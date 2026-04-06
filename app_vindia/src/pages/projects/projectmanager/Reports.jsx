import { useState, useRef, useEffect } from "react";
import "../../../styles/Reports.css";

// ── Week Config with real dates & lock logic ──────────────────
const TODAY = new Date("2026-04-04");

const WEEKS_CONFIG = [
  { id: "W1", short: "Mar 10–14",     startDate: new Date("2026-03-10") },
  { id: "W2", short: "Mar 17–21",     startDate: new Date("2026-03-17") },
  { id: "W3", short: "Mar 24–28",     startDate: new Date("2026-03-24") },
  { id: "W4", short: "Mar 31–Apr 4",  startDate: new Date("2026-03-31") },
  { id: "W5", short: "Apr 7–11",      startDate: new Date("2026-04-07") }, // future — locked
];

const WEEKS = ["W1", "W2", "W3", "W4"];

const WEEK_LABELS = {
  W1: "Week 1 — Mar 10–14",
  W2: "Week 2 — Mar 17–21",
  W3: "Week 3 — Mar 24–28",
  W4: "Week 4 — Mar 31–Apr 4",
};

// ── Weekly Project Data ───────────────────────────────────────
const PROJECT_WEEKLY = {
  W1: {
    overall: 58, phasesComplete: 2, delayedMilestones: 0, weeklyTasks: 14,
    phases: [
      { name: "Foundation",     progress: 100, status: "done",       planned: 30, actual: 32 },
      { name: "Structure",      progress: 100, status: "done",       planned: 60, actual: 58 },
      { name: "Roofing",        progress: 45,  status: "inprogress", planned: 45, actual: 22 },
      { name: "Interior Walls", progress: 20,  status: "inprogress", planned: 40, actual: 9  },
      { name: "Electrical",     progress: 10,  status: "inprogress", planned: 30, actual: 4  },
      { name: "Plumbing",       progress: 5,   status: "inprogress", planned: 25, actual: 2  },
      { name: "Finishing",      progress: 0,   status: "pending",    planned: 35, actual: 0  },
      { name: "Landscaping",    progress: 0,   status: "pending",    planned: 20, actual: 0  },
    ],
  },
  W2: {
    overall: 62, phasesComplete: 2, delayedMilestones: 1, weeklyTasks: 11,
    phases: [
      { name: "Foundation",     progress: 100, status: "done",       planned: 30, actual: 32 },
      { name: "Structure",      progress: 100, status: "done",       planned: 60, actual: 58 },
      { name: "Roofing",        progress: 60,  status: "inprogress", planned: 45, actual: 32 },
      { name: "Interior Walls", progress: 35,  status: "inprogress", planned: 40, actual: 18 },
      { name: "Electrical",     progress: 20,  status: "inprogress", planned: 30, actual: 9  },
      { name: "Plumbing",       progress: 10,  status: "inprogress", planned: 25, actual: 4  },
      { name: "Finishing",      progress: 0,   status: "pending",    planned: 35, actual: 0  },
      { name: "Landscaping",    progress: 0,   status: "pending",    planned: 20, actual: 0  },
    ],
  },
  W3: {
    overall: 65, phasesComplete: 2, delayedMilestones: 1, weeklyTasks: 13,
    phases: [
      { name: "Foundation",     progress: 100, status: "done",       planned: 30, actual: 32 },
      { name: "Structure",      progress: 100, status: "done",       planned: 60, actual: 58 },
      { name: "Roofing",        progress: 75,  status: "inprogress", planned: 45, actual: 42 },
      { name: "Interior Walls", progress: 48,  status: "inprogress", planned: 40, actual: 30 },
      { name: "Electrical",     progress: 28,  status: "inprogress", planned: 30, actual: 13 },
      { name: "Plumbing",       progress: 15,  status: "inprogress", planned: 25, actual: 7  },
      { name: "Finishing",      progress: 0,   status: "pending",    planned: 35, actual: 0  },
      { name: "Landscaping",    progress: 0,   status: "pending",    planned: 20, actual: 0  },
    ],
  },
  W4: {
    overall: 68, phasesComplete: 2, delayedMilestones: 1, weeklyTasks: 9,
    phases: [
      { name: "Foundation",     progress: 100, status: "done",       planned: 30, actual: 32 },
      { name: "Structure",      progress: 100, status: "done",       planned: 60, actual: 58 },
      { name: "Roofing",        progress: 85,  status: "inprogress", planned: 45, actual: 50 },
      { name: "Interior Walls", progress: 60,  status: "inprogress", planned: 40, actual: 44 },
      { name: "Electrical",     progress: 35,  status: "inprogress", planned: 30, actual: 18 },
      { name: "Plumbing",       progress: 20,  status: "inprogress", planned: 25, actual: 10 },
      { name: "Finishing",      progress: 0,   status: "pending",    planned: 35, actual: 0  },
      { name: "Landscaping",    progress: 0,   status: "pending",    planned: 20, actual: 0  },
    ],
  },
};

