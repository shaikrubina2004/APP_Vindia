const ReceivablesPayables = require("../models/receivablesPayablesModel");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/finance/receivables-payables
exports.getReceivablesPayables = asyncHandler(async (req, res) => {
  const {
    project_id,
    vendor_id,
    search,
    from_date,
    to_date,
    wbs_id,
  } = req.query;

  const report = await ReceivablesPayables.getReport({
    project_id,
    vendor_id,
    search,
    from_date,
    to_date,
    wbs_id,
  });

  res.json({
    success: true,
    data: report,
  });
});