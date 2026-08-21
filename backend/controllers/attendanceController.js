const pool = require("../config/db");

/* ══════════════════════════════════════════════════════════
   PUBLIC HOLIDAYS
   (keep in sync with backend/controllers/payrollController.js
   and app_vindia/src/pages/hr/Attendance.jsx)
   ══════════════════════════════════════════════════════════ */
const HOLIDAYS = new Set([
  "2024-01-26","2024-08-15","2024-10-02","2024-12-25",
  "2025-01-01","2025-01-14","2025-01-26","2025-03-17",
  "2025-04-14","2025-05-01","2025-08-15","2025-10-02","2025-12-25",
  "2026-01-01","2026-01-15","2026-01-26","2026-03-19",
  "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
  "2026-10-20","2026-12-25",
]);

// Sunday or a listed public holiday = not a working day.
function isNonWorkingDay(dateStr) {
  if (HOLIDAYS.has(dateStr)) return true;
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  return dow === 0; // Sunday
}

// ─── Status Logic ─────────────────────────────────────────────────────────────
//
// attendance.employee_id = users.id  (NOT employees.id)
//
// Rules:
//   No check-in at all                          → Absent
//   Check-in before shift_start                 → Present (on time)
//   Check-in between shift_start and shift_start+30min → Late  (late_minutes recorded)
//   Check-in after shift_start+30min            → Absent
//   Check-in 13:30–14:00 (afternoon only)       → Afternoon Present (Half Day)
//   Checked in on time/late + checkout < 12:00  → Afternoon Absent  (Half Day)
//   Checked in on time/late + checkout >= 12:00
//     but < shift_end                            → Present (partial but acceptable)
//   Checked in on time/late + checkout >= shift_end → Present (full day)
//   WFH employee                                → WFH always
//
// Shift timing is read from employees table via user_id FK.
// Falls back to 09:00–18:00 if no shift_timing set.
//
// Location:
//   check_in_lat/lng and check_out_lat/lng are captured client-side at
//   the moment of check-in / check-out, along with a short reverse-
//   geocoded address (check_in_address / check_out_address — landmark/
//   locality, district, state). CEOs are exempt from capture entirely
//   — enforced here, server-side, regardless of what the client sends.
//
//   On READ, raw lat/lng are only returned to a viewer who declares
//   themselves CEO (see viewer_designation below) — everyone else only
//   gets the short address text. This mirrors the same client-declared
//   role pattern the rest of this app already uses (see leads endpoints
//   taking `role`/`name` as query params) rather than a hardened,
//   server-verified session — if/when real auth is added, this check
//   should move there instead.

