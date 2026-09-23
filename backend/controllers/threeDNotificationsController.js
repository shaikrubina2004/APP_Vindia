// FILE PATH: backend/controllers/threeDNotificationsController.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles INSERT + GET + PATCH for the three_d_notifications table.
// Same shape as architectNotificationsController.js (user_id scoped, is_seen).
// ─────────────────────────────────────────────────────────────────────────────

const pool = require("../config/db");

// ── Insert (called internally from threeDModelController) ────────────────────
exports.insertThreeDNotification = async (
  userId,
  type,
  title,
  description,
  link,
  severity,
  referenceId,
) => {
  if (!userId) return;
  console.log(`🔔 3D VISUALIZER NOTIFY → user:${userId} type:${type} title:${title}`);
  try {
    await pool.query(
      `INSERT INTO three_d_notifications
         (user_id, type, title, description, link, severity, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        type,
        title,
        description || null,
        link        || null,
        severity    || "info",
        referenceId || null,
      ],
    );
    console.log(`✅ 3D VISUALIZER NOTIFY inserted → user:${userId}`);
  } catch (err) {
    console.error("3D notification insert error:", err.message);
  }
};

// ── GET /api/3d-notifications/:userId ────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM three_d_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 60`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("getNotifications (3d):", err);
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/3d-notifications/:id/read ─────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE three_d_notifications SET is_seen = TRUE WHERE id = $1`,
      [id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markRead (3d):", err);
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/3d-notifications/read-all/:userId ─────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `UPDATE three_d_notifications SET is_seen = TRUE WHERE user_id = $1`,
      [userId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markAllRead (3d):", err);
    res.status(500).json({ error: err.message });
  }
};