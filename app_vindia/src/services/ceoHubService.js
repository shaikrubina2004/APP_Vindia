import API from "./authService";

/* ── Daily reports going to the CEO ───────────────────────────── */
export const ceoReportService = {
  // manager side (PM / BDA / Operations / HR)
  submit: (body) => API.post("/ceo-daily-reports", body),
  today: (report_type) => API.get("/ceo-daily-reports/today", { params: { report_type } }),
  mine: (report_type) => API.get("/ceo-daily-reports/mine", { params: { report_type } }),

  // CEO side
  list: (params = {}) => API.get("/ceo-daily-reports", { params }),
  summary: () => API.get("/ceo-daily-reports/summary"),
  review: (source, id, status, note) =>
    API.put(`/ceo-daily-reports/${source}/${id}/review`, { status, note }),
};

/* ── CEO dashboard / analytics ────────────────────────────────── */
export const ceoDashboardService = {
  overview: () => API.get("/ceo-insights/overview"),
};

/* ── CEO notifications ────────────────────────────────────────── */
export const ceoNotificationService = {
  list: () => API.get("/ceo-alerts"),
  markRead: (id) => API.patch(`/ceo-alerts/${id}/read`),
  markAllRead: () => API.patch("/ceo-alerts/read-all"),
  clearRead: () => API.delete("/ceo-alerts/read"),
};