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

const LOGO_LETTERHEAD = path.join(__dirname, "..", "assets", "logo-letterhead.png");
const LOGO_FALLBACK = path.join(__dirname, "..", "assets", "logo.png");

/* ───────────── page geometry & colours ───────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 70;
const MARGIN_R = 70;
const MARGIN_TOP = 152;
const MARGIN_BOTTOM = 100;
const L = MARGIN_L;
const W = PAGE_W - MARGIN_L - MARGIN_R; // 455

const INK = "#111111";
const SKY = "#4aa3df";
const SKY_TEXT = "#5b9bd0";
const TABLE_HEAD = "#ece9e1";
const BORDER = "#222222";

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

const monthly = (annual) => Math.round(annual / 12);

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
  if (clean.acceptance_deadline && !/^\d{4}-\d{2}-\d{2}$/.test(clean.acceptance_deadline)) {
    errors.push("Acceptance deadline must be a valid date");
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

function drawLetterhead(doc) {
  const sx = doc.x;
  const sy = doc.y;

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

/* ───────────── text helpers (always explicit x / y) ───────────── */

function makeWriter(doc) {
  const bottom = () => PAGE_H - MARGIN_BOTTOM;

  const ensure = (h) => {
    if (doc.y + h > bottom()) doc.addPage();
  };

  const write = (text, o = {}) => {
    doc.font(o.bold ? "Helvetica-Bold" : "Helvetica").fontSize(o.size || 10).fillColor(INK);
    const x = o.x ?? L;
    doc.text(text, x, doc.y, {
      width: o.width ?? W - (x - L),
      align: o.align || "left",
      lineGap: o.lineGap ?? 2,
    });
    if (o.after !== undefined) doc.moveDown(o.after);
  };

  return { ensure, write, bottom };
}

/* ───────────── tables ───────────── */

function drawRow(doc, y, h, cols, cells, opts = {}) {
  // cells: [{ text, align, bold }]
  let x = L;
  if (opts.fill) {
    doc.save().rect(L, y, W, h).fill(opts.fill).restore();
  }
  cols.forEach((w, i) => {
    doc.save().lineWidth(0.7).strokeColor(BORDER).rect(x, y, w, h).stroke().restore();
    const c = cells[i] || {};
    doc.font(c.bold || opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).fillColor(INK);
    doc.text(String(c.text ?? ""), x + 6, y + (h - 9.5) / 2 - 0.5, {
      width: w - 12,
      align: c.align || "left",
      lineBreak: false,
    });
    x += w;
  });
}

/* ───────────── the document ───────────── */

