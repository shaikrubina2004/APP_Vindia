import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const fetchTeam = (projectId) =>
  axios
    .get(`${BASE}/api/team/${projectId}`, { headers: headers() })
    .then((r) => r.data);

export const addMember = (data) =>
  axios
    .post(`${BASE}/api/team`, {
      ...data,
      project_id: Number(data.project_id),
    }, { headers: headers() })
    .then((r) => r.data);

export const updateMember = (id, data) =>
  axios
    .put(`${BASE}/api/team/${id}`, {
      ...data,
      project_id: Number(data.project_id),
    }, { headers: headers() })
    .then((r) => r.data);

export const deleteMember = (id) =>
  axios.delete(`${BASE}/api/team/${id}`, { headers: headers() });

export const logIncident = (id, data) =>
  axios
    .post(`${BASE}/api/team/${id}/incidents`, data, { headers: headers() })
    .then((r) => r.data);

export const assignTask = (id, data) =>
  axios
    .post(`${BASE}/api/team/${id}/tasks`, data, { headers: headers() })
    .then((r) => r.data);