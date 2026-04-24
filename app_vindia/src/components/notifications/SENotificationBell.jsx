import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSENotifications } from "../../context/useSENotifications";
import "./SENotificationBell.css";

const TYPE_CFG = {
  drawing:  { label: "Drawing",  color: "#0891b2", bg: "#ecfeff" },
  incident: { label: "Incident", color: "#dc2626", bg: "#fef2f2" },
  rfi:      { label: "RFI",      color: "#7c3aed", bg: "#f5f3ff" },
  work:     { label: "Work",     color: "#ca8a04", bg: "#fefce8" },
  approval: { label: "Approval", color: "#0d9488", bg: "#f0fdfa" },
  task:     { label: "Task",     color: "#d97706", bg: "#fffbeb" },
  boq:      { label: "BOQ",      color: "#0369a1", bg: "#e0f2fe" },
  handover: { label: "Handover", color: "#7c3aed", bg: "#f5f3ff" },
  analysis: { label: "Analysis", color: "#059669", bg: "#ecfdf5" },
};

const SEV_COLOR = { critical: "#dc2626", warn: "#f59e0b", info: "#2563eb", ok: "#10b981" };
const FILTERS = ["all", "drawing", "rfi", "incident", "task", "boq", "handover", "work"];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SENotificationBell() {
  // ✅ hook called INSIDE the component — only here, nowhere else
  const { notifications, unreadCount, markAllRead, removeNotification } = useSENotifications();
  const navigate               = useNavigate();
  const [open,   setOpen]      = useState(false);
  const [filter, setFilter]    = useState("all");

  const shown = filter === "all"
    ? notifications
    : notifications.filter(n => n.type === filter);

  const handleItemClick = (n) => {
    removeNotification(n.id);       // remove from list
    setOpen(false);                  // close panel
    if (n.link) navigate(n.link);   // go to page
  };

  return (
    <>
      <button
        className="navbar-icon-btn se-notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="se-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="se-notif-overlay" onClick={() => setOpen(false)}>
          <div className="se-notif-panel" onClick={e => e.stopPropagation()}>

            <div className="se-notif-header">
              <div>
                <h3 className="se-notif-title">Notifications</h3>
                {unreadCount > 0 && <span className="se-notif-unread-label">{unreadCount} unread</span>}
              </div>
              <div className="se-notif-header-actions">
                {unreadCount > 0 && (
                  <button className="se-mark-all-btn" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="se-close-btn" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="se-notif-filters">
              {FILTERS.map(f => (
                <button key={f}
                  className={`se-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}>
                  {f === "rfi" ? "RFI" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== "all" && notifications.filter(n => n.type === f && !n.is_read).length > 0 && (
                    <span className="se-filter-dot" />
                  )}
                </button>
              ))}
            </div>

            <div className="se-notif-list">
              {shown.length === 0 ? (
                <p className="se-notif-empty">No notifications in this category.</p>
              ) : shown.map(n => {
                const tc = TYPE_CFG[n.type] || TYPE_CFG.work;
                return (
                  <div key={n.id}
                    className={`se-notif-item ${n.is_read ? "read" : "unread"} clickable`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className="se-notif-sev-dot" style={{ background: SEV_COLOR[n.severity] }} />
                    <div className="se-notif-body">
                      <div className="se-notif-top">
                        <span className="se-type-chip" style={{ background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                        <span className="se-notif-time">{timeAgo(n.created_at)}</span>
                        {!n.is_read && <span className="se-unread-dot" />}
                      </div>
                      <p className="se-notif-item-title">{n.title}</p>
                      <p className="se-notif-item-desc">{n.description}</p>
                      {n.link && <span className="se-notif-goto">Go to page →</span>}
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