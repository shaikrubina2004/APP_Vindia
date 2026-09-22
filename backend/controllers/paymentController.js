// ===== FILE: APP_Vindia/backend/controllers/paymentController.js =====
const Payment = require("../models/paymentModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// Accountant permission per financePermissions.js is "view, prepare" —
// not "release"/"reject". updatePayment previously accepted a raw
// status field from any caller; this blocks that for the accountant
// role only. finance_manager/ceo are completely unaffected.
function blockStatusChangeForAccountant(req) {
  if (req.user?.role !== "accountant") return null;
  if (req.body.status !== undefined) {
    return new AppError(
      "Accountant cannot change payment status. Releasing or rejecting a payment is a Finance Manager action.",
      403
    );
  }
  return null;
}

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

  // paymentModel.create defaults status to 'completed' when absent — an
  // already-released payment. An accountant (view/prepare only) must
  // never end up with a released payment, whether they set status
  // explicitly or just omit it, so both cases are handled here,
  // BEFORE any DB call.
  if (req.user?.role === "accountant") {
    if (req.body.status && req.body.status !== "pending") {
      throw new AppError(
        "Accountant can only prepare a payment as 'pending'. Releasing a payment is a Finance Manager action.",
        403
      );
    }
    req.body.status = "pending";
  }

  const payment = await Payment.create(req.body);
  res.status(201).json({ success: true, data: payment });
});

// PUT /api/finance/payments/:id
// Body: any of { amount, payment_method, reference_number, status, payment_date, notes }
exports.updatePayment = asyncHandler(async (req, res) => {
  // Authorization checked BEFORE any DB round-trip — fail fast.
  const statusError = blockStatusChangeForAccountant(req);
  if (statusError) throw statusError;

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