import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:5000/api/qs/notifications";

const TYPE_COLOR = {
  Cost:     { bg: "#e0f2f1", text: "#0b6e72", border: "#0b6e7240" },
  Quantity: { bg: "#dbeafe", text: "#1d4ed8", border: "#1d4ed840" },
  Task:     { bg: "#fef3c7", text: "#d97706", border: "#d9770640" },
  Incident: { bg: "#fee2e2", text: "#b91c1c", border: "#b91c1c40" },
};

const STATUS_COLOR = {
  approved:  "#15803d",
  rejected:  "#b91c1c",
  pending:   "#d97706",
  high:      "#ef4444",
  finalised: "#15803d",
};

export default function QSNotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [activeTab,     setActiveTab]     = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const panelRef = useRef(null);
  const TABS = ["All", "Cost", "Quantity", "Task", "Incident"];

  // ── Fetch ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data.map((n) => ({
          id:        n.id,
          type:      n.type         || "Task",
          project:   n.project_name || "",
          milestone: n.milestone    || "",
          title:     n.title        || "",
          desc:      n.message      || "",
          status:    n.status       || "pending",
          unread:    !n.is_read,
          date:      n.created_at
            ? new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "",
        })));
      } else {
        setError("Failed to load");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount + every 30s
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Mark all read ──
  const markAllRead = async () => {
    const res = await fetch(`${API}/mark-all-read`, { method: "PUT" });
    if (res.ok) setNotifications((p) => p.map((n) => ({ ...n, unread: false })));
  };

  // ── Mark one read ──
  const markRead = async (id) => {
    await fetch(`${API}/${id}/read`, { method: "PUT" });
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, unread: false } : n));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filtered    = activeTab === "All" ? notifications : notifications.filter((n) => n.type === activeTab);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={panelRef}>

      {/* Bell */}
      <button onClick={() => setOpen(!open)} style={{
        position: "relative", background: "none", border: "none",
        cursor: "pointer", padding: "8px", color: "#374151",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "2px", right: "2px",
            background: "#ef4444", color: "#fff", borderRadius: "999px",
            fontSize: "10px", fontWeight: 700, minWidth: "18px",
            height: "18px", display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 4px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: "380px", background: "#fff", borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 9999,
          border: "1px solid #e5e7eb", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 16px 12px", borderBottom: "1px solid #f3f4f6",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>Notifications</div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: "11px", color: "#0b6e72", background: "none",
                  border: "none", cursor: "pointer", fontWeight: 600,
                }}>✓ Mark all read</button>
              )}
              <button onClick={fetchNotifications} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: "14px",
              }} title="Refresh">🔄</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: "4px", padding: "10px 12px",
            borderBottom: "1px solid #f3f4f6", overflowX: "auto",
          }}>
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "5px 12px", borderRadius: "999px", fontSize: "12px",
                fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: activeTab === tab ? "#0b6e72" : "#f3f4f6",
                color:      activeTab === tab ? "#fff"     : "#6b7280",
              }}>
                {tab}
                {tab === "All" && unreadCount > 0 && (
                  <span style={{
                    marginLeft: "5px", background: "#ef4444", color: "#fff",
                    borderRadius: "999px", fontSize: "10px", padding: "1px 5px",
                  }}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                Loading…
              </div>
            ) : error ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
                {error} — <button onClick={fetchNotifications} style={{
                  color: "#0b6e72", background: "none", border: "none", cursor: "pointer",
                }}>Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: "32px" }}>🔔</div>
                <div style={{ marginTop: "8px" }}>No {activeTab === "All" ? "" : activeTab} notifications</div>
              </div>
            ) : (
              filtered.map((n) => {
                const tc = TYPE_COLOR[n.type] || { bg: "#f3f4f6", text: "#6b7280", border: "#6b728040" };
                const sc = STATUS_COLOR[n.status?.toLowerCase()] || "#6b7280";
                return (
                  <div key={n.id} onClick={() => n.unread && markRead(n.id)}
                    style={{
                      display: "flex", gap: "10px", padding: "12px 16px",
                      borderBottom: "1px solid #f9fafb", cursor: n.unread ? "pointer" : "default",
                      background: n.unread ? "#f0fdfa" : "#fff",
                      transition: "background 0.2s",
                    }}>
                    {/* Status dot */}
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: sc, flexShrink: 0, marginTop: "5px",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Type badge */}
                      <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                        borderRadius: "999px", background: tc.bg,
                        color: tc.text, border: `1px solid ${tc.border}`,
                      }}>{n.type}</span>

                      {/* Project */}
                      {n.project && (
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 2px", fontWeight: 600 }}>
                          {n.project}{n.milestone && <span style={{ fontWeight: 400 }}> · {n.milestone}</span>}
                        </p>
                      )}

                      {/* Title */}
                      <p style={{ fontSize: "13px", fontWeight: n.unread ? 600 : 400, color: "#111827", margin: "3px 0" }}>
                        {n.title}
                      </p>

                      {/* Desc */}
                      {n.desc && (
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.desc}
                        </p>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0, marginTop: "2px" }}>
                      {n.date}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <button onClick={() => setOpen(false)} style={{
                fontSize: "12px", color: "#0b6e72", background: "none",
                border: "none", cursor: "pointer", fontWeight: 600,
              }}>View all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}