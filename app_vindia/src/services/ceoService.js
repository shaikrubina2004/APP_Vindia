// src/services/ceoService.js
// All CEO-only API calls in one place (JWT is added by the shared axios client).
import API from "./authService";

export const getCeoDashboard = (projectId, fresh) =>
  API.get("/ceo/dashboard", { params: { ...(projectId ? { projectId } : {}), ...(fresh ? { fresh: 1 } : {}) } }).then((r) => r.data);

export const getManagerUpdates = (params = {}) =>
  API.get("/ceo/manager-updates", { params }).then((r) => r.data);

export const getManagerTodayStatus = () =>
  API.get("/ceo/manager-updates/today").then((r) => r.data);

export const reviewFinanceUpdate = (id, status, review_note) =>
  API.put(`/ceo/manager-updates/finance/${id}/review`, { status, review_note }).then((r) => r.data);

export const reviewManagerReport = (id, status, ceo_comment) =>
  API.put(`/manager-reports/${id}/review`, { status, ceo_comment }).then((r) => r.data);

export const getCeoNotifications = () => API.get("/ceo-notifications").then((r) => r.data);
export const markCeoNotificationRead = (id) => API.patch(`/ceo-notifications/${id}/read`);
export const markAllCeoNotificationsRead = () => API.patch("/ceo-notifications/read-all");

/* ── shared formatters ── */
export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const inrShort = (n) => {
  const v = Number(n || 0), a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${s}₹${a}`;
};

export const cap = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); return dd < 7 ? `${dd}d ago` : fmtDate(d);
};