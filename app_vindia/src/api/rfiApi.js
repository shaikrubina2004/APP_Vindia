// FILE PATH: src/api/rfiApi.js
// ✅ ENHANCED VERSION with better error logging

import axios from "axios";


const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

console.log("📌 API Base URL:", BASE); // Debug

function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  if (!token) {
    console.error("❌ No token found in localStorage");
    return {};
  }

  console.log("✅ Token found, setting auth header"); // Debug
  return {
    Authorization: `Bearer ${token}`,
  };
}

// ── Fetch RFIs (all | sent | received) ───────────────────────────────────────
export const fetchRFIs = async (view = "all") => {
  console.log(`🔥 CALLING RFI API with view: ${view}`);

  try {
    const res = await axios.get(`${BASE}/api/rfis?view=${view}`, {
      headers: authHeaders(),
    });

    console.log("✅ RFI RESPONSE:", res.data);

    const rfis = res.data.rfis || res.data || [];

    return Array.isArray(rfis) ? rfis : [];
  } catch (err) {
    console.error("❌ RFI API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

// ── Fetch single RFI + thread ─────────────────────────────────────────────────
export async function fetchRFIById(id) {
  try {
    const res = await axios.get(`${BASE}/api/rfis/${id}`, {
      headers: authHeaders(),
    });
    console.log("✅ RFI Detail fetched:", res.data);
    return res.data; // { rfi, responses }
  } catch (err) {
    console.error("❌ fetchRFIById ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// ── Create RFI (with optional file) ──────────────────────────────────────────
// ✅ ENHANCED with better error logging
export async function createRFI(formData) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  console.log("📝 Creating RFI...");
  console.log("  Token present:", !!token);
  console.log("  API endpoint:", `${BASE}/api/rfis`);

  try {
    const res = await fetch(`${BASE}/api/rfis`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log("  Response status:", res.status);
    console.log("  Response OK:", res.ok);

    const body = await res.json();
    console.log("  Response body:", body);

    if (!res.ok) {
      console.error("❌ RFI creation failed:", body);
      const errorMsg = body.message || body.error || `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    console.log("✅ RFI created successfully:", body.rfi);
    return body.rfi;
  } catch (err) {
    console.error("❌ createRFI NETWORK/PARSE ERROR:", err.message);
    throw err;
  }
}

// ── Respond to RFI (with optional file) ──────────────────────────────────────
export async function respondToRFI(id, formData) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  try {
    const res = await fetch(`${BASE}/api/rfis/${id}/respond`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const body = await res.json();

    if (!res.ok) {
      console.error("❌ respondToRFI failed:", body);
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    console.log("✅ Response added:", body.response);
    return body.response;
  } catch (err) {
    console.error("❌ respondToRFI ERROR:", err.message);
    throw err;
  }
}

// ── Update RFI status ────────────────────────────────────────────────────────
export async function updateRFIStatus(id, status) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  try {
    const res = await fetch(`${BASE}/api/rfis/${id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error("❌ updateRFIStatus failed:", body);
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    console.log("✅ Status updated:", body.rfi);
    return body.rfi;
  } catch (err) {
    console.error("❌ updateRFIStatus ERROR:", err.message);
    throw err;
  }
}

// ── Role & Project options ────────────────────────────────────────────────────
export const ROLE_OPTIONS = [
  { value: "structural_engineer", label: "Structural Engineer" },
  { value: "mep_engineer", label: "MEP Engineer" },
  { value: "architect", label: "Architect" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "quantity_surveyor", label: "Quantity Surveyor" },
  { value: "site_engineer", label: "Site Engineer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "planning_engineer", label: "Planning Engineer" },
  { value: "qc_engineer", label: "QC Engineer" },
  { value: "safety_officer", label: "Safety Officer" },
  { value: "hr_manager", label: "HR Manager" },
];

export const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);


