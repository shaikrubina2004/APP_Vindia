// ===== FILE: APP_Vindia/backend/controllers/financeSettingsController.js =====
const FinanceSettings = require("../models/financeSettingsModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await FinanceSettings.get();
  res.json({ success: true, data: settings });
});

// PUT /api/finance/settings/general
exports.updateGeneral = asyncHandler(async (req, res) => {
  const settings = await FinanceSettings.updateGeneral(req.body);
  res.json({ success: true, data: settings });
});

// PUT /api/finance/settings/tax
exports.updateTax = asyncHandler(async (req, res) => {
  const settings = await FinanceSettings.updateTax(req.body);
  res.json({ success: true, data: settings });
});

// PUT /api/finance/settings/invoice-prefs
exports.updateInvoicePrefs = asyncHandler(async (req, res) => {
  const settings = await FinanceSettings.updateInvoicePrefs(req.body);
  res.json({ success: true, data: settings });
});

// PUT /api/finance/settings/gateway/:gateway
exports.updateGateway = asyncHandler(async (req, res) => {
  const gateway = await FinanceSettings.updateGateway(req.params.gateway, req.body);
  if (!gateway) throw new AppError("Gateway not found", 404);
  res.json({ success: true, data: gateway });
});

// POST /api/finance/settings/bank-accounts
exports.addBankAccount = asyncHandler(async (req, res) => {
  const { bank_name, account_holder, account_number } = req.body;
  if (!bank_name || !account_holder || !account_number) {
    throw new AppError("bank_name, account_holder and account_number are required", 400);
  }
  const account = await FinanceSettings.addBankAccount(req.body);
  res.status(201).json({ success: true, data: account });
});

// DELETE /api/finance/settings/bank-accounts/:id
exports.deleteBankAccount = asyncHandler(async (req, res) => {
  await FinanceSettings.deleteBankAccount(req.params.id);
  res.json({ success: true, message: "Bank account removed" });
});