import { useState, useEffect } from "react";
import "./CostReporting.css";

/* ── Mock Data ─────────────────────────────────────────────── */
const COST_SUMMARY = {
  totalCost:       142600000,
  budgetedCost:    155000000,
  variance:         12400000,
  variancePct:           8.0,
  cpi:                  1.09,
  completionPct:          67,
  forecastAtCompletion: 212800000,
  budgetAtCompletion:   232000000,
};

const COST_CATEGORIES = [
  { id: 1, name: "Direct Materials",  budgeted: 55000000, actual: 49200000, forecast: 73000000, color: "#0A4174", icon: "📦" },
  { id: 2, name: "Direct Labour",     budgeted: 40000000, actual: 36800000, forecast: 55000000, color: "#4E8EA2", icon: "👷" },
  { id: 3, name: "Equipment & Plant", budgeted: 28000000, actual: 25100000, forecast: 37500000, color: "#6EA2B3", icon: "🏗️" },
  { id: 4, name: "Sub-contractors",   budgeted: 18000000, actual: 17900000, forecast: 26800000, color: "#49769F", icon: "🤝" },
  { id: 5, name: "Overheads",         budgeted: 10000000, actual:  9200000, forecast: 13700000, color: "#7BBDE8", icon: "🏢" },
  { id: 6, name: "Contingency",       budgeted:  4000000, actual:  4400000, forecast:  6800000, color: "#BDD8E9", icon: "🛡️" },
];

const MONTHLY_COST = [
  { month: "Jul", planned:  9500000, actual:  8800000 },
  { month: "Aug", planned: 11200000, actual: 10500000 },
  { month: "Sep", planned: 13000000, actual: 12100000 },
  { month: "Oct", planned: 14500000, actual: 13900000 },
  { month: "Nov", planned: 15800000, actual: 15200000 },
  { month: "Dec", planned: 16600000, actual: 16400000 },
  { month: "Jan", planned: 17200000, actual: 17100000 },
  { month: "Feb", planned: 18100000, actual: 18900000 },
  { month: "Mar", planned: 19500000, actual:        0 },
  { month: "Apr", planned: 20400000, actual:        0 },
];

const COST_CODES = [
  { code: "CC-101", description: "Foundation Works",        budgeted: 22000000, actual: 19800000, remaining:  2200000, status: "Under" },
  { code: "CC-102", description: "Structural Steel",        budgeted: 35000000, actual: 33500000, remaining:  1500000, status: "Under" },
  { code: "CC-103", description: "Civil Works",             budgeted: 28000000, actual: 27200000, remaining:   800000, status: "Under" },
  { code: "CC-104", description: "Mechanical Systems",      budgeted: 18000000, actual: 19200000, remaining: -1200000, status: "Over"  },
  { code: "CC-105", description: "Electrical Installation", budgeted: 15000000, actual: 14100000, remaining:   900000, status: "Under" },
  { code: "CC-106", description: "HVAC Systems",            budgeted: 12000000, actual: 12800000, remaining:  -800000, status: "Over"  },
  { code: "CC-107", description: "Finishing Works",         budgeted: 14000000, actual:  9200000, remaining:  4800000, status: "Under" },
  { code: "CC-108", description: "External Works",          budgeted:  9000000, actual:  6800000, remaining:  2200000, status: "Under" },
];

const VARIANCE_ITEMS = [
  { item: "Steel price escalation",   category: "Materials", impact: -2800000, type: "Risk"        },
  { item: "Labour productivity gain", category: "Labour",    impact:  1900000, type: "Opportunity" },
  { item: "HVAC scope addition",      category: "Equipment", impact: -1600000, type: "Scope"       },
  { item: "Crane downtime savings",   category: "Equipment", impact:   950000, type: "Opportunity" },
  { item: "Subcontractor claim",      category: "Sub-con",   impact: -1200000, type: "Risk"        },
  { item: "Material wastage reduced", category: "Materials", impact:   740000, type: "Opportunity" },
];

