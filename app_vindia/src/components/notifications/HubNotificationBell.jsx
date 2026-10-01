// CEO notification bell — backed by /api/ceo-notifications.
// Items are created by the backend when a manager submits a daily update,
// when a report is marked critical or left waiting, and when a new user
// signs up and needs a role.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ceoNotificationService } from "../../services/ceoHubService";
import "./HubNotificationBell.css";

const FILTERS = [
  { id: "all",    label: "All" },
  { id: "report", label: "Reports" },
  { id: "user",   label: "Users" },
  { id: "system", label: "Alerts" },
];

const TYPE_LABEL = { report: "Report", user: "User", approval: "Approval", system: "Alert" };

const ICON = {
  report: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />,
  user:   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>,
  system: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
};

const timeAgo = (ts) => {
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function HubNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await ceoNotificationService.list();
      setItems(Array.isArray(res.data) ? res.data : []);
      setFailed(false);
    } catch (err) {
      console.error("CEO notifications fetch error:", err);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const t = setInterval(fetchItems, 15000);
    return () => clearInterval(t);
  }, [fetchItems]);

  // allow other components to refresh the bell: window.refreshCeoNotifications?.()
  useEffect(() => {
    window.refreshCeoNotifications = fetchItems;
    return () => { delete window.refreshCeoNotifications; };
  }, [fetchItems]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);
  const shown = useMemo(
    () => items.filter((n) => filter === "all" || (filter === "system" ? !["report", "user"].includes(n.type) : n.type === filter)),
    [items, filter]
  );

  const markRead = async (id) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try { await ceoNotificationService.markRead(id); } catch (e) { console.error(e); }
  };

  const markAll = async () => {
    setItems((p) => p.map((n) => ({ ...n, is_read: true })));
    try { await ceoNotificationService.markAllRead(); } catch (e) { console.error(e); }
  };

  const clearRead = async () => {
    setItems((p) => p.filter((n) => !n.is_read));
    try { await ceoNotificationService.clearRead(); } catch (e) { console.error(e); }
  };

  const go = (n) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="cnb" ref={wrapRef}>
      <button
        className="navbar-icon-btn cnb__btn"
        onClick={() => { setOpen((o) => !o); if (!open) fetchItems(); }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="cnb__badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="cnb__panel" role="dialog" aria-label="Notifications">
          <div className="cnb__head">
            <div>
              <h3>Notifications</h3>
              <span>{unread ? `${unread} unread` : "You're all caught up"}</span>
            </div>
            <div className="cnb__head-actions">
              {unread > 0 && <button onClick={markAll}>Mark all read</button>}
              {items.some((n) => n.is_read) && <button onClick={clearRead}>Clear read</button>}
            </div>
          </div>

          <div className="cnb__filters">
            {FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? "is-on" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>

          <div className="cnb__list">
            {failed && items.length === 0 && <p className="cnb__empty">Couldn't load notifications.</p>}
            {!failed && shown.length === 0 && <p className="cnb__empty">Nothing here yet.</p>}
            {shown.map((n) => (
              <button key={n.id} className={`cnb__item${n.is_read ? "" : " is-unread"}`} onClick={() => go(n)}>
                <span className={`cnb__icon sev-${n.severity}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {ICON[n.type] || ICON.system}
                  </svg>
                </span>
                <span className="cnb__body">
                  <span className="cnb__meta">
                    <span>{TYPE_LABEL[n.type] || "Alert"}</span>
                    <time>{timeAgo(n.created_at)}</time>
                  </span>
                  <span className="cnb__title">{n.title}</span>
                  {n.description && <span className="cnb__desc">{n.description}</span>}
                </span>
                {!n.is_read && <i className="cnb__dot" />}
              </button>
            ))}
          </div>

          <div className="cnb__foot">
            <button onClick={() => { setOpen(false); navigate("/reports"); }}>Open reports inbox</button>
          </div>
        </div>
      )}
    </div>
  );
}