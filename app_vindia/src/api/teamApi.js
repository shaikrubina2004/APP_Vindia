import axios from "axios";

const BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const fetchAllTeam = () =>
  axios
    .get(`${BASE}/api/team`, { headers: headers() })
    .then((r) => r.data);

export const fetchTeamOverview = () =>
  axios
    .get(`${BASE}/api/team/overview`, { headers: headers() })
    .then((r) => r.data);

// Same role list HR uses for employee designations.
export const fetchRoles = () =>
  axios
    .get(`${BASE}/api/roles`, { headers: headers() })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || []));

export const fetchMyProjectTeams = () =>
  axios
    .get(`${BASE}/api/team/my-projects`, { headers: headers() })
    .then((r) => r.data);

export const fetchTeamActivity = () =>
  axios
    .get(`${BASE}/api/team/activity`, { headers: headers() })
    .then((r) => r.data);

export const markTeamActivitySeen = (upTo) =>
  axios
    .post(`${BASE}/api/team/activity/seen`, { up_to: upTo }, { headers: headers() })
    .then((r) => r.data);

export const fetchRoster = () =>
  axios
    .get(`${BASE}/api/team/roster`, { headers: headers() })
    .then((r) => r.data);

export const importToTeam = (payload) =>
  axios
    .post(`${BASE}/api/team/import`, payload, { headers: headers() })
    .then((r) => r.data);

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
export const fetchMemberTasks = (memberId) =>
  axios.get(`${BASE}/api/team/${memberId}/tasks`, { headers: headers() }).then((r) => r.data);

export const updateTask = (taskId, data) =>
  axios.put(`${BASE}/api/team/tasks/${taskId}`, data, { headers: headers() }).then((r) => r.data);

export const updateIncident = (incidentId, data) =>
  axios.put(`${BASE}/api/team/incidents/${incidentId}`, data, { headers: headers() }).then((r) => r.data);
