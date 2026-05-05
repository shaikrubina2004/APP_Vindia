// src/components/NotificationBell.jsx
// Drop-in bell icon + dropdown — place in your navbar/header
import React, { useEffect, useRef, useState } from "react";
import { useNotifications } from "../context/NotificationContext";

const TYPE_CFG = {
  task:     { icon: "✅", color: "#185FA5", bg: "#E6F1FB" },
  rfi:      { icon: "❓", color: "#BA7517", bg: "#FAEEDA" },
  incident: { icon: "⚠️", color: "#791F1F", bg: "#FCEBEB" },
  approval: { icon: "🔖", color: "#085041", bg: "#E1F5EE" },
  deadline: { icon: "⏰", color: "#b83232", bg: "#FCEBEB" },
  material: { icon: "📦", color: "#3B3A37", bg: "#F1EFE8" },
  info:     { icon: "ℹ️", color: "#444", bg: "var(--color-background-secondary)" },
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const recent = notifications.slice(0, 30);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`${unreadCount} unread notifications`}
        style={{
          position: "relative", background: "none", border: "none",
          cursor: "pointer", padding: "6px 8px", borderRadius: "var(--border-radius-md)",
          color: "var(--color-text-secondary)", fontSize: 18,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "#b83232", color: "#fff",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          width: 340, maxHeight: 480,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          overflow: "hidden", zIndex: 1000,
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 7px", background: "#FCEBEB", color: "#791F1F", borderRadius: 99 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 11, color: "#185FA5", background: "none", border: "none", cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {recent.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-tertiary)" }}>
                No notifications yet
              </div>
            ) : (
              recent.map(n => {
                const cfg = TYPE_CFG[n.type] || TYPE_CFG.info;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex", gap: 10, padding: "10px 14px",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                      background: n.read ? "transparent" : "var(--color-background-secondary)",
                      cursor: "pointer", transition: "background 0.1s",
                    }}
                    onClick={() => markRead(n.id)}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: "var(--border-radius-md)",
                      background: cfg.bg, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.45,
                        fontWeight: n.read ? 400 : 500,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                        {timeAgo(n.createdAt)}
                        {n.linked_ref && (
                          <span style={{ marginLeft: 6, color: cfg.color, fontWeight: 600 }}>{n.linked_ref}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, flexShrink: 0, padding: "0 2px", alignSelf: "flex-start" }}
                      aria-label="Dismiss"
                    >×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {recent.length > 0 && (
            <div style={{ padding: "8px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", textAlign: "center" }}>
              <button style={{ fontSize: 11, color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}