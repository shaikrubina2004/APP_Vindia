// FILE PATH: src/context/SENotificationProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Provider for SE notifications.
// • Polls /api/se-notifications every 60 s
// • NO static / dummy data — only real DB notifications appear
// • removeNotification  → optimistic UI removal + PATCH /:id/read
// • markAllRead         → clears list + PATCH /read-all
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { SENotificationContext } from "./SENotificationContext";
import {
  fetchSENotifications,
  markSENotificationRead,
  markAllSENotificationsRead,
} from "../services/seNotificationService";

const POLL_MS = 60_000; // poll every 60 seconds

export function SENotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  // ── Load from backend ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      console.log("📡 [SE NOTIF] Fetching SE notifications..."); // ← Add
      const data = await fetchSENotifications();

      console.log("✅ [SE NOTIF] Received:", data.length, "notifications"); // ← Add
      console.log("🔍 [SE NOTIF] Sample notification:", data[0]); // ← Add

      // Verify all have correct role
      const wrongRole = data.filter(
        (n) => n.role && n.role !== "structural_engineer",
      );
      if (wrongRole.length > 0) {
        console.error("❌ [SE NOTIF] FOUND WRONG ROLE:", wrongRole); // ← Add
      }

      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("SE notifications unavailable:", err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const unreadCount = notifications.length; // all fetched items are unread

  // ── Remove one notification (click → marks read in DB + removes from UI) ──
  const removeNotification = useCallback(async (id) => {
    // Optimistic: remove from list immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await markSENotificationRead(id);
    } catch (err) {
      console.warn("Could not persist read status:", err.message);
      // Don't restore — UI already looks clean; next poll will reconcile
    }
  }, []);

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications([]);
    try {
      await markAllSENotificationsRead();
    } catch (err) {
      console.warn("Could not mark all read:", err.message);
      // Re-fetch so the badge is accurate
      load();
    }
  }, [load]);

  return (
    <SENotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        removeNotification,
        markAllRead,
        refresh: load,
      }}
    >
      {children}
    </SENotificationContext.Provider>
  );
}
