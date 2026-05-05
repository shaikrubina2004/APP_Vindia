import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const TYPE_CFG = {
  incident: { label: "Incident", color: "#dc2626", bg: "#fef2f2" },
  clash: { label: "Clash", color: "#b45309", bg: "#fffbeb" },
  drawing: { label: "Drawing", color: "#0ea5e9", bg: "#e0f2fe" },
  approval: { label: "Approval", color: "#10b981", bg: "#ecfdf5" },
  task: { label: "Task", color: "#7c3aed", bg: "#f5f3ff" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn: "#f59e0b",
  info: "#2563eb",
  ok: "#10b981",
};

const FILTERS = ["all", "incident", "clash", "drawing", "approval", "task"];

export default function MEPNotificationBell({ userId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [showRead, setShowRead] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/mep-notifications/${userId}`,
      );
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("MEP Notification fetch error:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifs]);

  useEffect(() => {
    window.refreshNotifications = fetchNotifs;
    return () => {
      delete window.refreshNotifications;
    };
  }, [fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await fetch(`http://localhost:5000/api/mep-notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch(
        `http://localhost:5000/api/mep-notifications/read-all/${userId}`,
        { method: "PATCH" },
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoToPage = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    const routes = {
      incident: "/mep/incidents",
      clash: "/mep/shared/drawings",
      drawing: "/mep/shared/drawings",
      approval: "/mep/shared/drawings",
      task: "/mep/incidents?page=tasks",
    };
    navigate(routes[n.type] ?? "/mep/dashboard");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const byType =
    filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadList = byType.filter((n) => !n.is_read);
  const readList = byType.filter((n) => n.is_read);

  const NotifCard = ({ n, dimmed = false }) => {
    const tc = TYPE_CFG[n.type] ?? TYPE_CFG.incident;
    return (
      <div
        className={`notif-item ${dimmed ? "read" : "unread"}`}
        onClick={(e) => handleGoToPage(e, n)}
      >
        <div
          className="notif-item__dot"
          style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }}
        />
        <div className="notif-item__body">
          <div className="notif-item__top">
            <span
              className="notif-type-chip"
              style={{ background: tc.bg, color: tc.color }}
            >
              {tc.label}
            </span>
            <span className="notif-item__time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="notif-unread-dot" />}
          </div>
          <p className="notif-item__title">{n.title}</p>
          <p className="notif-item__desc">{n.description}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        className="navbar-icon-btn notif-bell-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifs();
        }}
        title="Notifications"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-overlay" onClick={() => setOpen(false)}>
          <div className="notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notif-panel__header">
              <div>
                <h3 className="notif-panel__title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="notif-panel__unread">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="notif-close" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="notif-filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="notif-list">
              {unreadList.length === 0 ? (
                <p className="notif-empty">
                  {readList.length === 0
                    ? "You're all caught up ✓"
                    : "No new notifications"}
                </p>
              ) : (
                unreadList.map((n) => (
                  <NotifCard key={n.id} n={n} dimmed={false} />
                ))
              )}

              {readList.length > 0 && (
                <>
                  <button
                    className="notif-show-read-btn"
                    onClick={() => setShowRead((v) => !v)}
                  >
                    {showRead
                      ? "▲ Hide read notifications"
                      : `▼ Show ${readList.length} read notification${readList.length > 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="notif-read-section">
                      {readList.map((n) => (
                        <NotifCard key={n.id} n={n} dimmed={true} />
                      ))}
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
