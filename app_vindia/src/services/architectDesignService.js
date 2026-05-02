import axios from "axios";

const API = "/api/architect-designs";

/* ─────────────────────────────────────────────
   CREATE DRAWING
───────────────────────────────────────────── */
export const createDrawing = async (data) => {
  return axios.post(`${API}`, data);
};

/* ─────────────────────────────────────────────
   GET DRAWINGS FOR USER (ROLE FILTERED)
───────────────────────────────────────────── */
export const getDrawings = async (userId, role) => {
  return axios.get(`${API}?userId=${userId}&role=${role}`);
};

/* ─────────────────────────────────────────────
   SEND DRAWING TO USER
───────────────────────────────────────────── */
export const sendDrawing = async (drawingId, payload) => {
  return axios.post(`${API}/${drawingId}/send`, payload);
};

/* ─────────────────────────────────────────────
   REQUEST DETAILED DRAWING
───────────────────────────────────────────── */
export const requestDrawing = async (data) => {
  return axios.post(`${API}/request`, data);
};

/* ─────────────────────────────────────────────
   GET REQUESTS
───────────────────────────────────────────── */
export const getRequests = async () => {
  return axios.get(`${API}/requests`);
};