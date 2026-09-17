import axios from "axios";

const API = "/api/architect-designs";

/* ─────────────────────────────────────────────
   CREATE DRAWING
───────────────────────────────────────────── */
export const createDrawing = async (data) => {
  return axios.post(`${API}`, data);
};

/* ─────────────────────────────────────────────
   GET DRAWINGS FOR USER (ROLE FILTERED)
───────────────────────────────────────────── */
export const getDrawings = async (userId, role) => {
  return axios.get(`${API}?userId=${userId}&role=${role}`);
};

/* ─────────────────────────────────────────────
   SEND DRAWING TO USER
───────────────────────────────────────────── */
export const sendDrawing = async (drawingId, payload) => {
  return axios.post(`${API}/${drawingId}/send`, payload);
};

/* ─────────────────────────────────────────────
   REQUEST DETAILED DRAWING (SE / Client → Architect)
───────────────────────────────────────────── */
export const requestDrawing = async (data) => {
  return axios.post(`${API}/request`, data);
};

/* ─────────────────────────────────────────────
   GET REQUESTS (Architect inbox)
───────────────────────────────────────────── */
export const getRequests = async (architectId) => {
  const params = architectId ? `?architectId=${architectId}` : "";
  return axios.get(`${API}/requests${params}`);
};

/* ─────────────────────────────────────────────
   3D VISUALIZER — SUBMIT RENDER
   Called by 3D Visualizer after uploading their file
───────────────────────────────────────────── */
export const submit3DRender = async (drawingId, payload) => {
  // payload: { submitted_by, file_url, file_name, notes }
  return axios.post(`${API}/${drawingId}/submit-3d`, payload);
};

/* ─────────────────────────────────────────────
   ARCHITECT — GET 3D SUBMISSIONS FOR A DRAWING
───────────────────────────────────────────── */
export const get3DSubmissions = async (drawingId) => {
  return axios.get(`${API}/${drawingId}/3d-submissions`);
};

/* ─────────────────────────────────────────────
   ARCHITECT — APPROVE / REJECT A 3D SUBMISSION
───────────────────────────────────────────── */
export const review3DSubmission = async (submissionId, payload) => {
  // payload: { status: "Approved"|"Rejected", reviewed_by, review_note }
  return axios.patch(`${API}/3d-submissions/${submissionId}`, payload);
};

/* ─────────────────────────────────────────────
   3D VISUALIZER — GET OWN SUBMISSION HISTORY
───────────────────────────────────────────── */
export const getMy3DSubmissions = async (userId) => {
  return axios.get(`${API}/my-3d-submissions?userId=${userId}`);
};
/* ─────────────────────────────────────────────
   ARCHITECT — GET ALL 3D SUBMISSIONS FOR THEIR DRAWINGS
───────────────────────────────────────────── */
export const getMy3DReviews = async (architectId) => {
  return axios.get(`${API}/my-3d-reviews?architectId=${architectId}`);
};