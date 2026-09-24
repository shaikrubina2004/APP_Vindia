// FILE PATH: src/components/notifications/ThreeDVisualizerNotificationBell.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bell icon + sliding notification panel for the 3D Visualizer role.
// Fetches from /api/3d-notifications/:userId (JWT-protected, uses the shared
// authenticated axios instance so the token is always attached).
// Fires when the architect approves or rejects a submitted model.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./ThreeDVisualizerNotificationBell.css";

const TYPE_CFG = {
  review:   { label: "Review",   color: "#7c3aed", bg: "#f5f3ff" },
  model:    { label: "Model",    color: "#0891b2", bg: "#ecfeff" },
  incident: { label: "Incident", color: "#dc2626", bg: "#fef2f2" },
  task:     { label: "Task",     color: "#d97706", bg: "#fffbeb" },
  rfi:      { label: "RFI",      color: "#2563eb", bg: "#eff6ff" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn:     "#f59e0b",
  info:     "#0891b2",
  ok:       "#10b981",
};

const FILTERS = ["all", "review", "model", "incident", "task", "rfi"];

const ROUTES = {
  review:   "/3d-visualizer/models",
  model:    "/3d-visualizer/models",
  incident: "/3d-visualizer/incidents",
  task:     "/3d-visualizer/incidents?page=tasks",
  rfi:      "/3d-visualizer/rfi",
};

function formatTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  const days = Math.floor(diff / 1440);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ThreeDVisualizerNotificationBell({ userId }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRead, setShowRead] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/3d-notifications/${userId}`);
      setNotifs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("3D notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 15_000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifs]);

  useEffect(() => {
    window.refreshThreeDVisualizerNotifications = fetchNotifs;
    return () => { delete window.refreshThreeDVisualizerNotifications; };
  }, [fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_seen).length;

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_seen: true } : n)));
    try {
      await api.patch(`/3d-notifications/${id}/read`);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, is_seen: true })));
    try {
      await api.patch(`/3d-notifications/read-all/${userId}`);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleItemClick = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    navigate(n.link || ROUTES[n.type] || "/3d-visualizer/dashboard");
  };

  const byType = filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadList = byType.filter((n) => !n.is_seen);
  const readList = byType.filter((n) => n.is_seen);

  const NotifCard = ({ n, dimmed = false }) => {
    const tc = TYPE_CFG[n.type] ?? { label: n.type, color: "#64748b", bg: "#f1f5f9" };
    return (
      <div
        className={`tdv-notif-item ${dimmed ? "read" : "unread"}`}
        onClick={(e) => handleItemClick(e, n)}
      >
        <div
          className="tdv-notif-item__dot"
          style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }}
        />
        <div className="tdv-notif-item__body">
          <div className="tdv-notif-item__top">
            <span className="tdv-notif-type-chip" style={{ background: tc.bg, color: tc.color }}>
              {tc.label}
            </span>
            <span className="tdv-notif-item__time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="tdv-notif-unread-dot" />}
          </div>
          <p className="tdv-notif-item__title">{n.title}</p>
          {n.description && <p className="tdv-notif-item__desc">{n.description}</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        className="navbar-icon-btn tdv-notif-bell-btn"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifs(); }}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="tdv-notif-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="tdv-notif-overlay" onClick={() => setOpen(false)}>
          <div className="tdv-notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tdv-notif-panel__header">
              <div>
                <h3 className="tdv-notif-panel__title">Notifications</h3>
                {unreadCount > 0 && <span className="tdv-notif-panel__unread">{unreadCount} unread</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="tdv-notif-mark-all" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="tdv-notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="tdv-notif-filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`tdv-notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : (TYPE_CFG[f]?.label ?? f)}
                </button>
              ))}
            </div>

            <div className="tdv-notif-list">
              {loading && notifs.length === 0 ? (
                <p className="tdv-notif-loading">Loading notifications…</p>
              ) : unreadList.length === 0 ? (
                <p className="tdv-notif-empty">
                  {readList.length === 0 ? "You're all caught up ✓" : "No new notifications"}
                </p>
              ) : (
                unreadList.map((n) => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button className="tdv-notif-show-read-btn" onClick={() => setShowRead((v) => !v)}>
                    {showRead
                      ? "▲ Hide read notifications"
                      : `▼ Show ${readList.length} read notification${readList.length !== 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="tdv-notif-read-section">
                      {readList.map((n) => <NotifCard key={n.id} n={n} dimmed={true} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}