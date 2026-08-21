// ===== FILE: APP_Vindia/app_vindia/src/services/financeService.js =====
import api from "./api";

// api.js already sets baseURL "http://localhost:5000/api" and attaches
// the Bearer token automatically — so every call below is relative to /api
const F = "/finance";

const financeService = {
  /* ── Dashboard ─────────────────────────────────────── */
  getDashboard: (projectId) =>
    api.get(`${F}/dashboard`, { params: { projectId } }),

  /* ── Cost Reporting ────────────────────────────────── */
  getCostReport: (projectId) =>
    api.get(`${F}/cost-report`, { params: { projectId } }),

  /* ── Budgets ───────────────────────────────────────── */
  getAllBudgets: (filters = {}) =>
    api.get(`${F}/budgets`, { params: filters }),
  getBudgetsByProject: (projectId) =>
    api.get(`${F}/budgets/project/${projectId}`),
  getBudgetById: (id) => api.get(`${F}/budgets/${id}`),
  createBudget: (data) => api.post(`${F}/budgets`, data),
  updateBudget: (id, data) => api.put(`${F}/budgets/${id}`, data),
  deleteBudget: (id) => api.delete(`${F}/budgets/${id}`),

  /* ── Expenses ──────────────────────────────────────── */
  getAllExpenses: (filters = {}) =>
    api.get(`${F}/expenses`, { params: filters }),
  getExpenseSummary: (projectId) =>
    api.get(`${F}/expenses/summary`, { params: { projectId } }),
  getExpenseById: (id) => api.get(`${F}/expenses/${id}`),
  createExpense: (data) => api.post(`${F}/expenses`, data),
  updateExpense: (id, data) => api.put(`${F}/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`${F}/expenses/${id}`),

  /* ── Invoices ──────────────────────────────────────── */
  getAllInvoices: (filters = {}) =>
    api.get(`${F}/invoices`, { params: filters }),
  createInvoice: (data) => api.post(`${F}/invoices`, data),
  updateInvoice: (id, data) => api.put(`${F}/invoices/${id}`, data),
  updateInvoiceStatus: (id, status) =>
    api.put(`${F}/invoices/${id}/status`, { status }),
  deleteInvoice: (id) => api.delete(`${F}/invoices/${id}`),

  /* ── Payments ──────────────────────────────────────── */
  getAllPayments: (filters = {}) =>
    api.get(`${F}/payments`, { params: filters }),
  getPaymentSummary: (projectId) =>
    api.get(`${F}/payments/summary`, { params: { projectId } }),
  getPaymentById: (id) => api.get(`${F}/payments/${id}`),
  createPayment: (data) => api.post(`${F}/payments`, data),
  updatePayment: (id, data) => api.put(`${F}/payments/${id}`, data),
  deletePayment: (id) => api.delete(`${F}/payments/${id}`),

  /* ── Vendors ───────────────────────────────────────── */
  getAllVendors: (filters = {}) =>
    api.get(`${F}/vendors`, { params: filters }),
  getVendorMetrics: () => api.get(`${F}/vendors/metrics`),
  getVendorById: (id) => api.get(`${F}/vendors/${id}`),
  createVendor: (data) => api.post(`${F}/vendors`, data),
  updateVendor: (id, data) => api.put(`${F}/vendors/${id}`, data),
  toggleVendorStatus: (id) => api.patch(`${F}/vendors/${id}/toggle-status`),
  deleteVendor: (id) => api.delete(`${F}/vendors/${id}`),

  /* ── Settings ──────────────────────────────────────── */
  getSettings: () => api.get(`${F}/settings`),
  updateGeneralSettings: (data) => api.put(`${F}/settings/general`, data),
  updateTaxSettings: (data) => api.put(`${F}/settings/tax`, data),
  updateInvoicePrefs: (data) => api.put(`${F}/settings/invoice-prefs`, data),
  updateGateway: (gateway, data) =>
    api.put(`${F}/settings/gateway/${gateway}`, data),
  addBankAccount: (data) => api.post(`${F}/settings/bank-accounts`, data),
  deleteBankAccount: (id) => api.delete(`${F}/settings/bank-accounts/${id}`),
};

export default financeService;