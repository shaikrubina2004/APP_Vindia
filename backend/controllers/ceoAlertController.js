// CEO notification inbox.
//  • Other controllers call notifyCeos(...) to push an item to every CEO user.
//  • GET / also refreshes "derived" alerts (things that are true right now in
//    the database, e.g. users waiting for a role) – de-duplicated by dedupe_key.

const pool = require("../config/db");
const { asyncHandler } = require("../middleware/errorHandler");

/* ── push a notification to every CEO ─────────────────────────── */
const notifyCeos = async ({
  type = "system",
  title,
  description = "",
  link = null,
  severity = "info",
  dedupeKey = null,
}) => {
  try {
    await pool.query(
      `INSERT INTO ceo_notifications (user_id, type, title, description, link, severity, dedupe_key)
       SELECT u.id, $1, $2, $3, $4, $5, $6
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE LOWER(REPLACE(TRIM(r.name), ' ', '_')) = 'ceo'
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [type, title, description, link, severity, dedupeKey]
    );
  } catch (err) {
    // A notification must never break the main request
    console.error("notifyCeos failed:", err.message);
  }
};

/* ── derived alerts (throttled to once a minute per process) ───── */
let lastSync = 0;
const syncDerivedAlerts = async () => {
  if (Date.now() - lastSync < 60 * 1000) return;
  lastSync = Date.now();

  // 1. Registered users still waiting for a role
  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM users
       WHERE LOWER(COALESCE(status,'')) = 'pending'
       ORDER BY id DESC LIMIT 20`
    );
    for (const u of rows) {
      await notifyCeos({
        type: "user",
        title: "New user awaiting a role",
        description: `${u.name || "A new user"} has registered and needs a department and role.`,
        link: "/users",
        severity: "warn",
        dedupeKey: `user-pending-${u.id}`,
      });
    }
  } catch (err) {
    console.error("derived alert (users) skipped:", err.message);
  }

  // 2. Daily reports that have been waiting more than 24h for review
  try {
    const { rows } = await pool.query(
      `SELECT id, report_type, report_date FROM ceo_daily_reports
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 20`
    );
    for (const r of rows) {
      await notifyCeos({
        type: "report",
        title: "Report waiting over 24 hours",
        description: `A ${String(r.report_type).toUpperCase()} daily update is still pending your review.`,
        link: "/reports",
        severity: "warn",
        dedupeKey: `report-stale-${r.id}`,
      });
    }
  } catch (err) {
    console.error("derived alert (stale reports) skipped:", err.message);
  }
};

/* ── HTTP handlers ─────────────────────────────────────────────── */
exports.notifyCeos = notifyCeos;

exports.getMine = asyncHandler(async (req, res) => {
  await syncDerivedAlerts();
  const { rows } = await pool.query(
    `SELECT id, type, title, description, link, severity, is_read, created_at
     FROM ceo_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 60`,
    [req.user.id]
  );
  res.json(rows);
});

exports.markOneRead = asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE ceo_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE ceo_notifications SET is_read = TRUE WHERE user_id = $1`,
    [req.user.id]
  );
  res.json({ success: true });
});

exports.clearRead = asyncHandler(async (req, res) => {
  await pool.query(
    `DELETE FROM ceo_notifications WHERE user_id = $1 AND is_read = TRUE`,
    [req.user.id]
  );
  res.json({ success: true });
});