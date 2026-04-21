const pool = require("../config/db");

exports.createNCR = async (req, res) => {
  try {
    const raised_by = req.user?.id; // Extract from auth middleware
    const { title, description, severity, zone, assignedTo, immediateAction, holdPlaced } = req.body;

    if (!raised_by) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!title || !description || !severity) {
      return res.status(400).json({ error: "title, description, and severity are required" });
    }

    const result = await pool.query(
      `INSERT INTO ncr (raised_by, title, description, severity, zone, assigned_to, immediate_action, hold_placed, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', NOW())
       RETURNING *`,
      [raised_by, title, description, severity, zone, assignedTo, immediateAction, holdPlaced || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("NCR Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getNCR = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ncr.*, e.name as raised_by_name 
       FROM ncr
       LEFT JOIN employees e ON ncr.raised_by = e.id
       ORDER BY ncr.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("NCR Get Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getNCRById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ncr.*, e.name as raised_by_name 
       FROM ncr
       LEFT JOIN employees e ON ncr.raised_by = e.id
       WHERE ncr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NCR not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("NCR Get By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.updateNCR = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, assigned_to, hold_placed } = req.body;

    const result = await pool.query(
      `UPDATE ncr
       SET status = COALESCE($1, status),
           response = COALESCE($2, response),
           assigned_to = COALESCE($3, assigned_to),
           hold_placed = COALESCE($4, hold_placed),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, response, assigned_to, hold_placed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NCR not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("NCR Update Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};