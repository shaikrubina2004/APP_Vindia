import axios from "axios";

const API = "http://localhost:5000/api/pc-daily-updates";

/* ================================
   CREATE DAILY UPDATE
================================ */
export const createUpdate = async (data) => {
  return axios.post(API, data);
};

/* ================================
   GET ALL UPDATES (for coordinator)
================================ */
export const getUpdates = async (projectId) => {
  return axios.get(`${API}/project/${projectId}`);
};

/* ================================
   UPDATE DAILY UPDATE
================================ */
export const updateUpdate = async (id, data) => {
  return axios.put(`${API}/${id}`, data);
};