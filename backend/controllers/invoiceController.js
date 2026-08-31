// ===== FILE: APP_Vindia/backend/controllers/invoiceController.js =====
const Invoice = require("../models/invoiceModel");
const pool = require("../config/db");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/invoices?project_id=
exports.getAllInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.getAll(req.query);
  res.json({ success: true, data: invoices });
});

// POST /api/finance/invoices
exports.createInvoice = asyncHandler(async (req, res) => {
  const { project_id, amount, due_date } = req.body;
  if (!project_id || amount === undefined) {
    throw new AppError("project_id and amount are required", 400);
  }

  let { invoice_number } = req.body;
  if (!invoice_number) {
    // Auto-generate using the configured prefix, e.g. INV-000042
    const settings = await pool.query(
      `SELECT invoice_prefix FROM finance_settings WHERE id = 1`
    );
    const prefix = settings.rows[0]?.invoice_prefix || "INV-";
    const seq = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM invoices`);
    invoice_number = `${prefix}${String(seq.rows[0].next_id).padStart(6, "0")}`;
  }

  const invoice = await Invoice.create({
    project_id,
    invoice_number,
    amount,
    status: req.body.status || "pending",
    due_date,
  });
  res.status(201).json({ success: true, data: invoice });
});

// PUT /api/finance/invoices/:id/status
exports.updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("status is required", 400);

  const invoice = await Invoice.updateStatus(req.params.id, status);
  if (!invoice) throw new AppError("Invoice not found", 404);
  res.json({ success: true, data: invoice });
});

// DELETE /api/finance/invoices/:id
exports.deleteInvoice = asyncHandler(async (req, res) => {
  await Invoice.delete(req.params.id);
  res.json({ success: true, message: "Invoice deleted" });
});