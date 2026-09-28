// ===== FILE: APP_Vindia/app_vindia/src/services/opsDailyUpdateService.js =====
import api from "./api";

const B = "/ops-daily-updates";

const opsDailyUpdateService = {
  /* ── Inventory Controller + Logistics Coordinator ── */
  submitUpdate: (data) => api.post(B, data),
  getMyUpdates: () => api.get(`${B}/mine`),
  getTodayMine: () => api.get(`${B}/today`),
  getUpdateById: (id) => api.get(`${B}/${id}`),

  /* ── Operations Manager ── */
  getAllUpdates: (filters = {}) => api.get(B, { params: filters }),
  reviewUpdate: (id, payload) => api.put(`${B}/${id}/review`, payload),
};

export default opsDailyUpdateService;