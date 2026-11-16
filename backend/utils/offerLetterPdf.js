// ===== FILE: APP_Vindia/backend/utils/offerLetterPdf.js =====
//
// Builds the offer letter PDF (letterhead, offer paragraphs, Annexure 1 salary
// table, Additional Benefits, Annexure 2 Terms of Employment, acknowledgement
// page) in memory, and validates the extra "letter details" HR fills in on the
// offer form. Fixed wording lives in ./offerLetterTerms.js.
//
//   generateOfferLetterPdf(candidate)   -> Promise<Buffer>
//   validateOfferLetterData(raw, ctc)   -> { errors: string[], clean }
//   computeSalary(breakup)              -> monthly / annual rows and totals

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const T = require("./offerLetterTerms");

// Full-page letterhead artwork (logo, contact details, blue shapes) that is
// printed behind every page. Replace this file to change the letterhead.
const LETTERHEAD_IMAGE = path.join(__dirname, "..", "assets", "offer-letterhead.jpg");
// Only used if the file above is missing: a simpler drawn letterhead.
const LOGO_LETTERHEAD = path.join(__dirname, "..", "assets", "logo-letterhead.png");
const LOGO_FALLBACK = path.join(__dirname, "..", "assets", "logo.png");

// Carlito has the same letter widths as Calibri (the font of the original
// offer letter), so line breaks match the original. If the font files are
// missing the letter still works, using Helvetica instead.
const FONT_REGULAR = path.join(__dirname, "..", "assets", "fonts", "Carlito-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "..", "assets", "fonts", "Carlito-Bold.ttf");
const HAS_FONTS = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
const FONT = {
  reg: HAS_FONTS ? "Body" : "Helvetica",
  bold: HAS_FONTS ? "Body-Bold" : "Helvetica-Bold",
  body: HAS_FONTS ? 10.8 : 9.6, // letter and terms text
  small: HAS_FONTS ? 10.2 : 9.1, // clause headings and table text
};

/* ───────────── page geometry & colours (measured from the original) ───────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 84.1;
const MARGIN_R = 90; // text wraps at x = 505
const MARGIN_TOP = 172;
const MARGIN_BOTTOM = 142;
const L = MARGIN_L;
const RIGHT = PAGE_W - MARGIN_R;
const W = RIGHT - L; // ~421

// Annexure 2: clause headings, clauses and sub-clauses are indented
const T_HEAD_X = 100.3;
const T_ITEM_X = 120.7;
const T_SUB_X = 141.8;
const T_RIGHT = 500;

// Tables
const TABLE_X = 84.7;
const INFO_COLS = [175.2, 242.2];
const SAL_COLS = [226.7, 91.6, 99.1];
const ROW_H = 16.1;
const HEAD_H = 28.2;

const INK = "#111111";
const SKY = "#4aa3df";
const SKY_TEXT = "#5b9bd0";
const TABLE_HEAD = "#ece9e1";
const BORDER = "#1a1a1a";

const SALARY_KEYS = [
  "basic",
  "hra",
  "special_allowance",
  "ex_gratia",
  "variable_pay",
  "medical_insurance",
];

const SALUTATIONS = ["", "Mr.", "Ms.", "Mrs.", "Dr."];

/* ───────────── small helpers ───────────── */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2025-09-26" -> "September 26, 2025" (no time-zone shifting)
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  return `${MONTHS[+m[2] - 1]} ${m[3]}, ${m[1]}`;
};

// "10:00" -> "10:00 am", "14:30" -> "2:30 pm"
const fmtTime = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
  if (!m) return "";
  let h = +m[1];
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
};

// Indian digit grouping: 222240 -> "2,22,240"
const inr = (n) => {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return (v < 0 ? "-" : "") + grouped;
};

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const numWord = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/* ───────────── salary maths ───────────── */

// rounds half down, as the original letter does (4,049.5 -> 4,049)
const monthly = (annual) => Math.ceil(annual / 12 - 0.5);

function computeSalary(b) {
  const a = {};
  SALARY_KEYS.forEach((k) => (a[k] = Math.round(Number(b?.[k]) || 0)));
  const totalFixed = a.basic + a.hra + a.special_allowance + a.ex_gratia;
  const targetCash = totalFixed + a.variable_pay;
  const ctc = targetCash + a.medical_insurance;
  return { a, totalFixed, targetCash, ctc };
}

/* ───────────── validation of the letter details ───────────── */

