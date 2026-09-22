// ===== FILE: APP_Vindia/backend/controllers/pettyCashController.js =====
const PettyCash = require("../models/pettyCashModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const FM_ONLY_ROLES = ["finance_manager", "ceo"];

exports.getAll = asyncHandler(async (req, res) => {
  const { project_id, status } = req.query;
  const rows = await PettyCash.getAll({ project_id, status });
  res.json({ success: true, data: rows });
});

exports.getBalance = asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  const balance = await PettyCash.getBalance(project_id);
  res.json({ success: true, data: balance });
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await PettyCash.getById(req.params.id);
  if (!row) throw new AppError("Petty cash transaction not found", 404);
  res.json({ success: true, data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const { project_id, transaction_type, amount, category, description, receipt_url } = req.body;
  if (!transaction_type || amount === undefined) {
    throw new AppError("transaction_type and amount are required", 400);
  }
  if (!["inflow", "outflow"].includes(transaction_type)) {
    throw new AppError("transaction_type must be 'inflow' or 'outflow'", 400);
  }
  const row = await PettyCash.create({
    project_id, transaction_type, amount, category, description, receipt_url,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: row });
});

exports.update = asyncHandler(async (req, res) => {
  const result = await PettyCash.update(req.params.id, req.body);
  if (result.error === "NOT_FOUND") throw new AppError("Petty cash transaction not found", 404);
  if (result.error === "NOT_EDITABLE") {
    throw new AppError("Only pending transactions can be edited", 409);
  }
  res.json({ success: true, data: result.entry });
});

// Finance Manager only.
exports.approve = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can approve petty cash transactions", 403);
  }
  const result = await PettyCash.approve(req.params.id, req.user.id);
  if (result.error === "NOT_FOUND") throw new AppError("Petty cash transaction not found", 404);
  if (result.error === "NOT_PENDING") throw new AppError("Only pending transactions can be approved", 409);
  res.json({ success: true, data: result.entry });
});

exports.reject = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can reject petty cash transactions", 403);
  }
  const result = await PettyCash.reject(req.params.id, req.user.id);
  if (result.error === "NOT_FOUND") throw new AppError("Petty cash transaction not found", 404);
  if (result.error === "NOT_PENDING") throw new AppError("Only pending transactions can be rejected", 409);
  res.json({ success: true, data: result.entry });
});
