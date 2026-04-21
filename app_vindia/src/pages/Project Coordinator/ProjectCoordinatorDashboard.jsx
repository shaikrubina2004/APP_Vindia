import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import "./Coordinator.css";

/* ─── MOCK DATA ─── */
const MOCK_PROJECTS = [
  { id: 1, name: "Tajmahal",          client: "SHAJAHAAN",     engineer: "Nikhil", status: "ACTIVE",      progress: 0,  total_tasks: 80,  completed_tasks: 0,  budget: "₹4.2Cr", deadline: "Dec 2025" },
  { id: 2, name: "NH-66",             client: "Govt. of India", engineer: "Nikhil", status: "ACTIVE",      progress: 0,  total_tasks: 120, completed_tasks: 0,  budget: "₹12Cr",  deadline: "Mar 2026" },
  { id: 3, name: "Eiffel Tower–Paris",client: "XBC Developers", engineer: "Nikhil", status: "IN PROGRESS", progress: 45, total_tasks: 100, completed_tasks: 45, budget: "₹8.7Cr", deadline: "Jun 2025" },
];

/* ─── NOTIFICATIONS ─── */
/* severity: "critical" → auto popup on load, "warn" → shown in panel, "info"/"ok" → panel only */
const ALL_NOTIFICATIONS = [
  { id: 1,  type: "incident", severity: "critical", title: "Critical Incident",       desc: "Worker injury reported on Block B – Eiffel Tower",              time: "30m ago",  read: false, popup: true  },
  { id: 2,  type: "payment",  severity: "critical", title: "Payment Overdue",          desc: "NH-66 Road Base Layer – ₹1.2Cr overdue by 45 days",             time: "2h ago",   read: false, popup: true  },
  { id: 3,  type: "payment",  severity: "warn",     title: "Payment Due Soon",          desc: "Eiffel Tower – Milestone 2 payment due in 5 days",              time: "4h ago",   read: false, popup: false },
  { id: 4,  type: "payment",  severity: "ok",       title: "Payment Received",          desc: "Eiffel Tower – Advance ₹42L received from XBC Developers",     time: "1d ago",   read: false, popup: false },
  { id: 5,  type: "incident", severity: "warn",     title: "Incident Raised",           desc: "NH-66 – Scaffolding collapse reported by site engineer",        time: "3h ago",   read: false, popup: false },
  { id: 6,  type: "work",     severity: "warn",     title: "Pending Work Alert",        desc: "Eiffel Tower – Block A concrete pouring pending 3 days",        time: "1d ago",   read: true,  popup: false },
  { id: 7,  type: "work",     severity: "warn",     title: "Daily Update Due",          desc: "Today's site update not yet submitted",                         time: "Today",    read: false, popup: false },
  { id: 8,  type: "approval", severity: "info",     title: "Approval Pending",          desc: "Block C start awaiting Project Manager approval",               time: "2d ago",   read: true,  popup: false },
  { id: 9,  type: "payment",  severity: "warn",     title: "Invoice Not Raised",        desc: "Tajmahal Advance – invoice not yet submitted",                  time: "3d ago",   read: true,  popup: false },
  { id: 10, type: "work",     severity: "ok",       title: "Milestone Completed",       desc: "Eiffel Tower – Foundation milestone marked complete",           time: "2d ago",   read: true,  popup: false },
];

const TYPE_CFG = {
  payment:  { label: "Payment",  color: "#2563eb", bg: "#eff6ff" },
  incident: { label: "Incident", color: "#dc2626", bg: "#fef2f2" },
  work:     { label: "Work",     color: "#ca8a04", bg: "#fefce8" },
  approval: { label: "Approval", color: "#7c3aed", bg: "#f5f3ff" },
};
const SEV_COLOR = { critical: "#dc2626", warn: "#f59e0b", info: "#2563eb", ok: "#10b981" };
const POPUP_ICON = { critical: "🚨", warn: "⚠️", info: "ℹ️", ok: "✅" };

/* ─── Animated counter ─── */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return value;
}

