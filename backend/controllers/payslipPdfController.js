const { streamPayslipPdf } = require("../utils/payslipPdf");

/* ══════════════════════════════════════════════════════════
   POST /api/payroll/employee/:id/payslip-pdf
   Body: exactly what the Payroll page is showing/approving
   (see utils/payslipPdf.js for the shape). Streams back a
   watermarked PDF for download.
   ══════════════════════════════════════════════════════════ */
exports.generatePayslipPdf = async (req, res) => {
  try {
    const { monthLabel, employee, earnings, deductions } = req.body || {};

    if (!monthLabel || !employee || !Array.isArray(earnings) || !Array.isArray(deductions)) {
      return res.status(400).json({ message: "Missing payslip data" });
    }

    streamPayslipPdf(res, req.body);
  } catch (err) {
    console.error("generatePayslipPdf:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not generate payslip PDF" });
    }
  }
};