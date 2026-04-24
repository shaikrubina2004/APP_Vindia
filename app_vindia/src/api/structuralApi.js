// src/api/structuralApi.js
// ─── ONE place to change base URL, headers, timeouts ──────────────────────
import axios from "axios";

// ✅ Axios instance — change BASE_URL once here, affects all files
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,                          // 10s timeout — prevents infinite hangs
  headers: { "Content-Type": "application/json" },
});

// ─── Optional: attach auth token if you add JWT later ─────────────────────
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get("/api/structural/dashboard").then((r) => r.data);

// ─── Drawings ──────────────────────────────────────────────────────────────
export const fetchDrawings = () =>
  api.get("/api/structural/drawings").then((r) => r.data);

export const uploadDrawing = (formData) =>
  api.post("/api/structural/upload-drawing", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateDrawingStatus = ({ id, role, status }) =>
  api.put(`/api/structural/drawings/${id}/status`, { role, status });

// ─── RFI ───────────────────────────────────────────────────────────────────
export const fetchRFIs = () =>
  api.get("/rfis").then((r) => r.data);

export const fetchRFIById = (id) =>
  api.get(`/rfis/${id}`).then((r) => r.data);

export const createRFI = (data) =>
  api.post("/rfis", data).then((r) => r.data);

export const updateRFIStatus = ({ id, status }) =>
  api.put(`/rfis/${id}/status`, { status }).then((r) => r.data);

export const submitRFIAnswer = ({ id, response }) =>
  api.put(`/rfis/${id}/answer`, { response }).then((r) => r.data);

// ─── BOQ ───────────────────────────────────────────────────────────────────
export const fetchBOQ = () =>
  api.get("/api/structural/boq").then((r) => r.data);

// ─── Analysis ──────────────────────────────────────────────────────────────
export const fetchAnalysis = () =>
  api.get("/api/analysis").then((r) => r.data);

// ─── Query Keys (prevents typo bugs across files) ──────────────────────────
export const QUERY_KEYS = {
  dashboard:  ["se-dashboard"],
  drawings:   ["se-drawings"],
  rfis:       ["se-rfis"],
  rfi:        (id) => ["se-rfi", id],
  boq:        ["se-boq"],
  analysis:   ["se-analysis"],
};