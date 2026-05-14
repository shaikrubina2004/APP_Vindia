const pool = require("../config/db");

// ─── Status logic ────────────────────────────────────────────────────────────
//
// Morning check-in:
//   before 09:30           → Present
//   09:30 – 09:59          → Late
//   10:00 and after        → Absent (morning)
//
// If no check-in at all today → Absent
//
// Afternoon / check-out:
//   check-out before 12:00 → Afternoon Absent  (status = "Half Day")
//   check-in 13:30–14:00  (no morning) → Afternoon Present (status = "Half Day")
//
// Full day:
//   checked in morning + checked out at/after shift end (from employees.shift_timing) → Present
//
// Late minutes are only calculated for Late arrivals (09:30–10:00).

function deriveStatus(checkInStr, checkOutStr, shiftTimingStr) {
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  // Parse shift end from "HH:MM AM/PM - HH:MM AM/PM" or "09:00 - 18:00"
  let shiftEndMin = 18 * 60; // default 6 PM
  if (shiftTimingStr) {
    const parts = shiftTimingStr.split("-");
    const endPart = parts[parts.length - 1].trim();
    const match = endPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = (match[3] || "").toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      shiftEndMin = h * 60 + m;
    }
  }

  const PRESENT_CUTOFF  = 9 * 60 + 30;  // 09:30
  const LATE_CUTOFF     = 10 * 60;       // 10:00
  const NOON            = 12 * 60;       // 12:00
  const AFT_START       = 13 * 60 + 30; // 13:30
  const AFT_END         = 14 * 60;      // 14:00

  let lateMinutes = 0;

  if (!checkInStr) {
    return { status: "Absent", lateMinutes: 0 };
  }

  const checkInMin = toMinutes(checkInStr.slice(0, 5)); // "HH:MM"

  // ── Afternoon-only check-in (no morning, arrived 13:30–14:00) ──
  if (checkInMin >= AFT_START && checkInMin < AFT_END) {
    return { status: "Half Day", lateMinutes: 0 };
  }

  // ── Morning check-in rules ──
  if (checkInMin >= LATE_CUTOFF) {
    // After 10:00 AM → Absent
    return { status: "Absent", lateMinutes: 0 };
  }

  if (checkInMin >= PRESENT_CUTOFF) {
    // Between 09:30 and 09:59 → Late
    lateMinutes = checkInMin - (9 * 60); // minutes past 9:00
    // (or you can count from shift start 9:00)
    return { status: "Late", lateMinutes };
  }

  // ── On time morning check-in — check checkout ──
  if (!checkOutStr) {
    // Still checked in, no checkout yet — mark Present for now
    return { status: "Present", lateMinutes: 0 };
  }

  const checkOutMin = toMinutes(checkOutStr.slice(0, 5));

  if (checkOutMin < NOON) {
    // Left before noon → Afternoon Absent (Half Day)
    return { status: "Half Day", lateMinutes: 0 };
  }

  if (checkOutMin >= shiftEndMin) {
    // Completed full shift
    return { status: "Present", lateMinutes: 0 };
  }

  // Checked out after noon but before shift end — still Present
  return { status: "Present", lateMinutes: 0 };
}

