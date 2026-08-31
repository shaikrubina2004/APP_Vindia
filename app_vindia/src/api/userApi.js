// FILE PATH: src/api/userApi.js

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all active roles from DB.
 * GET /api/roles → [{ id, name, code, department_id, is_active }]
 */
export const fetchRoles = async () => {
  try {
    const res = await axios.get(`${BASE}/api/roles`, {
      headers: authHeaders(),
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("fetchRoles error:", err.message);
    return [];
  }
};

/**
 * Fetch users by role NAME (e.g. "Structural Engineer").
 * GET /api/users/by-role/:roleName
 * userController.getUsersByRole → WHERE LOWER(r.name) = LOWER($1)
 */
export const fetchUsersByRole = async (roleName) => {
  if (!roleName) return [];
  try {
    const encoded = encodeURIComponent(roleName);
    const res = await axios.get(`${BASE}/api/users/by-role/${encoded}`, {
      headers: authHeaders(),
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("fetchUsersByRole error:", err.message);
    return [];
  }
};

/**
 * Fetch all projects from DB.
 * GET /api/projects → handles both [] and { data: [] } and { projects: [] }
 * Projects table has: id, name, client, status, start_date, end_date
 */
export const fetchProjects = async () => {
  try {
    const res = await axios.get(`${BASE}/api/projects`, {
      headers: authHeaders(),
    });
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.projects)) return data.projects;
    return [];
  } catch (err) {
    console.error("fetchProjects error:", err.message);
    return [];
  }
};