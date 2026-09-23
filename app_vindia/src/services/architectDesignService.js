// src/services/architectDesignService.js
// Drawing exchange between Architect <-> 3D Visualizer (and other roles).
// Uses the centralized authenticated Axios instance (src/services/api.js)
// so the JWT is always attached — these routes require auth on the backend.
//
// NOTE: this file previously also exposed submit3DRender / get3DSubmissions /
// review3DSubmission / getMy3DSubmissions / getMy3DReviews, which called
// backend routes (POST /:id/submit-3d, GET /:id/3d-submissions, etc.) that
// were never implemented — they always 404'd. The 3D Model workflow (create,
// submit, approve, reject, revise) now lives in modelsService.js against the
// real /api/3d-models backend; see that file and the "My Models" page.
import api from "./api";

const BASE = "/architect-designs";

/* ───────────────────────────────────────────── CREATE DRAWING */
export const createDrawing = async (data) => api.post(BASE, data);

/* ───────────────────────────────────────────── GET DRAWINGS FOR CURRENT USER
   The backend derives the requesting user + role from the JWT — no need to
   pass userId/role from the client (and they were never trusted server-side). */
export const getDrawings = async () => api.get(BASE);

/* ───────────────────────────────────────────── SEND DRAWING TO USER */
export const sendDrawing = async (drawingId, payload) => api.post(`${BASE}/${drawingId}/send`, payload);

/* ───────────────────────────────────────────── REQUEST DETAILED DRAWING */
export const requestDrawing = async (data) => api.post(`${BASE}/request`, data);

/* ───────────────────────────────────────────── GET REQUESTS (Architect inbox) */
export const getRequests = async () => api.get(`${BASE}/requests`);

/* ───────────────────────────────────────────── MARK REQUEST SEEN */
export const markRequestSeen = async (id) => api.patch(`${BASE}/requests/${id}/seen`);

/* ─────────────────────────────────────────────────────────────────
   DEPRECATED — 3D render submission via drawings.
   These never had a working backend counterpart (always 404'd).
   The full 3D Model workflow now lives at /api/3d-models — see
   modelsService.js and the "My Models" / "3D Models" pages.
   Kept as no-op stubs only so older call sites in ArchitectDesigns.jsx
   keep compiling; they resolve to an empty/rejected result instead of
   throwing a network error.
───────────────────────────────────────────────────────────────── */
const deprecatedWarning = (name) =>
  console.warn(`[architectDesignService] "${name}" is deprecated — use modelsService.js / the 3D Models page instead.`);

export const submit3DRender = async () => {
  deprecatedWarning("submit3DRender");
  return Promise.reject(new Error("Please use the 3D Models page to submit a model for review."));
};
export const get3DSubmissions = async () => {
  deprecatedWarning("get3DSubmissions");
  return { data: [] };
};
export const review3DSubmission = async () => {
  deprecatedWarning("review3DSubmission");
  return Promise.reject(new Error("Please use the 3D Models page to review models."));
};
export const getMy3DSubmissions = async () => {
  deprecatedWarning("getMy3DSubmissions");
  return { data: [] };
};
export const getMy3DReviews = async () => {
  deprecatedWarning("getMy3DReviews");
  return { data: [] };
};