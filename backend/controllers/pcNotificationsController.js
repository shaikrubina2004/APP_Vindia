const pool = require("../config/db"); // your existing pg pool

// ── Internal helper called by other controllers ──
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
      `INSERT INTO pc_notifications 
      (user_id, type, title, description, link, severity, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, title, description, link, severity, projectId]
    );
  } catch (err) {
    console.error("Notification insert failed:", err.message);
  }
};

// GET /api/pc-notifications/:userId
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT * FROM pc_notifications 
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

// PATCH /api/pc-notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE pc_notifications SET is_read = TRUE WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};

// PATCH /api/pc-notifications/read-all/:userId
const markAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `UPDATE pc_notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

// POST /api/pc-notifications (manual/internal trigger)
const createNotification = async (req, res) => {
  try {
    const { user_id, type, title, description, link, severity } = req.body;
    await insertNotification(user_id, type, title, description, link, severity);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

module.exports = {
  insertNotification,
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
};