// ─── Mark Attendance (Check In) ──────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
  try {
    const { employee_id, date, check_in, shift, remarks } = req.body;

    if (!employee_id || !date || !check_in) {
      return res.status(400).json({ error: "Missing required fields", received: req.body });
    }

    // Fetch shift_timing and employee status from employees table
    const empResult = await pool.query(
      "SELECT shift_timing, status FROM employees WHERE id = $1",
      [employee_id]
    );
    const shiftTiming = empResult.rows[0]?.shift_timing || null;
    const empStatus   = (empResult.rows[0]?.status || "").toLowerCase();

    // WFH employees always get WFH attendance status
    let finalStatus, lateMinutes;
    if (empStatus === "work_from_home") {
      finalStatus = "WFH";
      lateMinutes = 0;
    } else {
      const derived = deriveStatus(check_in, null, shiftTiming);
      finalStatus  = derived.status;
      lateMinutes  = derived.lateMinutes;
    }

    const query = `
      INSERT INTO attendance (employee_id, date, status, check_in, shift, late_minutes, remarks, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    const values = [
      employee_id,
      date,
      finalStatus,
      check_in,
      shift || "Morning",
      lateMinutes,
      remarks || (lateMinutes > 0 ? `Late by ${lateMinutes} min` : ""),
    ];

    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("markAttendance error:", err.message);
    return res.status(500).json({ error: "Failed to mark attendance", details: err.message });
  }
};

// ─── Update Attendance (Check Out) ───────────────────────────────────────────
exports.updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, check_out } = req.body || {};

  // Check-out only (no status override)
  if (check_out && !status) {
    try {
      // Fetch existing record + employee shift_timing
      const existing = await pool.query(
        `SELECT a.*, e.shift_timing
         FROM attendance a
         LEFT JOIN employees e ON a.employee_id = e.id
         WHERE a.id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      const row = existing.rows[0];
      const { status: newStatus, lateMinutes } = deriveStatus(
        row.check_in,
        check_out,
        row.shift_timing
      );

      const result = await pool.query(
        `UPDATE attendance
         SET check_out = $1, status = $2, late_minutes = $3
         WHERE id = $4
         RETURNING *`,
        [check_out, newStatus, lateMinutes, id]
      );
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
  if (!["Present", "Absent", "Late", "WFH", "Half Day"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `UPDATE attendance SET status = $1 WHERE id = $2 RETURNING *`,
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

// ─── Get Today's Attendance (for Check-In button) ────────────────────────────
exports.getTodayAttendance = async (req, res) => {
  const { employee_id } = req.query;
  if (!employee_id) return res.status(400).json({ error: "employee_id required" });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 LIMIT 1`,
      [employee_id, today]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "No record for today" });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch today's attendance" });
  }
};

// ─── Get All Attendance ───────────────────────────────────────────────────────
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

// ─── Get All Employees With Today's Attendance Status ────────────────────────
// Returns every employee from both employees + users tables,
// merged, with today's attendance record (or Absent if none).
exports.getTodayAllEmployees = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT
        e.id                        AS employee_id,
        e.name,
        e.designation,
        e.department,
        e.shift_timing,
        e.email,
        e.user_id,
        a.id                        AS attendance_id,
        a.status,
        a.check_in,
        a.check_out,
        a.shift,
        a.late_minutes,
        a.remarks
       FROM employees e
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = $1
       ORDER BY e.name ASC`,
      [today]
    );

    // Also pull users NOT in employees (users with no employee record)
    const usersResult = await pool.query(
      `SELECT
        u.id                        AS employee_id,
        u.name,
        NULL::text                  AS designation,
        NULL::text                  AS department,
        NULL::text                  AS shift_timing,
        u.email,
        u.id                        AS user_id,
        a.id                        AS attendance_id,
        a.status,
        a.check_in,
        a.check_out,
        a.shift,
        a.late_minutes,
        a.remarks
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN attendance a ON a.employee_id = u.id AND a.date = $1
       WHERE e.id IS NULL
       ORDER BY u.name ASC`,
      [today]
    );

    const allRows = [...result.rows, ...usersResult.rows].map((row) => {
      // If no attendance record at all → Absent
      if (!row.attendance_id) {
        return { ...row, status: "Absent", check_in: null, check_out: null, late_minutes: 0 };
      }
      return row;
    });

    res.status(200).json(allRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch today employee attendance" });
  }
};

// ─── Get Attendance by Employee ───────────────────────────────────────────────
exports.getAttendanceByEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employee attendance" });
  }
};

// ─── Get Attendance by Date ───────────────────────────────────────────────────
exports.getAttendanceByDate = async (req, res) => {
  const { date } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM attendance WHERE date = $1 ORDER BY employee_id`,
      [date]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance by date" });
  }
};

// ─── Filter by Date Range ─────────────────────────────────────────────────────
exports.getAttendanceByDateRange = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: "From and To dates are required" });

  try {
    const result = await pool.query(
      `SELECT * FROM attendance WHERE date BETWEEN $1 AND $2 ORDER BY date DESC`,
      [from, to]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to filter attendance" });
  }
};

// ─── Total Employee Count ─────────────────────────────────────────────────────
exports.getTotalEmployees = async (req, res) => {
  try {
    // Count employees + users not already in employees
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM employees) +
        (SELECT COUNT(*) FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE e.id IS NULL)
       AS total`
    );
    res.status(200).json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employee count" });
  }
};