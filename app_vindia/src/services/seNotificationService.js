// FILE PATH: src/services/seNotificationService.js

import api from "./api";

// Fetch all unread notifications for the logged-in SE
export const fetchSENotifications = async () => {
  const res = await api.get("/se-notifications");
  return res.data.notifications;
};

// Fetch just the count (used by dashboard card)
export const fetchSENotificationCount = async () => {
  const res = await api.get("/se-notifications/count");
  return res.data.count; // number
};

// Mark single notification read (called on item click)
export const markSENotificationRead = async (id) => {
  await api.patch(`/se-notifications/${id}/read`);
};

// Mark ALL unread notifications read ("Mark all read" button)
export const markAllSENotificationsRead = async () => {
  await api.patch("/se-notifications/read-all");
};