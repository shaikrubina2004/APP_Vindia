const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken") || // 🔥 fallback
    ""
  );
}

function authHeaders() {
  const token = getToken();

  if (!token) {
    console.warn("⚠️ No token found in localStorage");
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Fetch notifications ─────────────────────────────
export async function fetchSENotifications() {
  const res = await fetch(`${BASE}/api/se-notifications`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    console.error("❌ Fetch notifications failed:", res.status);
    return [];
  }

  const body = await res.json();
  console.log("✅ API RESPONSE:", body);

  return body.notifications || [];
}

// ── Mark one read ───────────────────────────────────
export async function markSENotificationRead(id) {
  if (typeof id === "string" && isNaN(Number(id))) return;

  const res = await fetch(`${BASE}/api/se-notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    console.error("❌ mark read failed:", res.status);
  }
}

// ── Mark all read ───────────────────────────────────
export async function markAllSENotificationsRead() {
  const res = await fetch(`${BASE}/api/se-notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    console.error("❌ mark all failed:", res.status);
  }
}

// ── Count ───────────────────────────────────────────
export async function fetchSENotificationCount() {
  const res = await fetch(`${BASE}/api/se-notifications/count`, {
    headers: authHeaders(),
  });

  if (!res.ok) return 0;

  const body = await res.json();
  return body.count || 0;
}