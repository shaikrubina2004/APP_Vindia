import { useState, useEffect } from "react";
import "./BudgetPlanning.css";

/* ── Mock Data ─────────────────────────────────────────────── */
const PROJECTS = [
  { id: 1, name: "Tower B Construction",  totalBudget: 18000000, spent: 13500000, category: "Construction" },
  { id: 2, name: "Villa Complex Phase 2", totalBudget:  9500000, spent:  7200000, category: "Residential"  },
  { id: 3, name: "Commercial Hub",        totalBudget: 22000000, spent: 20800000, category: "Commercial"   },
  { id: 4, name: "Residential Block A",   totalBudget:  6000000, spent:  2900000, category: "Residential"  },
  { id: 5, name: "Highway Bridge",        totalBudget: 31000000, spent: 19500000, category: "Infrastructure"},
];

const ALLOCATIONS = [
  { category: "Materials",      allocated: 20000000, spent: 14200000, color: "#0A4174" },
  { category: "Labour",         allocated: 14000000, spent:  8800000, color: "#4E8EA2" },
  { category: "Equipment",      allocated:  9000000, spent:  4700000, color: "#6EA2B3" },
  { category: "Subcontractors", allocated:  8000000, spent:  5100000, color: "#49769F" },
  { category: "Overheads",      allocated:  5000000, spent:  2500000, color: "#7BBDE8" },
  { category: "Contingency",    allocated:  3000000, spent:   900000, color: "#BDD8E9" },
];

const MONTHS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
const BUDGET_TREND = [4200,3800,4500,4900,5200,5800,5100,4800,5400,5600,5200].map((b,i)=>({
  month: MONTHS[i], budget: b * 1000, actual: Math.round(b * 0.78 * 1000 + Math.random() * 400000)
}));

const EMPTY_BUDGET = { project: "", category: "Materials", amount: "", startDate: "", endDate: "", notes: "" };

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const pct = (spent, total) => Math.min(Math.round((spent / total) * 100), 100);
const cls = (p) => p >= 90 ? "danger" : p >= 70 ? "warn" : "ok";
const maxBudget = Math.max(...BUDGET_TREND.map((d) => d.budget));

