// FILE PATH: src/context/SENotificationProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Provider for SE notifications.
// • Polls /api/se-notifications every 60 s
// • NO static / dummy data — only real DB notifications appear
// • removeNotification  → optimistic UI removal + PATCH /:id/read
// • markAllRead         → clears list + PATCH /read-all
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { SENotificationContext }                    from "./SENotificationContext";
import {
  fetchSENotifications,
  markSENotificationRead,
  markAllSENotificationsRead,
} from "../services/seNotificationService";

const POLL_MS = 60_000; // poll every 60 seconds

export function SENotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const timerRef                          = useRef(null);

  // ── Load from backend ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await fetchSENotifications();
      // data is already filtered to is_read=false by the backend
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silently fail — don't crash the layout.
      // Empty array means bell shows 0, which is accurate when offline.
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