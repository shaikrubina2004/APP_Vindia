import api from "./api";

export const fetchSENotifications = async () => {
  const res = await api.get("/se-notifications");   // ← must match server.js
  return res.data.notifications;
};

export const markSENotificationRead = async (id) => {
  if (String(id).startsWith("se") || String(id).startsWith("daily-")) return;
  await api.patch(`/se-notifications/${id}/read`);
};