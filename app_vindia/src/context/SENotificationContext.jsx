// FILE PATH: src/context/SENotificationContext.jsx

import { createContext, useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSENotifications,
  markSENotificationRead,
  markAllSENotificationsRead,
} from "../services/seNotificationService";

export const SENotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000;

export function SENotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchSENotifications();
      setNotifications(data); // backend already returns only is_read=false
    } catch (err) {
      console.error("Failed to load SE notifications:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    timerRef.current = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [loadNotifications]);

  const unreadCount = notifications.length;

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await markSENotificationRead(id);
    } catch (err) {
      console.error("Failed to persist read status:", err.message);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications([]);
    try {
      await markAllSENotificationsRead();
    } catch (err) {
      console.error("Failed to mark all read:", err.message);
      loadNotifications();
    }
  }, [loadNotifications]);

  return (
    <SENotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAllRead, removeNotification, reload: loadNotifications }}
    >
      {children}
    </SENotificationContext.Provider>
  );
}