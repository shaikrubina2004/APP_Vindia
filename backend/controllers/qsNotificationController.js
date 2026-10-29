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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS qs_notification_reads (
        notification_id INTEGER NOT NULL REFERENCES qs_notifications(id) ON DELETE CASCADE,
        user_id         INTEGER NOT NULL,
        read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (notification_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_qs_notification_reads_user
        ON qs_notification_reads (user_id, notification_id);
    `);

    console.log("✅ qs_notifications table ready");
  } catch (err) {
    console.error("❌ Table setup failed:", err.message);
  }
})();

/* ── GET /api/qs/notifications ─────────────────────────────── */
exports.getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT n.*,
              CASE
                WHEN n.user_id IS NULL THEN EXISTS (
                  SELECT 1 FROM qs_notification_reads r
                   WHERE r.notification_id = n.id AND r.user_id = $1
                )
                ELSE COALESCE(n.is_read, FALSE)
              END AS is_read
         FROM qs_notifications n
        WHERE n.user_id = $1 OR n.user_id IS NULL
        ORDER BY n.created_at DESC
        LIMIT 50`,
      [userId]
    );

    const unread = await pool.query(
      `SELECT COUNT(*)
         FROM qs_notifications n
        WHERE (
          n.user_id = $1 AND COALESCE(n.is_read, FALSE) = FALSE
        ) OR (
          n.user_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM qs_notification_reads r
             WHERE r.notification_id = n.id AND r.user_id = $1
          )
        )`,
      [userId]
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
  let client;
  try {
    const userId = req.user.id;
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `UPDATE qs_notifications SET is_read = TRUE
        WHERE is_read IS DISTINCT FROM TRUE AND user_id = $1`,
      [userId]
    );
    await client.query(
      `INSERT INTO qs_notification_reads (notification_id, user_id)
       SELECT id, $1 FROM qs_notifications WHERE user_id IS NULL
       ON CONFLICT (notification_id, user_id) DO NOTHING`,
      [userId]
    );
    await client.query("COMMIT");
    client.release();
    client = null;
    res.json({ success: true });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("markAllRead rollback failed:", rollbackError.message);
      }
      client.release();
    }
    console.error("markAllRead (QS):", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── PUT /api/qs/notifications/:id/read ───────────────────── */
exports.markOneRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const owned = await pool.query(
      `UPDATE qs_notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, userId],
    );
    if (!owned.rows.length) {
      const globalRead = await pool.query(
        `INSERT INTO qs_notification_reads (notification_id, user_id)
         SELECT id, $2 FROM qs_notifications
          WHERE id = $1 AND user_id IS NULL
         ON CONFLICT (notification_id, user_id) DO NOTHING
         RETURNING notification_id`,
        [req.params.id, userId]
      );
      const exists = globalRead.rows.length
        ? true
        : (await pool.query(
            `SELECT 1 FROM qs_notification_reads
              WHERE notification_id = $1 AND user_id = $2`,
            [req.params.id, userId]
          )).rows.length > 0;
      if (!exists) return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("markOneRead (QS):", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── POST /api/qs/notifications ───────────────────────────── */
exports.createNotification = async (req, res) => {
  try {
    const {
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
      [req.user.id, type.toLowerCase(), title, message, severity, reference_id],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ── Helper — direct object-style call from other controllers ─ */
exports.createNotificationDirect = async ({
  type         = "task",
  title        = "",
  message      = "",
  severity     = "info",
  reference_id = null,
  user_id      = null,
} = {}) => {
  try {
    await pool.query(
      `INSERT INTO qs_notifications (user_id, type, title, message, severity, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user_id      ?? null,
        (type        ?? "task").toLowerCase(),
        title        ?? "",
        message      ?? "",
        severity     ?? "info",
        reference_id ?? null,
      ],
    );
  } catch (err) {
    console.error("createNotificationDirect error:", err.message);
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