import api from "./api";

const B = "/bda-daily-updates";

const bdaDailyUpdateService = {
  getStats: () => api.get(`${B}/stats`),          // live auto counts
  getToday: () => api.get(`${B}/today`),
  getMine: () => api.get(`${B}/mine`),
  submit: (data) => api.post(B, data),
  submitOther: (data) => api.post(`${B}/other-report`, data),
  getAllForCeo: () => api.get(B),
};

export default bdaDailyUpdateService;