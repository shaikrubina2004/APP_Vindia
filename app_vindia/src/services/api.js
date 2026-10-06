import axios from "axios";

// One place decides the backend URL. Set VITE_API_URL (or the older VITE_API_BASE)
// in .env for staging/production; local development keeps working unchanged.
export const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// optional token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
