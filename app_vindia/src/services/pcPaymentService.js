// ===== FILE: APP_Vindia/app_vindia/src/services/pcPaymentService.js =====
//
// Talks to the read-only Project Coordinator payment endpoints.
// api.js already sets the baseURL and attaches the Bearer token.

import api from "./api";

const BASE = "/pc/payments";

const pcPaymentService = {
  // All projects this coordinator owns, each with its receivables.
  getPayments: (projectId) =>
    api.get(BASE, { params: projectId ? { project_id: projectId } : {} }),

  // Individual payment lines behind one invoice.
  getInvoiceTransactions: (invoiceId) =>
    api.get(`${BASE}/${invoiceId}/transactions`),
};

export default pcPaymentService;