const express = require("express");
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
  updateAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

/* ================= EMPLOYEE ROUTES ================= */

// Employee marks attendance
router.post("/", markAttendance);

// Employee views own attendance (KEEP THIS LAST among GET /:id)
router.get("/:id", getAttendanceByEmployee);

/* ================= HR / ADMIN ROUTES ================= */

// Get attendance by exact date
router.get("/date/:date", getAttendanceByDate);

// Filter attendance by date range
router.get("/filter/date", getAttendanceByDateRange);

// Get all attendance
router.get("/", getAllAttendance);

// ✅ Update attendance status (HR edit)
router.put("/:id", updateAttendance);

module.exports = router;