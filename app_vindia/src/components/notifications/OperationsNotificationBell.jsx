import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./OperationsNotificationBell.css";

const API = "http://localhost:5000/api/operations-notifications";

/* Every type the Operations bell understands. */
const TYPE_CFG = {
  delivery:  { label: "Delivery",  color: "#0ea5e9", bg: "#e0f2fe" },
  delay:     { label: "Delay",     color: "#f59e0b", bg: "#fffbeb" },
  receipt:   { label: "Receipt",   color: "#10b981", bg: "#ecfdf5" },
  low_stock: { label: "Low Stock", color: "#dc2626", bg: "#fef2f2" },
  incident:  { label: "Incident",  color: "#dc2626", bg: "#fef2f2" },
  task:      { label: "Task",      color: "#7c3aed", bg: "#f5f3ff" },
};

const SEV_COLOR = {
  critical: "#dc2626",
  warn: "#f59e0b",
  info: "#2563eb",
  ok: "#10b981",
};

/* ── Only what each role actually needs in their bell ──
   Logistics tracks movement (dispatch → delay → confirmed receipt).
   Inventory tracks stock (incoming loads → goods receipt → low stock).
   Keep these in sync with ROLE_TYPES in
   backend/controllers/operationsNotificationsController.js            */
const ROLE_FILTERS = {
  logistics_coordinator: ["all", "delivery", "delay", "receipt", "incident", "task"],
  inventory_controller:  ["all", "delivery", "low_stock", "receipt", "incident", "task"],
  finance_manager:       ["all", "incident", "task"],
  procurement_officer:   ["all", "receipt", "delay", "incident", "task"],

};

/* A couple of labels read better when they're role-specific. */
const ROLE_TYPE_OVERRIDES = {
  inventory_controller: {
    delivery: { label: "Incoming", color: "#0ea5e9", bg: "#e0f2fe" },
  },
};

const ROLE_TITLE = {
  logistics_coordinator: "Logistics",
  inventory_controller: "Inventory",
  finance_manager: "Finance",
  procurement_officer: "Procurement",


};

const DEFAULT_FILTERS = ["all", "delivery", "delay", "receipt", "low_stock", "incident", "task"];

/**
 * Shared bell for Logistics Coordinator and Inventory Controller.
 *
 * `role`   decides which filter tabs and labels are shown, so the two
 *          roles get genuinely different bells from one component.
 * `routes` maps a notification `type` to the page it should open —
 *          pass a different map per role from Navbar.jsx.
 */
export default function OperationsNotificationBell({ userId, role, routes = {} }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [showRead, setShowRead] = useState(false);
  const [loading, setLoading] = useState(false);

  const filters = ROLE_FILTERS[role] ?? DEFAULT_FILTERS;
  const typeCfg = useMemo(
    () => ({ ...TYPE_CFG, ...(ROLE_TYPE_OVERRIDES[role] ?? {}) }),
    [role]
  );

  /* Guard against stale tabs when the role changes. */
  useEffect(() => {
    if (!filters.includes(filter)) setFilter("all");
  }, [filters, filter]);

  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/${userId}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      // Only keep types this role should ever see, even if older rows exist.
      const allowed = filters.filter((f) => f !== "all");
      setNotifs(
        Array.isArray(data) ? data.filter((n) => allowed.includes(n.type)) : []
      );
    } catch (err) {
      console.error("Notification fetch error:", err);
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifs]);

  useEffect(() => {
    window.refreshOperationsNotifications = fetchNotifs;
    return () => { delete window.refreshOperationsNotifications; };
  }, [fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await fetch(`${API}/${id}/read`, { method: "PATCH" });
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch(`${API}/read-all/${userId}`, { method: "PATCH" });
    } catch (err) { console.error(err); }
  };

  const handleGoToPage = (e, n) => {
    e.stopPropagation();
    markRead(n.id);
    setOpen(false);
    navigate(n.link || routes[n.type] || routes.default || "/");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const byType = filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadList = byType.filter((n) => !n.is_read);
  const readList = byType.filter((n) => n.is_read);

  const NotifCard = ({ n, dimmed = false }) => {
    const tc = typeCfg[n.type] ?? typeCfg.task;
    return (
      <div className={`notif-item ${dimmed ? "read" : "unread"}`} onClick={(e) => handleGoToPage(e, n)}>
        <div className="notif-item__dot" style={{ background: SEV_COLOR[n.severity] ?? SEV_COLOR.info }} />
        <div className="notif-item__body">
          <div className="notif-item__top">
            <span className="notif-type-chip" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
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
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifs(); }}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-overlay" onClick={() => setOpen(false)}>
          <div className="notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notif-panel__header">
              <div>
                <h3 className="notif-panel__title">
                  {ROLE_TITLE[role] ? `${ROLE_TITLE[role]} notifications` : "Notifications"}
                </h3>
                {unreadCount > 0 && <span className="notif-panel__unread">{unreadCount} unread</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="notif-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="notif-filters">
              {filters.map((f) => (
                <button
                  key={f}
                  className={`notif-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : (typeCfg[f]?.label ?? f)}
                </button>
              ))}
            </div>

            <div className="notif-list">
              {unreadList.length === 0 ? (
                <p className="notif-empty">
                  {loading
                    ? "Loading…"
                    : readList.length === 0
                      ? "You're all caught up ✓"
                      : "No new notifications"}
                </p>
              ) : (
                unreadList.map((n) => <NotifCard key={n.id} n={n} dimmed={false} />)
              )}

              {readList.length > 0 && (
                <>
                  <button className="notif-show-read-btn" onClick={() => setShowRead((v) => !v)}>
                    {showRead ? "▲ Hide read notifications" : `▼ Show ${readList.length} read notification${readList.length > 1 ? "s" : ""}`}
                  </button>
                  {showRead && (
                    <div className="notif-read-section">
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