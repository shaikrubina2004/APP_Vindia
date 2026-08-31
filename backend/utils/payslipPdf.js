const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const LOGO_PATH = path.join(__dirname, "..", "assets", "logo.png");
// Icon-only version of the logo (just the India-map graphic, no wordmark).
// Used for the header box and the watermark so neither shows the company name.
const LOGO_ICON_PATH = path.join(__dirname, "..", "assets", "logo-icon.png");

const COMPANY_NAME = "VIndia Infrasec Pvt Ltd";

// Palette lifted from the logo (blue map-icon + wordmark)
const BLUE = "#3E6FB0"; // header / total box / footer
const BLUE_DARK = "#2C4E82"; // diagonal overlay accent
const INK = "#26282d";
const MUTED = "#9195a0";
const LINE = "#e2e4ea";
const LINE_SOFT = "#eef0f3";
const PANEL = "#eef0f3"; // table header pill / totals row
const HEADER_TEXT_DIM = "#c7cdea"; // light label text on blue

const INR = (v) => {
  const n = Number(v);
  if (v === "—" || v == null || isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

/* Use the dedicated icon-only asset if present, else fall back to the full logo. */
function resolveIconPath() {
  if (fs.existsSync(LOGO_ICON_PATH)) return LOGO_ICON_PATH;
  return LOGO_PATH;
}

/* Draw the icon contain-fit into a box, centered. */
function drawIcon(doc, iconPath, x, y, maxW, maxH) {
  let natural;
  try {
    natural = doc.openImage(iconPath);
  } catch (_) {
    return;
  }
  const scale = Math.min(maxW / natural.width, maxH / natural.height);
  const drawW = natural.width * scale;
  const drawH = natural.height * scale;
  const boxX = x + (maxW - drawW) / 2;
  const boxY = y + (maxH - drawH) / 2;
  try {
    doc.image(iconPath, boxX, boxY, { width: drawW, height: drawH });
  } catch (_) {
    /* ignore image failure — never block payslip generation */
  }
}

/* ── repeating small icon-only watermark pattern, no wordmark ── */
function drawWatermark(doc) {
  const iconPath = resolveIconPath();
  if (!fs.existsSync(iconPath)) return;

  let natural;
  try {
    natural = doc.openImage(iconPath);
  } catch (_) {
    return; // never block payslip generation over a bad watermark asset
  }

  const { width: pageW, height: pageH } = doc.page;

  // The "white part" of the page — everything between the blue header
  // and the blue footer banner.
  const areaTop = 134; // matches headerH below
  const areaBottom = pageH - 48; // matches footer position below
  const areaLeft = 0;
  const areaRight = pageW;

  const tileW = 260; // big icon size
  const tileH = natural.height * (tileW / natural.width);
  const gapX = 60;
  const gapY = 50;
  const stepX = tileW + gapX;
  const stepY = tileH + gapY;

  doc.save();
  doc.rect(areaLeft, areaTop, areaRight - areaLeft, areaBottom - areaTop).clip();
  doc.opacity(0.1); // kept subtle even though icon is much bigger now

  let row = 0;
  for (let y = areaTop - stepY / 2; y < areaBottom + stepY; y += stepY) {
    const offsetX = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = areaLeft - stepX; x < areaRight + stepX; x += stepX) {
      drawIcon(doc, iconPath, x + offsetX, y, tileW, tileH);
    }
    row++;
  }

  doc.restore();
  doc.opacity(1);
}

/* ── path helper: rectangle with an independently-radiused corner set ── */
function roundedPath(doc, x, y, w, h, r) {
  const rr = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  doc
    .moveTo(x + rr.tl, y)
    .lineTo(x + w - rr.tr, y)
    .quadraticCurveTo(x + w, y, x + w, y + rr.tr)
    .lineTo(x + w, y + h - rr.br)
    .quadraticCurveTo(x + w, y + h, x + w - rr.br, y + h)
    .lineTo(x + rr.bl, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - rr.bl)
    .lineTo(x, y + rr.tl)
    .quadraticCurveTo(x, y, x + rr.tl, y)
    .closePath();
}

/* ── one two-column info row, e.g. "Name | ... | PAN | ..." ── */
function infoRow(doc, x, y, w, h, label1, val1, label2, val2) {
  const half = w / 2;
  doc.strokeColor(LINE).lineWidth(0.6);
  doc.moveTo(x, y + h).lineTo(x + w, y + h).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK);
  doc.text(label1, x, y + 7, { width: half * 0.42 });
  doc.text(label2, x + half, y + 7, { width: half * 0.42 });

  doc.font("Helvetica").fontSize(9).fillColor(INK);
  doc.text(String(val1 ?? "—"), x + half * 0.46, y + 7, { width: half * 0.48 });
  doc.text(String(val2 ?? "—"), x + half + half * 0.46, y + 7, { width: half * 0.48 });
}

