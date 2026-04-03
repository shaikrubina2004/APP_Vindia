import { useState } from "react";
import "../../../styles/Reports.css";
// ── Mock Data ────────────────────────────────────────────────
const PROJECT_DATA = {
  name: "Greenfield Towers",
  overall: 68,
  phases: [
    {
      name: "Foundation",
      progress: 100,
      status: "done",
      planned: 30,
      actual: 32,
    },
    {
      name: "Structure",
      progress: 100,
      status: "done",
      planned: 60,
      actual: 58,
    },
    {
      name: "Roofing",
      progress: 85,
      status: "inprogress",
      planned: 45,
      actual: 50,
    },
    {
      name: "Interior Walls",
      progress: 60,
      status: "inprogress",
      planned: 40,
      actual: 44,
    },
    {
      name: "Electrical",
      progress: 35,
      status: "inprogress",
      planned: 30,
      actual: 18,
    },
    {
      name: "Plumbing",
      progress: 20,
      status: "inprogress",
      planned: 25,
      actual: 10,
    },
    {
      name: "Finishing",
      progress: 0,
      status: "pending",
      planned: 35,
      actual: 0,
    },
    {
      name: "Landscaping",
      progress: 0,
      status: "pending",
      planned: 20,
      actual: 0,
    },
  ],
  milestones: [
    { name: "Site Clearance", date: "01 Jan 2026", status: "done" },
    { name: "Foundation Complete", date: "15 Feb 2026", status: "done" },
    { name: "Structure Complete", date: "10 Apr 2026", status: "done" },
    { name: "Roofing Complete", date: "20 May 2026", status: "delayed" },
    { name: "Interior Done", date: "15 Jul 2026", status: "pending" },
    { name: "Handover", date: "30 Sep 2026", status: "pending" },
  ],
};

const COST_DATA = {
  totalBudget: 4500000,
  totalSpent: 3120000,
  categories: [
    { name: "Materials", budget: 1800000, spent: 1350000 },
    { name: "Labour", budget: 1200000, spent: 980000 },
    { name: "Equipment", budget: 600000, spent: 520000 },
    { name: "Subcontract", budget: 500000, spent: 180000 },
    { name: "Overheads", budget: 250000, spent: 70000 },
    { name: "Contingency", budget: 150000, spent: 20000 },
  ],
  monthly: [
    { month: "Jan", budget: 300000, spent: 280000 },
    { month: "Feb", budget: 380000, spent: 410000 },
    { month: "Mar", budget: 420000, spent: 395000 },
    { month: "Apr", budget: 450000, spent: 470000 },
    { month: "May", budget: 400000, spent: 385000 },
    { month: "Jun", budget: 350000, spent: 180000 },
  ],
};

const TIMESHEET_DATA = {
  totalHours: 12840,
  thisMonth: 1640,
  employees: [
    {
      name: "Rajesh Kumar",
      role: "Site Engineer",
      hours: 2340,
      tasks: 48,
      efficiency: 94,
    },
    {
      name: "Priya Sharma",
      role: "Site Engineer",
      hours: 2180,
      tasks: 42,
      efficiency: 88,
    },
    {
      name: "Anita Desai",
      role: "Architect",
      hours: 1960,
      tasks: 36,
      efficiency: 91,
    },
    {
      name: "Suresh Nair",
      role: "Manager",
      hours: 1820,
      tasks: 62,
      efficiency: 96,
    },
    {
      name: "Kavita Rao",
      role: "Electrician",
      hours: 1640,
      tasks: 29,
      efficiency: 82,
    },
    {
      name: "Mohan Das",
      role: "Plumber",
      hours: 1480,
      tasks: 24,
      efficiency: 79,
    },
    {
      name: "Arun Singh",
      role: "Carpenter",
      hours: 920,
      tasks: 18,
      efficiency: 85,
    },
  ],
  weekly: [
    { week: "W1", hours: 380 },
    { week: "W2", hours: 420 },
    { week: "W3", hours: 395 },
    { week: "W4", hours: 445 },
  ],
};

