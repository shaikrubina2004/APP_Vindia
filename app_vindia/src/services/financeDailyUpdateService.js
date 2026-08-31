// ===== FILE: APP_Vindia/app_vindia/src/services/financeDailyUpdateService.js =====
import api from "./api";

const F = "/finance-daily-updates";

const financeDailyUpdateService = {
  /* ── Finance Manager ──────────────────────────────────── */
  submitUpdate: (data) => api.post(F, data),
  getMyUpdates: () => api.get(`${F}/mine`),
  getTodayMine: () => api.get(`${F}/today`),

  /* ── CEO ───────────────────────────────────────────────── */
  getAllUpdates: (filters = {}) => api.get(F, { params: filters }),
  reviewUpdate: (id, status, note) =>
    api.put(`${F}/${id}/review`, { status, note }),

  /* ── Shared ────────────────────────────────────────────── */
  getUpdateById: (id) => api.get(`${F}/${id}`),
};

export default financeDailyUpdateService;