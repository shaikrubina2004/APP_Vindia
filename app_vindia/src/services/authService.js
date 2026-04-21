import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// ✅ ADD THIS BLOCK
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// signup
export const signup = (data) => {
  return API.post("/auth/signup", data);
};

// login
export const login = (data) => {
  return API.post("/auth/login", data);
};