const TABS = ["Budget Planning", "Budget Allocation", "Budget Reports"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function BudgetPlanning() {
  const [tab, setTab]       = useState("Budget Planning");
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const totalBudget = PROJECTS.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent  = PROJECTS.reduce((s, p) => s + p.spent, 0);
  const remaining   = totalBudget - totalSpent;
  const overallPct  = pct(totalSpent, totalBudget);

  return (
    <div className={`bp-root ${animIn ? "bp-in" : ""}`}>

      {/* Header */}
      <div className="bp-header">
        <div>
          <p className="bp-eyebrow">Finance Manager</p>
          <h1 className="bp-title">Budget Management</h1>
        </div>
        <button className="bp-btn-primary" onClick={() => setTab("Budget Planning")}>
          + New Budget
        </button>
      </div>

      {/* KPI Strip */}
      <div className="bp-kpis">
        {[
          { label: "Total Budget",   value: fmt(totalBudget), color: "#0A4174", sub: `${PROJECTS.length} active projects` },
          { label: "Total Spent",    value: fmt(totalSpent),  color: "#d97706", sub: `${overallPct}% utilised` },
          { label: "Remaining",      value: fmt(remaining),   color: "#059669", sub: "Available to allocate" },
          { label: "Over Budget",    value: `${PROJECTS.filter(p => pct(p.spent,p.totalBudget) >= 90).length} Projects`,
            color: "#dc2626", sub: "Approaching limit" },
        ].map((k) => (
          <div key={k.label} className="bp-kpi" style={{ "--c": k.color }}>
            <p className="bp-kpi-label">{k.label}</p>
            <p className="bp-kpi-value">{k.value}</p>
            <p className="bp-kpi-sub">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bp-tabs">
        {TABS.map((t) => (
          <button key={t}
            className={`bp-tab ${tab === t ? "bp-tab--on" : ""}`}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bp-body">
        {tab === "Budget Planning"    && <PlanningTab />}
        {tab === "Budget Allocation"  && <AllocationTab />}
        {tab === "Budget Reports"     && <ReportsTab />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — BUDGET PLANNING (project budgets + create form)
════════════════════════════════════════════════════════════ */
function PlanningTab() {
  const [form, setForm]       = useState(EMPTY_BUDGET);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]     = useState(false);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); setForm(EMPTY_BUDGET); }, 1500);
  };

  return (
    <div className="bp-planning">
      {saved && <div className="bp-toast">✅ Budget entry saved!</div>}

      {/* Project Budget Cards */}
      <div className="bp-section-head">
        <h3>Project Budgets</h3>
        <button className="bp-btn-outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "✕ Cancel" : "+ Add Budget"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bp-form-card">
          <h4 className="bp-form-title">New Budget Entry</h4>
          <div className="bp-form-grid">
            <div className="bp-frow">
              <label>Project Name <span>*</span></label>
              <input className="bp-input" placeholder="e.g. Tower B Construction"
                value={form.project} onChange={(e) => setF("project", e.target.value)} />
            </div>
            <div className="bp-frow">
              <label>Category</label>
              <select className="bp-input" value={form.category} onChange={(e) => setF("category", e.target.value)}>
                {["Materials","Labour","Equipment","Subcontractors","Overheads","Contingency"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="bp-frow">
              <label>Budget Amount (₹) <span>*</span></label>
              <input className="bp-input" type="number" placeholder="e.g. 5000000"
                value={form.amount} onChange={(e) => setF("amount", e.target.value)} />
            </div>
            <div className="bp-frow">
              <label>Start Date</label>
              <input className="bp-input" type="date"
                value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} />
            </div>
            <div className="bp-frow">
              <label>End Date</label>
              <input className="bp-input" type="date"
                value={form.endDate} onChange={(e) => setF("endDate", e.target.value)} />
            </div>
            <div className="bp-frow bp-frow--full">
              <label>Notes</label>
              <textarea className="bp-textarea" rows={2} placeholder="Additional notes…"
                value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
            </div>
          </div>
          <div className="bp-form-actions">
            <button className="bp-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="bp-btn-primary" onClick={handleSave}>Save Budget</button>
          </div>
        </div>
      )}

      {/* Project Cards */}
      <div className="bp-project-cards">
        {PROJECTS.map((p) => {
          const used = pct(p.spent, p.totalBudget);
          const c    = cls(used);
          return (
            <div key={p.id} className={`bp-pcard bp-pcard--${c}`}>
              <div className="bp-pcard-top">
                <div>
                  <p className="bp-pcard-name">{p.name}</p>
                  <span className="bp-pcard-cat">{p.category}</span>
                </div>
                <span className={`bp-pct-badge bp-pct-badge--${c}`}>{used}%</span>
              </div>

              <div className="bp-pcard-amounts">
                <div>
                  <p className="bp-pcard-lbl">Spent</p>
                  <p className="bp-pcard-val">{fmt(p.spent)}</p>
                </div>
                <div className="bp-pcard-vs">of</div>
                <div>
                  <p className="bp-pcard-lbl">Budget</p>
                  <p className="bp-pcard-val bp-pcard-val--total">{fmt(p.totalBudget)}</p>
                </div>
                <div>
                  <p className="bp-pcard-lbl">Remaining</p>
                  <p className="bp-pcard-val bp-pcard-val--rem">{fmt(p.totalBudget - p.spent)}</p>
                </div>
              </div>

              <div className="bp-track">
                <div className={`bp-fill bp-fill--${c}`} style={{ width: `${used}%` }} />
              </div>

              {c === "danger" && (
                <p className="bp-pcard-warn">⚠️ Budget limit almost reached — review allocations</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — BUDGET ALLOCATION (category breakdown)
════════════════════════════════════════════════════════════ */
function AllocationTab() {
  const totalAlloc = ALLOCATIONS.reduce((s, a) => s + a.allocated, 0);
  const totalSpent = ALLOCATIONS.reduce((s, a) => s + a.spent, 0);

  return (
    <div className="bp-alloc">
      {/* Summary bar */}
      <div className="bp-alloc-summary">
        <div className="bp-alloc-sum-left">
          <p className="bp-alloc-sum-label">Overall Allocation Utilisation</p>
          <p className="bp-alloc-sum-val">{fmt(totalSpent)} <span>of {fmt(totalAlloc)}</span></p>
        </div>
        <div className="bp-alloc-sum-bar">
          <div className="bp-alloc-sum-fill" style={{ width: `${pct(totalSpent, totalAlloc)}%` }} />
        </div>
        <p className="bp-alloc-sum-pct">{pct(totalSpent, totalAlloc)}%</p>
      </div>

      {/* Stacked bar visual */}
      <div className="bp-stacked-card">
        <h3>Budget Distribution by Category</h3>
        <div className="bp-stacked-bar">
          {ALLOCATIONS.map((a) => (
            <div key={a.category}
              className="bp-stacked-seg"
              style={{ width: `${(a.allocated / totalAlloc) * 100}%`, background: a.color }}
              title={`${a.category}: ${fmt(a.allocated)}`}
            />
          ))}
        </div>
        <div className="bp-stacked-legend">
          {ALLOCATIONS.map((a) => (
            <div key={a.category} className="bp-legend-item">
              <span className="bp-legend-dot" style={{ background: a.color }} />
              <span>{a.category}</span>
              <span className="bp-legend-pct">{Math.round((a.allocated / totalAlloc) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation table */}
      <div className="bp-alloc-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Allocated</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Utilisation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ALLOCATIONS.map((a) => {
              const u = pct(a.spent, a.allocated);
              const c = cls(u);
              return (
                <tr key={a.category} className="bp-trow">
                  <td>
                    <div className="bp-cat-cell">
                      <span className="bp-cat-dot" style={{ background: a.color }} />
                      {a.category}
                    </div>
                  </td>
                  <td className="bp-mono">{fmt(a.allocated)}</td>
                  <td className="bp-mono">{fmt(a.spent)}</td>
                  <td className="bp-mono bp-rem">{fmt(a.allocated - a.spent)}</td>
                  <td>
                    <div className="bp-mini-track">
                      <div className={`bp-mini-fill bp-mini-fill--${c}`} style={{ width: `${u}%` }} />
                    </div>
                    <span className={`bp-mini-pct bp-mini-pct--${c}`}>{u}%</span>
                  </td>
                  <td>
                    <span className={`bp-status bp-status--${c}`}>
                      {c === "ok" ? "On Track" : c === "warn" ? "Caution" : "Critical"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — BUDGET REPORTS (trend chart + variance)
════════════════════════════════════════════════════════════ */
function ReportsTab() {
  const variance = BUDGET_TREND.map((d) => ({
    ...d, variance: d.budget - d.actual,
    pct: Math.round(((d.budget - d.actual) / d.budget) * 100),
  }));

  const totalBudgeted = BUDGET_TREND.reduce((s, d) => s + d.budget, 0);
  const totalActual   = BUDGET_TREND.reduce((s, d) => s + d.actual, 0);
  const totalVariance = totalBudgeted - totalActual;

  return (
    <div className="bp-reports">
      {/* Variance summary */}
      <div className="bp-var-summary">
        <div className="bp-var-card">
          <p>Total Budgeted</p><h3>{fmt(totalBudgeted)}</h3>
        </div>
        <div className="bp-var-card">
          <p>Total Actual</p><h3 style={{ color: "#d97706" }}>{fmt(totalActual)}</h3>
        </div>
        <div className="bp-var-card bp-var-card--good">
          <p>Variance (Saved)</p><h3 style={{ color: "#059669" }}>{fmt(totalVariance)}</h3>
        </div>
        <div className="bp-var-card">
          <p>Avg. Utilisation</p>
          <h3>{Math.round((totalActual / totalBudgeted) * 100)}%</h3>
        </div>
      </div>

      {/* Bar chart — Budget vs Actual */}
      <div className="bp-chart-card">
        <div className="bp-chart-head">
          <h3>Monthly Budget vs Actual Spend</h3>
          <div className="bp-chart-legend">
            <span><i className="bp-dot bp-dot--budget" /> Budgeted</span>
            <span><i className="bp-dot bp-dot--actual" /> Actual</span>
          </div>
        </div>
        <div className="bp-bar-chart">
          {BUDGET_TREND.map((d) => (
            <div className="bp-bar-group" key={d.month}>
              <div className="bp-bars">
                <div className="bp-bar bp-bar--budget"
                  style={{ "--h": `${(d.budget / maxBudget) * 100}%` }}
                  title={`Budget: ${fmt(d.budget)}`} />
                <div className="bp-bar bp-bar--actual"
                  style={{ "--h": `${(d.actual / maxBudget) * 100}%` }}
                  title={`Actual: ${fmt(d.actual)}`} />
              </div>
              <span className="bp-bar-lbl">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Variance Table */}
      <div className="bp-report-table-wrap">
        <h3>Monthly Variance Analysis</h3>
        <table className="bp-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>Variance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {variance.map((row) => (
              <tr key={row.month} className="bp-trow">
                <td className="bp-month">{row.month}</td>
                <td className="bp-mono">{fmt(row.budget)}</td>
                <td className="bp-mono">{fmt(row.actual)}</td>
                <td className={`bp-mono ${row.variance >= 0 ? "bp-pos" : "bp-neg"}`}>
                  {row.variance >= 0 ? "+" : ""}{fmt(Math.abs(row.variance))}
                </td>
                <td className={`bp-mono ${row.pct >= 0 ? "bp-pos" : "bp-neg"}`}>
                  {row.pct >= 0 ? "+" : ""}{row.pct}%
                </td>
                <td>
                  <span className={`bp-status ${row.pct >= 10 ? "bp-status--ok" : row.pct >= 0 ? "bp-status--warn" : "bp-status--danger"}`}>
                    {row.pct >= 10 ? "Under Budget" : row.pct >= 0 ? "On Track" : "Over Budget"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}