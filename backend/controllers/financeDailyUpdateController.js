// ===== FILE: APP_Vindia/backend/controllers/financeDailyUpdateController.js =====
const FinanceDailyUpdate = require("../models/financeDailyUpdateModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// POST /api/finance-daily-updates
// Finance Manager submits (or resubmits) today's update.
exports.submitUpdate = asyncHandler(async (req, res) => {
  const submittedBy = req.user.id;
  const date = req.body.date || new Date().toISOString().slice(0, 10);

  const update = await FinanceDailyUpdate.create(submittedBy, {
    ...req.body,
    date,
  });

  res.status(201).json({ success: true, data: update });
});

// GET /api/finance-daily-updates/mine
// Finance Manager's own submission history.
exports.getMyUpdates = asyncHandler(async (req, res) => {
  const rows = await FinanceDailyUpdate.getBySubmitter(req.user.id);
  res.json({ success: true, data: rows });
});

// GET /api/finance-daily-updates/today
// Used by the Finance Manager's page to check if they've already
// submitted today (and to prefill the form for editing).
exports.getTodayMine = asyncHandler(async (req, res) => {
  const row = await FinanceDailyUpdate.getTodayBySubmitter(req.user.id);
  res.json({ success: true, data: row });
});

// GET /api/finance-daily-updates
// CEO's review inbox. Optional query filters: ?status=pending&from=&to=
exports.getAllUpdates = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const rows = await FinanceDailyUpdate.getAll({ status, from, to });
  res.json({ success: true, data: rows });
});

// GET /api/finance-daily-updates/:id
exports.getUpdateById = asyncHandler(async (req, res) => {
  const row = await FinanceDailyUpdate.getById(req.params.id);
  if (!row) throw new AppError("Daily update not found", 404);
  res.json({ success: true, data: row });
});

// PUT /api/finance-daily-updates/:id/review
// CEO approves or rejects. Body: { status: "approved" | "rejected", note? }
exports.reviewUpdate = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("status must be 'approved' or 'rejected'", 400);
  }

  const row = await FinanceDailyUpdate.review(
    req.params.id,
    req.user.id,
    status,
    note
  );
  if (!row) throw new AppError("Daily update not found", 404);

  res.json({ success: true, data: row });
});