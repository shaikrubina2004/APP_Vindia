import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Coordinator.css";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

/* ─────────────────────────────────────────
   MOCK BACKEND DATA  (replace with your API)
───────────────────────────────────────────*/
const MOCK_PROJECTS = [
  {
    id: 3,
    name: "Eiffel Tower - Paris",
    client: "XBC Developers",
    budget: 5000000,
    manager_id: 13,
    status: "IN PROGRESS",
    created_at: "2026-03-27 11:44:07.170999",
    progress: 45,
    site_engineer_id: 3,
    start_date: "2026-03-01",
    end_date: "2028-12-31",
    spent: "2000000.00",
    client_paid: "1500000.00",
    location: "Paris",
    description: "High-rise commercial building",
    updated_at: "2026-03-27 11:44:07.170999",
    building_type: "Commercial",
    floors: "G+20",
    plot_size: "8000 sq ft",
    phone: "9123456780",
    site_engineer_name: "Nikhil",
  },
  {
    id: 5,
    name: "NH-66",
    client: "Government Of India",
    budget: 10000000,
    manager_id: 13,
    status: "Active",
    created_at: "2026-03-31 17:05:55.367627",
    progress: null,
    site_engineer_id: 3,
    start_date: "2026-03-31",
    end_date: "2032-06-30",
    spent: "0.00",
    client_paid: "0.00",
    location: "Kerala",
    description: "National highway project",
    updated_at: "2026-03-31 17:05:55.367627",
    building_type: "Infrastructure",
    floors: "N/A",
    plot_size: "50 km stretch",
    phone: "9988776655",
    site_engineer_name: "Nikhil",
  },
  {
    id: 6,
    name: "TAJMAHAL",
    client: "SHAJAHAAN",
    budget: 100000000,
    manager_id: 13,
    status: "Active",
    created_at: "2026-04-01 05:59:19.544745",
    progress: null,
    site_engineer_id: 3,
    start_date: "2026-04-01",
    end_date: "2028-03-15",
    spent: "0.00",
    client_paid: "0.00",
    location: "Agra",
    description: "Residential heritage project",
    updated_at: "2026-04-01 05:59:19.544745",
    building_type: "Residential",
    floors: "G+2",
    plot_size: "3000 sq ft",
    phone: "9090909090",
    site_engineer_name: "Nikhil",
  },
];

