// FILE PATH: src/components/notifications/SiteEngineerNotificationBell.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Per-user notification bell for the Site Engineer role — same design as
// OperationsNotificationBell.jsx (Logistics Coordinator / Inventory
// Controller): plain local state + fetch, no Context/Provider needed.
// `routes` maps a notification `type` to the page it should open.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./SiteEngineerNotificationBell.css";

const TYPE_CFG = {
  rfi:         { label: "RFI",         color: "#7c3aed", bg: "#f5f3ff" },
  incident:    { label: "Incident",    color: "#dc2626", bg: "#fef2f2" },
  task:        { label: "Task",        color: "#d97706", bg: "#fffbeb" },
  approval:    { label: "Approval",    color: "#0d9488", bg: "#f0fdfa" },
  material:    { label: "Material",    color: "#49769F", bg: "#e6f1fb" },
  snag:        { label: "Snag",        color: "#ba7517", bg: "#faeeda" },
  si:          { label: "Site Instr.", color: "#7B4FA6", bg: "#f3edf8" },
  measurement: { label: "Measurement", color: "#5DCAA5", bg: "#e1f5ee" },
  work:        { label: "Work",        color: "#ca8a04", bg: "#fefce8" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn: "#f59e0b",
  info: "#2563eb",
  ok: "#10b981",
};

const FILTERS = ["all", "rfi", "incident", "approval", "material", "snag", "si", "work"];

/**
 * routes = {
 *   default: "/site-engineer/dashboard",
 *   rfi: "/site-engineer/rfi",
 *   incident: "/site-engineer/incidents",
 *   ...
 * }
 */
export default function SiteEngineerNotificationBell({ userId, routes = {} }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [showRead, setShowRead] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/site-engineer-notifications/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Notification fetch error:", err);
    }
  }, [userId]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  const markRead = async (id) => {
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await fetch(`http://localhost:5000/api/site-engineer-notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch(`http://localhost:5000/api/site-engineer-notifications/read-all/${userId}`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch (err) { console.error(err); }
  };

  const handleGoToPage = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    navigate(n.link || routes[n.type] || routes.default || "/site-engineer/dashboard");
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

  const byType = filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadList = byType.filter((n) => !n.is_read);
  const readList = byType.filter((n) => n.is_read);

  const NotifCard = ({ n, dimmed = false }) => {
    const tc = TYPE_CFG[n.type] ?? TYPE_CFG.work;
    return (
      <div className={`sen-notif-item ${dimmed ? "read" : "unread"} clickable`} onClick={(e) => handleGoToPage(e, n)}>
        <div className="sen-notif-sev-dot" style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }} />
        <div className="sen-notif-body">
          <div className="sen-notif-top">
            <span className="sen-type-chip" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
            <span className="sen-notif-time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="sen-unread-dot" />}
          </div>
          <p className="sen-notif-item-title">{n.title}</p>
          <p className="sen-notif-item-desc">{n.description}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        className="navbar-icon-btn sen-notif-bell-btn"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifs(); }}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="sen-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="sen-notif-overlay" onClick={() => setOpen(false)}>
          <div className="sen-notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sen-notif-header">
              <div>
                <h3 className="sen-notif-title">Notifications</h3>
                {unreadCount > 0 && <span className="sen-notif-unread-label">{unreadCount} unread</span>}
              </div>
              <div className="sen-notif-header-actions">
                {unreadCount > 0 && (
                  <button className="sen-mark-all-btn" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="sen-close-btn" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="sen-notif-filters">
              {FILTERS.map((f) => {
                const count = f === "all" ? notifs.length : notifs.filter((n) => n.type === f).length;
                return (
                  <button
                    key={f}
                    className={`sen-filter-btn ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === "rfi" ? "RFI" : f === "si" ? "Site Instr." : f.charAt(0).toUpperCase() + f.slice(1)}
                    {count > 0 && f !== "all" && <span className="sen-filter-dot" />}
                  </button>
                );
              })}
            </div>

            <div className="sen-notif-list">
              {unreadList.length === 0 ? (
                <p className="sen-notif-empty">
                  {readList.length === 0 ? "You're all caught up! No new notifications." : "No new notifications."}
                </p>
              ) : (
                unreadList.map((n) => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button className="sen-mark-all-btn" style={{ width: "100%", padding: "8px 14px" }} onClick={() => setShowRead((v) => !v)}>
                    {showRead ? "▲ Hide read notifications" : `▼ Show ${readList.length} read notification${readList.length > 1 ? "s" : ""}`}
                  </button>
                  {showRead && readList.map((n) => <NotifCard key={n.id} n={n} dimmed={true} />)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
