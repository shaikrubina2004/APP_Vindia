const pool = require("../config/db");
const createSENotification = require(
  "../utils/createSENotification"
);

exports.createRFI = async (req, res) => {
  try {
    const raised_by = req.user?.id; // Extract from auth middleware
    const { title, description, zone, discipline, priority, assignedTo } = req.body;

    if (!raised_by) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!title || !description) {
      return res.status(400).json({ error: "title and description are required" });
    }

    const result = await pool.query(
      `INSERT INTO rfi (raised_by, title, description, zone, discipline, priority, assigned_to, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW())
       RETURNING *`,
      [raised_by, title, description, zone, discipline, priority, assignedTo]
    );

    res.status(201).json(result.rows[0]);

    // Create SE notification
    await createSENotification({
      message: `New RFI created: ${title}`,
      type: "rfi",
      severity: "info",
      description: description,
      link: "/structural-engineer/rfi",
    });
  } catch (err) {
    console.error("RFI Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getRFI = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rfi.*, e.name as raised_by_name 
       FROM rfi
       LEFT JOIN employees e ON rfi.raised_by = e.id
       ORDER BY rfi.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("RFI Get Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getRFIById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT rfi.*, e.name as raised_by_name 
       FROM rfi
       LEFT JOIN employees e ON rfi.raised_by = e.id
       WHERE rfi.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "RFI not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("RFI Get By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.updateRFI = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, assigned_to } = req.body;

    const result = await pool.query(
      `UPDATE rfi
       SET status = COALESCE($1, status),
           response = COALESCE($2, response),
           assigned_to = COALESCE($3, assigned_to),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, response, assigned_to, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "RFI not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("RFI Update Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};