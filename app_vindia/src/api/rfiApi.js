// FILE PATH: src/api/rfiApi.js

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchRFIs = async (view) => {
  console.log("🔥 CALLING RFI API...");

  const res = await axios.get(`${BASE}/api/rfis?view=${view}`, {
    headers: authHeaders(),
  });
  console.log("✅ RFI RESPONSE:", res.data);

  return res.data.rfis;
};

export const login = async (credentials) => {
  const res = await axios.post("http://localhost:5000/api/auth/login", credentials);

  const data = res.data;

  // 🔥 STORE TOKEN + USER (THIS IS THE FIX)
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};
function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  if (!token) {
    console.error("❌ No token found in localStorage");
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ── Fetch RFIs (all | sent | received) ───────────────────────────────────────

// ── Fetch single RFI + thread ─────────────────────────────────────────────────
export async function fetchRFIById(id) {
  const res = await axios.get(`${BASE}/api/rfis/${id}`, {
    headers: authHeaders(),
  });
  return res.data; // { rfi, responses }
}

// ── Create RFI (with optional file) ──────────────────────────────────────────
export async function createRFI(formData) {
  const res = await fetch(`${BASE}/api/rfis`, {
    method: "POST",
    headers: authHeaders(), // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  if (!res.ok) throw new Error(`createRFI ${res.status}`);
  const body = await res.json();
  return body.rfi;
}

// ── Respond to RFI (with optional file) ──────────────────────────────────────
export async function respondToRFI(id, formData) {
  const res = await fetch(`${BASE}/api/rfis/${id}/respond`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(`respondToRFI ${res.status}`);
  const body = await res.json();
  return body.response;
}

// ── Update RFI status ────────────────────────────────────────────────────────
export async function updateRFIStatus(id, status) {
  const res = await fetch(`${BASE}/api/rfis/${id}/status`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateRFIStatus ${res.status}`);
  const body = await res.json();
  return body.rfi;
}

export const ROLE_OPTIONS = [
  { value: "mep_engineer", label: "MEP Engineer" },
  { value: "architect", label: "Architect" },
  { value: "structural_engineer", label: "Structural Engineer" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "quantity_surveyor", label: "Quantity Surveyor" },
  { value: "site_engineer", label: "Site Engineer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "planning_engineer", label: "Planning Engineer" },
  { value: "qc_engineer", label: "QC Engineer" },
  { value: "safety_officer", label: "Safety Officer" },
];

export const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);
