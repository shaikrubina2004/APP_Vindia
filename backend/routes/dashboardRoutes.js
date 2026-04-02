const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {
    // ✅ Total Employees
    const totalEmployeesRes = await pool.query(
      "SELECT COUNT(*) FROM employees"
    );
    const totalEmployees = parseInt(totalEmployeesRes.rows[0].count);

    // ✅ On Leave (real-time)
    let onLeave = 0;

    try {
      const leaveRes = await pool.query(`
        SELECT COUNT(DISTINCT employee_id) 
        FROM leave_requests
        WHERE status = 'Approved'
        AND CURRENT_DATE BETWEEN from_date AND to_date
      `);
      onLeave = parseInt(leaveRes.rows[0].count);
    } catch (err) {
      console.log("⚠️ leave_requests table missing");
    }

    // ✅ Active Employees (REAL LOGIC)
    const active = totalEmployees - onLeave;

    // ✅ Attendance Distribution (latest date)
    const attendanceRes = await pool.query(`
      SELECT status, COUNT(*) 
      FROM attendance 
      WHERE date = (SELECT MAX(date) FROM attendance)
      GROUP BY status
    `);

    let present = 0,
      absent = 0,
      late = 0,
      wfh = 0;

    attendanceRes.rows.forEach((row) => {
      const status = row.status.toLowerCase();

      if (status === "present") present = parseInt(row.count);
      if (status === "absent") absent = parseInt(row.count);
      if (status === "late") late = parseInt(row.count);
      if (status === "wfh") wfh = parseInt(row.count);
    });

    // ✅ Birthdays
    const birthdays = await pool.query(`
      SELECT name, dob 
      FROM employees
      WHERE EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM dob) >= EXTRACT(DAY FROM CURRENT_DATE)
      ORDER BY dob ASC
      LIMIT 5
    `);

    // ✅ Pending Requests (safe)
    let pending = { rows: [] };

    try {
      pending = await pool.query(`
        SELECT type, COUNT(*) 
        FROM leave_requests
        WHERE status = 'Pending'
        GROUP BY type
      `);
    } catch (err) {
      console.log("⚠️ pending skipped");
    }

    res.json({
      totalEmployees,
      active,        // ⭐ NEW
      onLeave,       // ⭐ REAL VALUE
      attendance: { present, absent, late, wfh },
      birthdays: birthdays.rows,
      pending: pending.rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching dashboard data");
  }
});

module.exports = router;