function buildPdf(candidate) {
  const data = candidate.offer_letter_data || {};
  const salary = computeSalary(data.salary_breakup);
  const noticeWord = cap(numWord(Number(data.notice_months) || 3));
  const probationN = Number(data.probation_months) || 6;
  const fill = (s) => s.replace(/\{\{NOTICE_WORD\}\}/g, noticeWord);

  const joining = fmtDate(candidate.joining_date_text || candidate.joining_date);
  const fullName = `${data.salutation ? `${data.salutation} ` : ""}${candidate.name}`.trim();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_L, right: MARGIN_R },
      info: {
        Title: `Offer Letter - ${candidate.name}`,
        Author: T.COMPANY.legalName,
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.on("pageAdded", () => drawLetterhead(doc));

    try {
      const { ensure, write, bottom } = makeWriter(doc);
      drawLetterhead(doc);
      doc.x = L;
      doc.y = MARGIN_TOP;

      /* ── page 1: the letter ── */
      write("PRIVATE AND CONFIDENTIAL", { bold: true, align: "center", after: 1.2 });
      write(fmtDate(data.letter_date) || fmtDate(todayIST()));
      write(fullName, { bold: true });
      String(data.address || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((line) => write(line, { lineGap: 1 }));
      doc.moveDown(1);
      write(`Dear ${data.greeting_name || candidate.name},`, { after: 0.9 });
      write(`Welcome to ${T.COMPANY.letterName}!`, { after: 0.9 });

      // paragraph with the role in bold
      doc.font("Helvetica").fontSize(10).fillColor(INK);
      const probationText =
        probationN === 1
          ? "The first month of your employment shall be a probationary period."
          : `The first ${numWord(probationN)} months of your employment shall be a probationary period.`;
      doc.text(
        `It was a pleasure meeting you to explore a career opportunity with ${T.COMPANY.letterName} ${T.COMPANY.division}. Based on our discussion, we are pleased to offer you the position of `,
        L, doc.y, { width: W, align: "justify", lineGap: 2, continued: true },
      );
      doc.font("Helvetica-Bold").text(candidate.offered_role, { continued: true });
      doc.font("Helvetica").text(
        `. ${probationText} The payment will be done on 1st Calendar day of the month and your salary would be as per Annexure 1. The details of the terms and conditions of the offer of employment are detailed in the enclosed annexure.`,
        { continued: false },
      );
      doc.moveDown(0.9);

      T.WELCOME_PARAGRAPHS.forEach((p) => write(p, { align: "justify", after: 0.9 }));

      const reportingTime = fmtTime(data.reporting_time);
      const joinText =
        `${T.BGV_CONTINGENCY} We look forward to you joining us at our ${T.COMPANY.reportingCity} office ` +
        `(${data.reporting_address || T.COMPANY.officeAddress}) on ${joining}.` +
        (reportingTime ? ` The reporting time is ${reportingTime}.` : "") +
        (candidate.offered_location ? ` Kindly note your job location will be ${candidate.offered_location}.` : "") +
        " Please keep your recruiter informed, in case of an advancement in the joining date.";
      write(joinText, { align: "justify", after: 0.9 });

      if (data.acceptance_deadline) {
        write(`Please endorse your acceptance on or before ${fmtDate(data.acceptance_deadline)}.`, { after: 1 });
      }

      /* ── Annexure 1 ── */
      const infoRows = [
        ["Name", fullName],
        ["Band", data.band || "Band 1"],
        ["Level", data.level || "Level 1"],
        ["Designation", candidate.offered_role],
      ];
      const salRows = [
        { label: "Basic", key: "basic" },
        { label: "House Rent Allowance", key: "hra" },
        { label: "Leave Travel Allowance", na: true },
        { label: "Special Allowance", key: "special_allowance" },
        { label: "Ex-Gratia Bonus\u00B9", key: "ex_gratia" },
        { label: "TOTAL FIXED CASH", total: salary.totalFixed, bold: true },
        { label: "Variable Pay\u00B2", key: "variable_pay" },
        { label: "TARGET CASH COMPENSATION", total: salary.targetCash, bold: true },
        { label: "Medical Insurance Premium", key: "medical_insurance" },
        { label: "TARGET COST TO COMPANY", total: salary.ctc, bold: true },
      ];
      const ROW = 21;
      const annexHeight = 24 + infoRows.length * ROW + 6 + (salRows.length + 1) * ROW + 150;
      // keep the title and the tables together on one page
      if (doc.y + annexHeight > bottom()) doc.addPage();
      else doc.moveDown(0.6);

      write("Annexure -1", { bold: true, align: "center", after: 0.5 });

      let y = doc.y;
      infoRows.forEach(([k, v]) => {
        drawRow(doc, y, ROW, [W * 0.4, W * 0.6], [{ text: k, bold: true }, { text: v, bold: true }]);
        y += ROW;
      });
      y += 4;

      const cols = [W * 0.55, W * 0.225, W * 0.225];
      drawRow(
        doc, y, ROW + 2, cols,
        [{ text: "SALARY COMPONENT", bold: true }, { text: "MONTHLY GROSS", bold: true, align: "right" }, { text: "ANNUAL GROSS", bold: true, align: "right" }],
        { fill: TABLE_HEAD },
      );
      y += ROW + 2;
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
          doc, y, ROW, cols,
          [{ text: r.label, bold: r.bold }, { text: mo, align: "right", bold: r.bold }, { text: an, align: "right", bold: r.bold }],
        );
        y += ROW;
      });
      doc.x = L;
      doc.y = y + 12;

      write("Note:", { after: 0.4 });
      T.SALARY_NOTES.forEach((n) => write(n, { size: 9.5, align: "justify", after: 0.4 }));
      doc.moveDown(0.8);

      /* ── Additional Benefits ── */
      ensure(80);
      write("Additional Benefits.", { bold: true, after: 0.5 });
      T.ADDITIONAL_BENEFITS.forEach((b) => {
        doc.font("Helvetica").fontSize(10);
        const h = doc.heightOfString(b, { width: W - 22, lineGap: 2 });
        ensure(h + 6);
        const by = doc.y;
        doc.text("\u2022", L + 6, by, { lineBreak: false });
        doc.text(b, L + 22, by, { width: W - 22, align: "justify", lineGap: 2 });
        doc.moveDown(0.5);
      });

      /* ── Annexure 2: Terms of employment ── */
      ensure(120);
      doc.moveDown(0.8);
      write("ANNEXURE - 2", { bold: true, align: "center", after: 0.6 });
      write("TERMS OF EMPLOYMENT", { bold: true, size: 9, align: "center", after: 0.6 });
      write(T.TERMS_INTRO, { align: "justify", after: 0.8 });

      T.TERMS.forEach((section) => {
        ensure(60);
        write(section.title, { bold: true, size: 9.5, after: 0.3 });
        section.items.forEach((item) => {
          const x = L + (item.level === 1 ? 36 : 18);
          const text = fill(item.text);
          doc.font("Helvetica").fontSize(9.5);
          const h = doc.heightOfString(text, { width: W - (x - L), lineGap: 1.5 });
          ensure(Math.min(h, 60) + 4);
          write(text, { x, size: 9.5, align: "justify", lineGap: 1.5, after: 0.35 });
        });
        doc.moveDown(0.4);
      });

      /* ── Acknowledgement ── */
      doc.moveDown(2.5);
      ensure(230);
      doc.x = L;
      write(T.ACK_TITLE, { bold: true, size: 9.5, align: "center", after: 2 });
      write(`I, ____________________________________________________ ${T.ACK_TEXT}`, { align: "justify", after: 1.5 });
      write(
        `I confirm my acceptance of the offer and shall report for work on ${joining}.`,
        { after: 3 },
      );

      ["Signature:", "Name:", "Date:", "Place:"].forEach((label) => {
        const ly = doc.y;
        doc.font("Helvetica").fontSize(10).fillColor(INK).text(label, L + 150, ly, { lineBreak: false });
        doc.save().lineWidth(0.6).strokeColor("#444").moveTo(L + 225, ly + 11).lineTo(L + W, ly + 11).stroke().restore();
        doc.y = ly + 28;
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