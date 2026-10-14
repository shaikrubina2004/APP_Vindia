// src/api/structuralApi.js
// ─── ONE place to change base URL, headers, timeouts ──────────────────────
// Cleaned up: the old RFI, BOQ, analysis and drawing helpers here pointed at
// URLs that do not exist (or at pages that were removed), so they are gone.
// RFIs use src/api/rfiApi.js; drawings use the shared Drawing Register page.
import axios from "axios";

// ✅ Axios instance — change BASE_URL once here, affects all files
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,                          // 10s timeout — prevents infinite hangs
  headers: { "Content-Type": "application/json" },
});

// ─── Attach the login token to every request ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get("/api/structural/dashboard").then((r) => r.data);

// ─── Query Keys (prevents typo bugs across files) ──────────────────────────
export const QUERY_KEYS = {
  dashboard: ["se-dashboard"],
};