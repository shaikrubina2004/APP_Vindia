const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getAllPayrollEmployees,
  getPayrollEmployee,
  getPayrollAttendance,
  updatePayslipDetails,
} = require("../controllers/payrollController");

const { generatePayslipPdf } = require("../controllers/payslipPdfController");

// GET /api/payroll/employees         - list all employees for dropdown
router.get("/employees", authMiddleware, getAllPayrollEmployees);

// GET /api/payroll/employee/:id      - employee info + salary breakdown
router.get("/employee/:id", authMiddleware, getPayrollEmployee);

// PATCH /api/payroll/employee/:id/payslip-details - save Band/Level/PF No.
router.patch("/employee/:id/payslip-details", authMiddleware, updatePayslipDetails);

// GET /api/payroll/attendance/:id?month=YYYY-MM
router.get("/attendance/:id", authMiddleware, getPayrollAttendance);

// POST /api/payroll/employee/:id/payslip-pdf - generate watermarked payslip PDF
router.post("/employee/:id/payslip-pdf", authMiddleware, generatePayslipPdf);

module.exports = router;