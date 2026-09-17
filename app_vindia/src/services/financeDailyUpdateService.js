// ===== FILE: APP_Vindia/app_vindia/src/services/financeDailyUpdateService.js =====
import api from "./api";

const F = "/finance-daily-updates";

const financeDailyUpdateService = {
  /* ── Shared: Accountant + Finance Manager ─────────────── */
  submitUpdate: (data) => api.post(F, data),

  getMyUpdates: () => api.get(`${F}/mine`),

  getTodayMine: () => api.get(`${F}/today`),

  getUpdateById: (id) => api.get(`${F}/${id}`),

  /* ── Finance Manager: Review Accountant Updates ───────── */
  getAllUpdates: (filters = {}) =>
    api.get(F, {
      params: filters,
    }),

  reviewUpdate: (id, payload) =>
    api.put(`${F}/${id}/review`, payload),
};

export default financeDailyUpdateService;