/**
 * Stream a payslip PDF (invoice-template styling, simple content) to `res`.
 *
 * payload = {
 *   monthLabel: "July 2026",
 *   employee: {
 *     name, employeeCode, pan, workingDays, designation, daysPayable,
 *     band, pfNo, level, lopDays, location, lopPrevMonth,
 *     bankName, bankAccNo,
 *   },
 *   earnings:   [{ label, amount }, ...],
 *   deductions: [{ label, amount }, ...],
 *   totalEarnings, totalDeductions, netPay,
 * }
 */
function streamPayslipPdf(res, payload) {
  const {
    monthLabel = "",
    employee = {},
    earnings = [],
    deductions = [],
    totalEarnings = 0,
    totalDeductions = 0,
    netPay = 0,
  } = payload;

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  const fileName = `Payslip-${(employee.name || "employee").replace(/[^a-z0-9]+/gi, "_")}-${monthLabel.replace(/\s+/g, "_")}.pdf`;
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  doc.pipe(res);

  drawWatermark(doc);

  const left = 42;
  const right = doc.page.width - 42;
  const pageWidth = right - left;

  /* ══════════════════════════════════════════════════════════
     HEADER — diagonal two-tone blue banner (template styling),
     simple single-row content (matches the plain layout)
     ══════════════════════════════════════════════════════════ */
  const headerH = 134;

  doc.save();
  doc.rect(0, 0, doc.page.width, headerH).fill(BLUE);
  doc
    .moveTo(0, 34)
    .lineTo(doc.page.width, 0)
    .lineTo(doc.page.width, 58)
    .lineTo(160, headerH)
    .lineTo(0, headerH)
    .closePath()
    .fill(BLUE_DARK);
  doc.restore();

  // Bigger, clearer logo box, icon only (no wordmark) — sized for print visibility
  const LOGO_BOX = 118;
  const LOGO_BOX_Y = 8;
  const iconPath = resolveIconPath();
  if (fs.existsSync(iconPath)) {
    doc.save();
    roundedPath(doc, left, LOGO_BOX_Y, LOGO_BOX, LOGO_BOX, 16);
    doc.fillColor("#ffffff").fill();
    doc.restore();

    const pad = 4;
    drawIcon(doc, iconPath, left + pad, LOGO_BOX_Y + pad, LOGO_BOX - pad * 2, LOGO_BOX - pad * 2);
  }

  const textX = left + LOGO_BOX + 14;
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#ffffff");
  doc.text(COMPANY_NAME.toUpperCase(), textX, 45, { width: right - textX });
  doc.font("Helvetica").fontSize(8.5).fillColor(HEADER_TEXT_DIM);
  doc.text(`Payslip · ${monthLabel}`, textX, 64);

  let y = headerH + 40;
  const rowH = 24;

  // ── Employee info table ────────────────────────────────
  infoRow(doc, left, y, pageWidth, rowH, "Name", employee.name, "PAN", employee.pan);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Employee No", employee.employeeCode, "Working Days", employee.workingDays);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Designation", employee.designation, "Days Payable", employee.daysPayable);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Band", employee.band, "PF No.", employee.pfNo);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Level", employee.level, "LOP", employee.lopDays);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Location", employee.location, "LOP Prev Month", employee.lopPrevMonth ?? 0);
  y += rowH;
  infoRow(doc, left, y, pageWidth, rowH, "Bank Name", employee.bankName, "Bank Acc No", employee.bankAccNo);
  y += rowH + 26;

  /* ══════════════════════════════════════════════════════════
     EARNINGS / DEDUCTIONS — minimal, modern two-column table:
     rounded pill header, hairline row dividers, no cell borders
     ══════════════════════════════════════════════════════════ */
  const half = pageWidth / 2;
  const headH = 26;

  doc.save();
  roundedPath(doc, left, y, pageWidth, headH, 12);
  doc.fillColor(PANEL).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK);
  doc.text("EARNINGS", left + 14, y + 8, { width: half * 0.7 });
  doc.text("Rs.", left + half - 56, y + 8, { width: 42, align: "right" });
  doc.text("DEDUCTIONS", left + half + 14, y + 8, { width: half * 0.7 });
  doc.text("Rs.", left + pageWidth - 56, y + 8, { width: 42, align: "right" });
  y += headH + 8;

  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    const e = earnings[i];
    const d = deductions[i];

    doc.font("Helvetica").fontSize(9.5).fillColor(INK);
    if (e) {
      doc.text(e.label, left + 14, y + 6, { width: half * 0.6 });
      doc.text(INR(e.amount), left + half - 56, y + 6, { width: 42, align: "right" });
    }
    if (d) {
      doc.text(d.label, left + half + 14, y + 6, { width: half * 0.6 });
      doc.text(INR(d.amount), left + pageWidth - 56, y + 6, { width: 42, align: "right" });
    }
    y += rowH;
    doc.strokeColor(LINE_SOFT).lineWidth(0.6);
    doc.moveTo(left, y - 3).lineTo(left + pageWidth, y - 3).stroke();
  }
  y += 4;

  // Totals row — soft highlighted panel, no border boxes (minimal)
  doc.save();
  roundedPath(doc, left, y, pageWidth, rowH + 6, 10);
  doc.fillColor(PANEL).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK);
  doc.text("Total Earnings", left + 14, y + 9, { width: half * 0.6 });
  doc.text(INR(totalEarnings), left + half - 56, y + 9, { width: 42, align: "right" });
  doc.text("Total Deductions", left + half + 14, y + 9, { width: half * 0.6 });
  doc.text(INR(totalDeductions), left + pageWidth - 56, y + 9, { width: 42, align: "right" });
  y += rowH + 6 + 20;

  // Net salary — highlighted rounded blue box, right-aligned
  const netBoxW = 220;
  const netBoxH = 34;
  const netBoxX = left + pageWidth - netBoxW;
  doc.save();
  roundedPath(doc, netBoxX, y, netBoxW, netBoxH, 8);
  doc.fillColor(BLUE).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
  doc.text("Net Salary", netBoxX + 16, y + 11, { width: netBoxW * 0.45 });
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
  doc.text(`Rs. ${INR(netPay)}`, netBoxX, y + 10, { width: netBoxW - 16, align: "right" });
  y += netBoxH + 26;

  doc.font("Helvetica").fontSize(8).fillColor(MUTED);
  doc.text(
    "",
    left,
    y,
    { width: pageWidth, align: "center" }
  );

  /* ══════════════════════════════════════════════════════════
     FOOTER — rounded blue banner, invoice-style
     ══════════════════════════════════════════════════════════ */
  const footH = 28;
  const footY = doc.page.height - footH - 20;
  doc.save();
  roundedPath(doc, left, footY, pageWidth, footH, 14);
  doc.fillColor(BLUE).fill();
  doc.restore();
  doc.font("Helvetica").fontSize(9).fillColor("#ffffff");
  doc.text(COMPANY_NAME, left, footY + 9, { width: pageWidth, align: "center" });

  doc.end();
}

module.exports = { streamPayslipPdf };