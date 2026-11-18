// ===== FILE: APP_Vindia/app_vindia/src/services/travelClaimsService.js =====
// Finance side of travel requests: approved claims waiting to be paid.
// Backend: backend/routes/travelExpenseRoutes.js (mounted at /api/travel-expenses)

import api from "./api";

const BASE_URL = "/travel-expenses";

const travelClaimsService = {
  // All approved claims in the Finance queue (Pending + Paid).
  // Pass "Pending" or "Paid" to ask the server to filter.
  getClaims: (financeStatus) =>
    api.get(`${BASE_URL}/finance/claims`, {
      params: financeStatus ? { finance_status: financeStatus } : {},
    }),

  // Finance Manager marks a claim as paid.
  // payload: { reference?: string, note?: string }
  markPaid: (id, payload = {}) =>
    api.put(`${BASE_URL}/${id}/finance-status`, {
      status: "Paid",
      reference: payload.reference || "",
      note: payload.note || "",
    }),
};

export default travelClaimsService;