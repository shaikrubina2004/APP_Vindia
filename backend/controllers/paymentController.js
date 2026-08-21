// ===== FILE: APP_Vindia/backend/controllers/paymentController.js =====
const Payment = require("../models/paymentModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/payments?project_id=&payment_type=&status=
exports.getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.getAll(req.query);
  res.json({ success: true, data: payments });
});

// GET /api/finance/payments/summary?projectId=
exports.getPaymentSummary = asyncHandler(async (req, res) => {
  const summary = await Payment.getStatusSummary(req.query.projectId);
  res.json({ success: true, data: summary });
});

// GET /api/finance/payments/:id
exports.getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.getById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);
  res.json({ success: true, data: payment });
});

// POST /api/finance/payments
// Creating a "completed" incoming payment linked to an invoice automatically
// marks that invoice as paid once fully covered (handled inside paymentModel.create)
exports.createPayment = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (amount === undefined) throw new AppError("amount is required", 400);

  const payment = await Payment.create(req.body);
  res.status(201).json({ success: true, data: payment });
});

// PUT /api/finance/payments/:id
exports.updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.update(req.params.id, req.body);
  if (!payment) throw new AppError("Payment not found", 404);
  res.json({ success: true, data: payment });
});

// DELETE /api/finance/payments/:id
exports.deletePayment = asyncHandler(async (req, res) => {
  await Payment.delete(req.params.id);
  res.json({ success: true, message: "Payment deleted" });
});