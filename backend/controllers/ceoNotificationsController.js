// backend/controllers/ceoNotificationsController.js
//
// CEO notification bell backend.
//
// Follows the same pattern as the other roles and stores rows in the existing
// `operations_notifications` table with role_code = 'ceo'. Unlike the older
// unauthenticated  GET /operations-notifications/:userId  route, everything
// here is JWT-protected and scoped to the logged-in CEO (req.user.id) — the
// user id is never taken from the URL, so one user can't read another's feed.
//
// Other controllers call  notifyCEO({...})  to push an event to every CEO.
// notifyCEO NEVER throws, so a notification failure can't break the caller.

const pool = require("../config/db");

/* Matches CEO users whether the roles table stores it as name or code. */
const CEO_MATCH = `(
  LOWER(REPLACE(REPLACE(TRIM(COALESCE(r.name,'')),' ','_'),'-','_')) IN ('ceo','chief_executive_officer')
  OR LOWER(TRIM(COALESCE(r.code,''))) IN ('ceo','chief_executive_officer')
)`;

/* Types the CEO bell understands (keep in sync with CEONotificationBell.jsx) */
const CEO_TYPES = ["daily_update", "report", "incident", "task", "alert"];

/* ── Push one event to every CEO ── */
const notifyCEO = async ({
  type = "alert",
  title,
  description = null,
  link = null,
  severity = "info",
  projectId = null,
  referenceId = null,
}) => {
  try {
    if (!title) return;
    const t = CEO_TYPES.includes(type) ? type : "alert";

    const { rows } = await pool.query(
      `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE ${CEO_MATCH}`
    );
    if (!rows.length) {
      console.warn("⚠️  notifyCEO: no user with the CEO role was found — notification NOT created. "
        + "Run: node scripts/checkCeoNotifications.js");
      return;
    }

    for (const u of rows) {
      await pool.query(
        `INSERT INTO operations_notifications
           (user_id, role_code, type, title, description, link, severity, project_id, reference_id)
         VALUES ($1,'ceo',$2,$3,$4,$5,$6,$7,$8)`,
        [
          u.id,
          t,
          String(title).slice(0, 200),
          description ? String(description).slice(0, 300) : null,
          link,
          severity,
          projectId,
          referenceId,
        ]
      );
    }
  } catch (err) {
    console.error("❌ notifyCEO failed (notification NOT created):", err.message,
      "\n   → run: node migrations/createCeoTables.js   and   node scripts/checkCeoNotifications.js");
  }
};

/* GET /api/ceo-notifications */
const getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM operations_notifications
       WHERE user_id = $1 AND role_code = 'ceo'
       ORDER BY created_at DESC
       LIMIT 60`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET ceo notifications:", err.message);
    res.json([]); // keep the bell rendering
  }
};

/* GET /api/ceo-notifications/debug — quick self-check, CEO only */
const debug = async (req, res) => {
  try {
    const ceos = await pool.query(
      `SELECT u.id, u.email, r.name AS role_name, r.code AS role_code FROM users u
       JOIN roles r ON r.id = u.role_id WHERE ${CEO_MATCH}`
    );
    const mine = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT is_read)::int AS unread
       FROM operations_notifications WHERE user_id=$1 AND role_code='ceo'`, [req.user.id]
    );
    res.json({ loggedInAs: { id: req.user.id, role: req.user.role }, ceoUsersFound: ceos.rows, mine: mine.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* PATCH /api/ceo-notifications/read-all */
const markAllRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE operations_notifications SET is_read = TRUE
       WHERE user_id = $1 AND role_code = 'ceo' AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

/* PATCH /api/ceo-notifications/:id/read */
const markOneRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
    await pool.query(
      `UPDATE operations_notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read" });
  }
};

module.exports = { CEO_MATCH, notifyCEO, getNotifications, markAllRead, markOneRead, debug };