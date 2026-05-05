// QSNotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./QSNotificationBell.css";

const API = "http://localhost:5000/api/qs/notifications";

/* ── Type config ─────────────────────────────────────────────── */
const TYPE_CONFIG = {
  incident: {
    label:  "Incident",
    color:  "#ef4444",
    bg:     "#fee2e2",
    border: "#fca5a5",
    icon:   "⚠️",
    route:  (n) => `/qs/incidents${n.reference_id ? `?highlight=${n.reference_id}` : ""}`,
  },
  task: {
    label:  "Task",
    color:  "#d97706",
    bg:     "#fef3c7",
    border: "#fcd34d",
    icon:   "✅",
    route:  (n) => `/qs/incidents?page=tasks${n.reference_id ? `&highlight=${n.reference_id}` : ""}`,
  },
  cost: {
    label:  "Cost",
    color:  "#0d9373",
    bg:     "#d1fae5",
    border: "#6ee7b7",
    icon:   "💰",
    route:  () => `/qs/cost-report`,
  },
  quantity: {
    label:  "Quantity",
    color:  "#2563eb",
    bg:     "#dbeafe",
    border: "#93c5fd",
    icon:   "📐",
    route:  () => `/qs/quantity-report`,
  },
 
};

const SEVERITY_DOT = {
  critical: "#ef4444",
  warn:     "#f59e0b",
  info:     "#2563eb",
  ok:       "#0d9373",
  pending:  "#9ca3af",
};

const TABS = ["All", "Incident", "Task", "Cost", "Quantity"];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function normaliseType(raw = "") {
  const t = raw.toLowerCase();
  if (t.includes("incident")) return "incident";
  if (t.includes("task"))     return "task";
  if (t.includes("cost"))     return "cost";
  if (t.includes("quantity")) return "quantity";
  if (t.includes("boq"))      return "boq";
  return t;
}

export default function QSNotificationBell() {
  const navigate = useNavigate();

  const [open,          setOpen]          = useState(false);
  const [activeTab,     setActiveTab]     = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const panelRef = useRef(null);

  /* ── Fetch ────────────────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(
          data.data.map((n) => ({
            id:           n.id,
            type:         normaliseType(n.type),
            title:        n.title        || "",
            desc:         n.message      || n.description || "",
            severity:     n.severity     || "info",
            reference_id: n.reference_id || null,
            unread:       !n.is_read,
            date:         n.created_at,
          }))
        );
      } else {
        setError("Failed to load");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-refresh every 30 s */
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Actions ──────────────────────────────────────────────── */
  const markAllRead = async () => {
    try {
      await fetch(`${API}/mark-all-read`, { method: "PUT" });
      setNotifications((p) => p.map((n) => ({ ...n, unread: false })));
    } catch { /* silent */ }
  };

  const handleNotificationClick = async (n) => {
    /* Mark read */
    if (n.unread) {
      try {
        await fetch(`${API}/${n.id}/read`, { method: "PUT" });
        setNotifications((p) =>
          p.map((x) => x.id === n.id ? { ...x, unread: false } : x)
        );
      } catch { /* silent */ }
    }

    /* Navigate to the right page */
    const cfg = TYPE_CONFIG[n.type];
    if (cfg) {
      setOpen(false);
      navigate(cfg.route(n));
    }
  };

  /* ── Derived ──────────────────────────────────────────────── */
  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered = activeTab === "All"
    ? notifications
    : notifications.filter(
        (n) => n.type === activeTab.toLowerCase()
      );

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="qsnb-wrap" ref={panelRef}>

      {/* ── Bell button ── */}
      <button
        className="qsnb-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="qsnb-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="qsnb-panel">

          {/* Header */}
          <div className="qsnb-header">
            <div>
              <h3 className="qsnb-heading">Notifications</h3>
              <p className="qsnb-subhead">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up 🎉"}
              </p>
            </div>
            <div className="qsnb-header-actions">
              {unreadCount > 0 && (
                <button className="qsnb-mark-all" onClick={markAllRead}>
                  ✓ Mark all read
                </button>
              )}
              <button
                className="qsnb-refresh"
                onClick={fetchNotifications}
                title="Refresh"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="qsnb-tabs">
            {TABS.map((tab) => {
              const tabType = tab.toLowerCase();
              const tabUnread = tab === "All"
                ? unreadCount
                : notifications.filter((n) => n.type === tabType && n.unread).length;
              const cfg = TYPE_CONFIG[tabType];
              return (
                <button
                  key={tab}
                  className={`qsnb-tab ${activeTab === tab ? "qsnb-tab--active" : ""}`}
                  style={activeTab === tab && cfg ? {
                    background: cfg.bg,
                    color: cfg.color,
                    borderColor: cfg.border,
                  } : {}}
                  onClick={() => setActiveTab(tab)}
                >
                  {cfg ? <span>{cfg.icon}</span> : null}
                  {tab}
                  {tabUnread > 0 && (
                    <span className="qsnb-tab-badge">{tabUnread}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="qsnb-list">
            {loading ? (
              <div className="qsnb-state">
                <div className="qsnb-spinner" />
                <p>Loading notifications…</p>
              </div>
            ) : error ? (
              <div className="qsnb-state qsnb-state--error">
                <span>⚠ {error}</span>
                <button onClick={fetchNotifications} className="qsnb-retry">Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="qsnb-state">
                <span className="qsnb-empty-icon">🔔</span>
                <p>No {activeTab !== "All" ? activeTab : ""} notifications</p>
              </div>
            ) : (
              filtered.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || {
                  label: n.type, color: "#6b7280", bg: "#f3f4f6",
                  border: "#d1d5db", icon: "📌",
                  route: () => "/qs/incidents",
                };
                const dotColor = SEVERITY_DOT[n.severity] || SEVERITY_DOT.info;

                return (
                  <div
                    key={n.id}
                    className={`qsnb-item ${n.unread ? "qsnb-item--unread" : ""}`}
                    onClick={() => handleNotificationClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(n)}
                  >
                    {/* Left severity dot */}
                    <div
                      className="qsnb-severity-dot"
                      style={{ background: dotColor }}
                    />

                    {/* Body */}
                    <div className="qsnb-item-body">
                      {/* Type pill + time */}
                      <div className="qsnb-item-top">
                        <span
                          className="qsnb-type-pill"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            borderColor: cfg.border,
                          }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="qsnb-time">{timeAgo(n.date)}</span>
                      </div>

                      {/* Title */}
                      <p className={`qsnb-title ${n.unread ? "qsnb-title--bold" : ""}`}>
                        {n.title}
                      </p>

                      {/* Description */}
                      {n.desc && (
                        <p className="qsnb-desc">{n.desc}</p>
                      )}

                      {/* Go to arrow */}
                      <div className="qsnb-goto">
                        <span style={{ color: cfg.color }}>
                          Go to {cfg.label} →
                        </span>
                      </div>
                    </div>

                    {/* Unread indicator bar */}
                    {n.unread && (
                      <div
                        className="qsnb-unread-bar"
                        style={{ background: cfg.color }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="qsnb-footer">
              <button
                className="qsnb-view-all"
                onClick={() => { setOpen(false); navigate("/qs/notifications"); }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}