const PROJECT_MILESTONES = [
  { name: "Site Clearance",      date: "01 Jan 2026", status: "done"    },
  { name: "Foundation Complete", date: "15 Feb 2026", status: "done"    },
  { name: "Structure Complete",  date: "10 Apr 2026", status: "done"    },
  { name: "Roofing Complete",    date: "20 May 2026", status: "delayed" },
  { name: "Interior Done",       date: "15 Jul 2026", status: "pending" },
  { name: "Handover",            date: "30 Sep 2026", status: "pending" },
];

// ── Weekly Cost Data ──────────────────────────────────────────
const COST_WEEKLY = {
  W1: {
    budget: 87500, spent: 85000,
    categories: [
      { name: "Materials",   budget: 35000, spent: 32000 },
      { name: "Labour",      budget: 24000, spent: 25500 },
      { name: "Equipment",   budget: 15000, spent: 14200 },
      { name: "Subcontract", budget: 8500,  spent: 7800  },
      { name: "Overheads",   budget: 3500,  spent: 4200  },
      { name: "Contingency", budget: 1500,  spent: 1300  },
    ],
  },
  W2: {
    budget: 87500, spent: 102500,
    categories: [
      { name: "Materials",   budget: 35000, spent: 40000 },
      { name: "Labour",      budget: 24000, spent: 28000 },
      { name: "Equipment",   budget: 15000, spent: 18500 },
      { name: "Subcontract", budget: 8500,  spent: 9200  },
      { name: "Overheads",   budget: 3500,  spent: 5800  },
      { name: "Contingency", budget: 1500,  spent: 1000  },
    ],
  },
  W3: {
    budget: 87500, spent: 96250,
    categories: [
      { name: "Materials",   budget: 35000, spent: 38000 },
      { name: "Labour",      budget: 24000, spent: 26000 },
      { name: "Equipment",   budget: 15000, spent: 17000 },
      { name: "Subcontract", budget: 8500,  spent: 9500  },
      { name: "Overheads",   budget: 3500,  spent: 4500  },
      { name: "Contingency", budget: 1500,  spent: 1250  },
    ],
  },
  W4: {
    budget: 87500, spent: 45000,
    categories: [
      { name: "Materials",   budget: 35000, spent: 18000 },
      { name: "Labour",      budget: 24000, spent: 14000 },
      { name: "Equipment",   budget: 15000, spent: 7000  },
      { name: "Subcontract", budget: 8500,  spent: 4000  },
      { name: "Overheads",   budget: 3500,  spent: 1500  },
      { name: "Contingency", budget: 1500,  spent: 500   },
    ],
  },
};

const COST_TREND = [
  { week: "W1", budget: 87500, spent: 85000  },
  { week: "W2", budget: 87500, spent: 102500 },
  { week: "W3", budget: 87500, spent: 96250  },
  { week: "W4", budget: 87500, spent: 45000  },
];

