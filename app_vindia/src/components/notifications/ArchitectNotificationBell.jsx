// FILE PATH: src/components/notifications/ArchitectNotificationBell.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bell icon + sliding notification panel for the Architect role.
// Fetches from /api/architect-notifications/:userId
// Marks individual and all notifications as read.
// Navigates to the relevant architect module on click.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./ArchitectNotificationBell.css";

// ── Type config: chip colour per notification type ────────────────────────────
const TYPE_CFG = {
  drawing:   { label: "Drawing",   color: "#0891b2", bg: "#ecfeff" },
  design:    { label: "Design",    color: "#7c3aed", bg: "#f5f3ff" },
  rfi:       { label: "RFI",       color: "#2563eb", bg: "#eff6ff" },
  approval:  { label: "Approval",  color: "#0d9488", bg: "#f0fdfa" },
  task:      { label: "Task",      color: "#d97706", bg: "#fffbeb" },
  incident:  { label: "Incident",  color: "#dc2626", bg: "#fef2f2" },
  milestone: { label: "Milestone", color: "#0891b2", bg: "#ecfeff" },
  log:       { label: "Daily Log", color: "#059669", bg: "#ecfdf5" },
  assign:    { label: "Assign",    color: "#9333ea", bg: "#faf5ff" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn:     "#f59e0b",
  info:     "#0891b2",
  ok:       "#10b981",
};

const FILTERS = ["all", "drawing", "design", "rfi", "approval", "task", "incident", "log"];

// ── Time formatter ─────────────────────────────────────────────────────────────
function formatTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1)    return "Just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  const days = Math.floor(diff / 1440);
  if (days < 7)    return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Route mapping per notification type ───────────────────────────────────────
const ROUTES = {
  drawing:   "/architect/designs",
  design:    "/architect/designs",
  rfi:       "/architect/rfi",
  approval:  "/architect/assign",
  task:      "/architect/incidents?page=tasks",
  incident:  "/architect/incidents",
  milestone: "/architect/dashboard",
  log:       "/architect/logs",
  assign:    "/architect/assign",
};

export default function ArchitectNotificationBell({ userId }) {
  const navigate = useNavigate();

  const [open,     setOpen]     = useState(false);
  const [filter,   setFilter]   = useState("all");
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showRead, setShowRead] = useState(false);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:5000/api/architect-notifications/${userId}`);
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Architect notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // Poll every 10 seconds
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 10_000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifs]);

  // Expose global refresh so other components can trigger it
  // Usage: window.refreshArchitectNotifications?.()
  useEffect(() => {
  window.refreshArchitectNotifications = fetchNotifs;
  window.refreshNotifications = fetchNotifs;
  return () => {
    delete window.refreshArchitectNotifications;
    delete window.refreshNotifications;               // ✅ add this
  };
}, [fetchNotifs]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const unreadCount = notifs.filter(n => !n.is_seen).length;

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = async (id) => {
    // Optimistic update
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_seen: true } : n));
    try {
      await fetch(`http://localhost:5000/api/architect-notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_seen: true })));
    try {
      await fetch(`http://localhost:5000/api/architect-notifications/read-all/${userId}`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  // ── Navigate on click ──────────────────────────────────────────────────────
  const handleItemClick = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    navigate(n.link || ROUTES[n.type] || "/architect/dashboard");
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const byType     = filter === "all" ? notifs : notifs.filter(n => n.type === filter);
  const unreadList = byType.filter(n => !n.is_seen);
  const readList   = byType.filter(n =>  n.is_seen);

  // ── Notification card sub-component ───────────────────────────────────────
  const NotifCard = ({ n, dimmed = false }) => {
    const tc = TYPE_CFG[n.type] ?? { label: n.type, color: "#64748b", bg: "#f1f5f9" };
    return (
      <div
        className={`arch-notif-item ${dimmed ? "read" : "unread"}`}
        onClick={(e) => handleItemClick(e, n)}
      >
        <div
          className="arch-notif-item__dot"
          style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }}
        />
        <div className="arch-notif-item__body">
          <div className="arch-notif-item__top">
            <span
              className="arch-notif-type-chip"
              style={{ background: tc.bg, color: tc.color }}
            >
              {tc.label}
            </span>
            <span className="arch-notif-item__time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="arch-notif-unread-dot" />}
          </div>
          <p className="arch-notif-item__title">{n.title}</p>
          {n.description && (
            <p className="arch-notif-item__desc">{n.description}</p>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Bell button */}
      <button
        className="navbar-icon-btn arch-notif-bell-btn"
        onClick={() => {
          setOpen(o => !o);
          if (!open) fetchNotifs();
        }}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="arch-notif-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* Panel overlay */}
      {open && (
        <div className="arch-notif-overlay" onClick={() => setOpen(false)}>
          <div className="arch-notif-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="arch-notif-panel__header">
              <div>
                <h3 className="arch-notif-panel__title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="arch-notif-panel__unread">{unreadCount} unread</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="arch-notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="arch-notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            {/* Filters */}
            <div className="arch-notif-filters">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`arch-notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : (TYPE_CFG[f]?.label ?? f.charAt(0).toUpperCase() + f.slice(1))}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="arch-notif-list">
              {loading && notifs.length === 0 ? (
                <p className="arch-notif-loading">Loading notifications…</p>
              ) : unreadList.length === 0 ? (
                <p className="arch-notif-empty">
                  {readList.length === 0 ? "You're all caught up ✓" : "No new notifications"}
                </p>
              ) : (
                unreadList.map(n => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button
                    className="arch-notif-show-read-btn"
                    onClick={() => setShowRead(v => !v)}
                  >
                    {showRead
                      ? "▲ Hide read notifications"
                      : `▼ Show ${readList.length} read notification${readList.length !== 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="arch-notif-read-section">
                      {readList.map(n => <NotifCard key={n.id} n={n} dimmed={true} />)}
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