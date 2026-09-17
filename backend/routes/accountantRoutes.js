const express = require("express");

const router = express.Router();

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

const financeDashboardController = require("../controllers/financeDashboardController");
const financeCostReportController = require("../controllers/financecostReportController");

const budgetController = require("../controllers/budgetController");
const expenseController = require("../controllers/expenseController");
const invoiceController = require("../controllers/invoiceController");
const paymentController = require("../controllers/paymentController");
const vendorController = require("../controllers/vendorController");

// Accountant + Finance Manager + CEO can enter these APIs
router.use(
  protect,
  requireRole("accountant", "finance_manager", "ceo")
);

/* Dashboard */
router.get(
  "/dashboard",
  financeDashboardController.getDashboard
);

/* Cost Reporting */
router.get(
  "/cost-report",
  financeCostReportController.getCostReport
);

/* Budgets */
router.get(
  "/budgets",
  budgetController.getAllBudgets
);

router.get(
  "/budgets/project/:projectId",
  budgetController.getBudgetsByProject
);

router.get(
  "/budgets/:id",
  budgetController.getBudgetById
);

router.post(
  "/budgets",
  budgetController.createBudget
);

router.put(
  "/budgets/:id",
  budgetController.updateBudget
);

/* Expenses */
router.get(
  "/expenses",
  expenseController.getAllExpenses
);

router.get(
  "/expenses/summary",
  expenseController.getExpenseSummary
);

router.get(
  "/expenses/:id",
  expenseController.getExpenseById
);

router.post(
  "/expenses",
  expenseController.createExpense
);

router.put(
  "/expenses/:id",
  expenseController.updateExpense
);

/* Invoices */
router.get(
  "/invoices",
  invoiceController.getAllInvoices
);

router.post(
  "/invoices",
  invoiceController.createInvoice
);

router.put(
  "/invoices/:id/status",
  invoiceController.updateInvoiceStatus
);

/* Payments */
router.get(
  "/payments",
  paymentController.getAllPayments
);

router.get(
  "/payments/summary",
  paymentController.getPaymentSummary
);

router.get(
  "/payments/:id",
  paymentController.getPaymentById
);

router.post(
  "/payments",
  paymentController.createPayment
);

router.put(
  "/payments/:id",
  paymentController.updatePayment
);

/* Vendors */
router.get(
  "/vendors",
  vendorController.getAllVendors
);

router.get(
  "/vendors/metrics",
  vendorController.getVendorMetrics
);

router.get(
  "/vendors/:id",
  vendorController.getVendorById
);

router.post(
  "/vendors",
  vendorController.createVendor
);

router.put(
  "/vendors/:id",
  vendorController.updateVendor
);

router.patch(
  "/vendors/:id/toggle-status",
  vendorController.toggleVendorStatus
);

module.exports = router;