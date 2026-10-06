import axios from "axios";

// One place decides the backend URL. Set VITE_API_URL (or the older VITE_API_BASE)
// in .env for staging/production; local development keeps working unchanged.
const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// ✅ create instance
const API = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ EXPORT BOTH WAYS
export { API };        // for old code → import { API }
export default API;    // for new code → import API

// auth APIs
export const signup = (data) => {
  return API.post("/auth/signup", data);
};

export const login = (data) => {
  return API.post("/auth/login", data);
};