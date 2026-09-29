import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCeoNotifications, markCeoNotificationRead, markAllCeoNotificationsRead, timeAgo,
} from "../../services/ceoService";
import "./CEONotificationBell.css";

const POLL_MS = 30000;
const ICONS = { daily_update: "📋", report: "📄", incident: "⚠️", task: "✅", alert: "🔔" };
const TABS = [
  { key: "all", label: "All" },
  { key: "daily_update", label: "Daily updates" },
  { key: "report", label: "Reports" },
  { key: "alert", label: "Alerts" },
];

export default function CEONotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [ring, setRing] = useState(false);
  const prevUnread = useRef(0);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try { setItems(await getCeoNotifications()); } catch { /* keep last list */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const unread = items.filter((n) => !n.is_read).length;

  // shake the bell when something new arrives
  useEffect(() => {
    if (unread > prevUnread.current) { setRing(true); const t = setTimeout(() => setRing(false), 1000); return () => clearTimeout(t); }
    prevUnread.current = unread;
  }, [unread]);
  useEffect(() => { prevUnread.current = unread; });

  // close on outside click
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const visible = items.filter((n) => tab === "all" || n.type === tab || (tab === "alert" && ["incident", "task"].includes(n.type)));

  const openItem = async (n) => {
    if (!n.is_read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      try { await markCeoNotificationRead(n.id); } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    setItems((l) => l.map((x) => ({ ...x, is_read: true })));
    try { await markAllCeoNotificationsRead(); } catch { load(); }
  };

  return (
    <div className="ceo-bell" ref={wrapRef}>
      <button className={`ceo-bell-btn ${open ? "open" : ""} ${ring ? "ring" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="ceo-bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="ceo-bell-panel">
          <div className="ceo-bell-head">
            <h4>Notifications{unread ? ` (${unread})` : ""}</h4>
            {unread > 0 && <button onClick={readAll}>Mark all read</button>}
          </div>
          <div className="ceo-bell-tabs">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="ceo-bell-list">
            {visible.length === 0 ? (
              <div className="ceo-bell-empty">🎉 You're all caught up</div>
            ) : visible.map((n) => (
              <div key={n.id} className={`ceo-bell-item ${n.is_read ? "" : "unread"} ${n.severity || ""}`} onClick={() => openItem(n)}>
                <div className="ceo-bell-ico">{ICONS[n.type] || "🔔"}</div>
                <div className="ceo-bell-txt">
                  <strong>{n.title}</strong>
                  {n.description && <p>{n.description}</p>}
                  <time>{timeAgo(n.created_at)}</time>
                </div>
              </div>
            ))}
          </div>
          <div className="ceo-bell-foot">
            <button onClick={() => { setOpen(false); navigate("/ceo/manager-updates"); }}>View all manager updates →</button>
          </div>
        </div>
      )}
    </div>
  );
}