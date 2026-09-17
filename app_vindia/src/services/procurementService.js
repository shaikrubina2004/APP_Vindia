// ===== FILE: APP_Vindia/app_vindia/src/services/procurementService.js =====
import api from "./api";

// api.js already sets baseURL "http://localhost:5000/api" and attaches
// the Bearer token automatically — so every call below is relative to /api
const P = "/procurement";

const procurementService = {
  /* ── Material Requests (approved, unlinked to a PO) ──── */
  getApprovedRequests: () => api.get(`${P}/material-requests/approved`),

  /* ── Purchase Orders ──────────────────────────────────── */
  createPurchaseOrder: (data) => api.post(`${P}/purchase-orders`, data),
  getAllPurchaseOrders: (filters = {}) =>
    api.get(`${P}/purchase-orders`, { params: filters }),
  getPurchaseOrderById: (id) => api.get(`${P}/purchase-orders/${id}`),
};

export default procurementService;