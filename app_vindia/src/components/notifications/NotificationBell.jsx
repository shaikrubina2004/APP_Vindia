import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const TYPE_CFG = {
  payment:  { label: "Payment",   color: "#2563eb", bg: "#eff6ff" },
  incident: { label: "Incident",  color: "#dc2626", bg: "#fef2f2" },
  work:     { label: "Work",      color: "#ca8a04", bg: "#fefce8" },
  task:     { label: "Task",      color: "#7c3aed", bg: "#f5f3ff" },
  milestone:{ label: "Milestone", color: "#0891b2", bg: "#ecfeff" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn:     "#f59e0b",
  info:     "#2563eb",
  ok:       "#10b981",
};

export default function NotificationBell({ userId, onMarkRead, onMarkAllRead }) {
  const navigate = useNavigate();
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);

  // ── Fetch from backend ──
  const fetchNotifs = async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`/api/pc-notifications/${userId}`);
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Notification fetch error:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifs();
  }, [userId]);

  // ── Poll every 30 seconds ──
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await fetch(`/api/pc-notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`/api/pc-notifications/read-all/${userId}`, { method: "PATCH" });
    } catch (err) {
      console.error(err);
    }
  };

  const shown = filter === "all"
    ? notifs
    : notifs.filter(n => n.type === filter);

  const handleGoToPage = (e, link, id) => {
    e.stopPropagation();
    markRead(id);
    setOpen(false);
    navigate(link);
  };

  // ── Time formatter ──
  const formatTime = (ts) => {
    const d    = new Date(ts);
    const now  = new Date();
    const diff = Math.floor((now - d) / 60000); // minutes
    if (diff < 1)  return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <>
      {/* Bell Button */}
      <button
        className="navbar-icon-btn notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="notif-overlay" onClick={() => setOpen(false)}>
          <div className="notif-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="notif-panel__header">
              <div>
                <h3 className="notif-panel__title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="notif-panel__unread">{unreadCount} unread</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            {/* Filters */}
            <div className="notif-filters">
              {["all", "milestone", "work", "incident", "task", "payment"].map(f => (
                <button key={f}
                  className={`notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="notif-list">
              {shown.length === 0 && (
                <p className="notif-empty">No alerts in this category.</p>
              )}
              {shown.map(n => {
                const tc = TYPE_CFG[n.type] || TYPE_CFG.work;
                return (
                  <div key={n.id}
                    className={`notif-item ${n.is_read ? "read" : "unread"}`}
                    onClick={() => markRead(n.id)}>
                    <div className="notif-item__dot"
                      style={{ background: SEV_COLOR[n.severity] || SEV_COLOR.info }} />
                    <div className="notif-item__body">
                      <div className="notif-item__top">
                        <span className="notif-type-chip"
                          style={{ background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                        <span className="notif-item__time">
                          {formatTime(n.created_at)}
                        </span>
                        {!n.is_read && <span className="notif-unread-dot" />}
                      </div>
                      <p className="notif-item__title">{n.title}</p>
                      <p className="notif-item__desc">{n.description}</p>
                      {n.link && (
                        <button
                          className="notif-goto"
                          onClick={(e) => handleGoToPage(e, n.link, n.id)}>
                          Go to page →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </>
  );
}