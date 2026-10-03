// ===== FILE: APP_Vindia/app_vindia/src/services/recruitmentService.js =====
import api from "./api";

// api.js already sets baseURL and attaches the Bearer token automatically —
// every call below is relative to /api
const R = "/recruitment";

const recruitmentService = {
  /* ── Job Openings ─────────────────────────────────────── */
  createJobOpening: (data) => api.post(`${R}/job-openings`, data),
  getAllJobOpenings: (filters = {}) => api.get(`${R}/job-openings`, { params: filters }),
  getJobOpeningById: (id) => api.get(`${R}/job-openings/${id}`),
  updateJobOpeningStatus: (id, status) =>
    api.patch(`${R}/job-openings/${id}/status`, { status }),
  getCandidatesByJobOpening: (id) => api.get(`${R}/job-openings/${id}/candidates`),

  /* ── Candidates ───────────────────────────────────────── */
  createCandidate: (data) => api.post(`${R}/candidates`, data),
  getAllCandidates: (filters = {}) => api.get(`${R}/candidates`, { params: filters }),
  getCandidateById: (id) => api.get(`${R}/candidates/${id}`),
  updateCandidateStage: (id, data) => api.patch(`${R}/candidates/${id}/stage`, data),
  updateOfferDetails: (id, data) => api.patch(`${R}/candidates/${id}/offer`, data),
  markHired: (id, employeeId) => api.post(`${R}/candidates/${id}/hire`, { employeeId }),

  /* ── Interview Rounds ─────────────────────────────────── */
  addInterviewRound: (id, data) => api.post(`${R}/candidates/${id}/interviews`, data),

  /* ── Screening ────────────────────────────────────────── */
  submitScreening: (id, data) => api.post(`${R}/candidates/${id}/screening`, data),

  /* ── Aptitude Test ────────────────────────────────────── */
  sendAptitudeTestLink: (id, testLink) =>
    api.post(`${R}/candidates/${id}/aptitude-test/send`, { test_link: testLink }),
  completeAptitudeTest: (id, score) =>
    api.patch(`${R}/candidates/${id}/aptitude-test/complete`, { score }),

  /* ── Internal Approval ────────────────────────────────── */
  moveToApproval: (id) => api.post(`${R}/candidates/${id}/approval/start`),
  recordApproval: (id, decision) =>
    api.patch(`${R}/candidates/${id}/approval`, { decision }),

  /* ── BGV ──────────────────────────────────────────────── */
  updateBGV: (id, data) => api.patch(`${R}/candidates/${id}/bgv`, data),

  /* ── Offer Release ────────────────────────────────────── */
  releaseOffer: (id) => api.post(`${R}/candidates/${id}/offer/release`),
};

export default recruitmentService;