function parseShiftTimes(shiftTimingStr) {
  // Handles formats: "9AM-6PM", "9:00 AM - 6:00 PM", "09:00 - 18:00", "9:30 PM - 6:30 AM"
  const toMin = (hhmm, period) => {
    const [hStr, mStr] = hhmm.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    const p = (period || "").toUpperCase().trim();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  // Default: 09:00 – 18:00
  let shiftStartMin = 9 * 60;
  let shiftEndMin   = 18 * 60;

  if (!shiftTimingStr) return { shiftStartMin, shiftEndMin };

  // Try to extract two time tokens from the string
  // Matches things like "9AM", "9:30 PM", "09:00"
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi;
  const matches = [...shiftTimingStr.matchAll(timeRe)];

  if (matches.length >= 2) {
    shiftStartMin = toMin(
      matches[0][2] ? `${matches[0][1]}:${matches[0][2]}` : `${matches[0][1]}:00`,
      matches[0][3]
    );
    shiftEndMin = toMin(
      matches[1][2] ? `${matches[1][1]}:${matches[1][2]}` : `${matches[1][1]}:00`,
      matches[1][3]
    );
  }

  return { shiftStartMin, shiftEndMin };
}

function deriveStatus(checkInStr, checkOutStr, shiftTimingStr) {
  const toMinutes = (hhmmss) => {
    const parts = hhmmss.slice(0, 5).split(":").map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  };

  const { shiftStartMin, shiftEndMin } = parseShiftTimes(shiftTimingStr);

  // ── Thresholds ────────────────────────────────────────────────────────────
  const LATE_CUTOFF    = shiftStartMin + 30;  // e.g. 9:00 shift → 9:30
  const ABSENT_CUTOFF  = shiftStartMin + 60;  // e.g. 9:00 shift → 10:00
  const NOON           = 12 * 60;             // 12:00
  const AFT_START      = 13 * 60;             // 13:00 — afternoon window start
  const AFT_END        = 14 * 60;             // 15:00 — afternoon window end

  // ── No check-in → Absent ─────────────────────────────────────────────────
  if (!checkInStr) {
    return { status: "Absent", lateMinutes: 0, remarks: "" };
  }

  const checkInMin = toMinutes(checkInStr);

  // ── Afternoon-only check-in (13:00–15:00) → Half Day / Afternoon Present ─
  if (checkInMin >= AFT_START && checkInMin < AFT_END) {
    return {
      status:      "Half Day",
      lateMinutes: 0,
      remarks:     "Afternoon Present",
    };
  }

  // ── Check-in after absent cutoff (10:00 for 9:00 shift) → Absent ─────────
  if (checkInMin >= ABSENT_CUTOFF) {
    return { status: "Absent", lateMinutes: 0, remarks: "" };
  }

  // ── Determine if on-time or late ─────────────────────────────────────────
  //    On time  : check-in <= shift_start           (e.g. before/at 9:00)
  //    Late     : shift_start < check-in < late_cutoff  (e.g. 9:01–9:29)
  //    Late edge: check-in == late_cutoff            (9:30 is still "late")
  let lateMinutes = 0;
  let isLate      = false;

  if (checkInMin > shiftStartMin && checkInMin <= LATE_CUTOFF) {
    // Between 9:00 and 9:30 (inclusive) → Late
    lateMinutes = checkInMin - shiftStartMin;
    isLate      = true;
  }
  // checkInMin <= shiftStartMin → on time (Present), lateMinutes stays 0

  // ── No checkout yet → employee still on site ─────────────────────────────
  if (!checkOutStr) {
    return {
      status:      isLate ? "Late" : "Present",
      lateMinutes,
      remarks:     isLate ? `Late by ${lateMinutes} min` : "",
    };
  }

  const checkOutMin = toMinutes(checkOutStr);

  // ── Checked out before noon → Afternoon Absent (Half Day) ────────────────
  if (checkOutMin < NOON) {
    return {
      status:      "Half Day",
      lateMinutes,
      remarks:     isLate ? "Late + Afternoon Absent" : "Afternoon Absent",
    };
  }

  // ── Stayed till shift end or beyond → full Present / Late ────────────────
  return {
    status:      isLate ? "Late" : "Present",
    lateMinutes,
    remarks:     isLate ? `Late by ${lateMinutes} min` : "Full Day",
  };
}

// ─── Helper: get shift_timing / status / designation for a user ──────────────
// (via users.id → employees.user_id)
async function getShiftAndStatus(userId) {
  const r = await pool.query(
    `SELECT e.shift_timing, e.status, e.designation
     FROM employees e
     WHERE e.user_id = $1
     LIMIT 1`,
    [userId]
  );
  return {
    shiftTiming: r.rows[0]?.shift_timing || null,
    empStatus:   (r.rows[0]?.status || "").toLowerCase(),
    designation: r.rows[0]?.designation || "",
  };
}

const isCeoDesignation = (designation = "") =>
  (designation || "").trim().toLowerCase() === "ceo";

// Strips raw coordinates from a row unless the requesting viewer is the
// CEO. The short address text (check_in_address / check_out_address)
// is left untouched for everyone — it's coarse by design (see
// reverseGeocodeShort on the frontend).
function sanitizeLocationForViewer(row, isViewerCEO) {
  if (isViewerCEO) return row;
  return {
    ...row,
    check_in_lat: null,
    check_in_lng: null,
    check_out_lat: null,
    check_out_lng: null,
  };
}

// ─── Mark Attendance (Check In) ──────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
  try {
    const {
      employee_id,
      date,
      check_in,
      shift,
      remarks,
      check_in_lat,
      check_in_lng,
      check_in_address,
    } = req.body;

    if (!employee_id || !date || !check_in) {
      return res
        .status(400)
        .json({ error: "Missing required fields", received: req.body });
    }

    // employee_id here is users.id — fetch shift/designation via employees.user_id
    const { shiftTiming, empStatus, designation } = await getShiftAndStatus(employee_id);

    // CEOs are exempt from location capture — enforced here regardless
    // of what the client sent.
    const skipLocation = isCeoDesignation(designation);

    let finalStatus, lateMinutes, finalRemarks;
    if (empStatus === "work_from_home") {
      finalStatus   = "WFH";
      lateMinutes   = 0;
      finalRemarks  = "WFH";
    } else {
      const derived = deriveStatus(check_in, null, shiftTiming);
      finalStatus   = derived.status;
      lateMinutes   = derived.lateMinutes;
      finalRemarks  = derived.remarks || (lateMinutes > 0 ? `Late by ${lateMinutes} min` : "");
    }

    const result = await pool.query(
      `INSERT INTO attendance
         (employee_id, date, status, check_in, shift, late_minutes, remarks,
          check_in_lat, check_in_lng, check_in_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [
        employee_id,
        date,
        finalStatus,
        check_in,
        shift || "Morning",
        lateMinutes,
        remarks || finalRemarks,
        skipLocation ? null : check_in_lat ?? null,
        skipLocation ? null : check_in_lng ?? null,
        skipLocation ? null : check_in_address ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("markAttendance error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to mark attendance", details: err.message });
  }
};

// ─── Update Attendance (Check Out) ───────────────────────────────────────────
exports.updateAttendance = async (req, res) => {
  const { id } = req.params;
  const {
    status,
    check_out,
    check_out_lat,
    check_out_lng,
    check_out_address,
  } = req.body || {};

  // Check-out only path (no manual status override)
  if (check_out && !status) {
    try {
      // Fetch existing record; join employees via user_id to get
      // shift_timing and designation (for the CEO location exemption).
      const existing = await pool.query(
        `SELECT a.*,
                e.shift_timing,
                e.designation
         FROM attendance a
         LEFT JOIN employees e ON e.user_id = a.employee_id
         WHERE a.id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      const row = existing.rows[0];
      const derived = deriveStatus(row.check_in, check_out, row.shift_timing);
      const skipLocation = isCeoDesignation(row.designation);

      const result = await pool.query(
        `UPDATE attendance
         SET check_out          = $1,
             status             = $2,
             late_minutes       = $3,
             remarks            = $4,
             check_out_lat      = $5,
             check_out_lng      = $6,
             check_out_address  = $7
         WHERE id = $8
         RETURNING *`,
        [
          check_out,
          derived.status,
          derived.lateMinutes,
          derived.remarks || "",
          skipLocation ? null : check_out_lat ?? null,
          skipLocation ? null : check_out_lng ?? null,
          skipLocation ? null : check_out_address ?? null,
          id,
        ]
      );
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to update check_out" });
    }
  }

  // HR manual status update
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
// employee_id param = users.id
exports.getTodayAttendance = async (req, res) => {
  const { employee_id } = req.query;
  if (!employee_id)
    return res.status(400).json({ error: "employee_id required" });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 LIMIT 1`,
      [employee_id, today]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "No record for today" });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to fetch today's attendance" });
  }
};

// ─── Get All Attendance (historical list) ────────────────────────────────────
// Accepts ?viewer_designation=ceo — only that viewer gets raw lat/lng.
exports.getAllAttendance = async (req, res) => {
  try {
    const isViewerCEO = isCeoDesignation(req.query.viewer_designation);

    const result = await pool.query(
      `SELECT
         attendance.*,
         COALESCE(e.name, u.name) AS name
       FROM attendance
       LEFT JOIN users     u ON u.id          = attendance.employee_id
       LEFT JOIN employees e ON e.user_id     = attendance.employee_id
       ORDER BY date DESC`
    );

    const rows = result.rows.map((row) =>
      sanitizeLocationForViewer(row, isViewerCEO)
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// ─── Get All Employees With Today's Attendance Status ────────────────────────
// Shows every employee in the employees table.
// attendance is matched via COALESCE(e.user_id, e.id) = users.id based key.
// Employees with no user account (user_id IS NULL) show as Absent since
// they cannot log in and punch attendance.
// Accepts ?viewer_designation=ceo — only that viewer gets raw lat/lng.
exports.getTodayAllEmployees = async (req, res) => {
  try {
    const isViewerCEO = isCeoDesignation(req.query.viewer_designation);
    const today = new Date().toISOString().slice(0, 10);

    // Employees who have a linked user account — match attendance via user_id
    const result = await pool.query(
      `SELECT
         e.user_id                   AS employee_id,
         e.name,
         e.designation,
         e.department,
         e.shift_timing,
         e.email,
         e.user_id,
         e.status                    AS emp_status,
         a.id                        AS attendance_id,
         a.status,
         a.check_in,
         a.check_out,
         a.shift,
         a.late_minutes,
         a.remarks,
         a.check_in_lat,
         a.check_in_lng,
         a.check_in_address,
         a.check_out_lat,
         a.check_out_lng,
         a.check_out_address
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN attendance a
         ON a.employee_id = e.user_id AND a.date = $1
       ORDER BY e.name ASC`,
      [today]
    );

    const todayIsNonWorking = isNonWorkingDay(today);

    const allRows = result.rows.map((row) => {
      if (!row.attendance_id) {
        const isWfh = (row.emp_status || "").toLowerCase() === "work_from_home";

        // Sundays / public holidays are not working days — don't
        // mark employees "Absent" just because there's no attendance record.
        if (todayIsNonWorking && !isWfh) {
          return {
            ...row,
            status:       "Holiday",
            check_in:     null,
            check_out:    null,
            late_minutes: 0,
            remarks:      HOLIDAYS.has(today) ? "Holiday" : "Week Off",
          };
        }

        return {
          ...row,
          status:       isWfh ? "WFH" : "Absent",
          check_in:     null,
          check_out:    null,
          late_minutes: 0,
          remarks:      isWfh ? "WFH" : "",
        };
      }
      return row;
    });

    const sanitized = allRows.map((row) =>
      sanitizeLocationForViewer(row, isViewerCEO)
    );

    res.status(200).json(sanitized);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch today employee attendance" });
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
  if (!from || !to)
    return res
      .status(400)
      .json({ message: "From and To dates are required" });

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

// ─── Export Attendance by Date Range as CSV (for CEO "Download") ────────────
// This endpoint is reached only via the CEO-only Download button on the
// Attendance page, so raw coordinates are included unconditionally.
exports.exportAttendanceByDateRange = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res
      .status(400)
      .json({ message: "From and To dates are required" });
  }

  try {
    const result = await pool.query(
      `SELECT
         a.date,
         COALESCE(e.name, u.name)   AS name,
         e.designation,
         e.department,
         a.status,
         a.check_in,
         a.check_out,
         a.shift,
         a.late_minutes,
         a.remarks,
         a.check_in_lat,
         a.check_in_lng,
         a.check_in_address,
         a.check_out_lat,
         a.check_out_lng,
         a.check_out_address
       FROM attendance a
       LEFT JOIN users     u ON u.id      = a.employee_id
       LEFT JOIN employees e ON e.user_id = a.employee_id
       WHERE a.date BETWEEN $1 AND $2
       ORDER BY a.date ASC, name ASC`,
      [from, to]
    );

    const headers = [
      "Date", "Name", "Designation", "Department", "Status",
      "Check In", "Check Out", "Shift", "Late Minutes", "Remarks",
      "Check In Lat", "Check In Lng", "Check In Address",
      "Check Out Lat", "Check Out Lng", "Check Out Address",
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = result.rows.map((r) =>
      [
        r.date, r.name, r.designation, r.department, r.status,
        r.check_in, r.check_out, r.shift, r.late_minutes, r.remarks,
        r.check_in_lat, r.check_in_lng, r.check_in_address,
        r.check_out_lat, r.check_out_lng, r.check_out_address,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${from}_to_${to}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export attendance" });
  }
};

// ─── Total Employee Count ─────────────────────────────────────────────────────
// Only counts employees who have a user account (can actually log in)
exports.getTotalEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS total
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id`
    );
    res.status(200).json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employee count" });
  }
};