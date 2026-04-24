import axios from "axios";

// ✅ create instance
const API = axios.create({
  baseURL: "http://localhost:5000/api",
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