// ===== FILE: APP_Vindia/backend/routes/financeRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");

const financeDashboardController = require("../controllers/financeDashboardController");
const financeCostReportController = require("../controllers/financecostReportController");

const budgetController = require("../controllers/budgetController");
const expenseController = require("../controllers/expenseController");
const invoiceController = require("../controllers/invoiceController");
const paymentController = require("../controllers/paymentController");
const vendorController = require("../controllers/vendorController");
const financeSettingsController = require("../controllers/financeSettingsController");

// Only finance_manager and ceo can access Finance Manager endpoints
router.use(protect, requireRole("Finance Manager", "CEO"));

/* ── Dashboard ─────────────────────────────────────────── */
router.get("/dashboard", financeDashboardController.getDashboard);

/* ── Cost Reporting ────────────────────────────────────── */
router.get("/cost-report", financeCostReportController.getCostReport);

/* ── Budgets ───────────────────────────────────────────── */
router.get("/budgets", budgetController.getAllBudgets);
router.get("/budgets/project/:projectId", budgetController.getBudgetsByProject);
router.get("/budgets/:id", budgetController.getBudgetById);
router.post("/budgets", budgetController.createBudget);
router.put("/budgets/:id", budgetController.updateBudget);
router.delete("/budgets/:id", budgetController.deleteBudget);

/* ── Expenses ──────────────────────────────────────────── */
router.get("/expenses", expenseController.getAllExpenses);
router.get("/expenses/summary", expenseController.getExpenseSummary);
router.get("/expenses/:id", expenseController.getExpenseById);
router.post("/expenses", expenseController.createExpense);
router.put("/expenses/:id", expenseController.updateExpense);
router.delete("/expenses/:id", expenseController.deleteExpense);

/* ── Invoices ──────────────────────────────────────────── */
router.get("/invoices", invoiceController.getAllInvoices);
router.post("/invoices", invoiceController.createInvoice);
router.put("/invoices/:id/status", invoiceController.updateInvoiceStatus);
router.delete("/invoices/:id", invoiceController.deleteInvoice);

/* ── Payments ──────────────────────────────────────────── */
router.get("/payments", paymentController.getAllPayments);
router.get("/payments/summary", paymentController.getPaymentSummary);
router.get("/payments/:id", paymentController.getPaymentById);
router.post("/payments", paymentController.createPayment);
router.put("/payments/:id", paymentController.updatePayment);
router.delete("/payments/:id", paymentController.deletePayment);

/* ── Vendors ───────────────────────────────────────────── */
router.get("/vendors", vendorController.getAllVendors);
router.get("/vendors/metrics", vendorController.getVendorMetrics);
router.get("/vendors/:id", vendorController.getVendorById);
router.post("/vendors"
    , vendorController.createVendor);
router.put("/vendors/:id", vendorController.updateVendor);
router.patch("/vendors/:id/toggle-status", vendorController.toggleVendorStatus);
router.delete("/vendors/:id", vendorController.deleteVendor);

/* ── Settings ──────────────────────────────────────────── */
router.get("/settings", financeSettingsController.getSettings);
router.put("/settings/general", financeSettingsController.updateGeneral);
router.put("/settings/tax", financeSettingsController.updateTax);
router.put("/settings/invoice-prefs", financeSettingsController.updateInvoicePrefs);
router.put("/settings/gateway/:gateway", financeSettingsController.updateGateway);
router.post("/settings/bank-accounts", financeSettingsController.addBankAccount);
router.delete("/settings/bank-accounts/:id", financeSettingsController.deleteBankAccount);

module.exports = router;