import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/authService";
import "./QSNotificationBell.css"; // same look as every other role's bell

const ICON = { incident: "⚠️", rfi: "❓", invoice: "🧾", approval: "✅", info: "🔔" };
const ROUTE = { incident: "/client/incidents", rfi: "/client/rfi", invoice: "/client/invoices", approval: "/client/approvals" };

const ago = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// The client's own notification bell (client_notifications). Clients previously had none.
export default function ClientNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get("/client/notifications");
      setItems(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch {
      /* the bell must never break the page */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openItem = (n) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      API.patch(`/client/notifications/${n.id}/read`).catch(() => {});
    }
    setOpen(false);
    const to = n.link || ROUTE[n.type];
    if (to) navigate(to);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    API.patch("/client/notifications/read-all").catch(() => {});
  };

  return (
    <div className="qsnb-wrap" ref={ref}>
      <button className="qsnb-bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="qsnb-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="qsnb-panel">
          <div className="qsnb-header">
            <div>
              <h3 className="qsnb-heading">Notifications</h3>
              <p className="qsnb-subhead">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
            </div>
            <div className="qsnb-header-actions">
              {unread > 0 && <button className="qsnb-mark-all" onClick={markAll}>✓ Mark all read</button>}
            </div>
          </div>
          <div className="cnb-list">
            {items.length === 0 ? (
              <p className="cnb-empty">Nothing yet. You will be told here when the team answers an RFI, updates an incident, finalises an estimate or records an approval.</p>
            ) : items.map((n) => (
              <button key={n.id} className={`cnb-item${n.is_read ? "" : " cnb-item--unread"}`} onClick={() => openItem(n)}>
                <span className="cnb-icon">{ICON[n.type] || ICON.info}</span>
                <span className="cnb-text">
                  <strong>{n.title}</strong>
                  {n.description && <em>{n.description}</em>}
                  <small>{ago(n.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
