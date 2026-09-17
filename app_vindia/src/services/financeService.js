// ===== FILE: APP_Vindia/app_vindia/src/services/financeService.js =====

import api from "./api";

// api.js should already contain:
// baseURL: "http://localhost:5000/api"
// and automatically attach the Bearer token.

const FINANCE_BASE_URL = "/finance";

const financeService = {
  // ============================================================
  // DASHBOARD
  // ============================================================

  getDashboard: (projectId) =>
    api.get(`${FINANCE_BASE_URL}/dashboard`, {
      params: projectId ? { projectId } : {},
    }),

  // ============================================================
  // COST REPORTING
  // ============================================================

  getCostReport: (projectId) =>
    api.get(`${FINANCE_BASE_URL}/cost-report`, {
      params: projectId ? { projectId } : {},
    }),

  // ============================================================
  // BUDGETS
  // ============================================================

  getAllBudgets: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/budgets`, {
      params: filters,
    }),

  getBudgetsByProject: (projectId) =>
    api.get(`${FINANCE_BASE_URL}/budgets/project/${projectId}`),

  getBudgetById: (id) =>
    api.get(`${FINANCE_BASE_URL}/budgets/${id}`),

  createBudget: (data) =>
    api.post(`${FINANCE_BASE_URL}/budgets`, data),

  updateBudget: (id, data) =>
    api.put(`${FINANCE_BASE_URL}/budgets/${id}`, data),

  deleteBudget: (id) =>
    api.delete(`${FINANCE_BASE_URL}/budgets/${id}`),

  // ============================================================
  // EXPENSES
  // ============================================================

  getAllExpenses: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/expenses`, {
      params: filters,
    }),

  getExpenseSummary: (projectId) =>
    api.get(`${FINANCE_BASE_URL}/expenses/summary`, {
      params: projectId ? { project_id: projectId } : {},
    }),

  getExpenseById: (id) =>
    api.get(`${FINANCE_BASE_URL}/expenses/${id}`),

  createExpense: (data) =>
    api.post(`${FINANCE_BASE_URL}/expenses`, data),

  updateExpense: (id, data) =>
    api.put(`${FINANCE_BASE_URL}/expenses/${id}`, data),

  deleteExpense: (id) =>
    api.delete(`${FINANCE_BASE_URL}/expenses/${id}`),

  // ============================================================
  // INVOICES
  // ============================================================

  getAllInvoices: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/invoices`, {
      params: filters,
    }),

  createInvoice: (data) =>
    api.post(`${FINANCE_BASE_URL}/invoices`, data),

  /*
   * There is currently no generic backend route:
   *
   * PUT /api/finance/invoices/:id
   *
   * Therefore, do not use updateInvoice() until the backend
   * controller and route are created.
   */

  updateInvoiceStatus: (id, status) =>
    api.put(`${FINANCE_BASE_URL}/invoices/${id}/status`, {
      status,
    }),

  deleteInvoice: (id) =>
    api.delete(`${FINANCE_BASE_URL}/invoices/${id}`),

  // ============================================================
  // RECEIVABLES AND PAYABLES
  // ============================================================

  getReceivablesPayables: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/receivables-payables`, {
      params: filters,
    }),

  // ============================================================
  // PAYMENTS
  // ============================================================

  getAllPayments: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/payments`, {
      params: filters,
    }),

  getPaymentSummary: (projectId) =>
    api.get(`${FINANCE_BASE_URL}/payments/summary`, {
      params: projectId ? { projectId } : {},
    }),

  getPaymentById: (id) =>
    api.get(`${FINANCE_BASE_URL}/payments/${id}`),

  createPayment: (data) =>
    api.post(`${FINANCE_BASE_URL}/payments`, data),

  updatePayment: (id, data) =>
    api.put(`${FINANCE_BASE_URL}/payments/${id}`, data),

  deletePayment: (id) =>
    api.delete(`${FINANCE_BASE_URL}/payments/${id}`),

  // ============================================================
  // VENDORS
  // ============================================================

  getAllVendors: (filters = {}) =>
    api.get(`${FINANCE_BASE_URL}/vendors`, {
      params: filters,
    }),

  getVendorMetrics: () =>
    api.get(`${FINANCE_BASE_URL}/vendors/metrics`),

  getVendorById: (id) =>
    api.get(`${FINANCE_BASE_URL}/vendors/${id}`),

  createVendor: (data) =>
    api.post(`${FINANCE_BASE_URL}/vendors`, data),

  updateVendor: (id, data) =>
    api.put(`${FINANCE_BASE_URL}/vendors/${id}`, data),

  toggleVendorStatus: (id) =>
    api.patch(`${FINANCE_BASE_URL}/vendors/${id}/toggle-status`),

  deleteVendor: (id) =>
    api.delete(`${FINANCE_BASE_URL}/vendors/${id}`),

  // ============================================================
  // FINANCE SETTINGS
  // ============================================================
  //
  // These routes are restricted in the backend to:
  // - finance_manager
  // - ceo
  //
  // Accountant should not call these methods.
  // ============================================================

  getSettings: () =>
    api.get(`${FINANCE_BASE_URL}/settings`),

  updateGeneralSettings: (data) =>
    api.put(`${FINANCE_BASE_URL}/settings/general`, data),

  updateTaxSettings: (data) =>
    api.put(`${FINANCE_BASE_URL}/settings/tax`, data),

  updateInvoicePrefs: (data) =>
    api.put(`${FINANCE_BASE_URL}/settings/invoice-prefs`, data),

  updateGateway: (gateway, data) =>
    api.put(`${FINANCE_BASE_URL}/settings/gateway/${gateway}`, data),

  addBankAccount: (data) =>
    api.post(`${FINANCE_BASE_URL}/settings/bank-accounts`, data),

  deleteBankAccount: (id) =>
    api.delete(`${FINANCE_BASE_URL}/settings/bank-accounts/${id}`),
};

export default financeService;