// ===== FILE: APP_Vindia/backend/controllers/paymentController.js =====
const Payment = require("../models/paymentModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/payments
// Optional query filters: ?project_id=&payment_type=&status=
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { project_id, payment_type, status } = req.query;
  const payments = await Payment.getAll({ project_id, payment_type, status });
  res.json({ success: true, data: payments });
});

// GET /api/finance/payments/summary
// Optional query filter: ?project_id=
exports.getPaymentSummary = asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  const summary = await Payment.getStatusSummary(project_id);
  res.json({ success: true, data: summary });
});

// GET /api/finance/payments/:id
exports.getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.getById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);
  res.json({ success: true, data: payment });
});

// POST /api/finance/payments
// Body: { invoice_id?, project_id, vendor_id?, payment_type?, amount,
//         payment_method?, reference_number?, status?, payment_date?, notes? }
exports.createPayment = asyncHandler(async (req, res) => {
  const { project_id, amount } = req.body;
  if (!project_id || amount == null) {
    throw new AppError("project_id and amount are required", 400);
  }

  const payment = await Payment.create(req.body);
  res.status(201).json({ success: true, data: payment });
});

// PUT /api/finance/payments/:id
// Body: any of { amount, payment_method, reference_number, status, payment_date, notes }
exports.updatePayment = asyncHandler(async (req, res) => {
  const existing = await Payment.getById(req.params.id);
  if (!existing) throw new AppError("Payment not found", 404);

  const payment = await Payment.update(req.params.id, req.body);
  res.json({ success: true, data: payment });
});

// DELETE /api/finance/payments/:id
exports.deletePayment = asyncHandler(async (req, res) => {
  const existing = await Payment.getById(req.params.id);
  if (!existing) throw new AppError("Payment not found", 404);

  await Payment.delete(req.params.id);
  res.json({ success: true, message: "Payment deleted" });
});