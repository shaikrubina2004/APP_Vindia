import { useState, useEffect, useRef } from "react";
import "../../../styles/Reports.css";
import { useProject } from "../../../context/ProjectContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1000000 ? `₹${(n / 1000000).toFixed(2)}M` : `₹${(n / 1000).toFixed(0)}K`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function DeltaBadge({ delta, suffix = "" }) {
  if (!delta || delta.dir === "flat") return null;
  return (
    <span className={`rpt-delta rpt-delta-${delta.dir}`}>
      {delta.dir === "up" ? "▲" : "▼"} {delta.val}
      {suffix}
    </span>
  );
}

function Bar({ value, max = 100, color = "var(--primary-blue)", height = 6 }) {
  const w = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="rpt-bar-track" style={{ height }}>
      <div className="rpt-bar-fill" style={{ width: `${w}%`, background: color, height }} />
    </div>
  );
}

function Donut({ value, max = 100, size = 80, stroke = 10, color = "var(--primary-blue)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min((value || 0) / (max || 1), 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e8ec" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ * p} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size * 0.18} fontWeight="700" fill={color}>
        {Math.round(p * 100)}%
      </text>
    </svg>
  );
}

function EfficiencyCell({ value }) {
  const isHigh = value >= 90, isMid = value >= 75;
  const fill  = isHigh ? "#22c55e" : isMid ? "#f59e0b" : "#ef4444";
  const bg    = isHigh ? "#dcfce7" : isMid ? "#fef3c7" : "#fee2e2";
  const color = isHigh ? "#15803d" : isMid ? "#b45309" : "#dc2626";
  return (
    <div className="rpt-eff-cell">
      <div className="rpt-eff-bar-wrap">
        <div className="rpt-eff-track">
          <div className="rpt-eff-fill" style={{ width: `${value}%`, background: fill }} />
        </div>
      </div>
      <span className="rpt-eff-pill" style={{ background: bg, color }}>{value}%</span>
    </div>
  );
}

