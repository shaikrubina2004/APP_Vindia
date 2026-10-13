const pool = require("../config/db"); // your existing pg pool

// Roles allowed to read/write someone else's notifications or create them manually
const ADMIN_ROLES = ["ceo"];

const isSelfOrAdmin = (req, userId) =>
  Number(req.user?.id) === Number(userId) || ADMIN_ROLES.includes(req.user?.role);

// ── Internal helper called by other controllers ──
const insertNotification = async (
  userId,
  type,
  title,
  description,
  link,
  severity = "info",
  projectId = null
) => {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO pc_notifications
      (user_id, type, title, description, link, severity, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, title, description, link, severity, projectId ?? null]
    );
  } catch (err) {
    console.error("Notification insert failed:", err.message);
  }
};

// Notify every project coordinator (role_id 33, same as projects/coordinators list).
// extraUserId = the coordinator explicitly assigned on the project, if any, so they
// are always included even if their role id differs.
const notifyAllCoordinators = async (
  type, title, description, link, severity = "info", projectId = null, extraUserId = null
) => {
  try {
    const { rows } = await pool.query(`SELECT id FROM users WHERE role_id = 33`);
    const ids = new Set(rows.map((r) => Number(r.id)));
    if (extraUserId) ids.add(Number(extraUserId));
    for (const id of ids) {
      await insertNotification(id, type, title, description, link, severity, projectId);
    }
  } catch (err) {
    console.error("notifyAllCoordinators failed:", err.message);
  }
};

// GET /api/pc-notifications/:userId
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isSelfOrAdmin(req, userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }
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
    // Only the owner can mark their own notification as read
    const result = await pool.query(
      `UPDATE pc_notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Notification not found" });
    }
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
    if (!isSelfOrAdmin(req, userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }
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

// POST /api/pc-notifications (manual/internal trigger — CEO only)
const createNotification = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    const { user_id, type, title, description, link, severity, project_id } = req.body;
    if (!user_id || !type || !title) {
      return res.status(400).json({ error: "user_id, type and title are required" });
    }
    await insertNotification(user_id, type, title, description, link, severity, project_id);
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