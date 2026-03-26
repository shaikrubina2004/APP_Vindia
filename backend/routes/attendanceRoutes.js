const express = require("express");
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
  updateAttendance,
  getTotalEmployees, // ✅ ADD THIS
} = require("../controllers/attendanceController");

const router = express.Router();

/* ================= EMPLOYEE ROUTES ================= */

// Employee marks attendance
router.post("/", markAttendance);

router.get("/employees/count", getTotalEmployees);

/* ================= HR / ADMIN ROUTES ================= */

// ✅ Get all attendance (used by frontend)
router.get("/", getAllAttendance);

// ✅ Get attendance by exact date
router.get("/date/:date", getAttendanceByDate);

// ✅ Filter attendance by date range
router.get("/filter/date", getAttendanceByDateRange);

// ✅ Update attendance
router.put("/:id", updateAttendance);

// ✅ Employee specific (KEEP LAST)
router.get("/:id", getAttendanceByEmployee);


module.exports = router;