/* ── Helpers ─────────────────────────────────────────────── */
const fmt = (n) => {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
};

const pct = (a, b) => Math.min(Math.round((a / b) * 100), 100);

const varColor = (v) => (v >= 0 ? "#059669" : "#dc2626");
const varLabel = (v) => (v >= 0 ? `▲ ${fmt(v)} under` : `▼ ${fmt(Math.abs(v))} over`);

const typeColor = (t) =>
  t === "Opportunity" ? "#059669" : t === "Risk" ? "#dc2626" : "#f59e0b";
const typeBg = (t) =>
  t === "Opportunity" ? "#dcfce7" : t === "Risk" ? "#fee2e2" : "#fef3c7";

const MAX_MONTHLY = Math.max(...MONTHLY_COST.map((m) => Math.max(m.planned, m.actual || 0)));

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function CostReporting() {
  const [tab, setTab]       = useState("Overview");
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const TABS = ["Overview", "Cost Codes", "Monthly Trend", "Variance Analysis"];

  return (
    <div className={`ca-root ${animIn ? "ca-in" : ""}`}>

      {/* Header */}
      <div className="ca-header">
        <div>
          <p className="ca-eyebrow">Finance Manager</p>
          <h1 className="ca-title">Cost Reporting</h1>
          <p className="ca-subtitle">Under construction 🏗️</p>
        </div>
        <div className="ca-header-badges">
          <div className="ca-badge">
            <span className="ca-badge-dot ca-badge-dot--green" />
            CPI {COST_SUMMARY.cpi.toFixed(2)}
          </div>
          <div className="ca-badge">
            <span className="ca-badge-dot ca-badge-dot--blue" />
            {COST_SUMMARY.completionPct}% Complete
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="ca-kpis">
        <div className="ca-kpi" style={{ "--kpi-accent": "#0A4174" }}>
          <p className="ca-kpi-label">Total Cost to Date</p>
          <p className="ca-kpi-value">{fmt(COST_SUMMARY.totalCost)}</p>
          <span className="ca-kpi-sub">of {fmt(COST_SUMMARY.budgetedCost)} budgeted</span>
          <div className="ca-kpi-bar">
            <div className="ca-kpi-fill" style={{ width: `${pct(COST_SUMMARY.totalCost, COST_SUMMARY.budgetedCost)}%`, background: "#0A4174" }} />
          </div>
        </div>

        <div className="ca-kpi" style={{ "--kpi-accent": "#059669" }}>
          <p className="ca-kpi-label">Cost Variance</p>
          <p className="ca-kpi-value" style={{ color: varColor(COST_SUMMARY.variance) }}>
            {fmt(COST_SUMMARY.variance)}
          </p>
          <span className="ca-kpi-sub">{COST_SUMMARY.variancePct}% under budget</span>
          <div className="ca-kpi-bar">
            <div className="ca-kpi-fill" style={{ width: `${COST_SUMMARY.variancePct}%`, background: "#059669" }} />
          </div>
        </div>

        <div className="ca-kpi" style={{ "--kpi-accent": "#4E8EA2" }}>
          <p className="ca-kpi-label">Forecast at Completion</p>
          <p className="ca-kpi-value">{fmt(COST_SUMMARY.forecastAtCompletion)}</p>
          <span className="ca-kpi-sub">BAC: {fmt(COST_SUMMARY.budgetAtCompletion)}</span>
          <div className="ca-kpi-bar">
            <div className="ca-kpi-fill" style={{ width: `${pct(COST_SUMMARY.forecastAtCompletion, COST_SUMMARY.budgetAtCompletion)}%`, background: "#4E8EA2" }} />
          </div>
        </div>

        <div className="ca-kpi" style={{ "--kpi-accent": "#f59e0b" }}>
          <p className="ca-kpi-label">Cost Performance Index</p>
          <p className="ca-kpi-value" style={{ color: COST_SUMMARY.cpi >= 1 ? "#059669" : "#dc2626" }}>
            {COST_SUMMARY.cpi.toFixed(2)}
          </p>
          <span className="ca-kpi-sub">{COST_SUMMARY.cpi >= 1 ? "Performing ahead of plan" : "Behind plan"}</span>
          <div className="ca-kpi-bar">
            <div className="ca-kpi-fill" style={{ width: `${Math.min(COST_SUMMARY.cpi * 50, 100)}%`, background: "#f59e0b" }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ca-tabs">
        {TABS.map((t) => (
          <button key={t} className={`ca-tab ${tab === t ? "ca-tab--on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="ca-body">
        {tab === "Overview"          && <OverviewTab />}
        {tab === "Cost Codes"        && <CostCodesTab />}
        {tab === "Monthly Trend"     && <MonthlyTrendTab />}
        {tab === "Variance Analysis" && <VarianceTab />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const totalActual = COST_CATEGORIES.reduce((s, c) => s + c.actual, 0);

  return (
    <div className="ca-overview">

      {/* Category breakdown */}
      <div className="ca-section">
        <h2 className="ca-section-title">Cost by Category</h2>
        <div className="ca-cat-grid">
          {COST_CATEGORIES.map((cat) => {
            const usedPct    = pct(cat.actual, cat.budgeted);
            const overBudget = cat.actual > cat.budgeted;
            return (
              <div key={cat.id} className={`ca-cat-card ${overBudget ? "ca-cat-card--over" : ""}`}>
                <div className="ca-cat-top">
                  <span className="ca-cat-icon">{cat.icon}</span>
                  <div className="ca-cat-info">
                    <p className="ca-cat-name">{cat.name}</p>
                    <p className="ca-cat-actual">{fmt(cat.actual)}</p>
                  </div>
                  <span className={`ca-cat-pct ${overBudget ? "ca-cat-pct--over" : ""}`}>{usedPct}%</span>
                </div>
                <div className="ca-progress">
                  <div
                    className="ca-progress-fill"
                    style={{ width: `${usedPct}%`, background: overBudget ? "#dc2626" : cat.color }}
                  />
                </div>
                <div className="ca-cat-bottom">
                  <span>Budget: {fmt(cat.budgeted)}</span>
                  <span style={{ color: varColor(cat.budgeted - cat.actual) }}>
                    {varLabel(cat.budgeted - cat.actual)}
                  </span>
                </div>
                <div className="ca-cat-forecast">
                  <span className="ca-forecast-label">Forecast</span>
                  <span className="ca-forecast-val">{fmt(cat.forecast)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Donut */}
      <div className="ca-section">
        <h2 className="ca-section-title">Cost Distribution</h2>
        <div className="ca-donut-section">
          <DonutChart />
          <div className="ca-donut-legend">
            {COST_CATEGORIES.map((cat) => {
              const share = Math.round((cat.actual / totalActual) * 100);
              return (
                <div key={cat.id} className="ca-legend-row">
                  <span className="ca-legend-dot" style={{ background: cat.color }} />
                  <span className="ca-legend-name">{cat.name}</span>
                  <span className="ca-legend-val">{fmt(cat.actual)}</span>
                  <span className="ca-legend-pct">{share}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SVG Donut ────────────────────────────────────────────── */
function DonutChart() {
  const total        = COST_CATEGORIES.reduce((s, c) => s + c.actual, 0);
  const R            = 80;
  const cx           = 100;
  const cy           = 100;
  const strokeW      = 28;
  const circumference = 2 * Math.PI * R;

  const segments = COST_CATEGORIES.reduce((acc, cat) => {
    const startPct = acc.length > 0 ? acc[acc.length - 1].startPct + acc[acc.length - 1].share : 0;
    const share    = cat.actual / total;
    return [...acc, { ...cat, share, startPct }];
  }, []);

  return (
    <svg viewBox="0 0 200 200" className="ca-donut-svg">
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />

      {/* Segments */}
      {segments.map((seg) => {
        const dashArr = `${circumference * seg.share} ${circumference * (1 - seg.share)}`;
        const offset  = circumference * (1 - seg.startPct);
        return (
          <circle
            key={seg.id}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={dashArr}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dasharray 0.6s ease",
            }}
          />
        );
      })}

      <text x={cx} y={cy - 8}  textAnchor="middle" className="ca-donut-label-top">Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="ca-donut-label-val">
        {(total / 10000000).toFixed(1)}Cr
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — COST CODES
════════════════════════════════════════════════════════════ */
function CostCodesTab() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const rows = COST_CODES.filter((r) => {
    const matchSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted,  0);
  const totalActual   = rows.reduce((s, r) => s + r.actual,    0);
  const totalRemain   = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="ca-costcodes">
      <div className="ca-filters">
        <input
          className="ca-search"
          placeholder="Search cost code or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ca-filter-group">
          <label>Status:</label>
          <select className="ca-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            <option>Under</option>
            <option>Over</option>
          </select>
        </div>
      </div>

      <div className="ca-table-wrap">
        <table className="ca-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>Utilisation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const used = pct(r.actual, r.budgeted);
              return (
                <tr key={r.code} className="ca-trow">
                  <td className="ca-code">{r.code}</td>
                  <td className="ca-desc">{r.description}</td>
                  <td className="ca-mono">{fmt(r.budgeted)}</td>
                  <td className="ca-mono">{fmt(r.actual)}</td>
                  <td className="ca-mono" style={{ color: varColor(r.remaining) }}>{fmt(r.remaining)}</td>
                  <td>
                    <div className="ca-mini-bar">
                      <div
                        className="ca-mini-fill"
                        style={{
                          width:      `${Math.min(used, 100)}%`,
                          background: r.status === "Over" ? "#dc2626" : "#0A4174",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: r.status === "Over" ? "#dc2626" : "#374151" }}>
                      {used}%
                    </span>
                  </td>
                  <td>
                    <span
                      className="ca-status-badge"
                      style={{
                        background: r.status === "Over" ? "#fee2e2" : "#dcfce7",
                        color:      r.status === "Over" ? "#dc2626" : "#059669",
                      }}
                    >
                      {r.status === "Over" ? "Over Budget" : "Under Budget"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="ca-tfoot">
              <td colSpan={2}>Total</td>
              <td className="ca-mono">{fmt(totalBudgeted)}</td>
              <td className="ca-mono">{fmt(totalActual)}</td>
              <td className="ca-mono" style={{ color: varColor(totalRemain) }}>{fmt(totalRemain)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — MONTHLY TREND
════════════════════════════════════════════════════════════ */
function MonthlyTrendTab() {
  return (
    <div className="ca-trend">
      <div className="ca-section">
        <h2 className="ca-section-title">Planned vs Actual Cost — Monthly</h2>

        <div className="ca-chart-legend">
          <span className="ca-legend-chip" style={{ background: "#0A4174" }} /> Planned
          <span className="ca-legend-chip" style={{ background: "#4E8EA2", marginLeft: "1.5rem" }} /> Actual
        </div>

        <div className="ca-bar-chart">
          {MONTHLY_COST.map((m) => {
            const plannedH = (m.planned / MAX_MONTHLY) * 240;
            const actualH  = m.actual ? (m.actual / MAX_MONTHLY) * 240 : 0;
            const isFuture = m.actual === 0;
            return (
              <div key={m.month} className="ca-bar-group">
                <div className="ca-bar-pair">
                  <div className="ca-bar-col">
                    <div className="ca-bar ca-bar--planned" style={{ height: plannedH }}>
                      <span className="ca-bar-tip">{fmt(m.planned)}</span>
                    </div>
                  </div>
                  <div className="ca-bar-col">
                    {!isFuture ? (
                      <div className="ca-bar ca-bar--actual" style={{ height: actualH }}>
                        <span className="ca-bar-tip">{fmt(m.actual)}</span>
                      </div>
                    ) : (
                      <div className="ca-bar ca-bar--future" style={{ height: plannedH }} />
                    )}
                  </div>
                </div>
                <span className="ca-bar-month">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="ca-section">
        <h2 className="ca-section-title">Monthly Breakdown</h2>
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Variance %</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_COST.map((m) => {
                const variance = m.actual ? m.planned - m.actual : null;
                const vPct     = variance !== null ? ((variance / m.planned) * 100).toFixed(1) : "—";
                return (
                  <tr key={m.month} className={`ca-trow ${!m.actual ? "ca-trow--future" : ""}`}>
                    <td className="ca-mono">{m.month}</td>
                    <td className="ca-mono">{fmt(m.planned)}</td>
                    <td className="ca-mono">
                      {m.actual ? fmt(m.actual) : <span className="ca-forecast-pill">Forecast</span>}
                    </td>
                    <td className="ca-mono" style={{ color: variance !== null ? varColor(variance) : "#9ca3af" }}>
                      {variance !== null ? fmt(variance) : "—"}
                    </td>
                    <td style={{ color: variance !== null ? varColor(variance) : "#9ca3af" }}>
                      {variance !== null ? `${vPct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 4 — VARIANCE ANALYSIS
════════════════════════════════════════════════════════════ */
function VarianceTab() {
  const totalRisk = VARIANCE_ITEMS.filter((v) => v.impact < 0).reduce((s, v) => s + v.impact, 0);
  const totalOpp  = VARIANCE_ITEMS.filter((v) => v.impact > 0).reduce((s, v) => s + v.impact, 0);
  const netVar    = totalRisk + totalOpp;
  const maxImpact = Math.max(...VARIANCE_ITEMS.map((v) => Math.abs(v.impact)));

  return (
    <div className="ca-variance">
      {/* Summary */}
      <div className="ca-var-summary">
        <div className="ca-var-box ca-var-box--risk">
          <p className="ca-var-box-label">Total Risks</p>
          <p className="ca-var-box-val">{fmt(totalRisk)}</p>
        </div>
        <div className="ca-var-box ca-var-box--opp">
          <p className="ca-var-box-label">Total Opportunities</p>
          <p className="ca-var-box-val">{fmt(totalOpp)}</p>
        </div>
        <div className="ca-var-box" style={{ borderColor: varColor(netVar) + "44" }}>
          <p className="ca-var-box-label">Net Variance</p>
          <p className="ca-var-box-val" style={{ color: varColor(netVar) }}>{fmt(netVar)}</p>
        </div>
      </div>

      {/* Waterfall */}
      <div className="ca-section">
        <h2 className="ca-section-title">Variance Drivers</h2>
        <div className="ca-waterfall">
          {VARIANCE_ITEMS.map((v, i) => {
            const barW = Math.round((Math.abs(v.impact) / maxImpact) * 100);
            return (
              <div key={i} className="ca-wf-row">
                <div className="ca-wf-label">{v.item}</div>
                <div className="ca-wf-bar-wrap">
                  <div
                    className="ca-wf-bar"
                    style={{
                      width:      `${barW}%`,
                      background: v.impact > 0 ? "#059669" : "#dc2626",
                    }}
                  />
                </div>
                <span className="ca-wf-val" style={{ color: varColor(v.impact) }}>
                  {v.impact > 0 ? "+" : ""}{fmt(v.impact)}
                </span>
                <span className="ca-wf-type" style={{ background: typeBg(v.type), color: typeColor(v.type) }}>
                  {v.type}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className="ca-section">
        <h2 className="ca-section-title">Variance Register</h2>
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Impact</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {VARIANCE_ITEMS.map((v, i) => (
                <tr key={i} className="ca-trow">
                  <td>{v.item}</td>
                  <td className="ca-mono">{v.category}</td>
                  <td className="ca-mono" style={{ color: varColor(v.impact), fontWeight: 600 }}>
                    {v.impact > 0 ? "+" : ""}{fmt(v.impact)}
                  </td>
                  <td>
                    <span className="ca-status-badge" style={{ background: typeBg(v.type), color: typeColor(v.type) }}>
                      {v.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}