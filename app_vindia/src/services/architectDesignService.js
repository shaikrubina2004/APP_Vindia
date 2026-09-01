import axios from "axios";

const API = "/api/architect-designs";

const authHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

/* ─────────────────────────────────────────────
   CREATE DRAWING
───────────────────────────────────────────── */
export const createDrawing = async (data) => {
  return axios.post(`${API}`, data, {
    headers: authHeaders(),
  });
};

/* ─────────────────────────────────────────────
   GET DRAWINGS FOR USER
───────────────────────────────────────────── */
export const getDrawings = async (userId, role) => {
  return axios.get(`${API}?userId=${userId}&role=${role}`, {
    headers: authHeaders(),
  });
};

/* ─────────────────────────────────────────────
   SEND DRAWING TO USER
───────────────────────────────────────────── */
export const sendDrawing = async (drawingId, payload) => {
  return axios.post(`${API}/${drawingId}/send`, payload, {
    headers: authHeaders(),
  });
};

/* ─────────────────────────────────────────────
   REQUEST DETAILED DRAWING
───────────────────────────────────────────── */
export const requestDrawing = async (data) => {
  return axios.post(`${API}/request`, data, {
    headers: authHeaders(),
  });
};

/* ─────────────────────────────────────────────
   GET REQUESTS
───────────────────────────────────────────── */
export const getRequests = async () => {
  return axios.get(`${API}/requests`, {
    headers: authHeaders(),
  });
};