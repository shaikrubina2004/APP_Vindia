const express = require("express");
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

// ── Specific routes FIRST (before /:id) ──────────────────────────────────────
router.get("/employees/count",  getTotalEmployees);
router.get("/today/all",        getTodayAllEmployees);   // all employees + today's status
router.get("/today",            getTodayAttendance);     // single employee today check
router.get("/date/:date",       getAttendanceByDate);
router.get("/filter/date",      getAttendanceByDateRange);
router.get("/export/range",     exportAttendanceByDateRange); // CEO "Download" CSV

// ── Live location tracking (between check-in and check-out) ─────────────────
router.post("/:id/track", addLocationPing);   // client pings every few minutes
router.get("/:id/track",  getAttendanceTrack); // CEO views the trail

// ── General routes ────────────────────────────────────────────────────────────
router.post("/",   markAttendance);
router.get("/",    getAllAttendance);
router.put("/:id", updateAttendance);
router.get("/:id", getAttendanceByEmployee);  // must be last

module.exports = router;