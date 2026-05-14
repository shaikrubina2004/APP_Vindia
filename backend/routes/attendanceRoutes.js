const express = require("express");
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
  updateAttendance,
  getTotalEmployees,
  getTodayAttendance,
  getTodayAllEmployees,
} = require("../controllers/attendanceController");

const router = express.Router();

// ── Specific routes FIRST (before /:id) ──────────────────────────────────────
router.get("/employees/count",  getTotalEmployees);
router.get("/today/all",        getTodayAllEmployees);   // all employees + today's status
router.get("/today",            getTodayAttendance);     // single employee today check
router.get("/date/:date",       getAttendanceByDate);
router.get("/filter/date",      getAttendanceByDateRange);

// ── General routes ────────────────────────────────────────────────────────────
router.post("/",   markAttendance);
router.get("/",    getAllAttendance);
router.put("/:id", updateAttendance);
router.get("/:id", getAttendanceByEmployee);  // must be last

module.exports = router;