import axios from "axios";


// architectAssignService.js
const BASE_URL = "http://localhost:5000";
const api = axios.create({ baseURL: BASE_URL });

// Attach auth token if you store it in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * GET /api/architect-assign/architects
 * Returns all users with role_id = 29 (Architect)
 */
export const getArchitects = () => api.get("/api/architect-assign/architects");

/**
 * PATCH /api/architect-assign/projects/:projectId/assign
 * Body: { architect_id, assignment_data }
 */
export const assignArchitect = (projectId, payload) =>
  api.patch(`/api/architect-assign/projects/${projectId}/assign`, payload);