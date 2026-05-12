const express = require("express");
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
  updateAttendance,
  getTotalEmployees,
  getTodayAttendance,   // ✅ new
} = require("../controllers/attendanceController");

const router = express.Router();

/* ================= EMPLOYEE ROUTES ================= */
// Employee marks attendance (Check In)
router.post("/", markAttendance);

// Total employee count
router.get("/employees/count", getTotalEmployees);

/* ================= HR / ADMIN ROUTES ================= */
// Get all attendance
router.get("/", getAllAttendance);

// Get attendance by exact date
router.get("/date/:date", getAttendanceByDate);

// Filter attendance by date range
router.get("/filter/date", getAttendanceByDateRange);

// Update attendance (Check Out + HR status edit)
router.put("/:id", updateAttendance);

// ✅ Get today's attendance for logged-in employee — MUST be before /:id
router.get("/today", getTodayAttendance);

// Employee specific — KEEP LAST (/:id catches everything)
router.get("/:id", getAttendanceByEmployee);

module.exports = router;