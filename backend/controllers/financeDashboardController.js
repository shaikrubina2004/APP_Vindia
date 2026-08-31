// ===== FILE: APP_Vindia/backend/controllers/financeDashboardController.js =====
const Finance = require("../models/financeModel");
const { asyncHandler } = require("../middleware/errorHandler");

exports.getDashboard = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const stats = await Finance.getDashboard(projectId);
  const monthlyTrend = await Finance.getMonthlyTrend(projectId);
  res.json({ success: true, data: { stats, monthlyTrend } });
});