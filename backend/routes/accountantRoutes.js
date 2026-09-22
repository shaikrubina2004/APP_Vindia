const express = require("express");

const router = express.Router();

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

const accountantDashboardController = require("../controllers/accountantDashboardController");
const financeCostReportController = require("../controllers/financecostReportController");

const budgetController = require("../controllers/budgetController");
const expenseController = require("../controllers/expenseController");
const invoiceController = require("../controllers/invoiceController");
const paymentController = require("../controllers/paymentController");
const vendorController = require("../controllers/vendorController");

// Reused as-is, read-only, no Finance-Manager-only actions exist on this
// controller — safe thin reuse per Decision 1, no duplicate business logic.
const { getReceivablesPayables } = require("../controllers/receivablesPayablesController");

// New accounting-core modules
const chartOfAccountsController = require("../controllers/chartOfAccountsController");
const journalEntryController = require("../controllers/journalEntryController");
const ledgerController = require("../controllers/ledgerController");
const bankReconciliationController = require("../controllers/bankReconciliationController");
const taxRegisterController = require("../controllers/taxRegisterController");
const pettyCashController = require("../controllers/pettyCashController");

// Accountant + Finance Manager + CEO can enter these APIs
router.use(
  protect,
  requireRole("accountant", "finance_manager", "ceo")
);

/* Dashboard
   Phase 4A: dedicated Accountant dashboard (task-oriented view),
   separate from the Finance Manager dashboard (financeRoutes.js /
   financeDashboardController.js), which is untouched. */
router.get(
  "/dashboard",
  accountantDashboardController.getDashboard
);

/* Cost Reporting */
router.get(
  "/cost-report",
  financeCostReportController.getCostReport
);

/* Budgets
   Accountant: view only (per financePermissions.js and financeRoutes.js's
   own comment: "Restricted to Finance Manager and CEO"). create/update
   are intentionally NOT mounted here — this closes a real gap: they were
   previously reachable by any accountant with no restriction. */
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

/* Expenses
   create/update stay mounted — createExpense/updateExpense now enforce
   in the controller itself (shared with Finance Manager) that an
   accountant cannot set status to anything but 'pending'. */
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

/* Invoices
   Accountant: view, create. Status transition removed from this router —
   the matrix gives Accountant only view/create/edit, not a status change,
   and there is no separate "edit fields" vs "change status" split in the
   existing controller to safely allow. (financeRoutes.js still exposes
   this endpoint to accountantAccess independently — pre-existing,
   untouched, out of scope per "do not modify Finance Manager files";
   flagged as a residual gap in the manifest.) */
router.get(
  "/invoices",
  invoiceController.getAllInvoices
);

router.post(
  "/invoices",
  invoiceController.createInvoice
);

/* Payments
   updatePayment stays mounted — the controller now strips/blocks the
   status field for accountant-role callers (view/prepare only; release
   is Finance-Manager-only). */
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

/* Vendors
   Accountant: view, create, edit details. toggle-status (activate/
   deactivate) removed from this router — that's the vendor
   equivalent of an approve/reject action, Finance-Manager-only per
   both the matrix and financeRoutes.js's existing managerAccess gate. */
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

/* Receivables & Payables
   Thin reuse of the existing Finance Manager controller/model — read-only
   report, no Finance-Manager-only mutation exists on it, so no wrapper
   or duplicate logic is needed (Decision 1). */
router.get(
  "/receivables-payables",
  getReceivablesPayables
);

/* ============================================================
   CHART OF ACCOUNTS
   Accountant: view. Finance Manager: view, create, edit.
   Enforced inside the controller (req.user.role), not just here.
   ============================================================ */
router.get("/chart-of-accounts", chartOfAccountsController.getAll);
router.get("/chart-of-accounts/:id", chartOfAccountsController.getById);
router.post("/chart-of-accounts", chartOfAccountsController.create);
router.put("/chart-of-accounts/:id", chartOfAccountsController.update);

/* ============================================================
   JOURNAL ENTRIES
   Decision 3 workflow: draft -> submitted -> approved -> posted -> reversed
   Accountant: create, edit draft, submit.
   Finance Manager: approve, post, reverse (enforced in controller).
   No DELETE route exists anywhere for journal entries, by design —
   a posted entry must never be deletable, and this removes the
   possibility entirely rather than relying on a status check alone.
   ============================================================ */
router.get("/journal-entries", journalEntryController.getAll);
router.get("/journal-entries/:id", journalEntryController.getById);
router.post("/journal-entries", journalEntryController.create);
router.put("/journal-entries/:id", journalEntryController.update);
router.put("/journal-entries/:id/submit", journalEntryController.submit);
router.put("/journal-entries/:id/approve", journalEntryController.approve);
router.put("/journal-entries/:id/post", journalEntryController.post);
router.post("/journal-entries/:id/reverse", journalEntryController.reverse);

/* ============================================================
   GENERAL LEDGER
   Decision 2: derived read-only query, no physical table.
   ============================================================ */
router.get("/ledger", ledgerController.getLedger);
router.get("/ledger/trial-balance", ledgerController.getTrialBalance);

/* ============================================================
   BANK RECONCILIATION
   Accountant: view, create, edit (in_progress only).
   Finance Manager: approve (-> reconciled), enforced in controller.
   ============================================================ */
router.get("/bank-reconciliation", bankReconciliationController.getAll);
router.get("/bank-reconciliation/:id", bankReconciliationController.getById);
router.post("/bank-reconciliation", bankReconciliationController.create);
router.put("/bank-reconciliation/:id", bankReconciliationController.update);
router.put("/bank-reconciliation/:id/approve", bankReconciliationController.approve);

/* ============================================================
   TAX REGISTER
   ============================================================ */
router.get("/tax-register", taxRegisterController.getAll);
router.get("/tax-register/summary", taxRegisterController.getSummary);
router.get("/tax-register/:id", taxRegisterController.getById);
router.post("/tax-register", taxRegisterController.create);
router.put("/tax-register/:id", taxRegisterController.update);
router.put("/tax-register/:id/mark-filed", taxRegisterController.markFiled);

/* ============================================================
   PETTY CASH
   Accountant: view, create, edit (pending only).
   Finance Manager: approve/reject, enforced in controller.
   ============================================================ */
router.get("/petty-cash", pettyCashController.getAll);
router.get("/petty-cash/balance", pettyCashController.getBalance);
router.get("/petty-cash/:id", pettyCashController.getById);
router.post("/petty-cash", pettyCashController.create);
router.put("/petty-cash/:id", pettyCashController.update);
router.put("/petty-cash/:id/approve", pettyCashController.approve);
router.put("/petty-cash/:id/reject", pettyCashController.reject);

module.exports = router;