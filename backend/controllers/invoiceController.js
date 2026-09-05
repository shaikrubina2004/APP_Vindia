// ===== FILE: APP_Vindia/backend/controllers/invoiceController.js =====
const Invoice = require("../models/invoiceModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/invoices
// Optional query filters: ?project_id=&status=&search=
exports.getAllInvoices = asyncHandler(async (req, res) => {
  const { project_id, status, search } = req.query;
  const invoices = await Invoice.getAll({ project_id, status, search });
  res.json({ success: true, data: invoices });
});

// POST /api/finance/invoices
// Body: { project_id, client_name, amount, tax_amount?, issue_date?, due_date?, notes? }
// invoice_number is generated server-side, not taken from the request.
exports.createInvoice = asyncHandler(async (req, res) => {
  const { project_id, client_name, amount } = req.body;
  if (!project_id || !client_name || amount == null) {
    throw new AppError("project_id, client_name and amount are required", 400);
  }

  const invoice_number = await Invoice.getNextInvoiceNumber();

  const invoice = await Invoice.create({
    ...req.body,
    invoice_number,
  });
  res.status(201).json({ success: true, data: invoice });
});

// PUT /api/finance/invoices/:id
// Body: any of { client_name, amount, tax_amount, due_date, notes }
// project_id and invoice_number are immutable — matches Invoice.update() on the model.
exports.updateInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.getById(req.params.id);
  if (!existing) throw new AppError("Invoice not found", 404);

  const invoice = await Invoice.update(req.params.id, req.body);
  res.json({ success: true, data: invoice });
});

// PUT /api/finance/invoices/:id/status
// Body: { status: "pending" | "paid" | "overdue" | ... }
exports.updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("status is required", 400);

  const existing = await Invoice.getById(req.params.id);
  if (!existing) throw new AppError("Invoice not found", 404);

  const invoice = await Invoice.updateStatus(req.params.id, status);
  res.json({ success: true, data: invoice });
});

// DELETE /api/finance/invoices/:id
exports.deleteInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.getById(req.params.id);
  if (!existing) throw new AppError("Invoice not found", 404);

  await Invoice.delete(req.params.id);
  res.json({ success: true, message: "Invoice deleted" });
});