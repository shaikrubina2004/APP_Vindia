const express = require("express");
const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
  exportAttendanceByDateRange,
  updateAttendance,
  getTotalEmployees,
  getTodayAttendance,
  getTodayAllEmployees,
  addLocationPing,
  getAttendanceTrack,
} = require("../controllers/attendanceController");

const router = express.Router();

// Every attendance route now requires a valid login token.
router.use(auth);

// Reports across all employees: HR Manager and CEO only.
// (Add a role name here if another role legitimately needs these reports.)
const HR_CEO = requireRole("hr_manager", "ceo");

// Routes below WITHOUT HR_CEO are used by every logged-in employee
// (check-in / check-out). The controller makes sure a normal employee can
// only touch their OWN attendance record.

// ── Specific routes FIRST (before /:id) ──────────────────────────────────────
router.get("/employees/count",  getTotalEmployees);
router.get("/today/all",        HR_CEO, getTodayAllEmployees);   // all employees + today's status
router.get("/today",            getTodayAttendance);             // single employee today check (self or HR/CEO)
router.get("/date/:date",       HR_CEO, getAttendanceByDate);
router.get("/filter/date",      HR_CEO, getAttendanceByDateRange);
router.get("/export/range",     HR_CEO, exportAttendanceByDateRange); // CSV (GPS columns only filled for CEO)

// ── Live location tracking (between check-in and check-out) ─────────────────
router.post("/:id/track", addLocationPing);          // employee pings own record every few minutes
router.get("/:id/track",  HR_CEO, getAttendanceTrack); // CEO views the trail

// ── General routes ────────────────────────────────────────────────────────────
router.post("/",   markAttendance);
router.get("/",    HR_CEO, getAllAttendance);
router.put("/:id", updateAttendance);          // check-out (own record) or HR manual status (HR/CEO)
router.get("/:id", getAttendanceByEmployee);   // must be last (self or HR/CEO)

module.exports = router;