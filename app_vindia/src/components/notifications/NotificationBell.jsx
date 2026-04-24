import { useState, useEffect } from "react";
import "./NotificationBell.css";

const TYPE_CFG = {
  payment:  { label: "Payment",  color: "#2563eb", bg: "#eff6ff" },
  incident: { label: "Incident", color: "#dc2626", bg: "#fef2f2" },
  work:     { label: "Work",     color: "#ca8a04", bg: "#fefce8" },
  approval: { label: "Approval", color: "#7c3aed", bg: "#f5f3ff" },
};
export default function NotificationBell({ notifications = [] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
const [notifs, setNotifs] = useState([]);

useEffect(() => {
  setNotifs(notifications);
}, [notifications]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));

  const shown = filter === "all"
    ? notifs
    : notifs.filter(n => n.type === filter);

    const SEV_COLOR = { critical: "#dc2626", warn: "#f59e0b", info: "#2563eb", ok: "#10b981" };

  return (
    <>
      {/* BELL BUTTON — same class as existing navbar icon btns */}
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

      {/* PANEL OVERLAY */}
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
              {["all", "payment", "incident", "work", "approval"].map(f => (
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
  <p className="notif-empty">
    No alerts in this category.
  </p>
)}
              {shown.map(n => {
                const tc = TYPE_CFG[n.type] || TYPE_CFG.work;
                return (
                  <div key={n.id}
                    className={`notif-item ${n.read ? "read" : "unread"}`}
                    onClick={() => markRead(n.id)}>
                    <div className="notif-item__dot"
                      style={{ background: SEV_COLOR[n.severity] }} />
                    <div className="notif-item__body">
                      <div className="notif-item__top">
                        <span className="notif-type-chip"
                          style={{ background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                        <span className="notif-item__time">{n.time}</span>
                        {!n.read && <span className="notif-unread-dot" />}
                      </div>
                      <p className="notif-item__title">{n.title}</p>
                      <p className="notif-item__desc">{n.desc}</p>
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
