import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./BDANotificationBell.css";

const API = "http://localhost:5000/api";

/* ── Type config — label, colour, icon ── */
const TYPE_CFG = {
  new_lead:          { label: "New Lead",  color: "#2563eb", bg: "#eff6ff",  icon: "👤" },
  followup_today:    { label: "Today",     color: "#ea580c", bg: "#fff7ed",  icon: "📅" },
  followup_overdue:  { label: "Overdue",   color: "#dc2626", bg: "#fef2f2",  icon: "⚠️" },
  followup_upcoming: { label: "Upcoming",  color: "#7c3aed", bg: "#f5f3ff",  icon: "🔔" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn:     "#f59e0b",
  info:     "#2563eb",
  ok:       "#10b981",
};

/* Source icon map */
const SOURCE_ICON = {
  "meta ads":    "📘",
  "justdial":    "📋",
  "google":      "🔍",
  "youtube":     "▶️",
  "website":     "🌐",
  "excel import":"📊",
  "walk-in":     "🚶",
  "referral":    "🤝",
  "manual":      "✏️",
};

function getSourceIcon(description = "") {
  const lower = description.toLowerCase();
  for (const [key, icon] of Object.entries(SOURCE_ICON)) {
    if (lower.includes(key)) return icon;
  }
  return "📌";
}

function formatTime(ts) {
  const d    = new Date(ts);
  const now  = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)    return "Just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ── Route map based on notification type ── */
function getRoute(notif) {
  if (notif.type === "new_lead")          return "/bda/leads";
  if (notif.type === "followup_today")    return "/bda/follow-up";
  if (notif.type === "followup_overdue")  return "/bda/follow-up";
  if (notif.type === "followup_upcoming") return "/bda/follow-up";
  return "/bda/leads";
}

/* ════════════════════════════════════════
   NOTIFICATION BELL COMPONENT
════════════════════════════════════════ */
export default function BDANotificationBell({ bdaEmail }) {
  const navigate = useNavigate();
  const [open,     setOpen]     = useState(false);
  const [notifs,   setNotifs]   = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [showRead, setShowRead] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const params = bdaEmail ? `?bda_email=${encodeURIComponent(bdaEmail)}` : "";
      const res  = await fetch(`${API}/bda-notifications${params}`);
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("BDA notification fetch error:", err);
    }
  }, [bdaEmail]);

  /* Initial + polling every 15s */
  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);
  useEffect(() => {
    const id = setInterval(fetchNotifs, 15000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  /* Expose global refresh (for other components to call) */
  useEffect(() => {
    window.refreshBDANotifications = fetchNotifs;
    return () => { delete window.refreshBDANotifications; };
  }, [fetchNotifs]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await fetch(`${API}/bda-notifications/${id}/read`, { method: "PATCH" });
    } catch (_) {}
  };

  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API}/bda-notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bda_email: bdaEmail }),
      });
    } catch (_) {}
  };

  const handleClick = (e, notif) => {
    e.stopPropagation();
    markRead(notif.id);
    setOpen(false);
    navigate(getRoute(notif));
  };

  /* Filter options */
  const FILTERS = [
    { key: "all",              label: "All" },
    { key: "new_lead",         label: "New Leads" },
    { key: "followup_today",   label: "Today" },
    { key: "followup_overdue", label: "Overdue" },
    { key: "followup_upcoming",label: "Upcoming" },
  ];

  const filteredNotifs = filter === "all"
    ? notifs
    : notifs.filter(n => n.type === filter);

  const unreadList = filteredNotifs.filter(n => !n.is_read);
  const readList   = filteredNotifs.filter(n =>  n.is_read);

  /* ── Single notification card ── */
  const NotifCard = ({ n, dimmed = false }) => {
    const tc  = TYPE_CFG[n.type] ?? TYPE_CFG.new_lead;
    const ico = n.type === "new_lead" ? getSourceIcon(n.description) : tc.icon;

    return (
      <div
        className={`bda-notif-item ${dimmed ? "bda-notif-item--read" : "bda-notif-item--unread"}`}
        onClick={(e) => handleClick(e, n)}
      >
        {/* Severity bar */}
        <div
          className="bda-notif-item__bar"
          style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }}
        />

        <div className="bda-notif-item__icon-wrap" style={{ background: tc.bg }}>
          <span className="bda-notif-item__icon">{ico}</span>
        </div>

        <div className="bda-notif-item__body">
          <div className="bda-notif-item__top">
            <span
              className="bda-notif-type-chip"
              style={{ background: tc.bg, color: tc.color }}
            >
              {tc.label}
            </span>
            <span className="bda-notif-item__time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="bda-notif-unread-dot" />}
          </div>
          <p className="bda-notif-item__title">{n.title}</p>
          <p className="bda-notif-item__desc">{n.description}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Bell button ── */}
      <button
        className="navbar-icon-btn bda-notif-bell-btn"
        title="BDA Notifications"
        onClick={() => {
          setOpen(o => !o);
          if (!open) fetchNotifs();
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="bda-notif-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="bda-notif-overlay" onClick={() => setOpen(false)}>
          <div className="bda-notif-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bda-notif-panel__header">
              <div>
                <h3 className="bda-notif-panel__title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bda-notif-panel__unread">{unreadCount} unread</span>
                )}
              </div>
              <div className="bda-notif-panel__hactions">
                {unreadCount > 0 && (
                  <button className="bda-notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="bda-notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="bda-notif-filters">
              {FILTERS.map(f => {
                const count = f.key === "all"
                  ? notifs.filter(n => !n.is_read).length
                  : notifs.filter(n => n.type === f.key && !n.is_read).length;
                return (
                  <button
                    key={f.key}
                    className={`bda-notif-filter-btn ${filter === f.key ? "active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className="bda-notif-filter-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notification list */}
            <div className="bda-notif-list">
              {unreadList.length === 0 && readList.length === 0 ? (
                <div className="bda-notif-empty">
                  <span className="bda-notif-empty__icon">🔔</span>
                  <p className="bda-notif-empty__text">You're all caught up!</p>
                  <p className="bda-notif-empty__sub">No notifications yet</p>
                </div>
              ) : unreadList.length === 0 ? (
                <p className="bda-notif-no-new">No new notifications</p>
              ) : (
                unreadList.map(n => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button
                    className="bda-notif-show-read-btn"
                    onClick={() => setShowRead(v => !v)}
                  >
                    {showRead
                      ? "▲ Hide read"
                      : `▼ Show ${readList.length} read notification${readList.length !== 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="bda-notif-read-section">
                      {readList.map(n => <NotifCard key={n.id} n={n} dimmed />)}
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