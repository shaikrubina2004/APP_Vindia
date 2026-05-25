const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getAllPayrollEmployees,
  getPayrollEmployee,
  getPayrollAttendance,
} = require("../controllers/payrollController");

// GET /api/payroll/employees         - list all employees for dropdown
router.get("/employees", authMiddleware, getAllPayrollEmployees);

// GET /api/payroll/employee/:id      - employee info + salary breakdown
router.get("/employee/:id", authMiddleware, getPayrollEmployee);

// GET /api/payroll/attendance/:id?month=YYYY-MM
router.get("/attendance/:id", authMiddleware, getPayrollAttendance);

module.exports = router;