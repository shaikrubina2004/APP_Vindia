// src/services/modelsService.js
// Real backend-backed service for the 3D Models workflow.
// Uses the project's centralized authenticated Axios instance (src/services/api.js)
// so the JWT is always attached — no localStorage is used for model data.
import api from "./api";
import { getDrawings } from "./architectDesignService";

// ─── Helpers: map backend row -> the shape Model.jsx already expects ──────
const mapModel = (m) => ({
  id: m.id,
  title: m.title,
  description: m.description,
  drawingId: m.drawing_id,
  drawingTitle: m.drawing_name || "—",
  projectId: m.project_id,
  projectName: m.project_name || "—",
  status: m.status,
  version: m.version || 1,
  fileName: m.file_name,
  fileUrl: m.file_url,
  fileType: m.file_type,
  fileSize: m.file_size,
  notes: m.notes,
  thumbnailColor: "#1e40af",
  createdBy: m.created_by,
  createdByName: m.created_by_name || "—",
  createdAt: m.created_at,
  updatedAt: m.updated_at,
  submittedAt: m.submitted_at,
  reviewedByName: m.reviewed_by_name || null,
  reviewedAt: m.reviewed_at,
  architectComment: m.architect_feedback,
});

const mapDrawing = (d) => ({
  id: d.id,
  title: d.name || d.drawing_name || "Untitled drawing",
  description: d.description || "",
  fileName: d.file_name,
  fileUrl: d.file_url,
  sentByName: d.created_by_name || "Architect",
  sentAt: d.created_at,
  projectId: d.project_id,
  projectName: d.project_name || "—",
});

// ─── Drawings API (drawings shared with the 3D Visualizer) ────────────────
export const drawingsApi = {
  getAll: async () => {
    const res = await getDrawings();
    const rows = res?.data?.data || res?.data || [];
    return (Array.isArray(rows) ? rows : []).map(mapDrawing);
  },
  getById: async (id) => {
    const all = await drawingsApi.getAll();
    return all.find((d) => String(d.id) === String(id)) || null;
  },
};

// ─── Models API ─────────────────────────────────────────────────────────
export const modelsApi = {
  getAll: async (params = {}) => {
    const res = await api.get("/3d-models", { params });
    return (res.data?.models || []).map(mapModel);
  },

  getById: async (id) => {
    const res = await api.get(`/3d-models/${id}`);
    return {
      ...mapModel(res.data.model),
      history: (res.data.history || []).map((h) => ({
        version: h.version,
        fileName: h.file_name,
        fileUrl: h.file_url,
        status: h.status,
        note: h.note,
        createdByName: h.created_by_name,
        createdAt: h.created_at,
      })),
    };
  },

  getStatsSummary: async () => {
    const res = await api.get("/3d-models/stats/summary");
    return res.data.summary;
  },

  /** Upload the actual model file first; returns { file_url, file_name, file_type, file_size } */
  uploadFile: async (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/3d-models/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (evt) => onProgress(Math.round((evt.loaded * 100) / (evt.total || 1)))
        : undefined,
    });
    return res.data;
  },

  /** 3D Visualizer creates a new draft model. payload must include an already-uploaded file_url. */
  createModel: async (payload) => {
    const res = await api.post("/3d-models", {
      title: payload.title,
      description: payload.description,
      project_id: payload.projectId || null,
      drawing_id: payload.drawingId || null,
      file_name: payload.fileName,
      file_url: payload.fileUrl,
      file_type: payload.fileType,
      file_size: payload.fileSize,
      notes: payload.notes,
    });
    return mapModel(res.data.model);
  },

  /** Visualizer edits a draft/rejected model; if a new file is passed, this creates a new version */
  updateModel: async (id, updates) => {
    const res = await api.patch(`/3d-models/${id}`, {
      title: updates.title,
      description: updates.description,
      project_id: updates.projectId,
      drawing_id: updates.drawingId,
      file_name: updates.fileName,
      file_url: updates.fileUrl,
      file_type: updates.fileType,
      file_size: updates.fileSize,
      notes: updates.notes,
    });
    return mapModel(res.data.model);
  },

  /** 3D Visualizer submits model for architect review */
  submitForReview: async (id) => {
    const res = await api.post(`/3d-models/${id}/submit`);
    return mapModel(res.data.model);
  },

  /** Architect approves a model */
  approveModel: async (id, comment = "") => {
    const res = await api.post(`/3d-models/${id}/approve`, { comment });
    return mapModel(res.data.model);
  },

  /** Architect rejects a model (comment required) */
  rejectModel: async (id, comment) => {
    const res = await api.post(`/3d-models/${id}/reject`, { comment });
    return mapModel(res.data.model);
  },

  deleteModel: async (id) => {
    await api.delete(`/3d-models/${id}`);
    return { success: true };
  },
};