// qsNotificationController.js
const pool = require("../config/db");

/* Auto-create table on server start */
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qs_notifications (
        id           SERIAL        PRIMARY KEY,
        user_id      INTEGER       DEFAULT NULL,
        type         VARCHAR(50)   NOT NULL DEFAULT 'task',
        title        VARCHAR(255)  NOT NULL,
        message      TEXT          DEFAULT '',
        severity     VARCHAR(20)   DEFAULT 'info',
        reference_id INTEGER       DEFAULT NULL,
        is_read      BOOLEAN       DEFAULT FALSE,
        created_at   TIMESTAMP     DEFAULT NOW()
      );
    `);

    /* Add columns if table already existed without them */
    await pool.query(`
      ALTER TABLE qs_notifications
        ADD COLUMN IF NOT EXISTS severity     VARCHAR(20) DEFAULT 'info',
        ADD COLUMN IF NOT EXISTS reference_id INTEGER     DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS user_id      INTEGER     DEFAULT NULL;
    `);

    console.log("✅ qs_notifications table ready");
  } catch (err) {
    console.error("❌ Table setup failed:", err.message);
  }
})();

/* ── GET /api/qs/notifications ─────────────────────────────── */
exports.getAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;

    /* If user is authenticated, show their notifications + global ones */
    let query, params;
    if (userId) {
      query  = `SELECT * FROM qs_notifications
                WHERE user_id = $1 OR user_id IS NULL
                ORDER BY created_at DESC LIMIT 50`;
      params = [userId];
    } else {
      query  = `SELECT * FROM qs_notifications ORDER BY created_at DESC LIMIT 50`;
      params = [];
    }

    const result = await pool.query(query, params);

    const unread = await pool.query(
      userId
        ? `SELECT COUNT(*) FROM qs_notifications WHERE is_read = FALSE AND (user_id = $1 OR user_id IS NULL)`
        : `SELECT COUNT(*) FROM qs_notifications WHERE is_read = FALSE`,
      userId ? [userId] : [],
    );

    res.json({
      success:     true,
      data:        result.rows,
      unreadCount: parseInt(unread.rows[0].count) || 0,
    });
  } catch (err) {
    console.error("getAllNotifications error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── PUT /api/qs/notifications/mark-all-read ──────────────── */
exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    if (userId) {
      await pool.query(
        `UPDATE qs_notifications SET is_read = TRUE
         WHERE is_read = FALSE AND (user_id = $1 OR user_id IS NULL)`,
        [userId],
      );
    } else {
      await pool.query(`UPDATE qs_notifications SET is_read = TRUE WHERE is_read = FALSE`);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── PUT /api/qs/notifications/:id/read ───────────────────── */
exports.markOneRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE qs_notifications SET is_read = TRUE WHERE id = $1`,
      [req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── POST /api/qs/notifications ───────────────────────────── */
exports.createNotification = async (req, res) => {
  try {
    const {
      user_id      = null,
      type         = "task",
      title,
      message      = "",
      severity     = "info",
      reference_id = null,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "title is required" });

    const result = await pool.query(
      `INSERT INTO qs_notifications (user_id, type, title, message, severity, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, type.toLowerCase(), title, message, severity, reference_id],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── Helper — call from other controllers ─────────────────── */
exports.insertNotification = async (
  userId,
  type,
  title,
  description,
  _link,          // kept for API compatibility but navigation is handled frontend
  severity,
  referenceId,
) => {
  try {
    await pool.query(
      `INSERT INTO qs_notifications (user_id, type, title, message, severity, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId       ?? null,
        (type        ?? "task").toLowerCase(),
        title        ?? "",
        description  ?? "",
        severity     ?? "info",
        referenceId  ?? null,
      ],
    );
  } catch (err) {
    console.error("insertNotification error:", err.message);
  }
};