function BarChart({ data, valueKey, labelKey }) {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="rpt-chart">
      {data.map((d, i) => {
        const heightPct = Math.round(((d[valueKey] || 0) / max) * 100);
        const isActive = i === data.length - 1;
        return (
          <div key={i} className={`rpt-chart-col${isActive ? " rpt-chart-col-active" : ""}`}>
            <span className="rpt-chart-val">{d[valueKey]}</span>
            <div className="rpt-chart-bar-wrap">
              <div className="rpt-chart-bar"
                style={{ height: `${heightPct}%`, background: isActive ? "var(--primary-blue)" : "#c7d9ef" }} />
            </div>
            <span className="rpt-chart-label">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, flexDirection: "column", gap: 12 }}>
      <div className="tm-spinner" />
      <p style={{ color: "#6b7280", fontSize: 14 }}>Loading report data…</p>
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ color: "#ef4444", fontSize: 14 }}>{msg}</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function Reports() {
  const { activeProject, PROJECTS, loading: projectsLoading } = useProject();

  const [activeReport, setActiveReport] = useState("project");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Per-tab data
  const [projectData, setProjectData]     = useState(null);
  const [costData, setCostData]           = useState(null);
  const [timesheetData, setTimesheetData] = useState(null);
  const [incidentData, setIncidentData]   = useState(null);

  const projectId = activeProject?.id ? String(activeProject.id) : null;

  // Fetch on tab/project change
  useEffect(() => {
    if (!projectId || projectsLoading) return;
    fetchReport(activeReport);
  }, [activeReport, projectId, projectsLoading]);

  async function fetchReport(type) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/pm-reports/${projectId}/${type}`, { headers: headers() });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (type === "project")   setProjectData(data);
      if (type === "cost")      setCostData(data);
      if (type === "timesheet") setTimesheetData(data);
      if (type === "incidents") setIncidentData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load report data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!projectId) return;
    const typeMap = { project: "project", cost: "cost", timesheet: "timesheet", incident: "incident" };
    const t = typeMap[activeReport] || activeReport;
    window.open(`${BASE}/api/pm-reports/${projectId}/export?type=${t}`, "_blank");
  }

  const REPORTS = [
    { id: "project",   label: "Project Report",  icon: "📈" },
    { id: "cost",      label: "Cost Report",      icon: "💰" },
    { id: "timesheet", label: "Timesheet Report", icon: "⏱" },
    { id: "incidents", label: "Incident Report",  icon: "🚨" },
  ];

  if (projectsLoading) return <LoadingSpinner />;

  if (!projectId) {
    return (
      <div className="rpt-page">
        <div className="rpt-header">
          <div className="rpt-header-title"><h1>Reports</h1><p>Select a project to view reports</p></div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 36 }}>📊</div>
          <p style={{ color: "#6b7280", fontSize: 14 }}>No project selected. Please select a project from the top bar.</p>
        </div>
      </div>
    );
  }

  const projectName = activeProject?.name || "Project";

  return (
    <div className="rpt-page">
      {/* Header */}
      <div className="rpt-header">
        <div className="rpt-header-title">
          <h1>Reports</h1>
          <p>{projectName} — Live analytics</p>
        </div>
        <div className="rpt-export-group">
          <button className="rpt-export-btn rpt-excel" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rpt-tabs">
        {REPORTS.map((r) => (
          <button key={r.id}
            className={`rpt-tab${activeReport === r.id ? " rpt-tab-active" : ""}`}
            onClick={() => setActiveReport(r.id)}>
            <span className="rpt-tab-icon">{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorMsg msg={error} />}

      {/* ══ PROJECT ══ */}
      {!loading && !error && activeReport === "project" && projectData && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={projectData.overall} color="#1e5a96" size={72} />
              <div>
                <span className="rpt-kpi-label">Overall Progress</span>
                <span className="rpt-kpi-val">{projectData.overall}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Phases Complete</span>
                <span className="rpt-kpi-val">
                  {projectData.phases.filter((p) => p.status === "done" || p.progress === 100).length} / {projectData.phases.length}
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Delayed Milestones</span>
                <span className="rpt-kpi-val">{projectData.delayedMilestones}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Reports This Week</span>
                <span className="rpt-kpi-val">{projectData.weeklyTasks}</span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Phase Progress</h3><span className="rpt-card-sub">Planned vs Actual</span></div>
              {projectData.phases.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No WBS phases found for this project.</p>
              ) : (
                <div className="rpt-phase-list">
                  {projectData.phases.map((p, i) => (
                    <div key={i} className="rpt-phase-row">
                      <div className="rpt-phase-info">
                        <span className="rpt-phase-name">{p.name}</span>
                        <div className="rpt-phase-days">
                          {p.planned > 0 && <span className="rpt-days-planned">Plan: {p.planned}d</span>}
                          {p.actual > 0 && (
                            <span className={`rpt-days-actual ${p.actual > p.planned ? "over" : "under"}`}>
                              Act: {p.actual}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rpt-phase-bar-area">
                        <Bar value={p.progress}
                          color={p.progress === 100 ? "#22c55e" : p.progress > 0 ? "#1e5a96" : "#e6e8ec"} />
                        <span className="rpt-phase-pct">{p.progress}%</span>
                      </div>
                      <span className={`rpt-phase-status rpt-ps-${p.progress === 100 ? "done" : p.progress > 0 ? "inprogress" : "pending"}`}>
                        {p.progress === 100 ? "✔ Done" : p.progress > 0 ? "◐ Active" : "○ Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Milestones</h3><span className="rpt-card-sub">Key project dates</span></div>
              {(!projectData.milestones || projectData.milestones.length === 0) ? (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No milestones found.</p>
              ) : (
                <div className="rpt-milestone-list">
                  {projectData.milestones.map((m, i) => (
                    <div key={i} className="rpt-milestone-row">
                      <div className={`rpt-ms-dot rpt-ms-${m.status || "pending"}`}>
                        {m.status === "done" ? "✔" : m.status === "delayed" ? "!" : "○"}
                      </div>
                      <div className="rpt-ms-info">
                        <span className="rpt-ms-name">{m.name}</span>
                        <span className="rpt-ms-date">{m.target_date ? new Date(m.target_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                      </div>
                      <span className={`rpt-ms-badge rpt-ms-${m.status || "pending"}`}>
                        {m.status === "done" ? "Complete" : m.status === "delayed" ? "Delayed" : "Upcoming"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ COST ══ */}
      {!loading && !error && activeReport === "cost" && costData && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={pct(costData.spent, costData.budget)}
                color={costData.spent > costData.budget ? "#ef4444" : "#1e5a96"} size={72} />
              <div>
                <span className="rpt-kpi-label">Budget Used</span>
                <span className="rpt-kpi-val">{pct(costData.spent, costData.budget)}%</span>
                {costData.spent > costData.budget && <span className="rpt-over-badge">Over Budget</span>}
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">₹</div>
              <div>
                <span className="rpt-kpi-label">Total Budget</span>
                <span className="rpt-kpi-val">{fmt(costData.budget)}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costData.spent > costData.budget ? "kpi-red" : "kpi-amber"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Total Spent</span>
                <span className="rpt-kpi-val">{fmt(costData.spent)}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costData.budget - costData.spent < 0 ? "kpi-red" : "kpi-green"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Remaining</span>
                <span className="rpt-kpi-val">{fmt(Math.abs(costData.budget - costData.spent))}</span>
                {costData.spent > costData.budget && <span className="rpt-over-badge">Overspent</span>}
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Budget vs Spent by Phase</h3></div>
              {costData.categories.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No cost data yet.</p>
              ) : (
                <div className="rpt-cost-list">
                  {costData.categories.map((c, i) => {
                    const up = pct(c.spent, c.budget);
                    const over = c.spent > c.budget;
                    return (
                      <div key={i} className="rpt-cost-row">
                        <span className="rpt-cost-name">{c.name}</span>
                        <div className="rpt-cost-bars">
                          <div className="rpt-cost-bar-track">
                            <div className="rpt-cost-bar-budget" style={{ width: "100%" }} />
                            <div className={`rpt-cost-bar-spent${over ? " over-budget" : ""}`}
                              style={{ width: `${Math.min(up, 100)}%` }} />
                          </div>
                          <span className={`rpt-cost-pct${over ? " text-red" : ""}`}>{up}%</span>
                        </div>
                        <div className="rpt-cost-amounts">
                          <span className="rpt-cost-spent">{fmt(c.spent)}</span>
                          <span className="rpt-cost-budget">/ {fmt(c.budget)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Weekly Spend Trend</h3></div>
              {costData.trend && costData.trend.length > 0 ? (
                <BarChart data={costData.trend} valueKey="spent" labelKey="week" />
              ) : (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No weekly trend data yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TIMESHEET ══ */}
      {!loading && !error && activeReport === "timesheet" && timesheetData && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Hours</span>
                <span className="rpt-kpi-val">{timesheetData.totalHours}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Active Workers</span>
                <span className="rpt-kpi-val">{timesheetData.activeWorkers}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Tasks</span>
                <span className="rpt-kpi-val">{timesheetData.totalTasks}</span>
              </div>
            </div>
          </div>

          <div className="rpt-ts-grid">
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Team Productivity</h3>
                <span className="rpt-card-sub">{projectName}</span>
              </div>
              {timesheetData.employees.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No active team members found.</p>
              ) : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr><th>Employee</th><th>Role</th><th>Type</th><th>Hours</th><th>Tasks</th><th>Days Worked</th></tr>
                    </thead>
                    <tbody>
                      {timesheetData.employees.map((e, i) => (
                        <tr key={i}>
                          <td>
                            <div className="rpt-emp-cell">
                              <div className="rpt-emp-avatar">{e.name.charAt(0)}</div>
                              {e.name}
                            </div>
                          </td>
                          <td><span className="rpt-role-badge">{e.role}</span></td>
                          <td>
                            <span className={`pill pill-${(e.type || "").toLowerCase()}`}>{e.type}</span>
                          </td>
                          <td><strong>{e.hours}h</strong></td>
                          <td>{e.tasks}</td>
                          <td>{e.days_worked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Daily Report Submissions</h3><span className="rpt-card-sub">Recent weeks</span></div>
              {timesheetData.trend && timesheetData.trend.length > 0 ? (
                <BarChart data={timesheetData.trend} valueKey="submissions" labelKey="week" />
              ) : (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No submissions data yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ INCIDENT ══ */}
      {!loading && !error && activeReport === "incidents" && incidentData && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={incidentData.total > 0 ? pct(incidentData.closed, incidentData.total) : 100}
                color="#22c55e" size={72} />
              <div>
                <span className="rpt-kpi-label">Resolution Rate</span>
                <span className="rpt-kpi-val">
                  {incidentData.total > 0 ? pct(incidentData.closed, incidentData.total) : 100}%
                </span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Incidents</span>
                <span className="rpt-kpi-val">{incidentData.total}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Open</span>
                <span className="rpt-kpi-val">{incidentData.open}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Closed</span>
                <span className="rpt-kpi-val">{incidentData.closed}</span>
              </div>
            </div>
          </div>

          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>By Priority</h3></div>
              <div className="rpt-inc-priority-list">
                {incidentData.byPriority.map((p, i) => (
                  <div key={i} className="rpt-inc-p-row">
                    <div className="rpt-inc-p-info">
                      <span className="rpt-inc-p-dot" style={{ background: p.color }} />
                      <span className="rpt-inc-p-label">{p.label}</span>
                    </div>
                    <Bar value={p.count} max={incidentData.total || 1} color={p.color} />
                    <span className="rpt-inc-p-count">{p.count}</span>
                  </div>
                ))}
              </div>
              <div className="rpt-card-header" style={{ marginTop: 20 }}><h3>By Status</h3></div>
              <div className="rpt-inc-status-list">
                {incidentData.byStatus.map((s, i) => (
                  <div key={i} className="rpt-inc-s-row">
                    <span className="rpt-inc-s-label">{s.label}</span>
                    <div className="rpt-inc-s-bar">
                      <div className="rpt-inc-s-fill"
                        style={{ width: `${pct(s.count, incidentData.total || 1)}%` }} />
                    </div>
                    <span className="rpt-inc-s-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Recent Incidents</h3></div>
              {incidentData.recent.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>No incidents found for this project.</p>
              ) : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Age</th></tr></thead>
                    <tbody>
                      {incidentData.recent.map((inc, i) => (
                        <tr key={i}>
                          <td><code className="rpt-inc-id">{inc.id}</code></td>
                          <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {inc.title}
                          </td>
                          <td>
                            <span className={`rpt-p-badge rpt-p-${(inc.priority || "p3").toLowerCase()}`}>
                              {inc.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`rpt-s-badge rpt-s-${(inc.status || "").toLowerCase().replace(/ /g, "-")}`}>
                              {inc.status}
                            </span>
                          </td>
                          <td className="rpt-age">{inc.age}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="rpt-open-closed">
                <div className="rpt-oc-bar">
                  <div className="rpt-oc-open" style={{ width: `${pct(incidentData.open, incidentData.total || 1)}%` }} />
                  <div className="rpt-oc-closed" style={{ width: `${pct(incidentData.closed, incidentData.total || 1)}%` }} />
                </div>
                <div className="rpt-oc-legend">
                  <span><span className="rpt-oc-dot open" /> Open ({incidentData.open})</span>
                  <span><span className="rpt-oc-dot closed" /> Closed ({incidentData.closed})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}