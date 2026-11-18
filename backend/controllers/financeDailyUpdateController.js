// ===== FILE: APP_Vindia/backend/controllers/financeDailyUpdateController.js =====

const FinanceDailyUpdate = require("../models/financeDailyUpdateModel");

const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { notifyCEO } = require("./ceoNotificationsController");
const { notifyRole, insertNotification } = require("./operationsNotificationsController");


/*
 * POST /api/finance-daily-updates
 *
 * Accountant / Finance Manager submits or resubmits
 * their daily finance update.
 */

exports.submitUpdate = asyncHandler(async (req, res) => {
  const submittedBy = req.user.id;

  const date =
    req.body.date || new Date().toISOString().slice(0, 10);

  const update = await FinanceDailyUpdate.create(submittedBy, {
    ...req.body,
    date,
  });

  // 🔔 Finance MANAGER's own update goes to the CEO for review
  // (accountant updates go to the Finance Manager, not the CEO)
  if (req.user.role === "finance_manager") {
    await notifyCEO({
      type: "daily_update",
      title: `Finance daily update from ${req.user.name || "Finance Manager"}`,
      description: req.body.summary || "Awaiting your review",
      link: `/reports?tab=daily&open=fin-${update && update.id}`,
      severity: req.body.overall_status && req.body.overall_status !== "on-track" ? "warning" : "info",
      referenceId: update && update.id,
    });
  }

  // Accountant's update goes to the Finance Manager for review.
  if (req.user.role === "accountant") {
    try {
      await notifyRole(
        "finance_manager",
        "daily_update",
        `Finance daily update from ${req.user.name || "Accountant"}`,
        req.body.summary || "Awaiting your review",
        "/finance-manager/daily-updates/review",
        req.body.overall_status && req.body.overall_status !== "on-track" ? "warn" : "info",
        null,
        update && update.id,
        req.user.id
      );
    } catch (notifyErr) {
      console.error("Daily update notification failed:", notifyErr.message);
    }
  }

  res.status(201).json({
    success: true,
    data: update,
  });
});


/*
 * GET /api/finance-daily-updates/mine
 *
 * Logged-in user's own submission history.
 */

exports.getMyUpdates = asyncHandler(async (req, res) => {
  const rows = await FinanceDailyUpdate.getBySubmitter(req.user.id);

  res.json({
    success: true,
    data: rows,
  });
});


/*
 * GET /api/finance-daily-updates/today
 *
 * Used by Accountant / Finance Manager to check
 * today's submission and prefill the form.
 */

exports.getTodayMine = asyncHandler(async (req, res) => {
  const row = await FinanceDailyUpdate.getTodayBySubmitter(
    req.user.id
  );

  res.json({
    success: true,
    data: row,
  });
});


/*
 * GET /api/finance-daily-updates
 *
 * Finance Manager review inbox.
 *
 * Optional filters:
 * ?status=pending&from=&to=
 */

exports.getAllUpdates = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;

  const rows = await FinanceDailyUpdate.getAll({
    status,
    from,
    to,
  });

  res.json({
    success: true,
    data: rows,
  });
});


/*
 * GET /api/finance-daily-updates/:id
 *
 * View a single finance daily update.
 */

exports.getUpdateById = asyncHandler(async (req, res) => {
  const row = await FinanceDailyUpdate.getById(req.params.id);

  if (!row) {
    throw new AppError("Daily update not found", 404);
  }

  res.json({
    success: true,
    data: row,
  });
});


/*
 * PUT /api/finance-daily-updates/:id/review
 *
 * Finance Manager approves or rejects an Accountant update.
 *
 * Body:
 * {
 *   status: "approved" | "rejected",
 *   note?: string
 * }
 */

exports.reviewUpdate = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError(
      "status must be 'approved' or 'rejected'",
      400
    );
  }

  /*
   * The reviewer is always the authenticated user.
   * Because the route is restricted to finance_manager,
   * req.user.id is the Finance Manager's ID here.
   */
  const row = await FinanceDailyUpdate.review(
    req.params.id,
    req.user.id,
    status,
    note
  );

  if (!row) {
    throw new AppError("Daily update not found", 404);
  }

  // Tell the accountant who submitted it that it was reviewed.
  if (row.submitted_by && String(row.submitted_by) !== String(req.user.id)) {
    try {
      await insertNotification(
        row.submitted_by,
        "daily_update",
        `Daily update ${status}`,
        note
          ? `Finance Manager ${status} your daily update. Note: ${note}`
          : `Finance Manager ${status} your daily update.`,
        "/accountant/daily-update",
        status === "approved" ? "ok" : "warn",
        null,
        null,
        row.id
      );
    } catch (notifyErr) {
      console.error("Daily update review notification failed:", notifyErr.message);
    }
  }

  res.json({
    success: true,
    data: row,
  });
});