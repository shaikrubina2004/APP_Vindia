// FILE PATH: backend/controllers/siteEngineerNotificationsController.js
// Per-user notifications for the Site Engineer role — same shape as
// operationsNotificationsController.js (see that file for the pattern
// this follows: Logistics Coordinator / Inventory Controller).

const pool = require("../config/db");

// ── Internal helper: notify one specific user ──
const insertNotification = async (
  userId,
  type,
  title,
  description,
  link,
  severity = "info",
  projectId
) => {
  try {
    await pool.query(
      `INSERT INTO site_engineer_notifications
      (user_id, type, title, description, link, severity, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, title, description, link, severity, projectId]
    );
  } catch (err) {
    console.error("Site Engineer notification insert failed:", err.message);
  }
};

// ── Internal helper: notify every active site engineer ──
// e.g. notifyRole("site_engineer", "incident", "New incident reported", ...)
const notifyRole = async (
  roleCode,
  type,
  title,
  description,
  link,
  severity = "info",
  projectId
) => {
  try {
    const users = await pool.query(
      `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.code = $1 AND u.status = 'active'`,
      [roleCode]
    );
    for (const u of users.rows) {
      await insertNotification(u.id, type, title, description, link, severity, projectId);
    }
  } catch (err) {
    console.error("notifyRole (site engineer) failed:", err.message);
  }
};

// GET /api/site-engineer-notifications/:userId
const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || "").trim().toLowerCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    if (userId !== requesterId && requesterRole !== "ceo") {
      return res.status(403).json({ error: "You can only read your own notifications." });
    }

    const result = await pool.query(
      `SELECT * FROM site_engineer_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getSiteEngineerNotifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// PATCH /api/site-engineer-notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requesterId = Number(req.user?.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid notification ID" });

    const result = await pool.query(
      `UPDATE site_engineer_notifications
          SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING id`,
      [id, requesterId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true, id });
  } catch (err) {
    console.error("markSiteEngineerNotificationRead:", err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};

// PATCH /api/site-engineer-notifications/read-all/:userId
const markAllRead = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || "").trim().toLowerCase();
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Invalid user ID" });
    if (userId !== requesterId && requesterRole !== "ceo") {
      return res.status(403).json({ error: "You can only update your own notifications." });
    }

    await pool.query(
      `UPDATE site_engineer_notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markAllSiteEngineerNotificationsRead:", err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

// POST /api/site-engineer-notifications (manual/internal trigger)
const createNotification = async (req, res) => {
  try {
    const role = String(req.user?.role || "").trim().toLowerCase();
    if (!("site_engineer" === role || "ceo" === role || role.endsWith("_manager"))) {
      return res.status(403).json({ error: "Not authorized to create site engineer notifications." });
    }

    const { user_id, type, title, description, link, severity, project_id } = req.body || {};
    const targetUserId = Number(user_id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || !title) {
      return res.status(400).json({ error: "user_id and title are required" });
    }

    await insertNotification(targetUserId, type || "work", title, description || "", link || null, severity || "info", project_id || null);
    res.json({ success: true });
  } catch (err) {
    console.error("createSiteEngineerNotification:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

module.exports = {
  insertNotification,
  notifyRole,
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
};
