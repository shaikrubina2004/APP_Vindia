// ===== FILE: APP_Vindia/app_vindia/src/api/financeService.js =====

import axios from 'axios';

// eslint-disable-next-line no-undef
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FINANCE_API = `${API_BASE_URL}/api/finance`;

// Get authorization header
const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

const financeService = {
  // Dashboard
  getFinanceDashboard: (projectId) => {
    return axios.get(`${FINANCE_API}/dashboard?projectId=${projectId}`, getAuthHeader());
  },

  // Invoices
  getAllInvoices: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return axios.get(`${FINANCE_API}/invoices?${params}`, getAuthHeader());
  },

  createInvoice: (invoiceData) => {
    return axios.post(`${FINANCE_API}/invoices/create`, invoiceData, getAuthHeader());
  },

  updateInvoiceStatus: (invoiceId, status) => {
    return axios.put(`${FINANCE_API}/invoices/${invoiceId}/status`, { status }, getAuthHeader());
  },

  deleteInvoice: (invoiceId) => {
    return axios.delete(`${FINANCE_API}/invoices/${invoiceId}`, getAuthHeader());
  },

  // Budget
  createBudget: (budgetData) => {
    return axios.post(`${FINANCE_API}/budgets/create`, budgetData, getAuthHeader());
  },

  getBudgets: (projectId) => {
    return axios.get(`${FINANCE_API}/budgets?projectId=${projectId}`, getAuthHeader());
  },

  // Reports
  getCostReport: (projectId) => {
    return axios.get(`${FINANCE_API}/cost-report?projectId=${projectId}`, getAuthHeader());
  },

  // Expenses
  addExpense: (expenseData) => {
    return axios.post(`${FINANCE_API}/expenses/add`, expenseData, getAuthHeader());
  },

  // Payments
  getPaymentStatus: (projectId) => {
    return axios.get(`${FINANCE_API}/payment-status?projectId=${projectId}`, getAuthHeader());
  }
};

export default financeService;