function validateOfferLetterData(raw, ctcRaw) {
  const errors = [];
  const d = raw && typeof raw === "object" ? raw : {};
  const str = (v, max) => String(v ?? "").trim().slice(0, max);
  const int = (v, def, min, max, label) => {
    if (v === undefined || v === null || v === "") return def;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push(`${label} must be a whole number between ${min} and ${max}`);
      return def;
    }
    return n;
  };

  const clean = {
    salutation: str(d.salutation, 10),
    greeting_name: str(d.greeting_name, 60),
    address: str(d.address, 300),
    acceptance_deadline: str(d.acceptance_deadline, 10),
    reporting_time: str(d.reporting_time, 5) || "10:00",
    reporting_address: str(d.reporting_address, 200) || T.COMPANY.officeAddress,
    probation_months: int(d.probation_months, 6, 1, 12, "Probation period"),
    notice_months: int(d.notice_months, 3, 1, 6, "Notice period"),
    band: str(d.band, 30) || "Band 1",
    level: str(d.level, 30) || "Level 1",
    letter_date: /^\d{4}-\d{2}-\d{2}$/.test(String(d.letter_date || "")) ? d.letter_date : todayIST(),
    salary_breakup: {},
  };

  if (!SALUTATIONS.includes(clean.salutation)) errors.push("Salutation must be Mr., Ms., Mrs. or Dr.");
  if (!clean.greeting_name) errors.push("Greeting name is required (for example the candidate's first name)");
  if (!clean.address) errors.push("Candidate address is required for the letter");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.acceptance_deadline)) {
    errors.push("Acceptance deadline is required (the letter asks the candidate to accept by this date)");
  }
  if (!/^\d{1,2}:\d{2}$/.test(clean.reporting_time)) errors.push("Reporting time must be a valid time");

  const src = d.salary_breakup && typeof d.salary_breakup === "object" ? d.salary_breakup : {};
  let negative = false;
  SALARY_KEYS.forEach((k) => {
    const n = Math.round(Number(src[k]));
    if (!Number.isFinite(n) || n < 0) {
      negative = true;
      clean.salary_breakup[k] = 0;
    } else {
      clean.salary_breakup[k] = n;
    }
  });
  if (negative) errors.push("Every salary component must be a number of 0 or more");

  const ctc = Math.round(Number(ctcRaw) || 0);
  if (ctc < 12000) {
    errors.push(
      `The yearly salary is only ${inr(ctc)}. Check that the salary was entered in the right unit (LPA, per year or per month).`,
    );
  }
  const { ctc: sum } = computeSalary(clean.salary_breakup);
  if (!negative && Math.abs(sum - ctc) > 1) {
    errors.push(
      `The salary components add up to ${inr(sum)} but the annual salary is ${inr(ctc)}. Adjust the breakup so both match.`,
    );
  }

  return { errors, clean };
}

/* ───────────── letterhead & footer art ───────────── */

function poly(doc, points, color, opacity) {
  doc.save();
  doc.fillColor(color).fillOpacity(opacity);
  doc.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) doc.lineTo(points[i][0], points[i][1]);
  doc.closePath().fill();
  doc.restore();
}

let warnedMissingLetterhead = false;

