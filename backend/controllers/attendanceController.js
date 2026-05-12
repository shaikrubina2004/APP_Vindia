const pool = require("../config/db");

/**
 * Employee marks attendance
 */
exports.markAttendance = async (req, res) => {
  console.log("HEADERS:", req.headers);
  console.log("BODY:", req.body);

  try {
    const { employee_id, date, status, check_in, shift, late_minutes, remarks } = req.body;

    if (!employee_id || !date || !status) {
      return res.status(400).json({
        error: "Missing required fields",
        received: req.body,
      });
    }

    const query = `
      INSERT INTO attendance (employee_id, date, status, check_in, shift, late_minutes, remarks, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const values = [
      employee_id,
      date,
      status,
      check_in || null,
      shift || null,
      late_minutes || 0,
      remarks || "",
    ];

    const result = await pool.query(query, values);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 ACTUAL ERROR:", err.message);
    console.error(err.stack);

    return res.status(500).json({
      error: "Failed to mark attendance",
      details: err.message,
    });
  }
};

/**
 * Get today's attendance for a specific employee (for Check In/Out button)
 */
exports.getTodayAttendance = async (req, res) => {
  const { employee_id } = req.query;

  if (!employee_id) {
    return res.status(400).json({ error: "employee_id required" });
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE employee_id = $1 AND date = $2
       LIMIT 1`,
      [employee_id, today]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No record for today" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch today's attendance" });
  }
};

/**
 * Get attendance for a specific employee
 */
exports.getAttendanceByEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE employee_id = $1
       ORDER BY date DESC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};

/**
 * HR - Get attendance by exact date
 */
exports.getAttendanceByDate = async (req, res) => {
  const { date } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE date = $1
       ORDER BY employee_id`,
      [date]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance by date" });
  }
};

/**
 * HR - Get all attendance
 */
exports.getAllAttendance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        attendance.*,
        COALESCE(employees.name, users.name) AS name
       FROM attendance
       LEFT JOIN employees ON attendance.employee_id = employees.id
       LEFT JOIN users ON attendance.employee_id = users.id
       ORDER BY date DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

/**
 * HR - Filter attendance by date range
 */
exports.getAttendanceByDateRange = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ message: "From and To dates are required" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE date BETWEEN $1 AND $2
       ORDER BY date DESC`,
      [from, to]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to filter attendance" });
  }
};

/**
 * HR - Update attendance (check_out + status)
 */
exports.updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, check_out } = req.body || {};

  // If only check_out is being updated (Check Out button)
  if (check_out && !status) {
    try {
      const result = await pool.query(
        `UPDATE attendance
         SET check_out = $1
         WHERE id = $2
         RETURNING *`,
        [check_out, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to update check_out" });
    }
  }

  // HR full status update
  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  if (!["Present", "Absent", "Late", "WFH"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `UPDATE attendance
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
};

/**
 * Get total employee count
 */
exports.getTotalEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM employees`
    );

    res.status(200).json({
      total: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employee count" });
  }
};