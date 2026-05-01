// services/architectDesignService.js
import axios from "axios";

const API = "/api/architect-designs";

// ── Get all drawings for a project (returns { success, data: Drawing[] })
export const getDrawingsByProject = (projectId) =>
  axios.get(`${API}/project/${projectId}`).then((r) => r.data);

// ── Get single drawing with full workflow
export const getDrawingById = (drawingId) =>
  axios.get(`${API}/${drawingId}`).then((r) => r.data);

// ── Create a new drawing
// payload: { id, project_id, name, drawing_type, revision, created_by, file_name, file_url }
export const createDrawing = (payload) =>
  axios.post(`${API}`, payload).then((r) => r.data);

// ── Add a new revision to an existing drawing
// payload: { revision, file_name, file_url, created_by }
export const addRevision = (drawingId, payload) =>
  axios.post(`${API}/${drawingId}/revision`, payload).then((r) => r.data);

// ── Get all revisions for a drawing
export const getRevisions = (drawingId) =>
  axios.get(`${API}/${drawingId}/revisions`).then((r) => r.data);

// ── Workflow action
// payload: { stage: "qs"|"site"|"pm"|"client", action: "send"|"approve"|"reject", user_id, note? }
export const updateWorkflow = (drawingId, payload) =>
  axios.post(`${API}/${drawingId}/workflow`, payload).then((r) => r.data);

// ── Delete a drawing
export const deleteDrawing = (drawingId) =>
  axios.delete(`${API}/${drawingId}`).then((r) => r.data);

// ── Dashboard stats
export const getStats = () =>
  axios.get(`${API}/stats`).then((r) => r.data);