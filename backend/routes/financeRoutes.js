// ===== FILE: APP_Vindia/backend/routes/finance.routes.js =====

const express = require("express");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────

const financeDashboardController = require("../controllers/financeDashboardController");

const financeCostReportController = require(
  "../controllers/financecostReportController"
);

const budgetController = require("../controllers/budgetController");

const expenseController = require("../controllers/expenseController");

const invoiceController = require("../controllers/invoiceController");

const paymentController = require("../controllers/paymentController");

const vendorController = require("../controllers/vendorController");

const financeSettingsController = require(
  "../controllers/financeSettingsController"
);

const {
  getReceivablesPayables,
} = require("../controllers/receivablesPayablesController");

// ─────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────
//
// Every Finance route requires a valid logged-in user.
// ─────────────────────────────────────────────────────────────

router.use(protect);

// ─────────────────────────────────────────────────────────────
// Role Access Groups
// ─────────────────────────────────────────────────────────────
//
// Accountant:
// - Daily finance operations
// - View dashboards and reports
// - Create and update operational records
//
// Finance Manager:
// - All Accountant access
// - Approvals
// - Budget control
// - Vendor activation
// - Delete operations
// - Finance settings
//
// CEO:
// - Oversight and management access
// ─────────────────────────────────────────────────────────────

const accountantAccess = requireRole(
  "accountant",
  "finance_manager",
  "ceo"
);

const managerAccess = requireRole(
  "finance_manager",
  "ceo"
);

// ============================================================
// DASHBOARD
// ============================================================

// Finance dashboard
router.get(
  "/dashboard",
  accountantAccess,
  financeDashboardController.getDashboard
);

// Finance cost report
router.get(
  "/cost-report",
  accountantAccess,
  financeCostReportController.getCostReport
);

// ============================================================
// BUDGETS
// ============================================================
//
// Accountant:
// - View budgets
//
// Finance Manager / CEO:
// - Create budgets
// - Update budgets
// - Delete budgets
//
// ============================================================

// Get all budgets
router.get(
  "/budgets",
  accountantAccess,
  budgetController.getAllBudgets
);

// Get budgets by project
router.get(
  "/budgets/project/:projectId",
  accountantAccess,
  budgetController.getBudgetsByProject
);

// Get budget by ID
router.get(
  "/budgets/:id",
  accountantAccess,
  budgetController.getBudgetById
);

// Create budget
// Restricted to Finance Manager and CEO
router.post(
  "/budgets",
  managerAccess,
  budgetController.createBudget
);

// Update budget
// Restricted to Finance Manager and CEO
router.put(
  "/budgets/:id",
  managerAccess,
  budgetController.updateBudget
);

// Delete budget
// Restricted to Finance Manager and CEO
router.delete(
  "/budgets/:id",
  managerAccess,
  budgetController.deleteBudget
);

// ============================================================
// EXPENSES
// ============================================================
//
// Accountant:
// - View expenses
// - Create expenses
// - Update expenses
//
// Finance Manager / CEO:
// - Delete expenses
//
// Note:
// The current update route still allows the controller to decide
// which fields can be changed. Status approval workflow should
// later be implemented with separate protected endpoints.
// ============================================================

// Get all expenses
router.get(
  "/expenses",
  accountantAccess,
  expenseController.getAllExpenses
);

// Get expense summary
router.get(
  "/expenses/summary",
  accountantAccess,
  expenseController.getExpenseSummary
);

// Get expense by ID
router.get(
  "/expenses/:id",
  accountantAccess,
  expenseController.getExpenseById
);

// Create expense
router.post(
  "/expenses",
  accountantAccess,
  expenseController.createExpense
);

// Update expense
router.put(
  "/expenses/:id",
  accountantAccess,
  expenseController.updateExpense
);

// Delete expense
// Restricted to Finance Manager and CEO
router.delete(
  "/expenses/:id",
  managerAccess,
  expenseController.deleteExpense
);

// ============================================================
// INVOICES
// ============================================================
//
// Accountant:
// - View invoices
// - Create invoices
// - Update invoice status through existing controller
//
// Finance Manager / CEO:
// - Delete invoices
//
// There is intentionally no generic PUT /invoices/:id route
// because the current invoice controller does not expose
// updateInvoice() according to your existing code.
// ============================================================