function drawLetterhead(doc) {
  const sx = doc.x;
  const sy = doc.y;

  // preferred: the company's own letterhead artwork as a full-page background
  if (fs.existsSync(LETTERHEAD_IMAGE)) {
    doc.image(LETTERHEAD_IMAGE, 0, 0, { width: PAGE_W, height: PAGE_H });
    doc.fillColor(INK).fillOpacity(1);
    doc.x = sx;
    doc.y = sy;
    return;
  }

  if (!warnedMissingLetterhead) {
    warnedMissingLetterhead = true;
    console.warn(
      `[offer letter] ${LETTERHEAD_IMAGE} was not found, so a simpler drawn letterhead is used. Copy offer-letterhead.jpg into backend/assets/.`,
    );
  }

  // soft blue geometric shapes at the top
  poly(doc, [[0, 0], [215, 0], [0, 78]], "#cfe3f1", 0.75);
  poly(doc, [[150, 0], [430, 0], [330, 108], [60, 108]], "#dcebf6", 0.7);
  poly(doc, [[380, 0], [PAGE_W, 0], [PAGE_W, 125], [455, 70]], "#b7d8ee", 0.65);
  poly(doc, [[470, 0], [PAGE_W, 0], [PAGE_W, 55]], "#a5cde8", 0.6);

  // soft blue shapes at the bottom
  poly(doc, [[0, PAGE_H], [0, PAGE_H - 52], [210, PAGE_H]], "#9cc3de", 0.7);
  poly(doc, [[130, PAGE_H], [330, PAGE_H - 70], [PAGE_W - 140, PAGE_H]], "#7db8e0", 0.55);
  poly(doc, [[300, PAGE_H], [PAGE_W, PAGE_H - 48], [PAGE_W, PAGE_H]], "#b9d6ea", 0.75);

  // logo (left)
  const logo = fs.existsSync(LOGO_LETTERHEAD) ? LOGO_LETTERHEAD : LOGO_FALLBACK;
  try {
    doc.image(logo, 66, 22, { fit: [150, 105], align: "left", valign: "center" });
  } catch (_) {
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#333").text(T.COMPANY.letterName, 70, 60, { lineBreak: false });
  }

  // contact block (right)
  const cx = 372;
  const dot = (y) => {
    doc.save().lineWidth(0.8).strokeColor(SKY_TEXT).circle(cx - 12, y + 4.5, 4).stroke().restore();
  };
  doc.font("Helvetica").fontSize(8.5).fillColor(SKY_TEXT);
  dot(36);
  doc.text(T.COMPANY.website, cx, 36, { lineBreak: false });
  dot(58);
  T.COMPANY.addressLines.forEach((line, i) => {
    doc.text(line, cx, 58 + i * 11, { lineBreak: false });
  });
  dot(100);
  doc.text(T.COMPANY.phone, cx, 100, { lineBreak: false });

  // rule under the header
  doc.save().lineWidth(0.8).strokeColor(SKY).moveTo(58, 134).lineTo(PAGE_W - 58, 134).stroke().restore();

  doc.fillColor(INK).fillOpacity(1);
  doc.x = sx;
  doc.y = sy;
}

/* ───────────── text helpers ───────────── */

