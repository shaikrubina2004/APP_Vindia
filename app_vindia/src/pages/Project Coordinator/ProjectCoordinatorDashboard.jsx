import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./Coordinator.css";

/* ─── MOCK DATA (replace with your API call) ─── */
const MOCK_PROJECTS = [
  {
    id: 1,
    name: "Tajmahal",
    client: "SHAJAHAAN",
    engineer: "Nikhil",
    status: "ACTIVE",
    progress: 0,
    total_tasks: 80,
    completed_tasks: 0,
    budget: "₹4.2Cr",
    deadline: "Dec 2025",
  },
  {
    id: 2,
    name: "NH-66",
    client: "Govt. of India",
    engineer: "Nikhil",
    status: "ACTIVE",
    progress: 0,
    total_tasks: 120,
    completed_tasks: 0,
    budget: "₹12Cr",
    deadline: "Mar 2026",
  },
  {
    id: 3,
    name: "Eiffel Tower – Paris",
    client: "XBC Developers",
    engineer: "Nikhil",
    status: "IN PROGRESS",
    progress: 45,
    total_tasks: 100,
    completed_tasks: 45,
    budget: "₹8.7Cr",
    deadline: "Jun 2025",
  },
];

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
    "ACTIVE":      { bg: "#dcfce7", color: "#16a34a" },
    "IN PROGRESS": { bg: "#dbeafe", color: "#2563eb" },
    "ON HOLD":     { bg: "#fef9c3", color: "#ca8a04" },
  }[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span className="status-pill" style={{ background: cfg.bg, color: cfg.color }}>
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
    <div className="pc-bar-track">
      <div className="pc-bar-fill" style={{ width: `${proj.progress}%` }} />
    </div>
  </div>
);

/* ─── Stat Card ─── */
const StatCard = ({ label, value, icon, active, onClick, accent }) => {
  const anim = useCountUp(typeof value === "number" ? value : 0, 800);
  return (
    <div
      className={`pc-stat-card ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ "--accent": accent }}
    >
      <span className="pc-stat-card__icon">{icon}</span>
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

/* ─── Alert Row ─── */
const AlertRow = ({ icon, text, type }) => (
  <div className={`alert-row alert-row--${type}`}>
    <span>{icon}</span>
    <span className="alert-row__text">{text}</span>
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════ */
const ProjectCoordinatorDashboard = () => {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [selected, setSelected] = useState(MOCK_PROJECTS[2]);
  const [activeCard, setActiveCard] = useState("completed");

  useEffect(() => {
    // Replace with your real API:
    // fetch("http://localhost:5000/api/projects")
    //   .then(r => r.json())
    //   .then(d => { setProjects(d.slice(0,3)); setSelected(d[0]); });
  }, []);

  useEffect(() => { setActiveCard("completed"); }, [selected]);

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

  return (
    <div className="pc-dashboard">

      {/* ── HEADER ── */}
      <div className="pc-header">
        <div>
          <p className="pc-breadcrumb">Dashboard</p>
          <h1 className="pc-title">Project Coordinator</h1>
        </div>
        <div className="pc-header-actions">
          <button className="pc-btn-outline">⬇ Export</button>
          <button className="pc-btn-primary">+ New Project</button>
        </div>
      </div>

      {/* ── PROJECT CARDS ── */}
      <div className="pc-projects">
        {projects.map(p => (
          <ProjectCard
            key={p.id}
            proj={p}
            isActive={selected?.id === p.id}
            onClick={() => setSelected(p)}
          />
        ))}
      </div>

      {/* ── SELECTED BANNER ── */}
      {selected && (
        <div className="pc-banner">
          <span className="pc-banner__dot" />
          <span className="pc-banner__name">{selected.name}</span>
          <span className="pc-banner__sub">{selected.client} · {selected.engineer}</span>
          <StatusPill status={selected.status} />
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="pc-stats">
        <StatCard
          label="Overall Progress" value={progress} icon="📈"
          accent="#2563eb" active={activeCard === "progress"}
          onClick={() => setActiveCard("progress")}
        />
        <StatCard
          label="Completed Tasks" value={completed} icon="✅"
          accent="#16a34a" active={activeCard === "completed"}
          onClick={() => setActiveCard("completed")}
        />
        <StatCard
          label="Pending Tasks" value={pending} icon="⏳"
          accent="#f59e0b" active={activeCard === "pending"}
          onClick={() => setActiveCard("pending")}
        />
      </div>

      {/* ── BOTTOM GRID ── */}
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
              <Area
                type="monotone" dataKey="progress"
                stroke="#2563eb" strokeWidth={2.5}
                fill="url(#blueGrad)"
                dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT PANEL */}
        <div className="pc-side-panel">

          {/* ALERTS */}
          <div className="pc-mini-box">
            <div className="mini-box-header">
              <h4 className="mini-box-title">Alerts</h4>
              <span className="badge badge--red">3 Active</span>
            </div>
            <AlertRow icon="⚠️" text="2 tasks are overdue"          type="warn" />
            <AlertRow icon="⏳" text="Approval pending from client"  type="info" />
            <AlertRow icon="📋" text="Site inspection scheduled"     type="ok"   />
          </div>

          {/* PAYMENTS */}
          <div className="pc-mini-box">
            <div className="mini-box-header">
              <h4 className="mini-box-title">Payments</h4>
            </div>
            {[
              { label: "Advance",   amt: "₹1.2Cr", status: "Completed", cls: "badge--green"  },
              { label: "Milestone", amt: "₹2.4Cr", status: "Pending",   cls: "badge--yellow" },
              { label: "Retention", amt: "₹0.8Cr", status: "Completed", cls: "badge--green"  },
            ].map(p => (
              <div key={p.label} className="payment-row">
                <div>
                  <p className="payment-label">{p.label}</p>
                  <p className="payment-amt">{p.amt}</p>
                </div>
                <span className={`badge ${p.cls}`}>{p.status}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProjectCoordinatorDashboard;