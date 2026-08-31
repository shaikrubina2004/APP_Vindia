import { useState, useEffect, useCallback } from "react";
import financeService from "../../services/financeService";
import { getProjects } from "../../services/projectService";
import "./BudgetPlanning.css";

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n || 0).toLocaleString("en-IN")}`;

const pct = (spent, total) => (total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0);
const cls = (p) => p >= 90 ? "danger" : p >= 70 ? "warn" : "ok";

const CATEGORY_OPTIONS = ["Materials", "Labour", "Equipment", "Subcontractors", "Overheads", "Contingency", "Misc"];
const CATEGORY_COLORS  = ["#0A4174", "#4E8EA2", "#6EA2B3", "#49769F", "#7BBDE8", "#BDD8E9", "#9AC5D9"];

const EMPTY_BUDGET = { project_id: "", category: "Materials", allocated_amount: "", fiscal_year: "2025-26", notes: "" };

const TABS = ["Budget Planning", "Budget Allocation", "Budget Reports"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT — owns all data fetching, tabs just render it
════════════════════════════════════════════════════════════ */
export default function BudgetPlanning() {
  const [tab, setTab] = useState("Budget Planning");
  const [animIn, setAnimIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [costReport, setCostReport] = useState({ budgetVsActual: [] });

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsRes, projectsRes, costReportRes] = await Promise.all([
        financeService.getAllBudgets(),
        getProjects(),
        financeService.getCostReport(),
      ]);
      setBudgets(budgetsRes.data.data);
      setProjects(projectsRes.data.projects || projectsRes.data || []);
      setCostReport(costReportRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Aggregate raw budget rows into per-project totals for the Planning cards
  const projectCards = Object.values(
    budgets.reduce((acc, b) => {
      const key = b.project_id;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          name: b.project_name || `Project #${key}`,
          totalBudget: 0,
          spent: 0,
        };
      }
      acc[key].totalBudget += Number(b.allocated_amount);
      acc[key].spent += Number(b.spent_amount);
      return acc;
    }, {})
  );

  const totalBudget = projectCards.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent  = projectCards.reduce((s, p) => s + p.spent, 0);
  const remaining   = totalBudget - totalSpent;
  const overallPct  = pct(totalSpent, totalBudget);
  const overCount   = projectCards.filter((p) => pct(p.spent, p.totalBudget) >= 90).length;

  if (loading) {
    return <div className="bp-root"><p style={{ padding: 40, textAlign: "center" }}>Loading budgets…</p></div>;
  }
  if (error) {
    return (
      <div className="bp-root">
        <p style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>
          {error} <button className="bp-btn-outline" onClick={loadAll}>Retry</button>
        </p>
      </div>
    );
  }

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
          { label: "Total Budget", value: fmt(totalBudget), color: "#0A4174", sub: `${projectCards.length} project${projectCards.length === 1 ? "" : "s"} budgeted` },
          { label: "Total Spent",  value: fmt(totalSpent),  color: "#d97706", sub: `${overallPct}% utilised` },
          { label: "Remaining",    value: fmt(remaining),   color: "#059669", sub: "Available to allocate" },
          { label: "Over Budget",  value: `${overCount} Project${overCount === 1 ? "" : "s"}`, color: "#dc2626", sub: "Approaching limit" },
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
        {tab === "Budget Planning"   && <PlanningTab projectCards={projectCards} projects={projects} onSaved={loadAll} />}
        {tab === "Budget Allocation" && <AllocationTab budgetVsActual={costReport.budgetVsActual} />}
        {tab === "Budget Reports"    && <ReportsTab budgetVsActual={costReport.budgetVsActual} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — BUDGET PLANNING (project budgets + create form)
════════════════════════════════════════════════════════════ */
function PlanningTab({ projectCards, projects, onSaved }) {
  const [form, setForm] = useState(EMPTY_BUDGET);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState(null);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.project_id || !form.category || !form.allocated_amount) {
      setFormError("Project, category and amount are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await financeService.createBudget({
        project_id: form.project_id,
        category: form.category,
        allocated_amount: Number(form.allocated_amount),
        fiscal_year: form.fiscal_year,
        notes: form.notes,
      });
      setSaved(true);
      await onSaved();
      setTimeout(() => { setSaved(false); setShowForm(false); setForm(EMPTY_BUDGET); }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bp-planning">
      {saved && <div className="bp-toast">✅ Budget entry saved!</div>}

      <div className="bp-section-head">
        <h3>Project Budgets</h3>
        <button className="bp-btn-outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "✕ Cancel" : "+ Add Budget"}
        </button>
      </div>

      {showForm && (
        <div className="bp-form-card">
          <h4 className="bp-form-title">New Budget Entry</h4>
          {formError && <p style={{ color: "#c0392b", marginBottom: 8 }}>{formError}</p>}
          <div className="bp-form-grid">
            <div className="bp-frow">
              <label>Project <span>*</span></label>
              <select className="bp-input" value={form.project_id} onChange={(e) => setF("project_id", e.target.value)}>
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="bp-frow">
              <label>Category</label>
              <select className="bp-input" value={form.category} onChange={(e) => setF("category", e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="bp-frow">
              <label>Budget Amount (₹) <span>*</span></label>
              <input className="bp-input" type="number" placeholder="e.g. 5000000"
                value={form.allocated_amount} onChange={(e) => setF("allocated_amount", e.target.value)} />
            </div>
            <div className="bp-frow">
              <label>Fiscal Year</label>
              <input className="bp-input" placeholder="e.g. 2025-26"
                value={form.fiscal_year} onChange={(e) => setF("fiscal_year", e.target.value)} />
            </div>
            <div className="bp-frow bp-frow--full">
              <label>Notes</label>
              <textarea className="bp-textarea" rows={2} placeholder="Additional notes…"
                value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
            </div>
          </div>
          <div className="bp-form-actions">
            <button className="bp-btn-outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="bp-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Budget"}
            </button>
          </div>
        </div>
      )}

      <div className="bp-project-cards">
        {projectCards.length === 0 ? (
          <p style={{ padding: 20, opacity: 0.6 }}>No budgets set up yet — click "+ Add Budget" to create one.</p>
        ) : (
          projectCards.map((p) => {
            const used = pct(p.spent, p.totalBudget);
            const c = cls(used);
            return (
              <div key={p.id} className={`bp-pcard bp-pcard--${c}`}>
                <div className="bp-pcard-top">
                  <div>
                    <p className="bp-pcard-name">{p.name}</p>
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
          })
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — BUDGET ALLOCATION (category breakdown, all projects)
════════════════════════════════════════════════════════════ */
function AllocationTab({ budgetVsActual }) {
  const allocations = (budgetVsActual || []).map((a, i) => ({
    category: a.category,
    allocated: Number(a.allocated),
    spent: Number(a.spent),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const totalAlloc = allocations.reduce((s, a) => s + a.allocated, 0);
  const totalSpent = allocations.reduce((s, a) => s + a.spent, 0);

  if (allocations.length === 0) {
    return <div className="bp-alloc"><p style={{ padding: 20, opacity: 0.6 }}>No budget categories yet — add a budget first.</p></div>;
  }

  return (
    <div className="bp-alloc">
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

      <div className="bp-stacked-card">
        <h3>Budget Distribution by Category</h3>
        <div className="bp-stacked-bar">
          {allocations.map((a) => (
            <div key={a.category}
              className="bp-stacked-seg"
              style={{ width: `${(a.allocated / totalAlloc) * 100}%`, background: a.color }}
              title={`${a.category}: ${fmt(a.allocated)}`}
            />
          ))}
        </div>
        <div className="bp-stacked-legend">
          {allocations.map((a) => (
            <div key={a.category} className="bp-legend-item">
              <span className="bp-legend-dot" style={{ background: a.color }} />
              <span>{a.category}</span>
              <span className="bp-legend-pct">{Math.round((a.allocated / totalAlloc) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

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
            {allocations.map((a) => {
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
   TAB 3 — BUDGET REPORTS (variance by category)
   Note: your schema tracks budgets by category, not by month, so
   this shows Budgeted vs Actual PER CATEGORY rather than a monthly
   trend (there's no monthly budget-allocation data to chart).
════════════════════════════════════════════════════════════ */
function ReportsTab({ budgetVsActual }) {
  const rows = (budgetVsActual || []).map((a) => {
    const budget = Number(a.allocated);
    const actual = Number(a.spent);
    const variance = budget - actual;
    return {
      category: a.category,
      budget,
      actual,
      variance,
      pct: budget > 0 ? Math.round((variance / budget) * 100) : 0,
    };
  });

  const totalBudgeted = rows.reduce((s, d) => s + d.budget, 0);
  const totalActual   = rows.reduce((s, d) => s + d.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  const maxBudget = Math.max(1, ...rows.map((d) => d.budget));

  if (rows.length === 0) {
    return <div className="bp-reports"><p style={{ padding: 20, opacity: 0.6 }}>No budget data to report on yet.</p></div>;
  }

  return (
    <div className="bp-reports">
      <div className="bp-var-summary">
        <div className="bp-var-card">
          <p>Total Budgeted</p><h3>{fmt(totalBudgeted)}</h3>
        </div>
        <div className="bp-var-card">
          <p>Total Actual</p><h3 style={{ color: "#d97706" }}>{fmt(totalActual)}</h3>
        </div>
        <div className="bp-var-card bp-var-card--good">
          <p>Variance (Saved)</p><h3 style={{ color: totalVariance >= 0 ? "#059669" : "#dc2626" }}>{fmt(Math.abs(totalVariance))}</h3>
        </div>
        <div className="bp-var-card">
          <p>Avg. Utilisation</p>
          <h3>{totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0}%</h3>
        </div>
      </div>

      <div className="bp-chart-card">
        <div className="bp-chart-head">
          <h3>Budgeted vs Actual by Category</h3>
          <div className="bp-chart-legend">
            <span><i className="bp-dot bp-dot--budget" /> Budgeted</span>
            <span><i className="bp-dot bp-dot--actual" /> Actual</span>
          </div>
        </div>
        <div className="bp-bar-chart">
          {rows.map((d) => (
            <div className="bp-bar-group" key={d.category}>
              <div className="bp-bars">
                <div className="bp-bar bp-bar--budget"
                  style={{ "--h": `${(d.budget / maxBudget) * 100}%` }}
                  title={`Budget: ${fmt(d.budget)}`} />
                <div className="bp-bar bp-bar--actual"
                  style={{ "--h": `${(d.actual / maxBudget) * 100}%` }}
                  title={`Actual: ${fmt(d.actual)}`} />
              </div>
              <span className="bp-bar-lbl">{d.category}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bp-report-table-wrap">
        <h3>Variance Analysis by Category</h3>
        <table className="bp-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>Variance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="bp-trow">
                <td className="bp-month">{row.category}</td>
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