/* ─── Circular Progress ─── */
const CircularProgress = ({ pct, size = 52, stroke = 4 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#dbeafe" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2563eb" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
};

/* ─── Status Pill ─── */
const StatusPill = ({ status }) => {
  const cfg = {
    "ACTIVE":      { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    "IN PROGRESS": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
    "ON HOLD":     { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
  }[status] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <span className="status-pill"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="status-dot" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

/* ─── Project Card ─── */
const ProjectCard = ({ proj, isActive, onClick }) => (
  <div className={`pc-project-card ${isActive ? "active" : ""}`} onClick={onClick}>
    <div className="pc-project-card__accent" />
    <div className="pc-project-card__header">
      <div className="pc-project-card__info">
        <p className="pc-project-card__client">{proj.client}</p>
        <h3 className="pc-project-card__name">{proj.name}</h3>
      </div>
      <div className="pc-project-card__ring">
        <CircularProgress pct={proj.progress} />
        <span className="pc-project-card__pct">{proj.progress}%</span>
      </div>
    </div>
    <StatusPill status={proj.status} />
    <div className="pc-project-card__meta">
      <div><p className="meta-label">Engineer</p><p className="meta-value">{proj.engineer}</p></div>
      <div><p className="meta-label">Budget</p><p className="meta-value">{proj.budget}</p></div>
      <div><p className="meta-label">Deadline</p><p className="meta-value">{proj.deadline}</p></div>
    </div>
    <div className="pc-bar-track"><div className="pc-bar-fill" style={{ width: `${proj.progress}%` }} /></div>
  </div>
);

/* ─── Stat Card ─── */
const StatCard = ({ label, value, active, onClick, accent }) => {
  const anim = useCountUp(typeof value === "number" ? value : 0, 800);
  return (
    <div className={`pc-stat-card ${active ? "active" : ""}`} onClick={onClick}
      style={{ "--accent": accent }}>
      <p className="pc-stat-card__label">{label}</p>
      <p className="pc-stat-card__value" style={{ color: active ? accent : "#0a2540" }}>
        {typeof value === "number" ? anim : value}
        {label === "Overall Progress" && <span className="pc-stat-card__sub">%</span>}
      </p>
      {label === "Overall Progress" && (
        <div className="pc-bar-track" style={{ marginTop: 10 }}>
          <div className="pc-bar-fill" style={{ width: `${value}%`, background: accent }} />
        </div>
      )}
    </div>
  );
};

/* ─── Custom Tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="pc-tooltip">
      <p className="pc-tooltip__label">{label}</p>
      <p className="pc-tooltip__val">{payload[0].value}%</p>
    </div>
  );
};

/* ─── Payment Row ─── */
const PaymentRow = ({ label, amt, status, cls, onClick }) => (
  <div className="payment-row" onClick={onClick} style={{ cursor: "pointer" }}>
    <div><p className="payment-label">{label}</p><p className="payment-amt">{amt}</p></div>
    <span className={`badge ${cls}`}>{status}</span>
  </div>
);

/* ─── POPUP TOAST STACK ─── */
const PopupToasts = ({ popups, onDismiss }) => (
  <div className="popup-stack">
    {popups.map((n, i) => {
      const tc = TYPE_CFG[n.type] || TYPE_CFG.work;
      const isCritical = n.severity === "critical";
      return (
        <div key={n.id}
          className={`popup-toast ${isCritical ? "popup-toast--critical" : "popup-toast--warn"}`}
          style={{ bottom: `${20 + i * 90}px` }}>
          <div className="popup-toast__icon">{POPUP_ICON[n.severity]}</div>
          <div className="popup-toast__body">
            <div className="popup-toast__top">
              <span className="popup-toast__type" style={{ background: tc.bg, color: tc.color }}>
                {tc.label}
              </span>
              <span className="popup-toast__time">{n.time}</span>
            </div>
            <p className="popup-toast__title">{n.title}</p>
            <p className="popup-toast__desc">{n.desc}</p>
          </div>
          <button className="popup-toast__close" onClick={() => onDismiss(n.id)}>✕</button>
        </div>
      );
    })}
  </div>
);

/* ─── NOTIFICATION PANEL ─── */
const NotificationPanel = ({ notifications, onMarkRead, onMarkAllRead, onClose }) => {
  const [filter, setFilter] = useState("all");
  const unread = notifications.filter(n => !n.read).length;
  const shown  = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  return (
    /* full-page overlay so nothing underneath is clickable while panel is open */
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>

        <div className="notif-panel__header">
          <div>
            <h3 className="notif-panel__title">Notifications</h3>
            {unread > 0 && <span className="notif-panel__unread">{unread} unread</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {unread > 0 && <button className="notif-mark-all" onClick={onMarkAllRead}>Mark all read</button>}
            <button className="notif-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="notif-filters">
          {["all","payment","incident","work","approval"].map(f => (
            <button key={f}
              className={`notif-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="notif-list">
          {shown.length === 0 && <p className="notif-empty">No notifications here.</p>}
          {shown.map(n => {
            const tc = TYPE_CFG[n.type] || TYPE_CFG.work;
            return (
              <div key={n.id}
                className={`notif-item ${n.read ? "read" : "unread"}`}
                onClick={() => onMarkRead(n.id)}>
                <div className="notif-item__dot" style={{ background: SEV_COLOR[n.severity] }} />
                <div className="notif-item__body">
                  <div className="notif-item__top">
                    <span className="notif-type-chip" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                    <span className="notif-item__time">{n.time}</span>
                    {!n.read && <span className="notif-unread-dot" />}
                  </div>
                  <p className="notif-item__title">{n.title}</p>
                  <p className="notif-item__desc">{n.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════ */
const ProjectCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [projects]    = useState(MOCK_PROJECTS);
  const [selected,    setSelected]    = useState(MOCK_PROJECTS[2]);
  const [activeCard,  setActiveCard]  = useState("completed");
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);
  const [showPanel,   setShowPanel]   = useState(false);
  /* popups = critical/warn ones that auto-show on load */
  const [popups, setPopups] = useState(
    ALL_NOTIFICATIONS.filter(n => n.popup && !n.read)
  );

  useEffect(() => { setActiveCard("completed"); }, [selected]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead    = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = ()   => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const dismissPopup = (id) => {
    setPopups(p => p.filter(n => n.id !== id));
    markRead(id);
  };

  const total     = selected?.total_tasks     || (selected?.progress > 0 ? 100 : 0);
  const completed = selected?.completed_tasks || (selected?.progress > 0 ? selected.progress : 0);
  const pending   = total - completed;
  const progress  = selected?.progress ?? 0;

  const timelineData = [
    { day: "Mon", progress: Math.round(progress * 0.2) },
    { day: "Tue", progress: Math.round(progress * 0.4) },
    { day: "Wed", progress: Math.round(progress * 0.6) },
    { day: "Thu", progress: Math.round(progress * 0.8) },
    { day: "Fri", progress },
  ];

  const payments = [
    { label: "Advance",   amt: "₹1.2Cr", status: "Completed", cls: "badge--green"  },
    { label: "Milestone", amt: "₹2.4Cr", status: "Pending",   cls: "badge--yellow" },
    { label: "Retention", amt: "₹0.8Cr", status: "Completed", cls: "badge--green"  },
  ];

  return (
    <div className="pc-dashboard">

      {/* ── POPUP TOASTS (bottom-right, never overlap content) ── */}
      {popups.length > 0 && (
        <PopupToasts popups={popups} onDismiss={dismissPopup} />
      )}

      {/* ── NOTIFICATION PANEL (full-page overlay, no overlap) ── */}
      {showPanel && (
        <NotificationPanel
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setShowPanel(false)} />
      )}

      {/* HEADER */}
      <div className="pc-header">
        <div>
          <p className="pc-breadcrumb">Dashboard</p>
          <h1 className="pc-title">Project Coordinator</h1>
        </div>
        <div className="pc-header-actions">
          <button className="pc-notif-btn" onClick={() => setShowPanel(true)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="pc-notif-badge">{unreadCount}</span>}
          </button>
          <button className="pc-btn-outline">Export</button>
          <button className="pc-btn-primary">+ New Project</button>
        </div>
      </div>

      {/* PROJECT CARDS */}
      <div className="pc-projects">
        {projects.map(p => (
          <ProjectCard key={p.id} proj={p}
            isActive={selected?.id === p.id}
            onClick={() => setSelected(p)} />
        ))}
      </div>

      {/* SELECTED BANNER */}
      {selected && (
        <div className="pc-banner">
          <span className="pc-banner__dot" />
          <span className="pc-banner__name">{selected.name}</span>
          <span className="pc-banner__sub">{selected.client} · {selected.engineer}</span>
          <StatusPill status={selected.status} />
        </div>
      )}

      {/* STAT CARDS */}
      <div className="pc-stats">
        <StatCard label="Overall Progress" value={progress}
          accent="#2563eb" active={activeCard === "progress"}
          onClick={() => setActiveCard("progress")} />
        <StatCard label="Completed Tasks" value={completed}
          accent="#16a34a" active={activeCard === "completed"}
          onClick={() => setActiveCard("completed")} />
        <StatCard label="Pending Tasks" value={pending}
          accent="#f59e0b" active={activeCard === "pending"}
          onClick={() => setActiveCard("pending")} />
      </div>

      {/* BOTTOM GRID */}
      <div className="pc-bottom-grid">

        {/* CHART */}
        <div className="pc-chart-box">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Progress Timeline</h3>
              <p className="chart-sub">Weekly task completion</p>
            </div>
            <span className="chart-badge">Weekly</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="progress"
                stroke="#2563eb" strokeWidth={2.5} fill="url(#blueGrad)"
                dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT PANEL — payments only */}
        <div className="pc-side-panel">
          <div className="pc-mini-box">
            <div className="mini-box-header">
              <h4 className="mini-box-title">Payments</h4>
              <button className="pc-view-all" onClick={() => navigate("/project-coordinator/payments")}>
                View All
              </button>
            </div>
            {payments.map(p => (
              <PaymentRow key={p.label} {...p}
                onClick={() => navigate("/project-coordinator/payments")} />
            ))}
            <div className="pc-payment-footer">
              <div className="pc-payment-footer__bar-track">
                <div className="pc-payment-footer__bar-fill" style={{ width: "57%" }} />
              </div>
              <span className="pc-payment-footer__note">₹2.0Cr of ₹4.4Cr received</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectCoordinatorDashboard;