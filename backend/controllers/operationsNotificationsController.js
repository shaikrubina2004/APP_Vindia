const pool = require("../config/db");

/* ══════════════════════════════════════════════════════════════
   Notifications for the two Operations roles:
     • logistics_coordinator
     • inventory_controller

   Both read from operations_notifications, but each role only ever
   receives the event types that belong to it (see ROLE_TYPES below),
   so the two bells show different, role-relevant content.
══════════════════════════════════════════════════════════════ */

/* Which notification types each role is allowed to receive.
   Anything not in a role's list is never inserted for that role. */
const ROLE_TYPES = {
  logistics_coordinator: [
    "delivery",   // delivery created / dispatched / in transit
    "delay",      // delivery running late
    "receipt",    // inventory confirmed goods into stock
    "incident",   // incident raised or assigned to them
    "task",       // task assigned to them
  ],
  inventory_controller: [
    "delivery",   // delivery arrived, waiting to be received into stock
    "low_stock",  // item hit or fell below minimum stock
    "receipt",    // goods receipt posted
    "incident",
    "task",
  ],
};

const isTypeAllowed = (roleCode, type) => {
  const allowed = ROLE_TYPES[roleCode];
  if (!allowed) return true;      // unknown role → don't block
  return allowed.includes(type);
};

/* ── Internal helper: notify one specific user ── */
const insertNotification = async (
  userId,
  type,
  title,
  description,
  link,
  severity = "info",
  projectId = null,
  roleCode = null,
  referenceId = null
) => {
  if (!userId) return;

  // Resolve the role if the caller didn't supply it, so we can
  // apply the per-role type filter and tag the row.
  let role = roleCode;
  try {
    if (!role) {
      const r = await pool.query(
        `SELECT r.code FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [userId]
      );
      role = r.rows[0]?.code ?? null;
    }
  } catch (err) {
    console.error("Role lookup failed:", err.message);
  }

  if (role && !isTypeAllowed(role, type)) {
    // Not relevant for this role — skip instead of cluttering their bell.
    return;
  }

  try {
    await pool.query(
      `INSERT INTO operations_notifications
      (user_id, role_code, type, title, description, link, severity, project_id, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, role, type, title, description, link, severity, projectId, referenceId]
    );
  } catch (err) {
    console.error("Notification insert failed:", err.message);
  }
};

/* ── Internal helper: notify every user of a given role code ──
   e.g. notifyRole("inventory_controller", "delivery", "Delivery arrived", ...)
   Not filtered by account status — a pending/inactive account should still
   see what happened while they were away once they log back in. */
const notifyRole = async (
  roleCode,
  type,
  title,
  description,
  link,
  severity = "info",
  projectId = null,
  referenceId = null
) => {
  if (!isTypeAllowed(roleCode, type)) {
    console.warn(`Skipped "${type}" notification — not a ${roleCode} concern.`);
    return;
  }
  try {
    const users = await pool.query(
      `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.code = $1`,
      [roleCode]
    );
    if (!users.rows.length) {
      console.warn(`notifyRole: no users found with role "${roleCode}"`);
      return;
    }
    for (const u of users.rows) {
      await insertNotification(
        u.id, type, title, description, link, severity, projectId, roleCode, referenceId
      );
    }
  } catch (err) {
    console.error("notifyRole failed:", err.message);
  }
};

/* GET /api/operations-notifications/:userId */
const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const result = await pool.query(
      `SELECT * FROM operations_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET operations notifications failed:", err.message);
    // Return an empty list rather than a 500 so the bell still renders.
    res.json([]);
  }
};

/* PATCH /api/operations-notifications/:id/read */
const markOneRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }
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

/* PATCH /api/operations-notifications/read-all/:userId */
const markAllRead = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
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

/* POST /api/operations-notifications (manual/internal trigger) */
const createNotification = async (req, res) => {
  try {
    const { user_id, type, title, description, link, severity, project_id, reference_id } = req.body;
    if (!user_id || !type || !title) {
      return res.status(400).json({ error: "user_id, type and title are required" });
    }
    await insertNotification(
      user_id, type, title, description, link, severity, project_id, null, reference_id
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

module.exports = {
  ROLE_TYPES,
  insertNotification,
  notifyRole,
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
};