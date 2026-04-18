import React, { useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./Milestone.css";

/* ─────────────────────────────────────────
   MOCK DATA — in production these come from
   the Project Manager via your API
───────────────────────────────────────── */
const MOCK_MILESTONES = [
  {
    id: 1,
    title: "Foundation Completion",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete all foundation work including concrete pouring and curing for Block A and Block B.",
    startDate: "2025-05-01",
    dueDate: "2025-06-10",
    progress: 100,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "None",
    dependencies: "Site clearance and soil testing",
  },
  {
    id: 2,
    title: "Block A Structure Complete",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete the full structural work for Block A — columns, beams, and slab.",
    startDate: "2025-06-01",
    dueDate: "2025-07-15",
    progress: 65,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Material delay risk — steel procurement pending",
    dependencies: "Foundation Completion",
  },
  {
    id: 3,
    title: "Electrical Work Phase 1",
    project: "Eiffel Tower – Paris",
    phase: "MEP",
    description: "Complete electrical conduit laying and wiring for ground and first floor.",
    startDate: "2025-07-01",
    dueDate: "2025-08-10",
    progress: 20,
    assignedTo: "MEP Engineer",
    risks: "Coordination with structural team required",
    dependencies: "Block A Structure Complete",
  },
  {
    id: 4,
    title: "NH-66 Road Base Layer",
    project: "NH-66",
    phase: "Civil",
    description: "Lay the base layer (sub-base and base course) for 5km stretch of NH-66.",
    startDate: "2025-05-15",
    dueDate: "2025-06-05",
    progress: 40,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Weather dependency — monsoon risk",
    dependencies: "Survey and alignment approval",
  },
  {
    id: 5,
    title: "Tajmahal Site Clearance",
    project: "Tajmahal",
    phase: "Pre-Construction",
    description: "Complete full site clearance, leveling and boundary marking.",
    startDate: "2025-06-20",
    dueDate: "2025-07-05",
    progress: 0,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Permit approval delay",
    dependencies: "None",
  },
];

/* ─── auto-derive status ─── */
const today = new Date();
const getStatus = (m) => {
  if (m.progress === 100) return "completed";
  if (new Date(m.dueDate) < today && m.progress < 100) return "delayed";
  if (m.progress > 0) return "in-progress";
  return "not-started";
};

const STATUS_CFG = {
  "completed":   { label: "Completed",    bg: "#d1fae5", color: "#065f46", border: "#10b981", bar: "#10b981" },
  "in-progress": { label: "In Progress",  bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb", bar: "#2563eb" },
  "delayed":     { label: "Delayed",      bg: "#fee2e2", color: "#991b1b", border: "#ef4444", bar: "#ef4444" },
  "not-started": { label: "Not Started",  bg: "#f1f5f9", color: "#475569", border: "#94a3b8", bar: "#cbd5e1" },
};

const TABS = ["All", "In Progress", "Completed", "Delayed", "Not Started"];

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const daysLeft = (dueDate) => {
  const diff = Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24));
  return diff;
};

/* ─── small reusable ─── */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status];
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      <span className="ms-badge__dot" style={{ background: c.color }} />
      {c.label}
    </span>
  );
};

const MiniProgress = ({ pct, color }) => (
  <div className="ms-bar-track">
    <div className="ms-bar-fill" style={{ width: `${pct}%`, background: color }} />
  </div>
);

