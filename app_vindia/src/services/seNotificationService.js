// FILE PATH: src/services/seNotificationService.js
// ─────────────────────────────────────────────────────────────────────────────
// All API calls for SE notifications.
// Reads the JWT token from localStorage (same key your auth flow uses).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Read the JWT stored by your login flow */
function getToken() {
  // Adjust the key to match what you store in localStorage on login
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization:  `Bearer ${getToken()}`,
  };
}

// ── Fetch unread notifications ────────────────────────────────────────────────
export async function fetchSENotifications() {
  const res = await fetch(`${BASE}/api/se-notifications`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`fetchSENotifications: ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  // backend returns { success, notifications }
  return body.notifications || [];
}

// ── Mark a single notification read ──────────────────────────────────────────
export async function markSENotificationRead(id) {
  // Static IDs (strings like "s1") are local-only; skip the API call
  if (typeof id === "string" && isNaN(Number(id))) return;

  const res = await fetch(`${BASE}/api/se-notifications/${id}/read`, {
    method:  "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`markSENotificationRead: ${res.status}`);
  }
}

// ── Mark all notifications read ───────────────────────────────────────────────
export async function markAllSENotificationsRead() {
  const res = await fetch(`${BASE}/api/se-notifications/read-all`, {
    method:  "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`markAllSENotificationsRead: ${res.status}`);
  }
}

// ── Get unread count (used by dashboard card) ─────────────────────────────────
export async function fetchSENotificationCount() {
  const res = await fetch(`${BASE}/api/se-notifications/count`, {
    headers: authHeaders(),
  });

  if (!res.ok) return 0;

  const body = await res.json();
  return body.count || 0;
}