const INCIDENT_DATA = {
  total: 24,
  open: 6,
  closed: 18,
  byPriority: [
    { label: "P1 Urgent", count: 5, color: "#ef4444" },
    { label: "P2 Medium", count: 11, color: "#f59e0b" },
    { label: "P3 Low", count: 8, color: "#22c55e" },
  ],
  byStatus: [
    { label: "Created", count: 2 },
    { label: "Assigned", count: 1 },
    { label: "In Progress", count: 3 },
    { label: "Resolved", count: 10 },
    { label: "Closed", count: 8 },
  ],
  recent: [
    {
      id: "INC-001",
      title: "Water leakage in Block B",
      priority: "P1",
      status: "In Progress",
      age: "3h",
    },
    {
      id: "INC-002",
      title: "Electrical wiring exposed",
      priority: "P1",
      status: "Assigned",
      age: "5h",
    },
    {
      id: "INC-003",
      title: "Design revision — staircase",
      priority: "P2",
      status: "Created",
      age: "1d",
    },
    {
      id: "INC-004",
      title: "Material delivery delay",
      priority: "P2",
      status: "Resolved",
      age: "3d",
    },
    {
      id: "INC-005",
      title: "Painting quality issue",
      priority: "P3",
      status: "Closed",
      age: "7d",
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1000000 ? `₹${(n / 1000000).toFixed(2)}M` : `₹${(n / 1000).toFixed(0)}K`;

const pct = (a, b) => Math.round((a / b) * 100);

// ── Mini Bar ─────────────────────────────────────────────────
function Bar({ value, max = 100, color = "var(--primary-blue)", height = 6 }) {
  const w = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="rpt-bar-track" style={{ height }}>
      <div
        className="rpt-bar-fill"
        style={{ width: `${w}%`, background: color, height }}
      />
    </div>
  );
}

// ── Mini Chart (CSS-only bar chart) ──────────────────────────
function BarChart({ data, valueKey, labelKey, color = "var(--primary-blue)" }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="rpt-chart">
      {data.map((d, i) => (
        <div key={i} className="rpt-chart-col">
          <span className="rpt-chart-val">
            {d[valueKey] >= 1000
              ? `${(d[valueKey] / 1000).toFixed(0)}K`
              : d[valueKey]}
          </span>
          <div className="rpt-chart-bar-wrap">
            <div
              className="rpt-chart-bar"
              style={{
                height: `${Math.round((d[valueKey] / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
          <span className="rpt-chart-label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Dual Bar Chart ────────────────────────────────────────────
function DualBarChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.budget, d.spent]));
  return (
    <div className="rpt-chart rpt-dual-chart">
      {data.map((d, i) => (
        <div key={i} className="rpt-chart-col">
          <div className="rpt-chart-bar-wrap rpt-dual-wrap">
            <div className="rpt-dual-bar-pair">
              <div
                className="rpt-chart-bar rpt-bar-budget"
                style={{ height: `${Math.round((d.budget / max) * 100)}%` }}
              />
              <div
                className="rpt-chart-bar rpt-bar-spent"
                style={{ height: `${Math.round((d.spent / max) * 100)}%` }}
              />
            </div>
          </div>
          <span className="rpt-chart-label">
            {d.month || d.name?.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Donut SVG ─────────────────────────────────────────────────
function Donut({
  value,
  max = 100,
  size = 80,
  stroke = 10,
  color = "var(--primary-blue)",
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct2 = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e6e8ec"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${circ * pct2} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.18}
        fontWeight="700"
        fill={color}
      >
        {Math.round(pct2 * 100)}%
      </text>
    </svg>
  );
}

// ── Export helpers ────────────────────────────────────────────
function exportCSV(filename, rows) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(reportName) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>${reportName}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1a1a2e; }
      h1   { color: #1e5a96; font-size: 22px; margin-bottom: 6px; }
      p    { color: #7a7a8a; font-size: 12px; margin-bottom: 24px; }
      table{ width:100%; border-collapse:collapse; font-size:13px; }
      th   { background:#1e5a96; color:white; padding:8px 12px; text-align:left; }
      td   { padding:8px 12px; border-bottom:1px solid #e6e8ec; }
      tr:nth-child(even) td { background:#f7f9fc; }
      .badge { padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
    </style></head><body>
    <h1>${reportName}</h1>
    <p>Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Greenfield Towers Project</p>
    <p><em>This is a simplified PDF export. For full data export, use Excel.</em></p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

// ── Main Component ────────────────────────────────────────────
export default function Reports() {
  const [activeReport, setActiveReport] = useState("project");
  const [dateRange, setDateRange] = useState("thisMonth");

  const REPORTS = [
    { id: "project", label: "Project Report", icon: "📈" },
    { id: "cost", label: "Cost Report", icon: "💰" },
    { id: "timesheet", label: "Timesheet Report", icon: "⏱" },
    { id: "incident", label: "Incident Report", icon: "🚨" },
  ];

  const handleExcelExport = () => {
    if (activeReport === "project") {
      exportCSV("project_report.csv", [
        ["Phase", "Progress %", "Planned Days", "Actual Days", "Status"],
        ...PROJECT_DATA.phases.map((p) => [
          p.name,
          p.progress,
          p.planned,
          p.actual,
          p.status,
        ]),
      ]);
    } else if (activeReport === "cost") {
      exportCSV("cost_report.csv", [
        ["Category", "Budget (₹)", "Spent (₹)", "Remaining (₹)", "Usage %"],
        ...COST_DATA.categories.map((c) => [
          c.name,
          c.budget,
          c.spent,
          c.budget - c.spent,
          pct(c.spent, c.budget),
        ]),
      ]);
    } else if (activeReport === "timesheet") {
      exportCSV("timesheet_report.csv", [
        ["Employee", "Role", "Total Hours", "Tasks Completed", "Efficiency %"],
        ...TIMESHEET_DATA.employees.map((e) => [
          e.name,
          e.role,
          e.hours,
          e.tasks,
          e.efficiency,
        ]),
      ]);
    } else {
      exportCSV("incident_report.csv", [
        ["ID", "Title", "Priority", "Status", "Age"],
        ...INCIDENT_DATA.recent.map((i) => [
          i.id,
          i.title,
          i.priority,
          i.status,
          i.age,
        ]),
      ]);
    }
  };

  const handlePDFExport = () => {
    const r = REPORTS.find((r) => r.id === activeReport);
    exportPDF(r.label);
  };

  return (
    <div className="rpt-page">
      {/* ── Header ── */}
      <div className="rpt-header">
        <div>
          <h1>Reports</h1>
          <p>Generate and export project analytics</p>
        </div>
        <div className="rpt-export-group">
          <select
            className="rpt-date-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="thisYear">This Year</option>
            <option value="allTime">All Time</option>
          </select>
          <button
            className="rpt-export-btn rpt-excel"
            onClick={handleExcelExport}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
            Export Excel
          </button>
          <button className="rpt-export-btn rpt-pdf" onClick={handlePDFExport}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Report Tabs ── */}
      <div className="rpt-tabs">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            className={`rpt-tab ${activeReport === r.id ? "rpt-tab-active" : ""}`}
            onClick={() => setActiveReport(r.id)}
          >
            <span className="rpt-tab-icon">{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════ */}
      {/* PROJECT REPORT                     */}
      {/* ══════════════════════════════════ */}
      {activeReport === "project" && (
        <div className="rpt-content">
          {/* KPI row */}
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={PROJECT_DATA.overall} color="#1e5a96" size={72} />
              <div>
                <span className="rpt-kpi-label">Overall Progress</span>
                <span className="rpt-kpi-val">{PROJECT_DATA.overall}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Phases Complete</span>
                <span className="rpt-kpi-val">
                  {
                    PROJECT_DATA.phases.filter((p) => p.status === "done")
                      .length
                  }{" "}
                  / {PROJECT_DATA.phases.length}
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Delayed Milestones</span>
                <span className="rpt-kpi-val">
                  {
                    PROJECT_DATA.milestones.filter(
                      (m) => m.status === "delayed",
                    ).length
                  }
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Est. Completion</span>
                <span className="rpt-kpi-val">30 Sep 2026</span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            {/* Phase progress */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Phase Progress</h3>
                <span className="rpt-card-sub">Planned vs Actual days</span>
              </div>
              <div className="rpt-phase-list">
                {PROJECT_DATA.phases.map((p, i) => (
                  <div key={i} className="rpt-phase-row">
                    <div className="rpt-phase-info">
                      <span className="rpt-phase-name">{p.name}</span>
                      <div className="rpt-phase-days">
                        <span className="rpt-days-planned">
                          Plan: {p.planned}d
                        </span>
                        {p.actual > 0 && (
                          <span
                            className={`rpt-days-actual ${p.actual > p.planned ? "over" : "under"}`}
                          >
                            Act: {p.actual}d {p.actual > p.planned ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rpt-phase-bar-area">
                      <Bar
                        value={p.progress}
                        color={
                          p.status === "done"
                            ? "#22c55e"
                            : p.status === "inprogress"
                              ? "#1e5a96"
                              : "#e6e8ec"
                        }
                      />
                      <span className="rpt-phase-pct">{p.progress}%</span>
                    </div>
                    <span className={`rpt-phase-status rpt-ps-${p.status}`}>
                      {p.status === "done"
                        ? "✔ Done"
                        : p.status === "inprogress"
                          ? "◐ Active"
                          : "○ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Milestones</h3>
                <span className="rpt-card-sub">Key project dates</span>
              </div>
              <div className="rpt-milestone-list">
                {PROJECT_DATA.milestones.map((m, i) => (
                  <div key={i} className="rpt-milestone-row">
                    <div className={`rpt-ms-dot rpt-ms-${m.status}`}>
                      {m.status === "done"
                        ? "✔"
                        : m.status === "delayed"
                          ? "!"
                          : "○"}
                    </div>
                    <div className="rpt-ms-info">
                      <span className="rpt-ms-name">{m.name}</span>
                      <span className="rpt-ms-date">{m.date}</span>
                    </div>
                    <span className={`rpt-ms-badge rpt-ms-${m.status}`}>
                      {m.status === "done"
                        ? "Complete"
                        : m.status === "delayed"
                          ? "Delayed"
                          : "Upcoming"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* COST REPORT                        */}
      {/* ══════════════════════════════════ */}
      {activeReport === "cost" && (
        <div className="rpt-content">
          {/* KPIs */}
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut
                value={pct(COST_DATA.totalSpent, COST_DATA.totalBudget)}
                color="#1e5a96"
                size={72}
              />
              <div>
                <span className="rpt-kpi-label">Budget Used</span>
                <span className="rpt-kpi-val">
                  {pct(COST_DATA.totalSpent, COST_DATA.totalBudget)}%
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">₹</div>
              <div>
                <span className="rpt-kpi-label">Total Budget</span>
                <span className="rpt-kpi-val">
                  {fmt(COST_DATA.totalBudget)}
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">₹</div>
              <div>
                <span className="rpt-kpi-label">Total Spent</span>
                <span className="rpt-kpi-val">{fmt(COST_DATA.totalSpent)}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">₹</div>
              <div>
                <span className="rpt-kpi-label">Remaining</span>
                <span className="rpt-kpi-val">
                  {fmt(COST_DATA.totalBudget - COST_DATA.totalSpent)}
                </span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            {/* Category breakdown */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Budget vs Spent</h3>
                <div className="rpt-legend">
                  <span
                    className="rpt-legend-dot"
                    style={{ background: "#c7d9ef" }}
                  />{" "}
                  Budget
                  <span
                    className="rpt-legend-dot"
                    style={{ background: "#1e5a96" }}
                  />{" "}
                  Spent
                </div>
              </div>
              <div className="rpt-cost-list">
                {COST_DATA.categories.map((c, i) => {
                  const usedPct = pct(c.spent, c.budget);
                  const over = c.spent > c.budget;
                  return (
                    <div key={i} className="rpt-cost-row">
                      <span className="rpt-cost-name">{c.name}</span>
                      <div className="rpt-cost-bars">
                        <div className="rpt-cost-bar-track">
                          <div
                            className="rpt-cost-bar-budget"
                            style={{ width: "100%" }}
                          />
                          <div
                            className={`rpt-cost-bar-spent ${over ? "over-budget" : ""}`}
                            style={{ width: `${Math.min(usedPct, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`rpt-cost-pct ${over ? "text-red" : ""}`}
                        >
                          {usedPct}%
                        </span>
                      </div>
                      <div className="rpt-cost-amounts">
                        <span className="rpt-cost-spent">{fmt(c.spent)}</span>
                        <span className="rpt-cost-budget">
                          / {fmt(c.budget)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly chart */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Monthly Spend</h3>
                <div className="rpt-legend">
                  <span
                    className="rpt-legend-dot"
                    style={{ background: "#c7d9ef" }}
                  />{" "}
                  Budget
                  <span
                    className="rpt-legend-dot"
                    style={{ background: "#1e5a96" }}
                  />{" "}
                  Spent
                </div>
              </div>
              <DualBarChart data={COST_DATA.monthly} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TIMESHEET REPORT                   */}
      {/* ══════════════════════════════════ */}
      {activeReport === "timesheet" && (
        <div className="rpt-content">
          {/* KPIs */}
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Hours</span>
                <span className="rpt-kpi-val">
                  {TIMESHEET_DATA.totalHours.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Active Workers</span>
                <span className="rpt-kpi-val">
                  {TIMESHEET_DATA.employees.length}
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Avg Efficiency</span>
                <span className="rpt-kpi-val">
                  {Math.round(
                    TIMESHEET_DATA.employees.reduce(
                      (s, e) => s + e.efficiency,
                      0,
                    ) / TIMESHEET_DATA.employees.length,
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">This Month</span>
                <span className="rpt-kpi-val">
                  {TIMESHEET_DATA.thisMonth.toLocaleString()}h
                </span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            {/* Employee table */}
            <div className="rpt-card rpt-card-wide">
              <div className="rpt-card-header">
                <h3>Employee Productivity</h3>
                <span className="rpt-card-sub">
                  All time hours &amp; efficiency
                </span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Hours</th>
                      <th>Tasks</th>
                      <th>Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIMESHEET_DATA.employees.map((e, i) => (
                      <tr key={i}>
                        <td>
                          <div className="rpt-emp-cell">
                            <div className="rpt-emp-avatar">
                              {e.name.charAt(0)}
                            </div>
                            {e.name}
                          </div>
                        </td>
                        <td>
                          <span className="rpt-role-badge">{e.role}</span>
                        </td>
                        <td>
                          <strong>{e.hours.toLocaleString()}h</strong>
                        </td>
                        <td>{e.tasks}</td>
                        <td>
                          <div className="rpt-eff-cell">
                            <Bar
                              value={e.efficiency}
                              color={
                                e.efficiency >= 90
                                  ? "#22c55e"
                                  : e.efficiency >= 80
                                    ? "#f59e0b"
                                    : "#ef4444"
                              }
                              height={5}
                            />
                            <span
                              className={`rpt-eff-val ${e.efficiency >= 90 ? "eff-high" : e.efficiency >= 80 ? "eff-mid" : "eff-low"}`}
                            >
                              {e.efficiency}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly hours */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Weekly Hours</h3>
                <span className="rpt-card-sub">Current month breakdown</span>
              </div>
              <BarChart
                data={TIMESHEET_DATA.weekly}
                valueKey="hours"
                labelKey="week"
                color="#1e5a96"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* INCIDENT REPORT                    */}
      {/* ══════════════════════════════════ */}
      {activeReport === "incident" && (
        <div className="rpt-content">
          {/* KPIs */}
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut
                value={pct(INCIDENT_DATA.closed, INCIDENT_DATA.total)}
                color="#22c55e"
                size={72}
              />
              <div>
                <span className="rpt-kpi-label">Resolution Rate</span>
                <span className="rpt-kpi-val">
                  {pct(INCIDENT_DATA.closed, INCIDENT_DATA.total)}%
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Incidents</span>
                <span className="rpt-kpi-val">{INCIDENT_DATA.total}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Open</span>
                <span className="rpt-kpi-val">{INCIDENT_DATA.open}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Closed</span>
                <span className="rpt-kpi-val">{INCIDENT_DATA.closed}</span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            {/* Priority breakdown */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>By Priority</h3>
                <span className="rpt-card-sub">Incident distribution</span>
              </div>
              <div className="rpt-inc-priority-list">
                {INCIDENT_DATA.byPriority.map((p, i) => (
                  <div key={i} className="rpt-inc-p-row">
                    <div className="rpt-inc-p-info">
                      <span
                        className="rpt-inc-p-dot"
                        style={{ background: p.color }}
                      />
                      <span className="rpt-inc-p-label">{p.label}</span>
                    </div>
                    <Bar
                      value={p.count}
                      max={INCIDENT_DATA.total}
                      color={p.color}
                    />
                    <span className="rpt-inc-p-count">{p.count}</span>
                  </div>
                ))}
              </div>

              <div className="rpt-card-header" style={{ marginTop: 20 }}>
                <h3>By Status</h3>
              </div>
              <div className="rpt-inc-status-list">
                {INCIDENT_DATA.byStatus.map((s, i) => (
                  <div key={i} className="rpt-inc-s-row">
                    <span className="rpt-inc-s-label">{s.label}</span>
                    <div className="rpt-inc-s-bar">
                      <div
                        className="rpt-inc-s-fill"
                        style={{
                          width: `${pct(s.count, INCIDENT_DATA.total)}%`,
                        }}
                      />
                    </div>
                    <span className="rpt-inc-s-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent incidents table */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Recent Incidents</h3>
                <span className="rpt-card-sub">Latest 5 incidents</span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INCIDENT_DATA.recent.map((inc, i) => (
                      <tr key={i}>
                        <td>
                          <code className="rpt-inc-id">{inc.id}</code>
                        </td>
                        <td
                          style={{
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {inc.title}
                        </td>
                        <td>
                          <span
                            className={`rpt-p-badge rpt-p-${inc.priority.toLowerCase()}`}
                          >
                            {inc.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rpt-s-badge rpt-s-${inc.status.toLowerCase().replace(" ", "-")}`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="rpt-age">{inc.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Open vs Closed visual */}
              <div className="rpt-open-closed">
                <div className="rpt-oc-bar">
                  <div
                    className="rpt-oc-open"
                    style={{
                      width: `${pct(INCIDENT_DATA.open, INCIDENT_DATA.total)}%`,
                    }}
                  />
                  <div
                    className="rpt-oc-closed"
                    style={{
                      width: `${pct(INCIDENT_DATA.closed, INCIDENT_DATA.total)}%`,
                    }}
                  />
                </div>
                <div className="rpt-oc-legend">
                  <span>
                    <span className="rpt-oc-dot open" />
                    Open ({INCIDENT_DATA.open})
                  </span>
                  <span>
                    <span className="rpt-oc-dot closed" />
                    Closed ({INCIDENT_DATA.closed})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
