import { useState, useEffect, useCallback } from "react";
import financeService from "../../services/financeService";
import { getProjects } from "../../services/projectService";
import "./ExpenseTracking.css";

/* ── Category list — kept identical to BudgetPlanning.jsx so an
   expense's category actually matches a budget's category and
   spent_amount recalculation (backend budgetModel.recalcSpent)
   links up correctly. ─────────────────────────────────────── */
const CATEGORY_OPTIONS = ["Materials", "Labour", "Equipment", "Subcontractors", "Overheads", "Contingency", "Misc"];
const CATEGORY_COLORS  = ["#0A4174", "#4E8EA2", "#6EA2B3", "#49769F", "#7BBDE8", "#BDD8E9", "#9AC5D9"];
const PROJECT_COLORS   = ["#0A4174", "#4E8EA2", "#6EA2B3", "#49769F", "#7BBDE8", "#BDD8E9"];

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected", "paid"];
const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid" };

const EMPTY_EXPENSE = {
  expense_type: "project",
  vendor_id: "",
  category: "Materials",
  amount: "",
  expense_date: new Date().toISOString().split("T")[0],
  description: "",
  receipt_url: "",
  project_id: "",
};

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n || 0).toLocaleString("en-IN")}`;

const pct = (spent, total) => (total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0);
const cls = (p) => p >= 90 ? "critical" : p >= 70 ? "warning" : "ok";

const getStatusColor = (status) => {
  switch (status) {
    case "approved": return "#059669";
    case "pending":  return "#f59e0b";
    case "paid":     return "#3b82f6";
    case "rejected": return "#dc2626";
    default: return "#6b7280";
  }
};
const getStatusBg = (status) => {
  switch (status) {
    case "approved": return "#dcfce7";
    case "pending":  return "#fef3c7";
    case "paid":     return "#dbeafe";
    case "rejected": return "#fee2e2";
    default: return "#f3f4f6";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const TABS = ["Overview", "Expenses", "Budget Analysis", "By Project"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function ExpenseTracking() {
  const [tab, setTab] = useState("Overview");
  const [animIn, setAnimIn] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterExpenseType, setFilterExpenseType] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgetVsActual, setBudgetVsActual] = useState([]);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expRes, vendorRes, projRes, costRes] = await Promise.all([
        financeService.getAllExpenses(),
        financeService.getAllVendors(),
        getProjects(),
        financeService.getCostReport(),
      ]);
      setExpenses(expRes.data.data);
      setVendors(vendorRes.data.data);
      setProjects(projRes.data.projects || projRes.data || []);
      setBudgetVsActual(costRes.data.data.budgetVsActual || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expense data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.category || !form.amount) {
      setFormError("Category and amount are required.");
      return;
    }
    if (form.expense_type === "project" && !form.project_id) {
      setFormError("Project is required for a project expense.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await financeService.createExpense({
        expense_type: form.expense_type,
        project_id: form.expense_type === "project" ? form.project_id : null,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        vendor_id: form.vendor_id || null,
        expense_date: form.expense_date,
        receipt_url: form.receipt_url,
      });
      setSaved(true);
      await loadAll();
      setTimeout(() => { setSaved(false); setShowForm(false); setForm(EMPTY_EXPENSE); }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  // Totals by expense type (real, from expenses table's expense_type column)
  const companyExpenses = expenses.filter((e) => e.expense_type === "company").reduce((s, e) => s + Number(e.amount), 0);
  const projectExpenses = expenses.filter((e) => e.expense_type === "project").reduce((s, e) => s + Number(e.amount), 0);

  const totalBudget = budgetVsActual.reduce((s, c) => s + Number(c.allocated), 0);
  const totalSpent  = budgetVsActual.reduce((s, c) => s + Number(c.spent), 0);
  const overallPct  = pct(totalSpent, totalBudget);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;

  const filteredExpenses = expenses.filter((e) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (e.vendor_name || "").toLowerCase().includes(term) ||
      (e.receipt_url || "").toLowerCase().includes(term) ||
      (e.description || "").toLowerCase().includes(term);
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    const matchesType = filterExpenseType === "all" || e.expense_type === filterExpenseType;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return <div className="et-root"><p style={{ padding: 40, textAlign: "center" }}>Loading expenses…</p></div>;
  }
  if (error) {
    return (
      <div className="et-root">
        <p style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>
          {error} <button className="et-btn-outline" onClick={loadAll}>Retry</button>
        </p>
      </div>
    );
  }

  return (
    <div className={`et-root ${animIn ? "et-in" : ""}`}>

      {/* Header */}
      <div className="et-header">
        <div>
          <p className="et-eyebrow">Finance Manager</p>
          <h1 className="et-title">Expense Tracking</h1>
          <p className="et-subtitle">Track company & project expenses</p>
        </div>
        <button className="et-btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Expense"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="et-summary">
        <div className="et-summary-card" style={{ "--accent": "#0A4174" }}>
          <p className="et-summary-label">Total Budget</p>
          <p className="et-summary-value">{fmt(totalBudget)}</p>
          <span className="et-summary-sub">Across all categories</span>
        </div>
        <div className="et-summary-card" style={{ "--accent": "#f59e0b" }}>
          <p className="et-summary-label">Total Spent</p>
          <p className="et-summary-value">{fmt(totalSpent)}</p>
          <span className="et-summary-sub">{overallPct}% utilised</span>
        </div>
        <div className="et-summary-card" style={{ "--accent": "#F59E0B" }}>
          <p className="et-summary-label">🏢 Company Expenses</p>
          <p className="et-summary-value">{fmt(companyExpenses)}</p>
          <span className="et-summary-sub">Overhead costs</span>
        </div>
        <div className="et-summary-card" style={{ "--accent": "#10B981" }}>
          <p className="et-summary-label">🏗️ Project Expenses</p>
          <p className="et-summary-value">{fmt(projectExpenses)}</p>
          <span className="et-summary-sub">Direct project costs</span>
        </div>
        <div className="et-summary-card" style={{ "--accent": "#059669" }}>
          <p className="et-summary-label">Remaining Budget</p>
          <p className="et-summary-value">{fmt(totalBudget - totalSpent)}</p>
          <span className="et-summary-sub">Available to spend</span>
        </div>
        <div className="et-summary-card" style={{ "--accent": "#dc2626" }}>
          <p className="et-summary-label">Pending Approval</p>
          <p className="et-summary-value">{pendingCount}</p>
          <span className="et-summary-sub">Awaiting action</span>
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="et-form-card">
          <h3 className="et-form-title">Add New Expense</h3>
          {formError && <p style={{ color: "#c0392b", marginBottom: 12 }}>{formError}</p>}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Expense Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { key: "project", label: "Project Expense", description: "Materials, labour, equipment for projects" },
                { key: "company", label: "Company Expense", description: "Office rent, salaries, utilities, etc." },
              ].map((t) => (
                <div
                  key={t.key}
                  onClick={() => setF('expense_type', t.key)}
                  style={{
                    padding: '12px',
                    border: form.expense_type === t.key ? '2px solid #0A4174' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: form.expense_type === t.key ? '#eff6ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.label}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="et-form-grid">
            <div className="et-form-row">
              <label>Vendor</label>
              <select className="et-input" value={form.vendor_id} onChange={(e) => setF("vendor_id", e.target.value)}>
                <option value="">— No vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="et-form-row">
              <label>Category <span>*</span></label>
              <select className="et-input" value={form.category} onChange={(e) => setF("category", e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="et-form-row">
              <label>Amount (₹) <span>*</span></label>
              <input className="et-input" type="number" placeholder="e.g., 500000"
                value={form.amount} onChange={(e) => setF("amount", e.target.value)} />
            </div>
            <div className="et-form-row">
              <label>Date <span>*</span></label>
              <input className="et-input" type="date"
                value={form.expense_date} onChange={(e) => setF("expense_date", e.target.value)} />
            </div>

            {form.expense_type === 'project' && (
              <div className="et-form-row">
                <label>Project <span>*</span></label>
                <select className="et-input" value={form.project_id} onChange={(e) => setF("project_id", e.target.value)}>
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="et-form-row">
              <label>Receipt / Reference</label>
              <input className="et-input" placeholder="e.g., RCP-2024-001"
                value={form.receipt_url} onChange={(e) => setF("receipt_url", e.target.value)} />
            </div>
            <div className="et-form-row et-form-row--full">
              <label>Description</label>
              <textarea className="et-textarea" rows={3} placeholder="Expense details..."
                value={form.description} onChange={(e) => setF("description", e.target.value)} />
            </div>
          </div>
          <div className="et-form-actions">
            <button className="et-btn-outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="et-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Expense"}
            </button>
          </div>
          {saved && <div className="et-toast">✅ Expense added successfully!</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="et-tabs">
        {TABS.map((t) => (
          <button key={t} className={`et-tab ${tab === t ? "et-tab--on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="et-body">
        {tab === "Overview" && <OverviewTab budgetVsActual={budgetVsActual} recentExpenses={expenses.slice(0, 5)} />}
        {tab === "Expenses" && (
          <ExpensesTab
            filteredExpenses={filteredExpenses}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterExpenseType={filterExpenseType}
            setFilterExpenseType={setFilterExpenseType}
          />
        )}
        {tab === "Budget Analysis" && <BudgetAnalysisTab budgetVsActual={budgetVsActual} />}
        {tab === "By Project" && <ByProjectTab expenses={expenses} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */
function OverviewTab({ budgetVsActual, recentExpenses }) {
  const categories = budgetVsActual.map((c, i) => ({
    name: c.category,
    budget: Number(c.allocated),
    spent: Number(c.spent),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="et-overview">
      <div className="et-section">
        <h2 className="et-section-title">Budget by Category</h2>
        {categories.length === 0 ? (
          <p style={{ padding: 20, opacity: 0.6 }}>No budgets set up yet.</p>
        ) : (
          <div className="et-category-grid">
            {categories.map((cat) => {
              const used = pct(cat.spent, cat.budget);
              const status = cls(used);
              return (
                <div key={cat.name} className={`et-category-card et-category-card--${status}`}>
                  <div className="et-cat-header">
                    <div className="et-cat-info">
                      <p className="et-cat-name">{cat.name}</p>
                      <p className="et-cat-spent">{fmt(cat.spent)} of {fmt(cat.budget)}</p>
                    </div>
                    <span className="et-cat-pct">{used}%</span>
                  </div>
                  <div className="et-progress-bar">
                    <div className={`et-progress-fill et-progress--${status}`} style={{ width: `${used}%` }} />
                  </div>
                  <div className="et-cat-footer">
                    <span className="et-cat-remaining">{fmt(cat.budget - cat.spent)} remaining</span>
                    <span className={`et-status et-status--${status}`}>
                      {status === "ok" ? "On Track" : status === "warning" ? "Caution" : "Critical"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="et-section">
        <h2 className="et-section-title">Recent Expenses</h2>
        {recentExpenses.length === 0 ? (
          <p style={{ padding: 20, opacity: 0.6 }}>No expenses logged yet.</p>
        ) : (
          <div className="et-expense-list">
            {recentExpenses.map((exp) => (
              <div key={exp.id} className="et-expense-item">
                <div className="et-exp-left">
                  <div className="et-exp-dot" style={{ background: getStatusColor(exp.status) }} />
                  <div className="et-exp-info">
                    <p className="et-exp-vendor">{exp.vendor_name || "No vendor"}</p>
                    <p className="et-exp-meta">{exp.category} • {formatDate(exp.expense_date)}</p>
                  </div>
                </div>
                <div className="et-exp-right">
                  <p className="et-exp-amount">{fmt(exp.amount)}</p>
                  <span className="et-exp-status" style={{ background: getStatusBg(exp.status), color: getStatusColor(exp.status) }}>
                    {STATUS_LABEL[exp.status] || exp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — EXPENSES
════════════════════════════════════════════════════════════ */
function ExpensesTab({ filteredExpenses, searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterExpenseType, setFilterExpenseType }) {
  return (
    <div className="et-expenses">
      <div className="et-filters">
        <div className="et-search">
          <input
            type="text"
            placeholder="Search by vendor, receipt or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="et-search-input"
          />
        </div>
        <div className="et-filter-group">
          <label>Type:</label>
          <select value={filterExpenseType} onChange={(e) => setFilterExpenseType(e.target.value)} className="et-filter-select">
            <option value="all">All</option>
            <option value="company">Company</option>
            <option value="project">Project</option>
          </select>
        </div>
        <div className="et-filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="et-filter-select">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All" : STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="et-table-wrap">
        <table className="et-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Receipt</th>
              <th>Type</th>
              <th>Category</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} className="et-trow">
                <td className="et-date">{formatDate(exp.expense_date)}</td>
                <td className="et-vendor">{exp.vendor_name || "—"}</td>
                <td className="et-receipt">{exp.receipt_url || "—"}</td>
                <td>
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: exp.expense_type === 'company' ? '#FEF3C7' : '#DCFCE7',
                    color: exp.expense_type === 'company' ? '#B45309' : '#047857'
                  }}>
                    {exp.expense_type === 'company' ? '🏢 Company' : '🏗️ Project'}
                  </span>
                </td>
                <td className="et-category">{exp.category}</td>
                <td className="et-project">{exp.project_name || "—"}</td>
                <td className="et-amount">{fmt(exp.amount)}</td>
                <td>
                  <span className="et-status-badge" style={{ background: getStatusBg(exp.status), color: getStatusColor(exp.status) }}>
                    {STATUS_LABEL[exp.status] || exp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExpenses.length === 0 && (
          <div className="et-empty"><p>No expenses found matching your criteria</p></div>
        )}
      </div>

      <div className="et-summary-stats">
        <div className="et-stat-box">
          <p className="et-stat-label">Total Expenses</p>
          <p className="et-stat-value">{fmt(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Approved</p>
          <p className="et-stat-value">{fmt(filteredExpenses.filter(e => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0))}</p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Pending</p>
          <p className="et-stat-value" style={{ color: "#f59e0b" }}>{fmt(filteredExpenses.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0))}</p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Rejected</p>
          <p className="et-stat-value" style={{ color: "#dc2626" }}>{fmt(filteredExpenses.filter(e => e.status === "rejected").reduce((s, e) => s + Number(e.amount), 0))}</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — BUDGET ANALYSIS
   Note: your schema has no quarter dimension, so the "quarterly"
   cards from the original mock are replaced with category-based
   cards (same categories as Budget Planning), and the table below
   shows the same category data in tabular form.
════════════════════════════════════════════════════════════ */
function BudgetAnalysisTab({ budgetVsActual }) {
  const categories = budgetVsActual.map((c, i) => ({
    id: c.category,
    name: c.category,
    budget: Number(c.allocated),
    spent: Number(c.spent),
    icon: "📦",
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  if (categories.length === 0) {
    return <div className="et-budget-analysis"><p style={{ padding: 20, opacity: 0.6 }}>No budget data yet.</p></div>;
  }

  return (
    <div className="et-budget-analysis">
      <div className="et-section">
        <h2 className="et-section-title">Budget vs Actual by Category</h2>
        <div className="et-budget-grid">
          {categories.map((c) => {
            const used = pct(c.spent, c.budget);
            return (
              <div key={c.id} className="et-budget-card">
                <p className="et-budget-quarter">{c.name}</p>
                <div className="et-budget-amounts">
                  <div>
                    <span className="et-budget-label">Budget</span>
                    <p className="et-budget-val">{fmt(c.budget)}</p>
                  </div>
                  <div>
                    <span className="et-budget-label">Spent</span>
                    <p className="et-budget-val" style={{ color: "#f59e0b" }}>{fmt(c.spent)}</p>
                  </div>
                </div>
                <div className="et-progress-bar">
                  <div className="et-progress-fill" style={{ width: `${used}%`, background: `hsl(${used * 1.2}, 70%, 50%)` }} />
                </div>
                <p className="et-budget-percentage">{used}% utilised</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="et-section">
        <h2 className="et-section-title">Category-wise Analysis</h2>
        <div className="et-analysis-table">
          <table className="et-table">
            <thead>
              <tr>
                <th>Category</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Utilisation</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const used = pct(cat.spent, cat.budget);
                const status = cls(used);
                return (
                  <tr key={cat.id} className="et-trow">
                    <td className="et-cat-cell">{cat.icon} {cat.name}</td>
                    <td className="et-mono">{fmt(cat.budget)}</td>
                    <td className="et-mono">{fmt(cat.spent)}</td>
                    <td className="et-mono">{fmt(cat.budget - cat.spent)}</td>
                    <td>
                      <div className="et-mini-bar">
                        <div className={`et-mini-fill et-mini-fill--${status}`} style={{ width: `${used}%` }} />
                      </div>
                      <span className={`et-mini-pct et-mini-pct--${status}`}>{used}%</span>
                    </td>
                    <td>
                      <span className={`et-status et-status--${status}`}>
                        {status === "ok" ? "On Track" : status === "warning" ? "Caution" : "Critical"}
                      </span>
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
   TAB 4 — BY PROJECT
   Note: your expenses table has no "department" column, so the
   original "By Department" tab (which had no backing data at all)
   is replaced with a real, available dimension — spend by project,
   computed client-side from the same expense rows.
════════════════════════════════════════════════════════════ */
function ByProjectTab({ expenses }) {
  const grouped = Object.values(
    expenses.reduce((acc, e) => {
      const key = e.project_name || (e.expense_type === "company" ? "Company (no project)" : `Project #${e.project_id}`);
      if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 };
      acc[key].total += Number(e.amount);
      acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const grandTotal = grouped.reduce((s, g) => s + g.total, 0);
  const withPct = grouped.map((g, i) => ({
    ...g,
    percentage: grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));

  if (withPct.length === 0) {
    return <div className="et-by-dept"><p style={{ padding: 20, opacity: 0.6 }}>No expenses logged yet.</p></div>;
  }

  return (
    <div className="et-by-dept">
      <div className="et-section">
        <h2 className="et-section-title">Expenses by Project</h2>
        <div className="et-dept-cards">
          {withPct.map((g) => (
            <div key={g.name} className="et-dept-card">
              <div className="et-dept-header">
                <p className="et-dept-name">{g.name}</p>
                <span className="et-dept-pct">{g.percentage}%</span>
              </div>
              <p className="et-dept-amount">{fmt(g.total)}</p>
              <div className="et-progress-bar">
                <div className="et-progress-fill" style={{ width: `${g.percentage}%`, background: g.color }} />
              </div>
              <p className="et-dept-of-total">{g.count} expense{g.count === 1 ? "" : "s"} • of {fmt(grandTotal)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}