import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getArchitectProjects = (userId) => {
  return axios.get(
    `${API_BASE}/api/architect/${userId}/projects`
  );
};