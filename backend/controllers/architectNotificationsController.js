// FILE PATH: backend/controllers/architectNotificationsController.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles INSERT + GET + PATCH for the architect_notifications table.
// Uses the `is_seen` boolean column (matches your DB schema screenshot).
// ─────────────────────────────────────────────────────────────────────────────

const pool = require("../config/db");

// ── Insert (called internally from IncidentController) ───────────────────────
exports.insertArchitectNotification = async (
  userId,
  type,
  title,
  description,
  link,
  severity,
  referenceId,
) => {
  if (!userId) return;
  console.log(`🔔 ARCHITECT NOTIFY → user:${userId} type:${type} title:${title}`);
  try {
    await pool.query(
      `INSERT INTO architect_notifications
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
    console.log(`✅ ARCHITECT NOTIFY inserted → user:${userId}`);
  } catch (err) {
    console.error("Architect notification insert error:", err.message);
  }
};

// ── GET /api/architect-notifications/:userId ─────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM architect_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 60`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("getNotifications (architect):", err);
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/architect-notifications/:id/read ──────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE architect_notifications SET is_seen = TRUE WHERE id = $1`,
      [id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markRead (architect):", err);
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/architect-notifications/read-all/:userId ─────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `UPDATE architect_notifications SET is_seen = TRUE WHERE user_id = $1`,
      [userId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markAllRead (architect):", err);
    res.status(500).json({ error: err.message });
  }
};