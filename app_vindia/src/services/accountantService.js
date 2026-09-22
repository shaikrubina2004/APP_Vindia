// ===== FILE: APP_Vindia/app_vindia/src/services/accountantService.js =====
//
// Accountant-specific service, separate from services/financeService.js.
// Hits /api/accountant/* (accountantRoutes.js on the backend), not
// /api/finance/*. Follows the same axios instance / call pattern already
// used by financeService.js.

import api from "./api";

const ACCOUNTANT_BASE_URL = "/accountant";

const accountantService = {
  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * @param {string|number|null} [projectId] - null/undefined/"" all mean
   *   "global view" and are simply omitted from the request, matching
   *   the backend's contract (missing/empty projectId = global).
   */
  getDashboard: (projectId) =>
    api.get(`${ACCOUNTANT_BASE_URL}/dashboard`, {
      params: projectId ? { projectId } : {},
    }),

  // ============================================================
  // INVOICES (thin reuse of the same backend controller Finance
  // Manager uses, via /api/accountant/* instead of /api/finance/*)
  // ============================================================
  getInvoices: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/invoices`, { params }),
  createInvoice: (data) => api.post(`${ACCOUNTANT_BASE_URL}/invoices`, data),
  // No status-transition method — removed from the Accountant router
  // entirely (see accountantRoutes.js); Accountant has view/create only.

  // ============================================================
  // PAYMENTS
  // ============================================================
  getPayments: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/payments`, { params }),
  getPaymentSummary: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/payments/summary`, { params }),
  createPayment: (data) => api.post(`${ACCOUNTANT_BASE_URL}/payments`, data),
  updatePayment: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/payments/${id}`, data),

  // ============================================================
  // EXPENSES
  // ============================================================
  getExpenses: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/expenses`, { params }),
  getExpenseSummary: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/expenses/summary`, { params }),
  createExpense: (data) => api.post(`${ACCOUNTANT_BASE_URL}/expenses`, data),
  updateExpense: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/expenses/${id}`, data),

  // ============================================================
  // VENDORS
  // ============================================================
  getVendors: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/vendors`, { params }),
  getVendorMetrics: () => api.get(`${ACCOUNTANT_BASE_URL}/vendors/metrics`),
  createVendor: (data) => api.post(`${ACCOUNTANT_BASE_URL}/vendors`, data),
  updateVendor: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/vendors/${id}`, data),
  // No toggleVendorStatus here — that action is Finance-Manager-only and
  // is not mounted on the Accountant router at all (see accountantRoutes.js).

  // ============================================================
  // BUDGETS
  // ============================================================
  getBudgets: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/budgets`, { params }),
  // No createBudget/updateBudget — budgets create/edit is Finance-Manager-only
  // and is not mounted on the Accountant router at all.

  // ============================================================
  // COST ANALYSIS (read-only budget-vs-actual summary)
  // ============================================================
  getCostReport: (projectId) =>
    api.get(`${ACCOUNTANT_BASE_URL}/cost-report`, { params: projectId ? { projectId } : {} }),

  // ============================================================
  // RECEIVABLES & PAYABLES (read-only, thin reuse)
  // ============================================================
  getReceivablesPayables: (params = {}) =>
    api.get(`${ACCOUNTANT_BASE_URL}/receivables-payables`, { params }),

  // ============================================================
  // CHART OF ACCOUNTS — Accountant: view only
  // ============================================================
  getChartOfAccounts: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/chart-of-accounts`, { params }),
  createChartOfAccount: (data) => api.post(`${ACCOUNTANT_BASE_URL}/chart-of-accounts`, data),
  updateChartOfAccount: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/chart-of-accounts/${id}`, data),

  // ============================================================
  // JOURNAL ENTRIES
  // Accountant: create, edit draft, submit.
  // Approve/post/reverse exist below but the backend rejects them
  // for non-Finance-Manager roles — frontend only shows these
  // actions to Finance Manager (financePermissions.js is
  // visibility-only; the real check is server-side).
  // ============================================================
  getJournalEntries: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/journal-entries`, { params }),
  getJournalEntry: (id) => api.get(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}`),
  createJournalEntry: (data) => api.post(`${ACCOUNTANT_BASE_URL}/journal-entries`, data),
  updateJournalEntry: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}`, data),
  submitJournalEntry: (id) => api.put(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}/submit`),
  approveJournalEntry: (id) => api.put(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}/approve`),
  postJournalEntry: (id) => api.put(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}/post`),
  reverseJournalEntry: (id) => api.post(`${ACCOUNTANT_BASE_URL}/journal-entries/${id}/reverse`),

  // ============================================================
  // GENERAL LEDGER (derived, read-only — Decision 2)
  // ============================================================
  getLedger: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/ledger`, { params }),
  getTrialBalance: () => api.get(`${ACCOUNTANT_BASE_URL}/ledger/trial-balance`),

  // ============================================================
  // BANK RECONCILIATION
  // Accountant: view/create/edit in-progress. Approve is Finance-Manager-only server-side.
  // ============================================================
  getBankReconciliations: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/bank-reconciliation`, { params }),
  createBankReconciliation: (data) => api.post(`${ACCOUNTANT_BASE_URL}/bank-reconciliation`, data),
  updateBankReconciliation: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/bank-reconciliation/${id}`, data),
  approveBankReconciliation: (id) => api.put(`${ACCOUNTANT_BASE_URL}/bank-reconciliation/${id}/approve`),

  // ============================================================
  // TAX REGISTER
  // ============================================================
  getTaxRegister: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/tax-register`, { params }),
  getTaxSummary: () => api.get(`${ACCOUNTANT_BASE_URL}/tax-register/summary`),
  createTaxRegisterEntry: (data) => api.post(`${ACCOUNTANT_BASE_URL}/tax-register`, data),
  updateTaxRegisterEntry: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/tax-register/${id}`, data),
  markTaxRegisterFiled: (id) => api.put(`${ACCOUNTANT_BASE_URL}/tax-register/${id}/mark-filed`),

  // ============================================================
  // PETTY CASH
  // Accountant: view/create/edit pending. Approve/reject Finance-Manager-only server-side.
  // ============================================================
  getPettyCash: (params = {}) => api.get(`${ACCOUNTANT_BASE_URL}/petty-cash`, { params }),
  getPettyCashBalance: (projectId) =>
    api.get(`${ACCOUNTANT_BASE_URL}/petty-cash/balance`, { params: projectId ? { project_id: projectId } : {} }),
  createPettyCash: (data) => api.post(`${ACCOUNTANT_BASE_URL}/petty-cash`, data),
  updatePettyCash: (id, data) => api.put(`${ACCOUNTANT_BASE_URL}/petty-cash/${id}`, data),
  approvePettyCash: (id) => api.put(`${ACCOUNTANT_BASE_URL}/petty-cash/${id}/approve`),
  rejectPettyCash: (id) => api.put(`${ACCOUNTANT_BASE_URL}/petty-cash/${id}/reject`),
};

export default accountantService;