// ── Weekly Timesheet Data ─────────────────────────────────────
const TIMESHEET_WEEKLY = {
  W1: {
    totalHours: 380, avgEfficiency: 86, activeWorkers: 6,
    employees: [
      { name: "Rajesh Kumar", role: "Site Engineer", hours: 58, tasks: 12, efficiency: 94 },
      { name: "Priya Sharma", role: "Site Engineer", hours: 54, tasks: 10, efficiency: 88 },
      { name: "Anita Desai",  role: "Architect",     hours: 48, tasks: 9,  efficiency: 91 },
      { name: "Suresh Nair",  role: "Manager",       hours: 44, tasks: 15, efficiency: 96 },
      { name: "Kavita Rao",   role: "Electrician",   hours: 40, tasks: 7,  efficiency: 82 },
      { name: "Mohan Das",    role: "Plumber",       hours: 36, tasks: 6,  efficiency: 76 },
    ],
  },
  W2: {
    totalHours: 420, avgEfficiency: 88, activeWorkers: 7,
    employees: [
      { name: "Rajesh Kumar", role: "Site Engineer", hours: 62, tasks: 13, efficiency: 94 },
      { name: "Priya Sharma", role: "Site Engineer", hours: 58, tasks: 11, efficiency: 89 },
      { name: "Anita Desai",  role: "Architect",     hours: 52, tasks: 9,  efficiency: 91 },
      { name: "Suresh Nair",  role: "Manager",       hours: 48, tasks: 17, efficiency: 96 },
      { name: "Kavita Rao",   role: "Electrician",   hours: 44, tasks: 8,  efficiency: 83 },
      { name: "Mohan Das",    role: "Plumber",       hours: 38, tasks: 7,  efficiency: 79 },
      { name: "Arun Singh",   role: "Carpenter",     hours: 26, tasks: 5,  efficiency: 85 },
    ],
  },
  W3: {
    totalHours: 395, avgEfficiency: 87, activeWorkers: 7,
    employees: [
      { name: "Rajesh Kumar", role: "Site Engineer", hours: 60, tasks: 12, efficiency: 93 },
      { name: "Priya Sharma", role: "Site Engineer", hours: 56, tasks: 10, efficiency: 87 },
      { name: "Anita Desai",  role: "Architect",     hours: 48, tasks: 9,  efficiency: 91 },
      { name: "Suresh Nair",  role: "Manager",       hours: 46, tasks: 16, efficiency: 96 },
      { name: "Kavita Rao",   role: "Electrician",   hours: 42, tasks: 7,  efficiency: 82 },
      { name: "Mohan Das",    role: "Plumber",       hours: 38, tasks: 6,  efficiency: 78 },
      { name: "Arun Singh",   role: "Carpenter",     hours: 22, tasks: 4,  efficiency: 84 },
    ],
  },
  W4: {
    totalHours: 445, avgEfficiency: 89, activeWorkers: 7,
    employees: [
      { name: "Rajesh Kumar", role: "Site Engineer", hours: 68, tasks: 13, efficiency: 95 },
      { name: "Priya Sharma", role: "Site Engineer", hours: 62, tasks: 11, efficiency: 89 },
      { name: "Anita Desai",  role: "Architect",     hours: 56, tasks: 9,  efficiency: 92 },
      { name: "Suresh Nair",  role: "Manager",       hours: 52, tasks: 14, efficiency: 97 },
      { name: "Kavita Rao",   role: "Electrician",   hours: 46, tasks: 8,  efficiency: 82 },
      { name: "Mohan Das",    role: "Plumber",       hours: 38, tasks: 5,  efficiency: 80 },
      { name: "Arun Singh",   role: "Carpenter",     hours: 28, tasks: 5,  efficiency: 86 },
    ],
  },
};

const TIMESHEET_TREND = [
  { week: "W1", hours: 380 },
  { week: "W2", hours: 420 },
  { week: "W3", hours: 395 },
  { week: "W4", hours: 445 },
];

