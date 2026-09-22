// ===== FILE: APP_Vindia/backend/controllers/ledgerController.js =====
const Ledger = require("../models/ledgerModel");
const { asyncHandler } = require("../middleware/errorHandler");

exports.getLedger = asyncHandler(async (req, res) => {
  const { account_id, project_id } = req.query;
  const rows = await Ledger.getEntries({ account_id, project_id });
  res.json({ success: true, data: rows });
});

exports.getTrialBalance = asyncHandler(async (req, res) => {
  const rows = await Ledger.getTrialBalance();
  res.json({ success: true, data: rows });
});
