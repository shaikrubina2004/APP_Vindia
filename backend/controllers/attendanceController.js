const pool = require("../config/db");

/**
 * Employee marks attendance
 */
exports.markAttendance = async (req, res) => {
  const { employee_id, date, status } = req.body;

  if (!employee_id || !date || !status) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!["Present", "Absent"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [employee_id, date, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark attendance" });
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
      `SELECT * FROM attendance
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