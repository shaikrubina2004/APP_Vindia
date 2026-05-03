// ══════════════════════════════════════════════════════════════════════════════
//  qsNotificationController.js
//  QS Notifications — fetch, mark read, mark all read
//  Reads from existing `notifications` table
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create qs_notifications table ───────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qs_notifications (
        id            SERIAL        PRIMARY KEY,
        user_id       INTEGER,
        type          VARCHAR(50)   NOT NULL DEFAULT 'Task',
        project_name  VARCHAR(255)  DEFAULT '',
        milestone     VARCHAR(255)  DEFAULT '',
        title         VARCHAR(255)  NOT NULL,
        message       TEXT          DEFAULT '',
        status        VARCHAR(50)   DEFAULT 'pending',
        is_read       BOOLEAN       DEFAULT FALSE,
        created_at    TIMESTAMP     DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_qsn_user_id   ON qs_notifications (user_id);
      CREATE INDEX IF NOT EXISTS idx_qsn_is_read   ON qs_notifications (is_read);
      CREATE INDEX IF NOT EXISTS idx_qsn_type      ON qs_notifications (type);
      CREATE INDEX IF NOT EXISTS idx_qsn_created   ON qs_notifications (created_at DESC);
    `);
    console.log("✅ qs_notifications table ready");
  } catch (err) {
    console.error("❌ qs_notifications table setup failed:", err.message);
  }
})();

// ── Format helper ─────────────────────────────────────────────────────────────
function formatNotification(n) {
  return {
    id:           n.id,
    type:         n.type         || "Task",
    project_name: n.project_name || "",
    milestone:    n.milestone    || "",
    title:        n.title        || "",
    message:      n.message      || "",
    status:       n.status       || "pending",
    is_read:      n.is_read      || false,
    created_at:   n.created_at,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL  —  GET /api/qs/notifications
//  Returns all notifications for the QS role
//  Optional: ?type=Cost&unread=true
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllNotifications = async (req, res) => {
  try {
    const { type, unread } = req.query;
    const conditions = [];
    const values     = [];

    if (type && type !== "All") {
      values.push(type);
      conditions.push(`type = $${values.length}`);
    }
    if (unread === "true") {
      conditions.push(`is_read = FALSE`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT * FROM qs_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT 50`,
      values
    );

    // Also return unread count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM qs_notifications WHERE is_read = FALSE`
    );

    res.json({
      success:     true,
      data:        result.rows.map(formatNotification),
      unreadCount: parseInt(countResult.rows[0].count) || 0,
    });
  } catch (err) {
    console.error("getAllNotifications:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch notifications: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE  —  GET /api/qs/notifications/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getNotificationById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM qs_notifications WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true, data: formatNotification(result.rows[0]) });
  } catch (err) {
    console.error("getNotificationById:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/qs/notifications
//  Called internally when cost report approved/rejected or qty report approved/rejected
//  Body: { type, project_name, milestone, title, message, status, user_id }
// ══════════════════════════════════════════════════════════════════════════════
exports.createNotification = async (req, res) => {
  try {
    const {
      user_id,
      type         = "Task",
      project_name = "",
      milestone    = "",
      title,
      message      = "",
      status       = "pending",
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    const result = await pool.query(
      `INSERT INTO qs_notifications
         (user_id, type, project_name, milestone, title, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id || null, type, project_name, milestone, title, message, status]
    );

    res.status(201).json({
      success: true,
      data:    formatNotification(result.rows[0]),
    });
  } catch (err) {
    console.error("createNotification:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  MARK ONE READ  —  PUT /api/qs/notifications/:id/read
//  ⚠️  Must be registered BEFORE /:id in routes
// ══════════════════════════════════════════════════════════════════════════════
exports.markOneRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE qs_notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING id, is_read`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("markOneRead:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  MARK ALL READ  —  PUT /api/qs/notifications/mark-all-read
//  ⚠️  Must be registered BEFORE /:id in routes
// ══════════════════════════════════════════════════════════════════════════════
exports.markAllRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE qs_notifications SET is_read = TRUE WHERE is_read = FALSE`
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("markAllRead:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/qs/notifications/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteNotification = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM qs_notifications WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("deleteNotification:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  HELPER — createNotificationDirect (called from other controllers)
//  e.g. costReportController calls this after PM approves/rejects
// ══════════════════════════════════════════════════════════════════════════════
exports.createNotificationDirect = async ({ type, project_name, milestone, title, message, status, user_id }) => {
  try {
    await pool.query(
      `INSERT INTO qs_notifications
         (user_id, type, project_name, milestone, title, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user_id || null, type, project_name || "", milestone || "", title, message || "", status || "pending"]
    );
  } catch (err) {
    console.error("createNotificationDirect error:", err.message);
  }
};