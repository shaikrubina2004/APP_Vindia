// ===== FILE: APP_Vindia/backend/controllers/bankReconciliationController.js =====
const BankReconciliation = require("../models/bankReconciliationModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const FM_ONLY_ROLES = ["finance_manager", "ceo"];

exports.getAll = asyncHandler(async (req, res) => {
  const { bank_account_id, status } = req.query;
  const rows = await BankReconciliation.getAll({ bank_account_id, status });
  res.json({ success: true, data: rows });
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await BankReconciliation.getById(req.params.id);
  if (!row) throw new AppError("Reconciliation not found", 404);
  res.json({ success: true, data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const { bank_account_id, statement_date, statement_balance, book_balance, notes } = req.body;
  if (!bank_account_id || statement_balance === undefined || book_balance === undefined) {
    throw new AppError("bank_account_id, statement_balance and book_balance are required", 400);
  }
  const row = await BankReconciliation.create({
    bank_account_id, statement_date, statement_balance, book_balance, notes,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: row });
});

exports.update = asyncHandler(async (req, res) => {
  const result = await BankReconciliation.update(req.params.id, req.body);
  if (result.error === "NOT_FOUND") throw new AppError("Reconciliation not found", 404);
  if (result.error === "NOT_EDITABLE") {
    throw new AppError("Only in-progress reconciliations can be edited", 409);
  }
  res.json({ success: true, data: result.entry });
});

// Finance Manager only.
exports.approve = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can approve a reconciliation", 403);
  }
  const result = await BankReconciliation.approve(req.params.id, req.user.id);
  if (result.error === "NOT_FOUND") throw new AppError("Reconciliation not found", 404);
  if (result.error === "NOT_IN_PROGRESS") {
    throw new AppError("Only in-progress reconciliations can be approved", 409);
  }
  res.json({ success: true, data: result.entry });
});
