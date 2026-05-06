// src/context/NotificationContext.jsx
// Lightweight notification system — no external deps
// Triggers: task assigned, RFI response, incident raised, deadline missed
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../services/api";

const STORAGE_KEY = "se:notifications:v1";

const ls = {
  load: (k) => {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  },
  save: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(
    () => ls.load(STORAGE_KEY) || [],
  );
  const pollRef = useRef(null);
  const alive = useRef(true);

  // Persist to localStorage whenever notifications change
  useEffect(() => {
    ls.save(STORAGE_KEY, notifications.slice(0, 100)); // keep last 100
  }, [notifications]);

  // Poll disabled — role-specific notification bells handle this
  useEffect(() => {
    return () => {
      alive.current = false;
    };
  }, []);

  async function fetchRemote() {
    try {
      const res = await api.get("/notifications");
      if (!alive.current) return;
      const remote = Array.isArray(res?.data) ? res.data : [];
      if (!remote.length) return;
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fresh = remote.filter((n) => !existingIds.has(n.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });
    } catch {
      /* offline — silent */
    }
  }

  // Add a notification locally (for optimistic / client-side triggers)
  const push = useCallback((message, type = "info", meta = {}) => {
    const n = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message,
      type, // "task" | "rfi" | "incident" | "approval" | "deadline" | "material" | "info"
      read: false,
      createdAt: new Date().toISOString(),
      ...meta,
    };
    setNotifications((prev) => [n, ...prev]);
    return n.id;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    api.patch(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post("/notifications/read-all").catch(() => {});
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        push,
        markRead,
        markAllRead,
        dismiss,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  return ctx;
}
