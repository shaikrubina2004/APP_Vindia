// ===== FILE: APP_Vindia/app_vindia/src/services/hiringRequestService.js =====
import api from "./api";

// api.js already sets baseURL (/api) and attaches the Bearer token.
const H = "/hiring-requests";

const hiringRequestService = {
  /* Manager */
  create: (data) => api.post(H, data),
  getMine: () => api.get(`${H}/mine`),
  getOne: (id) => api.get(`${H}/${id}`),
  resubmit: (id, data) => api.put(`${H}/${id}`, data),
  cancel: (id) => api.patch(`${H}/${id}/cancel`),

  /* Finance Manager (used by the Finance review page — next component) */
  getFinanceQueue: () => api.get(`${H}/finance`),
  financeDecision: (id, decision, remark) =>
    api.patch(`${H}/${id}/finance-decision`, { decision, remark }),

  /* HR Manager (used by the HR review page — later component) */
  getHrQueue: () => api.get(`${H}/hr`),
  hrDecision: (id, decision, remark) =>
    api.patch(`${H}/${id}/hr-decision`, { decision, remark }),
};

export default hiringRequestService;