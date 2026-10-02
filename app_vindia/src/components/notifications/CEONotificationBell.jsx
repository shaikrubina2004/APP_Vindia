import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCeoNotifications, markCeoNotificationRead, markAllCeoNotificationsRead, timeAgo,
} from "../../services/ceoService";
import "./CEONotificationBell.css";

const POLL_MS = 30000;
const TABS = [
  { key: "all", label: "All" },
  { key: "daily_update", label: "Daily updates" },
  { key: "report", label: "Reports" },
  { key: "alert", label: "Alerts" },
];
const TYPE_LABEL = { daily_update: "Daily update", report: "Report", incident: "Alert", task: "Alert", alert: "Alert" };

const inTab = (n, tab) => tab === "all" || n.type === tab || (tab === "alert" && ["incident", "task", "alert"].includes(n.type));
/* where a notification leads; old rows without a link fall back by type */
const routeFor = (n) => n.link || (n.type === "report" ? "/reports?tab=reports" : "/reports?tab=daily");

export default function CEONotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [showRead, setShowRead] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try { setItems(await getCeoNotifications()); } catch { /* keep last list */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (!open) setShowRead(false); }, [open]);   // always reopen with read items collapsed

  const unread = items.filter((n) => !n.is_read).length;
  const filtered = items.filter((n) => inTab(n, tab));
  const unreadList = filtered.filter((n) => !n.is_read);
  const readList = filtered.filter((n) => n.is_read);

  const openItem = async (n) => {
    if (!n.is_read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      markCeoNotificationRead(n.id).catch(() => load());
    }
    setOpen(false);
    navigate(routeFor(n));
  };

  const readAll = async () => {
    setItems((l) => l.map((x) => ({ ...x, is_read: true })));
    try { await markAllCeoNotificationsRead(); } catch { load(); }
  };

  const Row = ({ n }) => (
    <div className={`ceo-bell-item ${n.is_read ? "" : "unread"} ${n.severity || ""}`} onClick={() => openItem(n)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") openItem(n); }}>
      <span className="ceo-bell-dot" />
      <div className="ceo-bell-txt">
        <em>{TYPE_LABEL[n.type] || "Update"}</em>
        <strong>{n.title}</strong>
        {n.description && <p>{n.description}</p>}
        <time>{timeAgo(n.created_at)}</time>
      </div>
    </div>
  );

  return (
    <div className="ceo-bell" ref={wrapRef}>
      <button className={`ceo-bell-btn ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="ceo-bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="ceo-bell-panel">
          <div className="ceo-bell-head">
            <div><h4>Notifications</h4>{unread > 0 && <span className="ceo-bell-unread">{unread} unread</span>}</div>
            <div className="ceo-bell-head-actions">
              {unread > 0 && <button onClick={readAll}>Mark all read</button>}
              <button className="ceo-bell-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
          </div>

          <div className="ceo-bell-tabs">
            {TABS.map((t) => {
              const c = items.filter((n) => !n.is_read && inTab(n, t.key)).length;
              return <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}{c > 0 && <span>{c}</span>}</button>;
            })}
          </div>

          <div className="ceo-bell-list">
            {unreadList.length === 0 && !(showRead && readList.length) && <div className="ceo-bell-empty">You are all caught up</div>}
            {unreadList.map((n) => <Row key={n.id} n={n} />)}
            {showRead && readList.map((n) => <Row key={n.id} n={n} />)}
          </div>

          {readList.length > 0 && (
            <div className="ceo-bell-foot">
              <button onClick={() => setShowRead((s) => !s)}>
                {showRead ? "▲ Hide" : "▼ Show"} {readList.length} read notification{readList.length === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}