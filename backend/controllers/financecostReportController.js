// ===== FILE: APP_Vindia/backend/controllers/financecostReportController.js =====
const Finance = require("../models/financeModel");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/finance/cost-report?projectId=
// Powers CostReporting.jsx: budget-vs-actual by category,
// expense breakdown by category, and per-project totals.
exports.getCostReport = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const data = await Finance.getCostReportSummary(projectId);
  res.json({ success: true, data });
});