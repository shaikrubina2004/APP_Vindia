// src/services/modelsService.js
// Mock backend service for 3D Models workflow
// Replace localStorage calls with real API (axios/fetch) when backend is ready

const KEYS = {
  MODELS: "threed_models",
  DRAWINGS: "threed_drawings",
};

// ─── Seed demo data on first load ────────────────────────────────
const seedData = () => {
  if (!localStorage.getItem(KEYS.DRAWINGS)) {
    localStorage.setItem(
      KEYS.DRAWINGS,
      JSON.stringify([
        {
          id: "drw-001",
          title: "Floor Plan — Block A",
          description: "Ground floor layout with structural grid",
          fileName: "block_a_floor_plan.dwg",
          sentByName: "John (Architect)",
          sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          projectName: "Skyline Tower Project",
        },
        {
          id: "drw-002",
          title: "Elevation — East Wing",
          description: "East elevation with facade details",
          fileName: "east_elevation.dwg",
          sentByName: "John (Architect)",
          sentAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          projectName: "Skyline Tower Project",
        },
        {
          id: "drw-003",
          title: "Section Detail — Core",
          description: "Vertical section through the building core",
          fileName: "core_section.pdf",
          sentByName: "Sarah (Architect)",
          sentAt: new Date(Date.now() - 86400000).toISOString(),
          projectName: "Metro Mall Renovation",
        },
      ])
    );
  }

  if (!localStorage.getItem(KEYS.MODELS)) {
    localStorage.setItem(
      KEYS.MODELS,
      JSON.stringify([
        {
          id: "mdl-001",
          title: "Block A — 3D Model v1",
          description: "Initial 3D model based on the floor plan drawing",
          drawingId: "drw-001",
          drawingTitle: "Floor Plan — Block A",
          projectName: "Skyline Tower Project",
          status: "approved",
          version: 1,
          fileName: "block_a_v1.fbx",
          thumbnailColor: "#1e40af",
          createdByName: "Mike (3D Visualizer)",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          submittedAt: new Date(Date.now() - 72000000).toISOString(),
          reviewedByName: "John (Architect)",
          reviewedAt: new Date(Date.now() - 36000000).toISOString(),
          architectComment: "Excellent work! Matches the drawing perfectly.",
        },
        {
          id: "mdl-002",
          title: "East Wing Elevation Model",
          description: "3D model of east wing with full facade detail",
          drawingId: "drw-002",
          drawingTitle: "Elevation — East Wing",
          projectName: "Skyline Tower Project",
          status: "pending_review",
          version: 1,
          fileName: "east_wing.obj",
          thumbnailColor: "#1d4ed8",
          createdByName: "Mike (3D Visualizer)",
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          submittedAt: new Date(Date.now() - 3600000).toISOString(),
          reviewedByName: null,
          reviewedAt: null,
          architectComment: null,
        },
        {
          id: "mdl-003",
          title: "Core Section Draft",
          description: "Rough 3D section through building core",
          drawingId: "drw-003",
          drawingTitle: "Section Detail — Core",
          projectName: "Metro Mall Renovation",
          status: "draft",
          version: 1,
          fileName: "core_draft.fbx",
          thumbnailColor: "#1e3a8a",
          createdByName: "Mike (3D Visualizer)",
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          submittedAt: null,
          reviewedByName: null,
          reviewedAt: null,
          architectComment: null,
        },
      ])
    );
  }
};

// ─── Helpers ──────────────────────────────────────────────────────
const genId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const getAll = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const saveAll = (key, data) =>
  localStorage.setItem(key, JSON.stringify(data));

// ─── Drawings API ─────────────────────────────────────────────────
export const drawingsApi = {
  /** Get all drawings sent by architect */
  getAll: async () => {
    await delay();
    return getAll(KEYS.DRAWINGS);
  },

  getById: async (id) => {
    await delay(200);
    return getAll(KEYS.DRAWINGS).find((d) => d.id === id) || null;
  },
};

// ─── Models API ───────────────────────────────────────────────────
export const modelsApi = {
  /** Get all models */
  getAll: async () => {
    await delay();
    return getAll(KEYS.MODELS);
  },

  getById: async (id) => {
    await delay(200);
    return getAll(KEYS.MODELS).find((m) => m.id === id) || null;
  },

  /** 3D Visualizer creates a new draft model */
  createModel: async (payload) => {
    await delay(600);
    const model = {
      id: genId("mdl"),
      ...payload,
      status: "draft",
      version: 1,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      reviewedByName: null,
      reviewedAt: null,
      architectComment: null,
    };
    const all = getAll(KEYS.MODELS);
    all.unshift(model);
    saveAll(KEYS.MODELS, all);
    return model;
  },

  /** 3D Visualizer submits model for architect review */
  submitForReview: async (id) => {
    await delay(500);
    const all = getAll(KEYS.MODELS);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Model not found");
    if (!["draft", "rejected"].includes(all[idx].status))
      throw new Error("Only draft or rejected models can be submitted");
    all[idx].status = "pending_review";
    all[idx].submittedAt = new Date().toISOString();
    saveAll(KEYS.MODELS, all);
    return all[idx];
  },

  /** Architect approves a model */
  approveModel: async (id, comment = "") => {
    await delay(600);
    const all = getAll(KEYS.MODELS);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Model not found");
    if (all[idx].status !== "pending_review")
      throw new Error("Model is not pending review");
    all[idx].status = "approved";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].architectComment = comment || "Approved.";
    all[idx].reviewedByName = "John (Architect)";
    saveAll(KEYS.MODELS, all);
    return all[idx];
  },

  /** Architect rejects a model (comment required) */
  rejectModel: async (id, comment) => {
    await delay(600);
    if (!comment?.trim()) throw new Error("Rejection comment is required");
    const all = getAll(KEYS.MODELS);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Model not found");
    if (all[idx].status !== "pending_review")
      throw new Error("Model is not pending review");
    all[idx].status = "rejected";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].architectComment = comment;
    all[idx].reviewedByName = "John (Architect)";
    saveAll(KEYS.MODELS, all);
    return all[idx];
  },

  /** Visualizer updates a rejected model before resubmitting */
  updateModel: async (id, updates) => {
    await delay(400);
    const all = getAll(KEYS.MODELS);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Model not found");
    all[idx] = {
      ...all[idx],
      ...updates,
      version: (all[idx].version || 1) + 1,
      status: "draft",
      reviewedAt: null,
      architectComment: null,
    };
    saveAll(KEYS.MODELS, all);
    return all[idx];
  },

  deleteModel: async (id) => {
    await delay(300);
    const filtered = getAll(KEYS.MODELS).filter((m) => m.id !== id);
    saveAll(KEYS.MODELS, filtered);
    return { success: true };
  },
};

// Initialize seed data
seedData();