// typographic quotes, like the original letter: "x" -> “x”, don't -> don’t
const smart = (s) =>
  String(s)
    .replace(/(^|[\s(\[])"/g, "$1\u201C")
    .replace(/"/g, "\u201D")
    .replace(/(^|[\s(\[])'/g, "$1\u2018")
    .replace(/'/g, "\u2019");

// "ram kumar" -> "Ram Kumar" (only words typed fully in lower case are changed)
const tidyName = (s) =>
  String(s || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w && w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

function makeWriter(doc) {
  const bottom = () => PAGE_H - MARGIN_BOTTOM;

  // start a new page if less than h points are left
  const ensure = (h) => {
    if (doc.y + h > bottom()) doc.addPage();
  };

  const lineHeight = (size, font) =>
    doc.font(font || FONT.reg).fontSize(size || FONT.body).currentLineHeight(true);

  const write = (text, o = {}) => {
    doc.font(o.bold ? FONT.bold : FONT.reg).fontSize(o.size || FONT.body).fillColor(INK);
    const x = o.x ?? L;
    doc.text(smart(text), x, doc.y, {
      width: o.width ?? (o.right ?? RIGHT) - x,
      align: o.align || "left",
      lineGap: o.lineGap ?? 0,
    });
  };

  const gap = (pts) => {
    doc.y += pts;
  };
  // one empty line of body text
  const blank = (n = 1) => gap(lineHeight() * n);

  return { ensure, write, gap, blank, bottom, lineHeight };
}

/* ───────────── tables ───────────── */

function drawRow(doc, x0, y, h, cols, cells, opts = {}) {
  // cells: [{ text, align, bold, sup }]
  let x = x0;
  const width = cols.reduce((a, b) => a + b, 0);
  if (opts.fill) {
    doc.save().rect(x0, y, width, h).fill(opts.fill).restore();
  }
  cols.forEach((w, i) => {
    doc.save().lineWidth(0.7).strokeColor(BORDER).rect(x, y, w, h).stroke().restore();
    const c = cells[i] || {};
    const font = c.bold || opts.bold ? FONT.bold : FONT.reg;
    const size = FONT.small;
    const text = smart(String(c.text ?? ""));
    doc.font(font).fontSize(size).fillColor(INK);
    const ty = y + (h - size) / 2 - 0.8;
    doc.text(text, x + 5, ty, { width: w - 10, align: c.align || "left", lineBreak: false });
    if (c.sup) {
      // small raised footnote number after the label
      const tw = doc.widthOfString(text);
      doc.fontSize(size * 0.62).text(c.sup, x + 5 + tw + 0.5, ty - 2.2, { lineBreak: false });
    }
    x += w;
  });
}

/* ───────────── the document ───────────── */

function buildPdf(candidate) {
  const data = candidate.offer_letter_data || {};
  const salary = computeSalary(data.salary_breakup);
  const noticeWord = cap(numWord(Number(data.notice_months) || 3));
  const probationN = Number(data.probation_months) || 6;
  const fill = (str) => str.replace(/\{\{NOTICE_WORD\}\}/g, noticeWord);

  const joining = fmtDate(candidate.joining_date_text || candidate.joining_date);
  const greeting = tidyName(data.greeting_name || candidate.name);
  const fullName = `${data.salutation ? `${data.salutation} ` : ""}${tidyName(candidate.name)}`.trim();
  const role = tidyName(candidate.offered_role);
  const location = tidyName(candidate.offered_location);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_L, right: MARGIN_R },
      info: {
        Title: `Offer Letter - ${candidate.name}`,
        Author: T.COMPANY.legalName,
      },
    });
    if (HAS_FONTS) {
      doc.registerFont("Body", FONT_REGULAR);
      doc.registerFont("Body-Bold", FONT_BOLD);
    }
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.on("pageAdded", () => drawLetterhead(doc));

    try {
      const { ensure, write, gap, blank, bottom, lineHeight } = makeWriter(doc);
      drawLetterhead(doc);
      doc.x = L;
      doc.y = 184.6;

      /* ── the letter ── */
      write("PRIVATE AND CONFIDENTIAL", { bold: true, align: "center" });
      blank();
      write(fmtDate(data.letter_date) || fmtDate(todayIST()));
      write(fullName, { bold: true });
      String(data.address || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => write(line));
      blank();
      write(`Dear ${greeting},`);
      blank();
      write(`Welcome to ${T.COMPANY.letterName}!`);
      blank();

      // first paragraph, with the role in bold
      const probationText =
        probationN === 1
          ? "The first month of your employment shall be a probationary period."
          : `The first ${numWord(probationN)} months of your employment shall be a probationary period.`;
      doc.font(FONT.reg).fontSize(FONT.body).fillColor(INK);
      doc.text(
        smart(`It was a pleasure meeting you to explore a career opportunity with ${T.COMPANY.letterName} ${T.COMPANY.division}. Based on our discussion, we are pleased to offer you the position of `),
        L, doc.y, { width: W, align: "left", continued: true },
      );
      doc.font(FONT.bold).text(smart(`${role}.`), { continued: true });
      doc.font(FONT.reg).text(
        smart(`  ${probationText} The payment will be done on 1st Calendar day of the month and your salary would be as per Annexure 1. The details of the terms and conditions of the offer of employment are detailed in the enclosed annexure.`),
        { continued: false },
      );
      blank();

      T.WELCOME_PARAGRAPHS.forEach((para) => {
        write(para);
        blank();
      });

      const reportingTime = fmtTime(data.reporting_time);
      write(
        `${T.BGV_CONTINGENCY} We look forward to you joining us at our ${T.COMPANY.reportingCity} office ` +
          `(${data.reporting_address || T.COMPANY.officeAddress}) on ${joining}.` +
          (reportingTime ? ` The reporting time is ${reportingTime}.` : "") +
          (location ? ` Kindly note your job location will be ${location}.` : "") +
          " Please keep your recruiter informed, in case of an advancement in the joining date.",
      );
      blank();
      if (data.acceptance_deadline) {
        write(`Please endorse your acceptance on or before ${fmtDate(data.acceptance_deadline)}.`);
        blank();
      }

      /* ── Annexure 1 ── */
      const infoRows = [
        ["Name", fullName],
        ["Band", data.band || "Band 1"],
        ["Level", data.level || "Level 1"],
        ["Designation", role],
      ];
      const salRows = [
        { label: "Basic", key: "basic" },
        { label: "House Rent Allowance", key: "hra" },
        { label: "Leave Travel Allowance", na: true },
        { label: "Special Allowance", key: "special_allowance" },
        { label: "Ex-Gratia Bonus", sup: "1", key: "ex_gratia" },
        { label: "TOTAL FIXED CASH", total: salary.totalFixed, bold: true },
        { label: "Variable Pay", sup: "2", key: "variable_pay" },
        { label: "TARGET CASH COMPENSATION", total: salary.targetCash, bold: true },
        { label: "Medical Insurance Premium", key: "medical_insurance" },
        { label: "TARGET COST TO COMPANY", total: salary.ctc, bold: true },
      ];
      // title and both tables stay together on one page
      const annexHeight = lineHeight() + 4 + infoRows.length * ROW_H + 2 + HEAD_H + salRows.length * ROW_H + 40;
      ensure(annexHeight);

      write("Annexure -1", { bold: true, align: "center", x: TABLE_X, width: INFO_COLS[0] + INFO_COLS[1] });
      gap(2);

      let y = doc.y;
      infoRows.forEach(([k, v]) => {
        drawRow(doc, TABLE_X, y, ROW_H, INFO_COLS, [{ text: k, bold: true }, { text: v, bold: true }]);
        y += ROW_H;
      });
      y += 0.5;

      drawRow(
        doc, TABLE_X, y, HEAD_H, SAL_COLS,
        [{ text: "SALARY COMPONENT", bold: true }, { text: "MONTHLY GROSS", bold: true, align: "right" }, { text: "ANNUAL GROSS", bold: true, align: "right" }],
        { fill: TABLE_HEAD },
      );
      y += HEAD_H;
      salRows.forEach((r) => {
        let mo;
        let an;
        if (r.na) {
          mo = "NA";
          an = "NA";
        } else if (r.total !== undefined) {
          mo = inr(monthly(r.total));
          an = inr(r.total);
        } else {
          mo = inr(monthly(salary.a[r.key]));
          an = inr(salary.a[r.key]);
        }
        drawRow(
          doc, TABLE_X, y, ROW_H, SAL_COLS,
          [{ text: r.label, bold: r.bold, sup: r.sup }, { text: mo, align: "right", bold: r.bold }, { text: an, align: "right", bold: r.bold }],
        );
        y += ROW_H;
      });
      doc.x = L;
      doc.y = y + lineHeight() * 1.1;

      write("Note:");
      blank();
      T.SALARY_NOTES.forEach((n) => write(n));

      /* ── Additional Benefits ── */
      blank();
      ensure(lineHeight() * 6);
      write("Additional Benefits.", { bold: true });
      gap(lineHeight() + 3);
      T.ADDITIONAL_BENEFITS.forEach((b) => {
        doc.font(FONT.reg).fontSize(FONT.body);
        const h = doc.heightOfString(smart(b), { width: RIGHT - 120.1, lineGap: 4.9 });
        ensure(Math.min(h, 60));
        const by = doc.y;
        doc.text("\u2022", 102.1, by, { lineBreak: false });
        doc.text(smart(b), 120.1, by, { width: RIGHT - 120.1, align: "left", lineGap: 4.9 });
      });
      gap(lineHeight() * 0.8);

      /* ── Annexure 2: Terms of employment ── */
      ensure(lineHeight() * 9);
      write("ANNEXURE - 2", { bold: true, align: "center" });
      gap(lineHeight() * 0.9);
      write("TERMS OF EMPLOYMENT", { bold: true, size: FONT.small - 0.6, align: "center" });
      gap(lineHeight() * 0.9);
      write(T.TERMS_INTRO, { x: T_HEAD_X, right: T_RIGHT });
      gap(lineHeight() * 0.7);

      T.TERMS.forEach((section) => {
        ensure(lineHeight() * 4);
        write(section.title, { bold: true, size: FONT.small, x: T_HEAD_X, right: T_RIGHT });
        gap(4.7);
        section.items.forEach((item) => {
          const x = item.level === 1 ? T_SUB_X : T_ITEM_X;
          write(fill(item.text), { x, right: T_RIGHT });
          if (item.level === 1) gap(3);
        });
        gap(9.4);
      });

      /* ── Acknowledgement ── */
      gap(lineHeight() * 1.5);
      ensure(lineHeight() * 14 + 120);
      write(T.ACK_TITLE, { bold: true, size: FONT.small, align: "center" });
      blank(2);
      write(`I, ${"_".repeat(50)} ${T.ACK_TEXT}`);
      blank(2);
      write(`I confirm my acceptance of the offer and shall report for work on ${joining}.`);
      blank(2.5);

      ["Signature:", "Name:", "Date:", "Place:"].forEach((label) => {
        const ly = doc.y;
        doc.font(FONT.reg).fontSize(FONT.body).fillColor(INK).text(label, 247.4, ly, { lineBreak: false });
        doc.save().lineWidth(0.6).strokeColor("#333").moveTo(312.3, ly + 11).lineTo(506, ly + 11).stroke().restore();
        doc.y = ly + 25;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function generateOfferLetterPdf(candidate) {
  if (!candidate || !candidate.offer_letter_data) {
    throw new Error("Offer letter details are missing");
  }
  return buildPdf(candidate);
}

module.exports = {
  generateOfferLetterPdf,
  validateOfferLetterData,
  computeSalary,
  SALARY_KEYS,
  todayIST,
};