/* ─── helpers ─── */
const fmt = (n) =>
  Number(n) >= 10000000
    ? `₹${(Number(n) / 10000000).toFixed(1)}Cr`
    : Number(n) >= 100000
    ? `₹${(Number(n) / 100000).toFixed(1)}L`
    : `₹${Number(n).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* build weekly-style timeline data per project */
const buildTimeline = (proj) => {
  const p = proj.progress || 0;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => {
    const base = Math.round(p * ((i + 1) / days.length));
    return {
      day,
      completed: base,
      progress: Math.min(100, Math.round(base * 1.1 + i * 2)),
      delay: Math.max(0, Math.round((100 - base) * 0.15 - i)),
    };
  });
};

/* ─── Status pill ─── */
const StatusPill = ({ status }) => {
  const map = {
    "IN PROGRESS": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
    Active:        { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    active:        { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    "ON HOLD":     { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    Completed:     { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  };
  const cfg = map[status] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <span className="coord-status-pill" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="coord-status-dot" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

/* ─── Circular progress ring ─── */
const Ring = ({ pct = 0, size = 56, stroke = 5 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dbeafe" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2563eb" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
};

/* ─── Custom chart tooltip ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="coord-tooltip">
      <p className="coord-tooltip__day">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700, fontSize: 12 }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

/* ─── Detail row component ─── */
const DetailRow = ({ icon, label, value }) => (
  <div className="coord-detail-row">
    <span className="coord-detail-row__icon">{icon}</span>
    <div>
      <p className="coord-detail-row__label">{label}</p>
      <p className="coord-detail-row__value">{value || "—"}</p>
    </div>
  </div>
);

/* ─── Animated number ─── */
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    let cur = 0;
    const step = Math.ceil(target / (dur / 16));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setV(target); clearInterval(t); } else setV(cur);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

/* ─── Stat card ─── */
const StatCard = ({ label, value, accent, suffix = "" }) => {
  const n = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="coord-stat-card" style={{ "--accent": accent }}>
      <p className="coord-stat-card__label">{label}</p>
      <p className="coord-stat-card__value" style={{ color: accent }}>
        {typeof value === "number" ? n : value}{suffix}
      </p>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   COORDINATOR PROJECT CARD (uses your existing
   ProjectCard's logic but with coordinator styling)
══════════════════════════════════════════════════ */
const CoordProjectCard = ({ proj, isActive, onClick }) => (
  <div className={`coord-project-card ${isActive ? "active" : ""}`} onClick={onClick}>
    <div className="coord-project-card__accent" />
    <div className="coord-project-card__top">
      <div className="coord-project-card__info">
        <p className="coord-project-card__client">{proj.client}</p>
        <h3 className="coord-project-card__name">{proj.name}</h3>
        <StatusPill status={proj.status} />
      </div>
      <div className="coord-project-card__ring">
        <Ring pct={proj.progress || 0} />
        <span className="coord-project-card__pct">{proj.progress || 0}%</span>
      </div>
    </div>
    <div className="coord-project-card__meta">
      <div><p className="meta-lbl">Engineer</p><p className="meta-val">{proj.site_engineer_name || "—"}</p></div>
      <div><p className="meta-lbl">Budget</p><p className="meta-val">{fmt(proj.budget)}</p></div>
      <div><p className="meta-lbl">Deadline</p><p className="meta-val">{fmtDate(proj.end_date)}</p></div>
    </div>
    <div className="coord-bar-track">
      <div className="coord-bar-fill" style={{ width: `${proj.progress || 0}%` }} />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════ */
const ProjectCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [projects] = useState(MOCK_PROJECTS);
  const [selected, setSelected] = useState(MOCK_PROJECTS[0]);

  const p = selected?.progress || 0;
  const budget = Number(selected?.budget || 0);
  const spent = Number(selected?.spent || 0);
  const paid = Number(selected?.client_paid || 0);
  const remaining = budget - spent;

  const timelineData = buildTimeline(selected);

  return (
    <div className="coord-dashboard">

      {/* HEADER */}
      <div className="coord-header">
        <div>
          <p className="coord-breadcrumb">Dashboard</p>
          <h1 className="coord-title">Project Coordinator</h1>
        </div>
        <div className="coord-header-actions">
          <button className="coord-btn-outline" onClick={() => navigate("/project-coordinator/payments")}>
            Payments
          </button>
          <button className="coord-btn-primary">+ New Project</button>
        </div>
      </div>

      {/* PROJECT CARDS */}
      <div className="coord-projects">
        {projects.map((proj) => (
          <CoordProjectCard
            key={proj.id}
            proj={proj}
            isActive={selected?.id === proj.id}
            onClick={() => setSelected(proj)}
          />
        ))}
      </div>

      {/* DETAIL + CHART GRID */}
      {selected && (
        <div className="coord-main-grid">

          {/* ── LEFT: Project Details ── */}
          <div className="coord-detail-panel">
            <div className="coord-detail-panel__header">
              <div>
                <h2 className="coord-detail-panel__name">{selected.name}</h2>
                <p className="coord-detail-panel__desc">{selected.description}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            {/* STATS ROW */}
            <div className="coord-stats-row">
              <StatCard label="Progress" value={p} accent="#2563eb" suffix="%" />
              <StatCard label="Budget" value={fmt(budget)} accent="#0a2540" />
              <StatCard label="Spent" value={fmt(spent)} accent="#dc2626" />
              <StatCard label="Client Paid" value={fmt(paid)} accent="#16a34a" />
            </div>

            {/* BUDGET BAR */}
            <div className="coord-budget-section">
              <div className="coord-budget-bar-wrap">
                <div className="coord-budget-bar-track">
                  <div className="coord-budget-bar-fill coord-budget-bar-fill--spent"
                    style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} />
                  <div className="coord-budget-bar-fill coord-budget-bar-fill--paid"
                    style={{ width: `${Math.min(100, (paid / budget) * 100)}%` }} />
                </div>
                <div className="coord-budget-legend">
                  <span className="coord-budget-legend__item"><span className="dot dot--red" />Spent {fmt(spent)}</span>
                  <span className="coord-budget-legend__item"><span className="dot dot--green" />Received {fmt(paid)}</span>
                  <span className="coord-budget-legend__item"><span className="dot dot--blue" />Remaining {fmt(remaining)}</span>
                </div>
              </div>
            </div>

            {/* DETAIL GRID */}
            <div className="coord-info-grid">
              <DetailRow icon="📍" label="Location"      value={selected.location} />
              <DetailRow icon="🏗️" label="Building Type" value={selected.building_type} />
              <DetailRow icon="📐" label="Plot Size"     value={selected.plot_size} />
              <DetailRow icon="🏢" label="Floors"        value={selected.floors} />
              <DetailRow icon="📅" label="Start Date"    value={fmtDate(selected.start_date)} />
              <DetailRow icon="🏁" label="End Date"      value={fmtDate(selected.end_date)} />
              <DetailRow icon="👤" label="Client"        value={selected.client} />
              <DetailRow icon="📞" label="Phone"         value={selected.phone} />
            </div>
          </div>

          {/* ── RIGHT: 3-Line Progress Chart ── */}
          <div className="coord-chart-panel">
            <div className="coord-chart-panel__header">
              <div>
                <h3 className="coord-chart-panel__title">Progress Timeline</h3>
                <p className="coord-chart-panel__sub">Weekly overview · {selected.name}</p>
              </div>
              <span className="coord-chart-badge">Weekly</span>
            </div>

            <div className="coord-chart-legend">
              <span className="coord-chart-legend__item"><span className="dot dot--green" />Completed</span>
              <span className="coord-chart-legend__item"><span className="dot dot--blue" />Progress</span>
              <span className="coord-chart-legend__item"><span className="dot dot--red" />Delay Risk</span>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="completed" name="Completed"
                  stroke="#16a34a" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="progress" name="Progress"
                  stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="delay" name="Delay Risk"
                  stroke="#dc2626" strokeWidth={2.5} strokeDasharray="5 3"
                  dot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>

            {/* quick summary chips */}
            <div className="coord-chart-chips">
              <div className="coord-chip coord-chip--green">
                <p className="coord-chip__num">{p}%</p>
                <p className="coord-chip__label">Complete</p>
              </div>
              <div className="coord-chip coord-chip--blue">
                <p className="coord-chip__num">{Math.min(100, p + 10)}%</p>
                <p className="coord-chip__label">In Progress</p>
              </div>
              <div className="coord-chip coord-chip--red">
                <p className="coord-chip__num">{Math.max(0, 100 - p - 15)}%</p>
                <p className="coord-chip__label">Pending</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default ProjectCoordinatorDashboard;