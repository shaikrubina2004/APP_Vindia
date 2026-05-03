import { useState, useEffect, useRef, useCallback } from "react";
import "./QSNotificationBell.css";

const API = "/api/qs/notifications";

export default function QSNotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [activeTab,     setActiveTab]     = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const panelRef = useRef(null);

  const tabs = ["All", "Cost", "Quantity", "Task", "Incident"];

  // ── Fetch from backend ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setNotifications(data.data.map((n) => ({
          id:        n.id,
          type:      n.type || "Task",
          project:   n.project_name  || n.project || "",
          milestone: n.milestone     || "",
          status:    n.status        || "pending",
          title:     n.title         || "",
          desc:      n.message       || n.description || "",
          date:      n.created_at
            ? new Date(n.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short",
              })
            : "",
          unread: !n.is_read,
        })));
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  // Fetch on mount + auto-refresh every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Mark all read ──
  const markAllRead = async () => {
    try {
      await fetch(`${API}/mark-all-read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (_) {
      // Optimistic update even if API fails
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }
  };

  // ── Mark single read ──
  const markRead = async (id) => {
    try {
      await fetch(`${API}/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
    } catch (_) {}
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, unread: false } : n)
    );
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered =
    activeTab === "All"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  const getColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":  return "#15803d";
      case "rejected":  return "#b91c1c";
      case "pending":   return "#d97706";
      case "high":      return "#d97706";
      case "finalised": return "#15803d";
      default:          return "#6b7280";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Cost":     return "#0b6e72";
      case "Quantity": return "#1d4ed8";
      case "Task":     return "#d97706";
      case "Incident": return "#b91c1c";
      default:         return "#6b7280";
    }
  };

  return (
    <div className="qsn" ref={panelRef}>

      {/* ── Bell button ── */}
      <button className="qsn__bell" onClick={() => setOpen(!open)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="qsn__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="qsn__panel">

          {/* Header */}
          <div className="qsn__header">
            <div>
              <h4 className="qsn__title">Notifications</h4>
              <span className="qsn__unread">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
            </div>
            <div className="qsn__header-actions">
              {unreadCount > 0 && (
                <button className="qsn__mark-all" onClick={markAllRead}>
                  ✓ Mark all read
                </button>
              )}
              <button className="qsn__refresh" onClick={fetchNotifications}
                title="Refresh">
                🔄
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="qsn__tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`qsn__tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === "All" && unreadCount > 0 && (
                  <span className="qsn__tab-count">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="qsn__list">
            {loading ? (
              <div className="qsn__loading">
                <div className="qsn__spinner" />
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="qsn__empty">
                <span>🔔</span>
                <p>No {activeTab === "All" ? "" : activeTab} notifications</p>
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`qsn__item ${n.unread ? "qsn__item--unread" : ""}`}
                  onClick={() => n.unread && markRead(n.id)}
                >
                  {/* Unread dot */}
                  <div
                    className="qsn__dot"
                    style={{ background: getColor(n.status) }}
                  />

                  <div className="qsn__content">
                    {/* Type tag */}
                    <span
                      className="qsn__type"
                      style={{
                        background: `${getTypeColor(n.type)}18`,
                        color: getTypeColor(n.type),
                        border: `1px solid ${getTypeColor(n.type)}40`,
                      }}
                    >
                      {n.type}
                    </span>

                    {/* Project + milestone */}
                    {(n.project || n.milestone) && (
                      <p className="qsn__project">
                        {n.project}
                        {n.milestone && (
                          <span className="qsn__milestone"> · {n.milestone}</span>
                        )}
                      </p>
                    )}

                    {/* Title */}
                    <p className="qsn__item-title">{n.title}</p>

                    {/* Description */}
                    {n.desc && <p className="qsn__desc">{n.desc}</p>}
                  </div>

                  <div className="qsn__date">{n.date}</div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="qsn__footer">
              <button className="qsn__view-all"
                onClick={() => { setOpen(false); }}>
                View all notifications
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}