// FILE PATH: src/api/rfiApi.js

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  return { Authorization: `Bearer ${token}` };
}

// ── Fetch RFIs (all | sent | received) ───────────────────────────────────────
export async function fetchRFIs(view = "all") {
  const res = await fetch(`${BASE}/api/rfis?view=${view}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`fetchRFIs ${res.status}`);
  const body = await res.json();
  return body.rfis || [];
}

// ── Fetch single RFI + thread ─────────────────────────────────────────────────
export async function fetchRFIById(id) {
  const res = await fetch(`${BASE}/api/rfis/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`fetchRFIById ${res.status}`);
  return res.json(); // { rfi, responses }
}

// ── Create RFI (with optional file) ──────────────────────────────────────────
export async function createRFI(formData) {
  const res = await fetch(`${BASE}/api/rfis`, {
    method:  "POST",
    headers: authHeaders(), // no Content-Type — browser sets multipart boundary
    body:    formData,
  });
  if (!res.ok) throw new Error(`createRFI ${res.status}`);
  const body = await res.json();
  return body.rfi;
}

// ── Respond to RFI (with optional file) ──────────────────────────────────────
export async function respondToRFI(id, formData) {
  const res = await fetch(`${BASE}/api/rfis/${id}/respond`, {
    method:  "POST",
    headers: authHeaders(),
    body:    formData,
  });
  if (!res.ok) throw new Error(`respondToRFI ${res.status}`);
  const body = await res.json();
  return body.response;
}

// ── Update RFI status ────────────────────────────────────────────────────────
export async function updateRFIStatus(id, status) {
  const res = await fetch(`${BASE}/api/rfis/${id}/status`, {
    method:  "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateRFIStatus ${res.status}`);
  const body = await res.json();
  return body.rfi;
}

export const ROLE_OPTIONS = [
  { value: "mep_engineer",        label: "MEP Engineer" },
  { value: "architect",           label: "Architect" },
  { value: "structural_engineer", label: "Structural Engineer" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "quantity_surveyor",   label: "Quantity Surveyor" },
  { value: "site_engineer",       label: "Site Engineer" },
  { value: "project_manager",     label: "Project Manager" },
  { value: "planning_engineer",   label: "Planning Engineer" },
  { value: "qc_engineer",         label: "QC Engineer" },
  { value: "safety_officer",      label: "Safety Officer" },
];

export const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);