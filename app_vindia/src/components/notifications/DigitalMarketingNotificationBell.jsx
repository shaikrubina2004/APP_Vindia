// FILE PATH: src/components/notifications/DigitalMarketingNotificationBell.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bell icon + sliding notification panel for the Digital Marketing role.
// Fetches from /api/dm-notifications (JWT-protected: requireRole("digital_marketing","ceo"))
// via the shared authenticated axios instance so the token is always attached —
// a plain fetch() here would 401 since these routes require a Bearer token.
// The feed itself is team-wide (new leads, campaign events, budget warnings),
// not per-user, matching digitalMarketingNotificationsController.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./DigitalMarketingNotificationBell.css";

const TYPE_CFG = {
  new_marketing_lead:       { label: "New Lead",  color: "#059669", bg: "#ecfdf5" },
  campaign_started:         { label: "Campaign",  color: "#0891b2", bg: "#ecfeff" },
  campaign_completed:       { label: "Campaign",  color: "#0891b2", bg: "#ecfeff" },
  campaign_budget_warning:  { label: "Budget",    color: "#dc2626", bg: "#fef2f2" },
};

const FILTERS = ["all", "new_marketing_lead", "campaign_started", "campaign_completed", "campaign_budget_warning"];

const ROUTES = {
  new_marketing_lead:       "/digital-marketing/campaigns",
  campaign_started:         "/digital-marketing/campaigns",
  campaign_completed:       "/digital-marketing/campaigns",
  campaign_budget_warning:  "/digital-marketing/campaigns",
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

export default function DigitalMarketingNotificationBell({ userId }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRead, setShowRead] = useState(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/dm-notifications");
      setNotifs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Digital marketing notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    const interval = setInterval(fetchNotifs, 20_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    window.refreshDigitalMarketingNotifications = fetchNotifs;
    return () => { delete window.refreshDigitalMarketingNotifications; };
  }, [fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/dm-notifications/${id}/read`);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch("/dm-notifications/read-all");
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleItemClick = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    navigate(ROUTES[n.type] || "/digital-marketing/dashboard");
  };

  const byType = filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadList = byType.filter((n) => !n.is_read);
  const readList = byType.filter((n) => n.is_read);

  const NotifCard = ({ n, dimmed = false }) => {
    const tc = TYPE_CFG[n.type] ?? { label: n.type, color: "#64748b", bg: "#f1f5f9" };
    return (
      <div
        className={`dm-notif-item ${dimmed ? "read" : "unread"}`}
        onClick={(e) => handleItemClick(e, n)}
      >
        <div className="dm-notif-item__body">
          <div className="dm-notif-item__top">
            <span className="dm-notif-type-chip" style={{ background: tc.bg, color: tc.color }}>
              {tc.label}
            </span>
            <span className="dm-notif-item__time">{formatTime(n.created_at)}</span>
            {!dimmed && <span className="dm-notif-unread-dot" />}
          </div>
          <p className="dm-notif-item__title">{n.title}</p>
          {n.message && <p className="dm-notif-item__desc">{n.message}</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        className="navbar-icon-btn dm-notif-bell-btn"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifs(); }}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="dm-notif-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="dm-notif-overlay" onClick={() => setOpen(false)}>
          <div className="dm-notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dm-notif-panel__header">
              <div>
                <h3 className="dm-notif-panel__title">Notifications</h3>
                {unreadCount > 0 && <span className="dm-notif-panel__unread">{unreadCount} unread</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="dm-notif-mark-all" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="dm-notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="dm-notif-filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`dm-notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : (TYPE_CFG[f]?.label ?? f)}
                </button>
              ))}
            </div>

            <div className="dm-notif-list">
              {loading && notifs.length === 0 ? (
                <p className="dm-notif-loading">Loading notifications…</p>
              ) : unreadList.length === 0 ? (
                <p className="dm-notif-empty">
                  {readList.length === 0 ? "You're all caught up ✓" : "No new notifications"}
                </p>
              ) : (
                unreadList.map((n) => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button className="dm-notif-show-read-btn" onClick={() => setShowRead((v) => !v)}>
                    {showRead
                      ? "▲ Hide read notifications"
                      : `▼ Show ${readList.length} read notification${readList.length !== 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="dm-notif-read-section">
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