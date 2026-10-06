// ===== FILE: APP_Vindia/backend/controllers/operationsDailyUpdateController.js =====
const OperationsDailyUpdate = require("../models/operationsDailyUpdateModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { insertNotification, notifyRole } = require("./operationsNotificationsController");

// "Today" in India time (YYYY-MM-DD) — avoids the UTC off-by-one after midnight
const todayLocal = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const ROLE_LABEL = {
  inventory_controller: "Inventory Controller",
  logistics_coordinator: "Logistics Coordinator",
  office_administrator: "Office Administrator",
};

const SUBMIT_LINK = {
  inventory_controller: "/operations/inventory/daily-update",
  logistics_coordinator: "/operations/logistics/daily-update",
  office_administrator: "/operations/administrator/daily-update",
};

/* POST /api/ops-daily-updates
   Submitter and role come from the login token, never from the body. */
exports.submitUpdate = asyncHandler(async (req, res) => {
  if (!req.body.work || !String(req.body.work).trim()) {
    throw new AppError("Work summary is required", 400);
  }

  const update = await OperationsDailyUpdate.upsert(req.user.id, req.user.role, {
    ...req.body,
    date: todayLocal(),
  });

  // Notify Operations Manager(s) — never fail the submit because of this
  try {
    const who = ROLE_LABEL[req.user.role] || "Team member";
    const status = req.body.overall_status;
    await notifyRole(
      "operations_manager",
      "daily_update",
      `${who} daily update`,
      req.body.issues && String(req.body.issues).trim()
        ? String(req.body.issues).slice(0, 140)
        : "Submitted today's update for review",
      "/operations/manager/daily-updates",
      status === "delayed" ? "critical" : status === "at-risk" ? "warn" : "info",
      null,
      update.id
    );
  } catch (err) {
    console.error("Daily update notification failed:", err.message);
  }

  res.status(201).json({ success: true, data: update });
});

/* GET /api/ops-daily-updates/mine */
exports.getMyUpdates = asyncHandler(async (req, res) => {
  const rows = await OperationsDailyUpdate.getBySubmitter(req.user.id);
  res.json({ success: true, data: rows });
});

/* GET /api/ops-daily-updates/today */
exports.getTodayMine = asyncHandler(async (req, res) => {
  const row = await OperationsDailyUpdate.getTodayBySubmitter(req.user.id, todayLocal());
  res.json({ success: true, data: row });
});

/* GET /api/ops-daily-updates?status=&role_code=   (Operations Manager) */
exports.getAllUpdates = asyncHandler(async (req, res) => {
  const { status, role_code } = req.query;
  const rows = await OperationsDailyUpdate.getAll({ status, role_code });
  res.json({ success: true, data: rows });
});

/* GET /api/ops-daily-updates/:id */
exports.getUpdateById = asyncHandler(async (req, res) => {
  const row = await OperationsDailyUpdate.getById(req.params.id);
  if (!row) throw new AppError("Daily update not found", 404);

  if (req.user.role !== "operations_manager" && row.submitted_by !== req.user.id) {
    throw new AppError("Access denied", 403);
  }
  res.json({ success: true, data: row });
});

/* PUT /api/ops-daily-updates/:id/review   (Operations Manager)
   Body: { status: "approved" | "rejected", note? } */
exports.reviewUpdate = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("status must be 'approved' or 'rejected'", 400);
  }
  if (status === "rejected" && !(note && String(note).trim())) {
    throw new AppError("Please add a note explaining what needs to change", 400);
  }

  const row = await OperationsDailyUpdate.review(req.params.id, req.user.id, status, note);
  if (!row) throw new AppError("Daily update not found", 404);

  // Tell the submitter the outcome
  try {
    await insertNotification(
      row.submitted_by,
      "daily_update",
      status === "approved" ? "Daily update approved" : "Daily update needs changes",
      note ? String(note).slice(0, 140) : `Your daily update was ${status}`,
      SUBMIT_LINK[row.role_code] || null,
      status === "approved" ? "ok" : "warn",
      null,
      row.role_code,
      row.id
    );
  } catch (err) {
    console.error("Review notification failed:", err.message);
  }

  res.json({ success: true, data: row });
});