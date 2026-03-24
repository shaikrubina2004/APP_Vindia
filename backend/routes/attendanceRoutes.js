const express = require("express");
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAllAttendance,
  getAttendanceByDateRange,
} = require("../controllers/attendanceController");

const router = express.Router();

/* Employee */
router.post("/", markAttendance);

/* HR / Admin (specific routes first) */
router.get("/date/:date", getAttendanceByDate);
router.get("/filter/date", getAttendanceByDateRange);
router.get("/", getAllAttendance);

/* Employee (keep param routes LAST) */
router.get("/:id", getAttendanceByEmployee);

module.exports = router;