import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // 🔥 change if needed
  headers: {
    "Content-Type": "application/json",
  },
});

// optional token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
