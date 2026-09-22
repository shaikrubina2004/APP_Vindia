// ===== FILE: APP_Vindia/backend/controllers/chartOfAccountsController.js =====
const ChartOfAccounts = require("../models/chartOfAccountsModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const FM_ONLY_ROLES = ["finance_manager", "ceo"];

exports.getAll = asyncHandler(async (req, res) => {
  const { account_type, is_active } = req.query;
  const rows = await ChartOfAccounts.getAll({
    account_type,
    is_active: is_active === undefined ? undefined : is_active === "true",
  });
  res.json({ success: true, data: rows });
});

exports.getById = asyncHandler(async (req, res) => {
  const account = await ChartOfAccounts.getById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  res.json({ success: true, data: account });
});

// Per financePermissions.js, Accountant has "view" only on chart of
// accounts; Finance Manager has view/create/edit. Enforced here, not
// just hidden in the frontend menu.
exports.create = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can create accounts", 403);
  }
  const { account_code, account_name, account_type, parent_account_id } = req.body;
  if (!account_code || !account_name || !account_type) {
    throw new AppError("account_code, account_name and account_type are required", 400);
  }
  const account = await ChartOfAccounts.create({ account_code, account_name, account_type, parent_account_id });
  res.status(201).json({ success: true, data: account });
});

exports.update = asyncHandler(async (req, res) => {
  if (!FM_ONLY_ROLES.includes(req.user?.role)) {
    throw new AppError("Only Finance Manager can edit accounts", 403);
  }
  const account = await ChartOfAccounts.update(req.params.id, req.body);
  if (!account) throw new AppError("Account not found", 404);
  res.json({ success: true, data: account });
});
