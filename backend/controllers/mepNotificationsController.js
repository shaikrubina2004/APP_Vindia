const pool = require("../config/db");

exports.insertMEPNotification = async (
  userId,
  type,
  title,
  description,
  severity,
  referenceId,
  projectId = null,
) => {
  if (!userId) return;
  console.log(
    `🔔 MEP NOTIFY → user:${userId} type:${type} title:${title} projectId:${projectId}`,
  );
  try {
    await pool.query(
      `INSERT INTO mep_notifications (user_id, type, title, description, severity, reference_id, project_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId,
        type,
        title,
        description || null,
        severity || "info",
        referenceId || null,
        projectId || null,
      ],
    );
  } catch (err) {
    console.error("MEP notification insert error:", err.message);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM mep_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("getNotifications:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE mep_notifications SET is_read = TRUE WHERE id = $1`,
      [id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `UPDATE mep_notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
