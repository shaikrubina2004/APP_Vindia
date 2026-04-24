import API from "./authService";

/* ================================
   CREATE DAILY UPDATE
================================ */
export const createUpdate = (data) => {
  return API.post("/pc-daily-updates", data);
};

/* ================================
   GET ALL UPDATES
================================ */
export const getUpdates = (projectId) => {
  return API.get(`/pc-daily-updates/project/${projectId}`);
};

/* ================================
   UPDATE DAILY UPDATE
================================ */
export const updateUpdate = (id, data) => {
  return API.put(`/pc-daily-updates/${id}`, data);
};