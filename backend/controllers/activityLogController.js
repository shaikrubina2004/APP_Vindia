const pool = require("../config/db");

/**
 * Create Activity Log Entry
 */
exports.createActivityLog = async (req, res) => {
  try {
    const { user_id, project_id, action, description, module_type } = req.body;

    if (!user_id || !action) {
      return res.status(400).json({ error: "user_id and action are required" });
    }

    const result = await pool.query(
      `INSERT INTO activity_log (user_id, project_id, action, description, module_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user_id, project_id, action, description, module_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Activity Log Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get All Activity Logs
 */
exports.getAllActivityLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, project_id } = req.query;

    let query = `SELECT al.*, u.name as user_name
                 FROM activity_log al
                 LEFT JOIN employees u ON al.user_id = u.id`;
    const params = [];

    if (project_id) {
      query += ` WHERE al.project_id = $1`;
      params.push(project_id);
      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get Activity Logs Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Activity Logs by Project
 */
exports.getActivityLogsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT al.*, u.name as user_name
       FROM activity_log al
       LEFT JOIN employees u ON al.user_id = u.id
       WHERE al.project_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [projectId, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get Activity Logs by Project Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Activity Logs by User
 */
exports.getActivityLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT * FROM activity_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get Activity Logs by User Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete Activity Log Entry
 */
exports.deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM activity_log WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity log entry not found" });
    }

    res.json({ message: "Activity log entry deleted successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Delete Activity Log Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