// Get all invoices
router.get(
  "/invoices",
  accountantAccess,
  invoiceController.getAllInvoices
);

// Create invoice
router.post(
  "/invoices",
  accountantAccess,
  invoiceController.createInvoice
);

// Update invoice status
router.put(
  "/invoices/:id/status",
  accountantAccess,
  invoiceController.updateInvoiceStatus
);

// Delete invoice
// Restricted to Finance Manager and CEO
router.delete(
  "/invoices/:id",
  managerAccess,
  invoiceController.deleteInvoice
);

// ============================================================
// PAYMENTS
// ============================================================
//
// Accountant:
// - View payments
// - Create payments
// - Update payments
//
// Finance Manager / CEO:
// - Delete payments
//
// Important:
// The current controller exposes only a generic updatePayment()
// method. Therefore, the approval/release workflow is not yet
// separated at route level.
//
// Until dedicated controller methods are created, the backend
// controller must validate which fields each role can update.
// ============================================================

// Get all payments
router.get(
  "/payments",
  accountantAccess,
  paymentController.getAllPayments
);

// Get payment summary
router.get(
  "/payments/summary",
  accountantAccess,
  paymentController.getPaymentSummary
);

// Get payment by ID
router.get(
  "/payments/:id",
  accountantAccess,
  paymentController.getPaymentById
);

// Create payment
router.post(
  "/payments",
  accountantAccess,
  paymentController.createPayment
);

// Update payment
router.put(
  "/payments/:id",
  accountantAccess,
  paymentController.updatePayment
);

// Delete payment
// Restricted to Finance Manager and CEO
router.delete(
  "/payments/:id",
  managerAccess,
  paymentController.deletePayment
);

// ============================================================
// VENDORS
// ============================================================
//
// Accountant:
// - View vendors
// - Create vendors
// - Update vendor details
//
// Finance Manager / CEO:
// - Activate/deactivate vendors
// - Delete vendors
//
// ============================================================

// Get all vendors
router.get(
  "/vendors",
  accountantAccess,
  vendorController.getAllVendors
);

// Get vendor metrics
router.get(
  "/vendors/metrics",
  accountantAccess,
  vendorController.getVendorMetrics
);

// Get vendor by ID
router.get(
  "/vendors/:id",
  accountantAccess,
  vendorController.getVendorById
);

// Create vendor
router.post(
  "/vendors",
  accountantAccess,
  vendorController.createVendor
);

// Update vendor
router.put(
  "/vendors/:id",
  accountantAccess,
  vendorController.updateVendor
);

// Activate/deactivate vendor
// Restricted to Finance Manager and CEO
router.patch(
  "/vendors/:id/toggle-status",
  managerAccess,
  vendorController.toggleVendorStatus
);

// Delete vendor
// Restricted to Finance Manager and CEO
router.delete(
  "/vendors/:id",
  managerAccess,
  vendorController.deleteVendor
);

// ============================================================
// FINANCE SETTINGS
// ============================================================
//
// Accountant:
// - No access
//
// Finance Manager / CEO:
// - View settings
// - Update settings
// - Manage bank accounts
// ============================================================

// Get finance settings
router.get(
  "/settings",
  managerAccess,
  financeSettingsController.getSettings
);

// Update general settings
router.put(
  "/settings/general",
  managerAccess,
  financeSettingsController.updateGeneral
);

// Update tax settings
router.put(
  "/settings/tax",
  managerAccess,
  financeSettingsController.updateTax
);

// Update invoice preferences
router.put(
  "/settings/invoice-prefs",
  managerAccess,
  financeSettingsController.updateInvoicePrefs
);

// Update payment gateway
router.put(
  "/settings/gateway/:gateway",
  managerAccess,
  financeSettingsController.updateGateway
);

// Add bank account
router.post(
  "/settings/bank-accounts",
  managerAccess,
  financeSettingsController.addBankAccount
);

// Delete bank account
router.delete(
  "/settings/bank-accounts/:id",
  managerAccess,
  financeSettingsController.deleteBankAccount
);

// ============================================================
// RECEIVABLES AND PAYABLES
// ============================================================

// Get receivables and payables
router.get(
  "/receivables-payables",
  accountantAccess,
  getReceivablesPayables
);

// ============================================================
// Export Router
// ============================================================

module.exports = router;