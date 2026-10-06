import API from "./authService";

const unwrap = (response) => response.data;

export const getMyTimesheets = (weekStart) =>
  API.get("/timesheets/me", { params: weekStart ? { week_start: weekStart } : {} }).then(unwrap);

export const getTimesheet = (id) =>
  API.get(`/timesheets/${id}`).then(unwrap);

export const saveTimesheetDraft = (payload) =>
  API.post("/timesheets/draft", payload).then(unwrap);

export const submitTimesheet = (id, comment = "") =>
  API.post(`/timesheets/${id}/submit`, { comment }).then(unwrap);

export const getTimesheetHistory = (id) =>
  API.get(`/timesheets/${id}/history`).then(unwrap);

export const getProjects = () =>
  API.get("/timesheets/options/projects").then(unwrap);

export const getTasksByProject = (projectId) =>
  API.get(`/timesheets/options/projects/${projectId}/tasks`).then(unwrap);

export const getTeamTimesheets = (params = {}) =>
  API.get("/timesheets/team", { params }).then(unwrap);

export const getTeamSummary = () =>
  API.get("/timesheets/team/summary").then(unwrap);

export const startTimesheetReview = (id, comment = "") =>
  API.post(`/timesheets/${id}/review`, { comment }).then(unwrap);

export const approveTimesheet = (id, comment = "") =>
  API.post(`/timesheets/${id}/approve`, { comment }).then(unwrap);

export const requestTimesheetChanges = (id, comment) =>
  API.post(`/timesheets/${id}/request-changes`, { comment }).then(unwrap);

export const rejectTimesheet = (id, comment) =>
  API.post(`/timesheets/${id}/reject`, { comment }).then(unwrap);

export const reopenTimesheet = (id, comment) =>
  API.post(`/timesheets/${id}/reopen`, { comment }).then(unwrap);