// ── Weekly Incident Data ──────────────────────────────────────
const INCIDENT_WEEKLY = {
  W1: {
    total: 8, open: 4, closed: 4,
    byPriority: [
      { label: "P1 Urgent", count: 2, color: "#ef4444" },
      { label: "P2 Medium", count: 4, color: "#f59e0b" },
      { label: "P3 Low",    count: 2, color: "#22c55e" },
    ],
    byStatus: [
      { label: "Created", count: 2 }, { label: "Assigned", count: 1 },
      { label: "In Progress", count: 1 }, { label: "Resolved", count: 2 }, { label: "Closed", count: 2 },
    ],
    recent: [
      { id: "INC-001", title: "Water leakage in Block B",    priority: "P1", status: "In Progress", age: "3h" },
      { id: "INC-002", title: "Electrical wiring exposed",   priority: "P1", status: "Assigned",    age: "5h" },
      { id: "INC-003", title: "Design revision — staircase", priority: "P2", status: "Created",     age: "1d" },
      { id: "INC-004", title: "Material delivery delay",     priority: "P2", status: "Resolved",    age: "2d" },
      { id: "INC-005", title: "Scaffolding loose bolt",      priority: "P2", status: "Closed",      age: "3d" },
    ],
  },
  W2: {
    total: 6, open: 2, closed: 4,
    byPriority: [
      { label: "P1 Urgent", count: 1, color: "#ef4444" },
      { label: "P2 Medium", count: 3, color: "#f59e0b" },
      { label: "P3 Low",    count: 2, color: "#22c55e" },
    ],
    byStatus: [
      { label: "Created", count: 0 }, { label: "Assigned", count: 0 },
      { label: "In Progress", count: 2 }, { label: "Resolved", count: 1 }, { label: "Closed", count: 3 },
    ],
    recent: [
      { id: "INC-006", title: "Crack in Block A wall",     priority: "P1", status: "In Progress", age: "1d" },
      { id: "INC-007", title: "Paint peeling — 3rd floor", priority: "P3", status: "Resolved",    age: "2d" },
      { id: "INC-008", title: "Drainage blockage",         priority: "P2", status: "In Progress", age: "1d" },
      { id: "INC-009", title: "Safety net repair",         priority: "P2", status: "Closed",      age: "3d" },
      { id: "INC-010", title: "Fire exit obstructed",      priority: "P2", status: "Closed",      age: "4d" },
    ],
  },
  W3: {
    total: 5, open: 2, closed: 3,
    byPriority: [
      { label: "P1 Urgent", count: 1, color: "#ef4444" },
      { label: "P2 Medium", count: 2, color: "#f59e0b" },
      { label: "P3 Low",    count: 2, color: "#22c55e" },
    ],
    byStatus: [
      { label: "Created", count: 0 }, { label: "Assigned", count: 1 },
      { label: "In Progress", count: 1 }, { label: "Resolved", count: 2 }, { label: "Closed", count: 1 },
    ],
    recent: [
      { id: "INC-011", title: "Concrete mix quality issue",   priority: "P1", status: "In Progress", age: "6h" },
      { id: "INC-012", title: "Worker safety gear missing",   priority: "P2", status: "Assigned",    age: "1d" },
      { id: "INC-013", title: "Wiring short circuit Block C", priority: "P2", status: "Resolved",    age: "2d" },
      { id: "INC-014", title: "Painting quality — lobby",     priority: "P3", status: "Closed",      age: "3d" },
      { id: "INC-015", title: "Door frame misaligned",        priority: "P3", status: "Resolved",    age: "4d" },
    ],
  },
  W4: {
    total: 5, open: 3, closed: 2,
    byPriority: [
      { label: "P1 Urgent", count: 2, color: "#ef4444" },
      { label: "P2 Medium", count: 2, color: "#f59e0b" },
      { label: "P3 Low",    count: 1, color: "#22c55e" },
    ],
    byStatus: [
      { label: "Created", count: 2 }, { label: "Assigned", count: 0 },
      { label: "In Progress", count: 1 }, { label: "Resolved", count: 2 }, { label: "Closed", count: 0 },
    ],
    recent: [
      { id: "INC-016", title: "Water leakage — roof slab",   priority: "P1", status: "In Progress", age: "2h" },
      { id: "INC-017", title: "Equipment breakdown — crane", priority: "P1", status: "Created",     age: "4h" },
      { id: "INC-018", title: "Tile crack in staircase",     priority: "P2", status: "Created",     age: "6h" },
      { id: "INC-019", title: "Painting overspray Block D",  priority: "P3", status: "Resolved",    age: "2d" },
      { id: "INC-020", title: "Minor plumbing leak",         priority: "P2", status: "Resolved",    age: "3d" },
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1000000 ? `₹${(n / 1000000).toFixed(2)}M` : `₹${(n / 1000).toFixed(0)}K`;
const pct = (a, b) => Math.round((a / b) * 100);
const getDelta = (curr, prev, higherIsBetter = true) => {
  if (prev == null) return null;
  const diff = curr - prev;
  if (diff === 0) return { val: 0, dir: "flat" };
  return { val: Math.abs(diff), dir: (higherIsBetter ? diff > 0 : diff < 0) ? "up" : "down" };
};

// ── Delta Badge ───────────────────────────────────────────────
function DeltaBadge({ delta, suffix = "" }) {
  if (!delta || delta.dir === "flat") return null;
  return (
    <span className={`rpt-delta rpt-delta-${delta.dir}`}>
      {delta.dir === "up" ? "▲" : "▼"} {delta.val}{suffix}
    </span>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────
function Bar({ value, max = 100, color = "var(--primary-blue)", height = 6 }) {
  const w = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="rpt-bar-track" style={{ height }}>
      <div className="rpt-bar-fill" style={{ width: `${w}%`, background: color, height }} />
    </div>
  );
}

// ── Efficiency Cell — redesigned ──────────────────────────────
function EfficiencyCell({ value }) {
  const isHigh = value >= 90;
  const isMid  = value >= 80;
  const fillColor  = isHigh ? "#22c55e" : isMid ? "#f59e0b" : "#ef4444";
  const pillBg     = isHigh ? "#dcfce7" : isMid ? "#fef3c7" : "#fee2e2";
  const pillColor  = isHigh ? "#15803d" : isMid ? "#b45309" : "#dc2626";
  return (
    <div className="rpt-eff-cell">
      <div className="rpt-eff-bar-wrap">
        <div className="rpt-eff-track">
          <div className="rpt-eff-fill" style={{ width: `${value}%`, background: fillColor }} />
        </div>
      </div>
      <span className="rpt-eff-pill" style={{ background: pillBg, color: pillColor }}>
        {value}%
      </span>
    </div>
  );
}

// ── Bar Chart — fixed height rendering ───────────────────────
function BarChart({ data, valueKey, labelKey, color = "var(--primary-blue)", activeIndex = -1 }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="rpt-chart">
      {data.map((d, i) => {
        const isActive = i === activeIndex;
        const barH = Math.round((d[valueKey] / max) * 100);
        return (
          <div
            key={i}
            className={`rpt-chart-col ${isActive ? "rpt-chart-col-active" : ""}`}
            style={{ opacity: activeIndex >= 0 && !isActive ? 0.35 : 1 }}
          >
            <span className="rpt-chart-val">
              {d[valueKey] >= 1000 ? `${(d[valueKey] / 1000).toFixed(0)}K` : d[valueKey]}
            </span>
            <div className="rpt-chart-bar-wrap">
              <div
                className="rpt-chart-bar"
                style={{
                  height: `${barH}%`,
                  background: isActive ? "var(--primary-blue)" : color,
                }}
              />
            </div>
            <span className="rpt-chart-label">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Dual Bar Chart ────────────────────────────────────────────
function DualBarChart({ data, activeIndex = -1 }) {
  const max = Math.max(...data.flatMap((d) => [d.budget, d.spent]));
  return (
    <div className="rpt-chart rpt-dual-chart">
      {data.map((d, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={i}
            className={`rpt-chart-col ${isActive ? "rpt-chart-col-active" : ""}`}
            style={{ opacity: activeIndex >= 0 && !isActive ? 0.35 : 1 }}
          >
            <div className="rpt-chart-bar-wrap rpt-dual-wrap">
              <div className="rpt-dual-bar-pair">
                <div className="rpt-chart-bar rpt-bar-budget"
                  style={{ height: `${Math.round((d.budget / max) * 100)}%` }} />
                <div className={`rpt-chart-bar rpt-bar-spent ${d.spent > d.budget ? "rpt-bar-over" : ""}`}
                  style={{ height: `${Math.round((d.spent / max) * 100)}%` }} />
              </div>
            </div>
            <span className="rpt-chart-label">{d.week || d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────
function Donut({ value, max = 100, size = 80, stroke = 10, color = "var(--primary-blue)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e6e8ec" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ * p} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size * 0.18} fontWeight="700" fill={color}>
        {Math.round(p * 100)}%
      </text>
    </svg>
  );
}

// ── Exports ───────────────────────────────────────────────────
function exportCSV(filename, rows) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function exportPDF(name, weekLabel) {
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>${name}</title><style>
    body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1a1a2e}
    h1{color:#1e5a96;font-size:22px} p{color:#7a7a8a;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#1e5a96;color:white;padding:8px 12px;text-align:left}
    td{padding:8px 12px;border-bottom:1px solid #e6e8ec}
    </style></head><body>
    <h1>${name}</h1><p>${new Date().toLocaleString()} | Greenfield Towers — ${weekLabel}</p>
    </body></html>`);
  win.document.close(); win.print();
}

// ── Inline Week Selector ──────────────────────────────────────
function WeekSelector({ weekIndex, setWeekIndex }) {
  const trackRef = useRef(null);

  useEffect(() => {
    const active = trackRef.current?.querySelector(".rpt-wc-chip-active");
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [weekIndex]);

  const canPrev = weekIndex > 0;
  const canNext = weekIndex < WEEKS.length - 1;

  return (
    <div className="rpt-wc">
      <button className="rpt-wc-arrow" onClick={() => canPrev && setWeekIndex((i) => i - 1)} disabled={!canPrev}>‹</button>
      <div className="rpt-wc-track" ref={trackRef}>
        {WEEKS_CONFIG.map((w, i) => {
          const isFuture = w.startDate > TODAY;
          const isActive = weekIndex === i && !isFuture;
          return (
            <button
              key={w.id}
              className={`rpt-wc-chip${isActive ? " rpt-wc-chip-active" : ""}${isFuture ? " rpt-wc-chip-locked" : ""}`}
              onClick={() => !isFuture && setWeekIndex(i)}
              disabled={isFuture}
              title={isFuture ? "Not yet available" : WEEK_LABELS[w.id] || w.id}
            >
              {isFuture
                ? <><span className="rpt-wc-lock">🔒</span><span className="rpt-wc-id">{w.id}</span></>
                : <><span className="rpt-wc-id">{w.id}</span><span className="rpt-wc-dates">{w.short}</span></>
              }
            </button>
          );
        })}
      </div>
      <button className="rpt-wc-arrow" onClick={() => canNext && setWeekIndex((i) => i + 1)} disabled={!canNext}>›</button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Reports() {
  const [activeReport, setActiveReport] = useState("project");
  const [weekIndex, setWeekIndex] = useState(3);

  const currentWeek = WEEKS[weekIndex];
  const prevWeek    = weekIndex > 0 ? WEEKS[weekIndex - 1] : null;

  const REPORTS = [
    { id: "project",   label: "Project Report",  icon: "📈" },
    { id: "cost",      label: "Cost Report",      icon: "💰" },
    { id: "timesheet", label: "Timesheet Report", icon: "⏱" },
    { id: "incident",  label: "Incident Report",  icon: "🚨" },
  ];

  const handleExcelExport = () => {
    const wk = currentWeek;
    if (activeReport === "project") {
      exportCSV(`project_${wk}.csv`, [
        ["Phase","Progress %","Planned Days","Actual Days","Status"],
        ...PROJECT_WEEKLY[wk].phases.map((p) => [p.name, p.progress, p.planned, p.actual, p.status]),
      ]);
    } else if (activeReport === "cost") {
      exportCSV(`cost_${wk}.csv`, [
        ["Category","Budget","Spent","Remaining","Usage %"],
        ...COST_WEEKLY[wk].categories.map((c) => [c.name, c.budget, c.spent, c.budget-c.spent, pct(c.spent,c.budget)]),
      ]);
    } else if (activeReport === "timesheet") {
      exportCSV(`timesheet_${wk}.csv`, [
        ["Employee","Role","Hours","Tasks","Efficiency %"],
        ...TIMESHEET_WEEKLY[wk].employees.map((e) => [e.name, e.role, e.hours, e.tasks, e.efficiency]),
      ]);
    } else {
      exportCSV(`incidents_${wk}.csv`, [
        ["ID","Title","Priority","Status","Age"],
        ...INCIDENT_WEEKLY[wk].recent.map((i) => [i.id, i.title, i.priority, i.status, i.age]),
      ]);
    }
  };

  const handlePDFExport = () => {
    const r = REPORTS.find((r) => r.id === activeReport);
    exportPDF(r.label, WEEK_LABELS[currentWeek]);
  };

  const tsNow    = TIMESHEET_WEEKLY[currentWeek];
  const tsPrev   = prevWeek ? TIMESHEET_WEEKLY[prevWeek] : null;
  const costNow  = COST_WEEKLY[currentWeek];
  const costPrev = prevWeek ? COST_WEEKLY[prevWeek] : null;
  const projNow  = PROJECT_WEEKLY[currentWeek];
  const projPrev = prevWeek ? PROJECT_WEEKLY[prevWeek] : null;
  const incNow   = INCIDENT_WEEKLY[currentWeek];
  const incPrev  = prevWeek ? INCIDENT_WEEKLY[prevWeek] : null;

  const tsDeltaHours   = getDelta(tsNow.totalHours,    tsPrev?.totalHours);
  const tsDeltaEff     = getDelta(tsNow.avgEfficiency,  tsPrev?.avgEfficiency);
  const tsDeltaWorkers = getDelta(tsNow.activeWorkers,  tsPrev?.activeWorkers);
  const projDeltaAll   = getDelta(projNow.overall,      projPrev?.overall);
  const costDeltaSpent = getDelta(costNow.spent,        costPrev?.spent, false);
  const incDeltaOpen   = getDelta(incNow.open,          incPrev?.open,   false);
  const incDeltaTotal  = getDelta(incNow.total,         incPrev?.total,  false);

  return (
    <div className="rpt-page">

      {/* ── Header ── */}
      <div className="rpt-header">
        <div className="rpt-header-title">
          <h1>Reports</h1>
          <p>Weekly project analytics — Greenfield Towers</p>
        </div>

        <WeekSelector weekIndex={weekIndex} setWeekIndex={setWeekIndex} />

        <div className="rpt-export-group">
          <button className="rpt-export-btn rpt-excel" onClick={handleExcelExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
            </svg>
            Export Excel
          </button>
          <button className="rpt-export-btn rpt-pdf" onClick={handlePDFExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="rpt-tabs">
        {REPORTS.map((r) => (
          <button key={r.id} className={`rpt-tab ${activeReport === r.id ? "rpt-tab-active" : ""}`}
            onClick={() => setActiveReport(r.id)}>
            <span className="rpt-tab-icon">{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {/* ══ PROJECT REPORT ══ */}
      {activeReport === "project" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={projNow.overall} color="#1e5a96" size={72} />
              <div>
                <span className="rpt-kpi-label">Overall Progress</span>
                <span className="rpt-kpi-val">{projNow.overall}%</span>
                <DeltaBadge delta={projDeltaAll} suffix="%" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Phases Complete</span>
                <span className="rpt-kpi-val">{projNow.phases.filter((p) => p.status === "done").length} / {projNow.phases.length}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Delayed Milestones</span>
                <span className="rpt-kpi-val">{projNow.delayedMilestones}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Tasks This Week</span>
                <span className="rpt-kpi-val">{projNow.weeklyTasks}</span>
              </div>
            </div>
          </div>

          <div className="rpt-trend-strip">
            <span className="rpt-trend-label">Progress Trend</span>
            <div className="rpt-sparkline">
              {WEEKS.map((w, i) => {
                const val = PROJECT_WEEKLY[w].overall;
                return (
                  <div key={w} className={`rpt-spark-col ${weekIndex === i ? "spark-active" : ""}`}>
                    <span className="rpt-spark-val">{val}%</span>
                    <div className="rpt-spark-bar-wrap">
                      <div className="rpt-spark-bar" style={{ height: `${val}%`, background: weekIndex === i ? "var(--primary-blue)" : "#c7d9ef" }} />
                    </div>
                    <span className="rpt-spark-week">{w}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Phase Progress</h3><span className="rpt-card-sub">Planned vs Actual days</span></div>
              <div className="rpt-phase-list">
                {projNow.phases.map((p, i) => (
                  <div key={i} className="rpt-phase-row">
                    <div className="rpt-phase-info">
                      <span className="rpt-phase-name">{p.name}</span>
                      <div className="rpt-phase-days">
                        <span className="rpt-days-planned">Plan: {p.planned}d</span>
                        {p.actual > 0 && (
                          <span className={`rpt-days-actual ${p.actual > p.planned ? "over" : "under"}`}>
                            Act: {p.actual}d {p.actual > p.planned ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rpt-phase-bar-area">
                      <Bar value={p.progress} color={p.status === "done" ? "#22c55e" : p.status === "inprogress" ? "#1e5a96" : "#e6e8ec"} />
                      <span className="rpt-phase-pct">{p.progress}%</span>
                    </div>
                    <span className={`rpt-phase-status rpt-ps-${p.status}`}>
                      {p.status === "done" ? "✔ Done" : p.status === "inprogress" ? "◐ Active" : "○ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Milestones</h3><span className="rpt-card-sub">Key project dates</span></div>
              <div className="rpt-milestone-list">
                {PROJECT_MILESTONES.map((m, i) => (
                  <div key={i} className="rpt-milestone-row">
                    <div className={`rpt-ms-dot rpt-ms-${m.status}`}>{m.status === "done" ? "✔" : m.status === "delayed" ? "!" : "○"}</div>
                    <div className="rpt-ms-info">
                      <span className="rpt-ms-name">{m.name}</span>
                      <span className="rpt-ms-date">{m.date}</span>
                    </div>
                    <span className={`rpt-ms-badge rpt-ms-${m.status}`}>
                      {m.status === "done" ? "Complete" : m.status === "delayed" ? "Delayed" : "Upcoming"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ COST REPORT ══ */}
      {activeReport === "cost" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={pct(costNow.spent, costNow.budget)} color={costNow.spent > costNow.budget ? "#ef4444" : "#1e5a96"} size={72} />
              <div>
                <span className="rpt-kpi-label">Budget Used</span>
                <span className="rpt-kpi-val">{pct(costNow.spent, costNow.budget)}%</span>
                {costNow.spent > costNow.budget && <span className="rpt-over-badge">Over Budget</span>}
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">₹</div>
              <div><span className="rpt-kpi-label">Weekly Budget</span><span className="rpt-kpi-val">{fmt(costNow.budget)}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costNow.spent > costNow.budget ? "kpi-red" : "kpi-amber"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Weekly Spent</span>
                <span className="rpt-kpi-val">{fmt(costNow.spent)}</span>
                <DeltaBadge delta={costDeltaSpent} suffix="K" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costNow.budget - costNow.spent < 0 ? "kpi-red" : "kpi-green"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Remaining</span>
                <span className="rpt-kpi-val">{fmt(Math.abs(costNow.budget - costNow.spent))}</span>
                {costNow.spent > costNow.budget && <span className="rpt-over-badge">Overspent</span>}
              </div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Budget vs Spent</h3>
                <div className="rpt-legend">
                  <span className="rpt-legend-dot" style={{ background: "#c7d9ef" }} /> Budget
                  <span className="rpt-legend-dot" style={{ background: "#1e5a96" }} /> Spent
                </div>
              </div>
              <div className="rpt-cost-list">
                {costNow.categories.map((c, i) => {
                  const usedPct = pct(c.spent, c.budget);
                  const over = c.spent > c.budget;
                  return (
                    <div key={i} className="rpt-cost-row">
                      <span className="rpt-cost-name">{c.name}</span>
                      <div className="rpt-cost-bars">
                        <div className="rpt-cost-bar-track">
                          <div className="rpt-cost-bar-budget" style={{ width: "100%" }} />
                          <div className={`rpt-cost-bar-spent ${over ? "over-budget" : ""}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                        </div>
                        <span className={`rpt-cost-pct ${over ? "text-red" : ""}`}>{usedPct}%</span>
                      </div>
                      <div className="rpt-cost-amounts">
                        <span className="rpt-cost-spent">{fmt(c.spent)}</span>
                        <span className="rpt-cost-budget">/ {fmt(c.budget)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Weekly Spend Trend</h3>
                <div className="rpt-legend">
                  <span className="rpt-legend-dot" style={{ background: "#c7d9ef" }} /> Budget
                  <span className="rpt-legend-dot" style={{ background: "#1e5a96" }} /> Spent
                </div>
              </div>
              <DualBarChart data={COST_TREND} activeIndex={weekIndex} />
            </div>
          </div>
        </div>
      )}

      {/* ══ TIMESHEET REPORT ══ */}
      {activeReport === "timesheet" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Week Hours</span>
                <span className="rpt-kpi-val">{tsNow.totalHours}</span>
                <DeltaBadge delta={tsDeltaHours} suffix="h" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Active Workers</span>
                <span className="rpt-kpi-val">{tsNow.activeWorkers}</span>
                <DeltaBadge delta={tsDeltaWorkers} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Avg Efficiency</span>
                <span className="rpt-kpi-val">{tsNow.avgEfficiency}%</span>
                <DeltaBadge delta={tsDeltaEff} suffix="%" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Tasks</span>
                <span className="rpt-kpi-val">{tsNow.employees.reduce((s, e) => s + e.tasks, 0)}</span>
              </div>
            </div>
          </div>

          <div className="rpt-ts-grid">
            {/* Employee table */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Employee Productivity</h3>
                <span className="rpt-card-sub">{WEEK_LABELS[currentWeek]} — hours &amp; efficiency</span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr><th>Employee</th><th>Role</th><th>Hours</th><th>Tasks</th><th>Efficiency</th></tr>
                  </thead>
                  <tbody>
                    {tsNow.employees.map((e, i) => (
                      <tr key={i}>
                        <td>
                          <div className="rpt-emp-cell">
                            <div className="rpt-emp-avatar">{e.name.charAt(0)}</div>
                            {e.name}
                          </div>
                        </td>
                        <td><span className="rpt-role-badge">{e.role}</span></td>
                        <td><strong>{e.hours}h</strong></td>
                        <td>{e.tasks}</td>
                        <td><EfficiencyCell value={e.efficiency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly hours trend */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Weekly Hours Trend</h3>
                <span className="rpt-card-sub">All weeks comparison</span>
              </div>
              <BarChart data={TIMESHEET_TREND} valueKey="hours" labelKey="week" color="#c7d9ef" activeIndex={weekIndex} />
            </div>
          </div>
        </div>
      )}

      {/* ══ INCIDENT REPORT ══ */}
      {activeReport === "incident" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={incNow.total > 0 ? pct(incNow.closed, incNow.total) : 100} color="#22c55e" size={72} />
              <div>
                <span className="rpt-kpi-label">Resolution Rate</span>
                <span className="rpt-kpi-val">{incNow.total > 0 ? pct(incNow.closed, incNow.total) : 100}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Incidents</span>
                <span className="rpt-kpi-val">{incNow.total}</span>
                <DeltaBadge delta={incDeltaTotal} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Open</span>
                <span className="rpt-kpi-val">{incNow.open}</span>
                <DeltaBadge delta={incDeltaOpen} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div><span className="rpt-kpi-label">Closed</span><span className="rpt-kpi-val">{incNow.closed}</span></div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>By Priority</h3><span className="rpt-card-sub">Incident distribution</span></div>
              <div className="rpt-inc-priority-list">
                {incNow.byPriority.map((p, i) => (
                  <div key={i} className="rpt-inc-p-row">
                    <div className="rpt-inc-p-info">
                      <span className="rpt-inc-p-dot" style={{ background: p.color }} />
                      <span className="rpt-inc-p-label">{p.label}</span>
                    </div>
                    <Bar value={p.count} max={incNow.total || 1} color={p.color} />
                    <span className="rpt-inc-p-count">{p.count}</span>
                  </div>
                ))}
              </div>
              <div className="rpt-card-header" style={{ marginTop: 20 }}><h3>By Status</h3></div>
              <div className="rpt-inc-status-list">
                {incNow.byStatus.map((s, i) => (
                  <div key={i} className="rpt-inc-s-row">
                    <span className="rpt-inc-s-label">{s.label}</span>
                    <div className="rpt-inc-s-bar">
                      <div className="rpt-inc-s-fill" style={{ width: `${pct(s.count, incNow.total || 1)}%` }} />
                    </div>
                    <span className="rpt-inc-s-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Incidents This Week</h3>
                <span className="rpt-card-sub">{WEEK_LABELS[currentWeek]}</span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Age</th></tr></thead>
                  <tbody>
                    {incNow.recent.map((inc, i) => (
                      <tr key={i}>
                        <td><code className="rpt-inc-id">{inc.id}</code></td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.title}</td>
                        <td><span className={`rpt-p-badge rpt-p-${inc.priority.toLowerCase()}`}>{inc.priority}</span></td>
                        <td><span className={`rpt-s-badge rpt-s-${inc.status.toLowerCase().replace(/ /g, "-")}`}>{inc.status}</span></td>
                        <td className="rpt-age">{inc.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rpt-open-closed">
                <div className="rpt-oc-bar">
                  <div className="rpt-oc-open"  style={{ width: `${pct(incNow.open,   incNow.total || 1)}%` }} />
                  <div className="rpt-oc-closed" style={{ width: `${pct(incNow.closed, incNow.total || 1)}%` }} />
                </div>
                <div className="rpt-oc-legend">
                  <span><span className="rpt-oc-dot open" /> Open ({incNow.open})</span>
                  <span><span className="rpt-oc-dot closed" /> Closed ({incNow.closed})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}