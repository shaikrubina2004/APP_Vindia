const pool = require("../config/db");

// Auto-create table on server start
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qs_notifications (
        id           SERIAL       PRIMARY KEY,
        type         VARCHAR(50)  NOT NULL DEFAULT 'Task',
        project_name VARCHAR(255) DEFAULT '',
        milestone    VARCHAR(255) DEFAULT '',
        title        VARCHAR(255) NOT NULL,
        message      TEXT         DEFAULT '',
        status       VARCHAR(50)  DEFAULT 'pending',
        is_read      BOOLEAN      DEFAULT FALSE,
        created_at   TIMESTAMP    DEFAULT NOW()
      );
    `);
    console.log("✅ qs_notifications table ready");
  } catch (err) {
    console.error("❌ Table setup failed:", err.message);
  }
})();

// GET /api/qs/notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM qs_notifications ORDER BY created_at DESC LIMIT 50`
    );
    const unread = await pool.query(
      `SELECT COUNT(*) FROM qs_notifications WHERE is_read = FALSE`
    );
    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unread.rows[0].count) || 0,
    });
  } catch (err) {
    console.error("getAllNotifications error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/qs/notifications/mark-all-read
exports.markAllRead = async (req, res) => {
  try {
    await pool.query(`UPDATE qs_notifications SET is_read = TRUE WHERE is_read = FALSE`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/qs/notifications/:id/read
exports.markOneRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE qs_notifications SET is_read = TRUE WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/qs/notifications  (for testing or internal use)
exports.createNotification = async (req, res) => {
  try {
    const { type = "Task", project_name = "", milestone = "", title, message = "", status = "pending" } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "title is required" });

    const result = await pool.query(
      `INSERT INTO qs_notifications (type, project_name, milestone, title, message, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type, project_name, milestone, title, message, status]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Helper — call from other controllers
exports.createNotificationDirect = async ({ type, project_name, milestone, title, message, status }) => {
  try {
    await pool.query(
      `INSERT INTO qs_notifications (type, project_name, milestone, title, message, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [type || "Task", project_name || "", milestone || "", title, message || "", status || "pending"]
    );
  } catch (err) {
    console.error("createNotificationDirect error:", err.message);
  }
};