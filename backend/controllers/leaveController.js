const pool = require("../config/db");

/**
 * Employee applies for leave
 */
exports.applyLeave = async (req, res) => {
  const { employee_id, from_date, to_date, reason } = req.body;

  if (!employee_id || !from_date || !to_date || !reason) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  if (new Date(from_date) > new Date(to_date)) {
    return res
      .status(400)
      .json({ message: "from_date cannot be after to_date" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO leaves (employee_id, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING *`,
      [employee_id, from_date, to_date, reason]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to apply leave" });
  }
};

/**
 * Employee views own leaves
 */
exports.getLeavesByEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM leaves
       WHERE employee_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch employee leaves" });
  }
};

/**
 * HR views leave requests (ONLY PENDING)
 * + Optional dynamic filter support
 */
exports.getAllLeaves = async (req, res) => {
  const { status } = req.query; // optional

  try {
    let query = `
      SELECT 
        leaves.id,
        leaves.employee_id, 
        leaves.from_date,
        leaves.to_date,
        leaves.reason,
        leaves.status,
        employees.name
      FROM leaves
      JOIN employees 
      ON leaves.employee_id = employees.id
    `;

    let values = [];

    // ✅ Default: show only Pending
    if (status) {
      query += ` WHERE leaves.status = $1`;
      values.push(status);
    } else {
      query += ` WHERE leaves.status = 'Pending'`;
    }

    query += ` ORDER BY leaves.created_at DESC`;

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

/**
 * Leave summary
 */
exports.getLeaveSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Approved') AS total,
        COUNT(*) FILTER (WHERE reason = 'Sick Leave' AND status='Approved') AS sick,
        COUNT(*) FILTER (WHERE reason = 'Casual Leave' AND status='Approved') AS casual
      FROM leaves
      WHERE employee_id = $1
    `,
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Summary failed" });
  }
};

/**
 * HR approves / rejects leave
 */
exports.updateLeaveStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `UPDATE leaves
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Leave not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update leave status" });
  }
};