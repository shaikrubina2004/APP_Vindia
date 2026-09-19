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
      `INSERT INTO operations_notifications
      (user_id, type, title, description, link, severity, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, title, description, link, severity, projectId]
    );
  } catch (err) {
    console.error("Notification insert failed:", err.message);
  }
};

// ── Internal helper: notify every user of a given role code ──
// e.g. notifyRole("inventory_controller", "delivery", "Delivery arrived", ...)
// Not filtered by account status — a pending/inactive account should still
// see what happened while they were away once they log back in.
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
       WHERE r.code = $1`,
      [roleCode]
    );
    for (const u of users.rows) {
      await insertNotification(u.id, type, title, description, link, severity, projectId);
    }
  } catch (err) {
    console.error("notifyRole failed:", err.message);
  }
};

// GET /api/operations-notifications/:userId
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT * FROM operations_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// PATCH /api/operations-notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE operations_notifications SET is_read = TRUE WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};

// PATCH /api/operations-notifications/read-all/:userId
const markAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `UPDATE operations_notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

// POST /api/operations-notifications (manual/internal trigger)
const createNotification = async (req, res) => {
  try {
    const { user_id, type, title, description, link, severity, project_id } = req.body;
    await insertNotification(user_id, type, title, description, link, severity, project_id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
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