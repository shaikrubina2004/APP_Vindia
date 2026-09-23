// src/services/campaignService.js
// Digital Marketing campaign management — uses the centralized authenticated
// Axios instance so the JWT is always attached.
import api from "./api";

export const campaignService = {
  getAll: (params = {}) => api.get("/campaigns", { params }).then((r) => r.data.campaigns),
  getById: (id) => api.get(`/campaigns/${id}`).then((r) => r.data),
  create: (payload) => api.post("/campaigns", payload).then((r) => r.data.campaign),
  update: (id, payload) => api.patch(`/campaigns/${id}`, payload).then((r) => r.data.campaign),
  remove: (id) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export const marketingService = {
  getDashboard: () => api.get("/marketing/dashboard").then((r) => r.data),
  getReports: (params = {}) => api.get("/marketing/reports", { params }).then((r) => r.data),
};