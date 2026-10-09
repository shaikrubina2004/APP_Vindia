const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;

const {
  getAllPayrollEmployees,
  getPayrollEmployee,
  getPayrollAttendance,
  updatePayslipDetails,
} = require("../controllers/payrollController");

const { generatePayslipPdf } = require("../controllers/payslipPdfController");

// Payroll holds salary data: every route below needs a login AND the
// HR Manager or CEO role. (Add e.g. "finance_manager" here if that role
// should also use payroll.)
router.use(authMiddleware, requireRole("hr_manager", "ceo"));

// GET /api/payroll/employees         - list all employees for dropdown
router.get("/employees", getAllPayrollEmployees);

// GET /api/payroll/employee/:id      - employee info + salary breakdown
router.get("/employee/:id", getPayrollEmployee);

// PATCH /api/payroll/employee/:id/payslip-details - save Band/Level/PF No.
router.patch("/employee/:id/payslip-details", updatePayslipDetails);

// GET /api/payroll/attendance/:id?month=YYYY-MM
router.get("/attendance/:id", getPayrollAttendance);

// POST /api/payroll/employee/:id/payslip-pdf - generate watermarked payslip PDF
router.post("/employee/:id/payslip-pdf", generatePayslipPdf);

module.exports = router;