/* ─── radial chart for summary ─── */
const SummaryRadial = ({ data }) => (
  <ResponsiveContainer width="100%" height={160}>
    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%"
      data={data} startAngle={90} endAngle={-270}>
      <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#f0f6ff" }} />
      <Tooltip
        content={({ active, payload }) =>
          active && payload?.length ? (
            <div className="ms-tooltip">
              <p style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].payload.name}</p>
              <p>{payload[0].value} milestones</p>
            </div>
          ) : null
        }
      />
    </RadialBarChart>
  </ResponsiveContainer>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Milestone() {
  const milestones = MOCK_MILESTONES.map(m => ({ ...m, status: getStatus(m) }));

  const [activeTab,   setActiveTab]   = useState("All");
  const [expandedId,  setExpanded]    = useState(null);
  const [filterProj,  setFilterProj]  = useState("All");

  /* filter logic */
  const projects = ["All", ...new Set(milestones.map(m => m.project))];

  const filtered = milestones.filter(m => {
    const tabMatch =
      activeTab === "All" ||
      (activeTab === "In Progress"  && m.status === "in-progress")  ||
      (activeTab === "Completed"    && m.status === "completed")     ||
      (activeTab === "Delayed"      && m.status === "delayed")       ||
      (activeTab === "Not Started"  && m.status === "not-started");
    const projMatch = filterProj === "All" || m.project === filterProj;
    return tabMatch && projMatch;
  });

  /* summary counts */
  const counts = {
    total:       milestones.length,
    completed:   milestones.filter(m => m.status === "completed").length,
    inProgress:  milestones.filter(m => m.status === "in-progress").length,
    delayed:     milestones.filter(m => m.status === "delayed").length,
    notStarted:  milestones.filter(m => m.status === "not-started").length,
  };

  const radialData = [
    { name: "Completed",   value: counts.completed,  fill: "#10b981" },
    { name: "In Progress", value: counts.inProgress,  fill: "#2563eb" },
    { name: "Delayed",     value: counts.delayed,     fill: "#ef4444" },
    { name: "Not Started", value: counts.notStarted,  fill: "#cbd5e1" },
  ];

  const overallPct = milestones.length
    ? Math.round(milestones.reduce((s, m) => s + m.progress, 0) / milestones.length)
    : 0;

  return (
    <div className="ms-page">

      {/* HEADER */}
      <div className="ms-header">
        <div>
          <p className="ms-breadcrumb">Project Coordinator / Milestones</p>
          <h1 className="ms-title">Milestones</h1>
        </div>
        <div className="ms-header-right">
          <select className="ms-select"
            value={filterProj} onChange={e => setFilterProj(e.target.value)}>
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* SUMMARY ROW */}
      <div className="ms-summary">

        {/* stat cards */}
        <div className="ms-stat-grid">
          {[
            { label: "Total",       val: counts.total,      color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Completed",   val: counts.completed,  color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "In Progress", val: counts.inProgress, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Delayed",     val: counts.delayed,    color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
          ].map(s => (
            <div key={s.label} className="ms-stat-card"
              style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
              <p className="ms-stat-card__label">{s.label}</p>
              <p className="ms-stat-card__val" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* radial chart */}
        <div className="ms-chart-card">
          <div className="ms-chart-card__left">
            <SummaryRadial data={radialData} />
          </div>
          <div className="ms-chart-card__right">
            <p className="ms-chart-card__pct">{overallPct}%</p>
            <p className="ms-chart-card__label">Overall Progress</p>
            <div className="ms-chart-legend">
              {radialData.map(d => (
                <div key={d.name} className="ms-legend-row">
                  <span className="ms-legend-dot" style={{ background: d.fill }} />
                  <span className="ms-legend-label">{d.name}</span>
                  <span className="ms-legend-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* TABS */}
      <div className="ms-tabs">
        {TABS.map(t => (
          <button key={t}
            className={`ms-tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}>
            {t}
            <span className="ms-tab__count">
              {t === "All"         ? counts.total      :
               t === "In Progress" ? counts.inProgress :
               t === "Completed"   ? counts.completed  :
               t === "Delayed"     ? counts.delayed    : counts.notStarted}
            </span>
          </button>
        ))}
      </div>

      {/* MILESTONE LIST */}
      {filtered.length === 0 && (
        <div className="ms-empty">No milestones found for this filter.</div>
      )}

      <div className="ms-list">
        {filtered.map(m => {
          const sc     = STATUS_CFG[m.status];
          const isOpen = expandedId === m.id;
          const days   = daysLeft(m.dueDate);
          const isOverdue = m.status === "delayed";

          return (
            <div key={m.id} className={`ms-card ${isOpen ? "open" : ""} ${isOverdue ? "overdue" : ""}`}>

              {/* left accent */}
              <div className="ms-card__accent" style={{ background: sc.bar }} />

              {/* collapsed header */}
              <div className="ms-card__header" onClick={() => setExpanded(isOpen ? null : m.id)}>
                <div className="ms-card__main">
                  <div className="ms-card__top">
                    <h3 className="ms-card__title">{m.title}</h3>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="ms-card__project">{m.project} &nbsp;·&nbsp; {m.phase}</p>

                  {/* progress bar */}
                  <div className="ms-card__progress-row">
                    <MiniProgress pct={m.progress} color={sc.bar} />
                    <span className="ms-card__pct" style={{ color: sc.bar }}>{m.progress}%</span>
                  </div>
                </div>

                <div className="ms-card__meta">
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">Due Date</p>
                    <p className="ms-meta-val">{fmtDate(m.dueDate)}</p>
                  </div>
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">Assigned To</p>
                    <p className="ms-meta-val">{m.assignedTo}</p>
                  </div>
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">{isOverdue ? "Overdue by" : "Days Left"}</p>
                    <p className="ms-meta-val"
                      style={{ color: isOverdue ? "#ef4444" : days <= 7 ? "#f59e0b" : "#0a2540", fontWeight: 700 }}>
                      {isOverdue ? `${Math.abs(days)} days` : days > 0 ? `${days} days` : "Due today"}
                    </p>
                  </div>
                  <span className="ms-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* expanded body */}
              {isOpen && (
                <div className="ms-card__body">
                  <div className="ms-detail-grid">
                    <div className="ms-detail-block ms-detail-block--wide">
                      <p className="ms-detail-label">Description</p>
                      <p className="ms-detail-val">{m.description || "—"}</p>
                    </div>
                    <div className="ms-detail-block">
                      <p className="ms-detail-label">Start Date</p>
                      <p className="ms-detail-val">{fmtDate(m.startDate)}</p>
                    </div>
                    <div className="ms-detail-block">
                      <p className="ms-detail-label">Due Date</p>
                      <p className="ms-detail-val">{fmtDate(m.dueDate)}</p>
                    </div>
                    <div className="ms-detail-block">
                      <p className="ms-detail-label">Dependencies</p>
                      <p className="ms-detail-val">{m.dependencies || "—"}</p>
                    </div>
                    <div className="ms-detail-block">
                      <p className="ms-detail-label">Risks / Issues</p>
                      <p className="ms-detail-val" style={{ color: m.risks !== "None" ? "#ef4444" : "#065f46" }}>
                        {m.risks || "—"}
                      </p>
                    </div>
                  </div>

                  {/* radial mini for this milestone */}
                  <div className="ms-card__radial">
                    <div className="ms-radial-wrap">
                      <ResponsiveContainer width={110} height={110}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="85%"
                          data={[{ value: m.progress, fill: sc.bar }]}
                          startAngle={90} endAngle={-270}>
                          <RadialBar dataKey="value" cornerRadius={6}
                            background={{ fill: "#f0f6ff" }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="ms-radial-center">
                        <span className="ms-radial-pct" style={{ color: sc.bar }}>{m.progress}%</span>
                        <span className="ms-radial-done">done</span>
                      </div>
                    </div>
                    <div className="ms-radial-info">
                      <p className="ms-radial-title">{m.title}</p>
                      <p className="ms-radial-sub">Assigned to: {m.assignedTo}</p>
                      {isOverdue && (
                        <div className="ms-overdue-alert">
                          This milestone is overdue by {Math.abs(days)} days. Notify Project Manager.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}