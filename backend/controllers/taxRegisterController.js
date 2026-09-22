// ===== FILE: APP_Vindia/backend/controllers/taxRegisterController.js =====
const TaxRegister = require("../models/taxRegisterModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const FM_ONLY_ROLES = ["finance_manager", "ceo"];

exports.getAll = asyncHandler(async (req, res) => {
  const { project_id, filing_period, source_type } = req.query;
  const rows = await TaxRegister.getAll({ project_id, filing_period, source_type });
  res.json({ success: true, data: rows });
});

exports.getSummary = asyncHandler(async (req, res) => {
  const rows = await TaxRegister.getSummaryByPeriod();
  res.json({ success: true, data: rows });
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await TaxRegister.getById(req.params.id);
  if (!row) throw new AppError("Tax register entry not found", 404);
  res.json({ success: true, data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const { source_type, source_id, tax_type, rate, taxable_amount, tax_amount, filing_period, project_id } = req.body;
  if (!source_type || !source_id || !tax_type) {
    throw new AppError("source_type, source_id and tax_type are required", 400);
  }
  if (!["invoice", "expense"].includes(source_type)) {
    throw new AppError("source_type must be 'invoice' or 'expense'", 400);
  }
  const row = await TaxRegister.create({
    source_type, source_id, tax_type, rate, taxable_amount, tax_amount, filing_period,
    project_id, created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: row });
});

exports.update = asyncHandler(async (req, res) => {
  const result = await TaxRegister.update(req.params.id, req.body);
  if (result.error === "NOT_FOUND") throw new AppError("Tax register entry not found", 404);
  if (result.error === "NOT_EDITABLE") throw new AppError("Only pending entries can be edited", 409);
  res.json({ success: true, data: result.entry });
});

// Finance Manager only — Accountant is explicitly blocked here.
exports.markFiled = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can mark a tax register entry as filed", 403);
  }
  const result = await TaxRegister.markFiled(req.params.id, req.user.id);
  if (result.error === "NOT_FOUND") throw new AppError("Tax register entry not found", 404);
  if (result.error === "NOT_PENDING") throw new AppError("Only pending entries can be filed", 409);
  res.json({ success: true, data: result.entry });
});
