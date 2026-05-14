import { useState, useEffect } from "react";
import "./ExpenseTracking.css";

/* ── Expense Classification Structure ─────────────────────── */
const EXPENSE_TYPES = {
  COMPANY: {
    label: 'Company Expense',
    description: 'Office rent, salaries, utilities, etc.',
    categories: [
      { id: 'rent', label: 'Rent & Utilities' },
      { id: 'salary_admin', label: 'Salaries (Admin)' },
      { id: 'office_exp', label: 'Office Expenses' },
      { id: 'software', label: 'Software & IT' },
      { id: 'travel_general', label: 'Travel (General)' },
      { id: 'legal', label: 'Legal & Compliance' },
      { id: 'marketing', label: 'Marketing' },
    ]
  },
  PROJECT: {
    label: 'Project Expense',
    description: 'Materials, labour, equipment for projects',
    categories: [
      { id: 'material', label: 'Material' },
      { id: 'labour', label: 'Labour' },
      { id: 'equipment', label: 'Equipment' },
      { id: 'transport', label: 'Transportation' },
      { id: 'site_exp', label: 'Site Expenses' },
      { id: 'subcontract', label: 'Subcontracting' },
      { id: 'salary_project', label: 'Project Staff Salary' },
    ]
  }
};

/* ── Mock Data ─────────────────────────────────────────────── */
const INITIAL_EXPENSES = [
  { id: 1, date: "2024-12-15", vendor: "Global Steel Ltd", category: "material", amount: 2800000, description: "High-grade steel rebar", status: "Approved", receipt: "RCP-2024-001", approvedBy: "Rajesh Kumar", department: "Procurement", expenseType: "PROJECT", projectId: 1 },
  { id: 2, date: "2024-12-14", vendor: "SafeWork Equipment", category: "office_exp", amount: 450000, description: "Safety helmets & PPE kits", status: "Approved", receipt: "RCP-2024-002", approvedBy: "Priya Singh", department: "Safety", expenseType: "COMPANY", projectId: null },
  { id: 3, date: "2024-12-13", vendor: "Transport Hub Co", category: "transport", amount: 1200000, description: "Fuel and logistics charges", status: "Pending", receipt: "RCP-2024-003", approvedBy: "—", department: "Logistics", expenseType: "PROJECT", projectId: 1 },
  { id: 4, date: "2024-12-12", vendor: "Cement Suppliers Ltd", category: "material", amount: 3500000, description: "Portland cement - 500 bags", status: "Approved", receipt: "RCP-2024-004", approvedBy: "Rajesh Kumar", department: "Procurement", expenseType: "PROJECT", projectId: 2 },
  { id: 5, date: "2024-12-11", vendor: "Electrical Systems", category: "equipment", amount: 1800000, description: "Wiring and switchboards", status: "Rejected", receipt: "RCP-2024-005", approvedBy: "—", department: "Engineering", expenseType: "PROJECT", projectId: 1 },
];

const PROJECTS = [
  { id: 1, name: 'Tower B Construction' },
  { id: 2, name: 'Villa Complex Phase 2' },
  { id: 3, name: 'Commercial Hub' },
];

const EXPENSE_CATEGORIES_OLD = [
  { id: 1, name: "Materials", budget: 50000000, spent: 38500000, color: "#0A4174", icon: "📦" },
  { id: 2, name: "Labour", budget: 35000000, spent: 28900000, color: "#4E8EA2", icon: "👷" },
  { id: 3, name: "Equipment", budget: 25000000, spent: 19200000, color: "#6EA2B3", icon: "🏗️" },
  { id: 4, name: "Transportation", budget: 12000000, spent: 9800000, color: "#49769F", icon: "🚚" },
  { id: 5, name: "Utilities", budget: 8000000, spent: 6200000, color: "#7BBDE8", icon: "⚡" },
  { id: 6, name: "Safety", budget: 5000000, spent: 3100000, color: "#BDD8E9", icon: "🛡️" },
];

const BUDGET_ALLOCATION = [
  { quarter: "Q1", budget: 80000000, spent: 65200000, percentage: 81.5 },
  { quarter: "Q2", budget: 85000000, spent: 72100000, percentage: 84.8 },
  { quarter: "Q3", budget: 90000000, spent: 78300000, percentage: 87 },
  { quarter: "Q4", budget: 95000000, spent: 88200000, percentage: 92.8 },
];

const DEPARTMENT_EXPENSES = [
  { dept: "Procurement", total: 25800000, percentage: 31, color: "#0A4174" },
  { dept: "HR", total: 18900000, percentage: 23, color: "#4E8EA2" },
  { dept: "Operations", total: 16500000, percentage: 20, color: "#6EA2B3" },
  { dept: "Safety", total: 10200000, percentage: 12, color: "#49769F" },
  { dept: "Engineering", total: 9800000, percentage: 12, color: "#7BBDE8" },
  { dept: "Admin", total: 2890000, percentage: 2, color: "#BDD8E9" },
];

const EMPTY_EXPENSE = {
  vendor: "",
  category: "material",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  receipt: "",
  department: "",
  expenseType: "PROJECT",
  projectId: null,
};

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const pct = (spent, total) => Math.min(Math.round((spent / total) * 100), 100);
const cls = (p) => p >= 90 ? "critical" : p >= 70 ? "warning" : "ok";

const getStatusColor = (status) => {
  switch (status) {
    case "Approved": return "#059669";
    case "Pending": return "#f59e0b";
    case "Under Review": return "#3b82f6";
    case "Rejected": return "#dc2626";
    default: return "#6b7280";
  }
};

const getStatusBg = (status) => {
  switch (status) {
    case "Approved": return "#dcfce7";
    case "Pending": return "#fef3c7";
    case "Under Review": return "#dbeafe";
    case "Rejected": return "#fee2e2";
    default: return "#f3f4f6";
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function ExpenseTracking() {
  const [tab, setTab] = useState("Overview");
  const [animIn, setAnimIn] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saved, setSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  // ✅ REMOVED: filterCategory / setFilterCategory (never used in ExpensesTab UI)
  const [filterExpenseType, setFilterExpenseType] = useState("All");
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const newExpense = {
      id: Math.max(...expenses.map(e => e.id), 0) + 1,
      ...form,
      amount: parseFloat(form.amount),
      status: "Pending",
      approvedBy: "—",
    };
    setExpenses([newExpense, ...expenses]);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      setForm(EMPTY_EXPENSE);
    }, 1500);
  };

  // Calculate totals by expense type
  const companyExpenses = expenses
    .filter(e => e.expenseType === 'COMPANY')
    .reduce((sum, e) => sum + e.amount, 0);

  const projectExpenses = expenses
    .filter(e => e.expenseType === 'PROJECT')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBudget = EXPENSE_CATEGORIES_OLD.reduce((s, c) => s + c.budget, 0);
  const totalSpent = EXPENSE_CATEGORIES_OLD.reduce((s, c) => s + c.spent, 0);
  const overallPct = pct(totalSpent, totalBudget);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.receipt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || e.status === filterStatus;
    const matchesType = filterExpenseType === "All" || e.expenseType === filterExpenseType;
    // ✅ REMOVED: matchesCategory (filterCategory state removed)
    return matchesSearch && matchesStatus && matchesType;
  });

  const TABS = ["Overview", "Expenses", "Budget Analysis", "By Department"];

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
          <p className="et-summary-value">{expenses.filter(e => e.status === "Pending").length}</p>
          <span className="et-summary-sub">Awaiting action</span>
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="et-form-card">
          <h3 className="et-form-title">Add New Expense</h3>

          {/* Expense Type Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Expense Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(EXPENSE_TYPES).map(([key, val]) => (
                <div
                  key={key}
                  onClick={() => setF('expenseType', key)}
                  style={{
                    padding: '12px',
                    border: form.expenseType === key ? '2px solid #0A4174' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: form.expenseType === key ? '#eff6ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{val.label}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{val.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="et-form-grid">
            <div className="et-form-row">
              <label>Vendor Name <span>*</span></label>
              <input
                className="et-input"
                placeholder="e.g., Global Steel Ltd"
                value={form.vendor}
                onChange={(e) => setF("vendor", e.target.value)}
              />
            </div>
            <div className="et-form-row">
              <label>Category <span>*</span></label>
              <select
                className="et-input"
                value={form.category}
                onChange={(e) => setF("category", e.target.value)}
              >
                <option value="">Select category...</option>
                {EXPENSE_TYPES[form.expenseType]?.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="et-form-row">
              <label>Amount (₹) <span>*</span></label>
              <input
                className="et-input"
                type="number"
                placeholder="e.g., 500000"
                value={form.amount}
                onChange={(e) => setF("amount", e.target.value)}
              />
            </div>
            <div className="et-form-row">
              <label>Date <span>*</span></label>
              <input
                className="et-input"
                type="date"
                value={form.date}
                onChange={(e) => setF("date", e.target.value)}
              />
            </div>

            {/* Project selector (only for PROJECT expenses) */}
            {form.expenseType === 'PROJECT' && (
              <div className="et-form-row">
                <label>Project <span>*</span></label>
                <select
                  className="et-input"
                  value={form.projectId || ''}
                  onChange={(e) => setF("projectId", e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select project...</option>
                  {PROJECTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="et-form-row">
              <label>Department</label>
              <select className="et-input" value={form.department} onChange={(e) => setF("department", e.target.value)}>
                <option>Procurement</option>
                <option>HR</option>
                <option>Operations</option>
                <option>Safety</option>
                <option>Engineering</option>
                <option>Admin</option>
              </select>
            </div>
            <div className="et-form-row">
              <label>Receipt Number</label>
              <input
                className="et-input"
                placeholder="e.g., RCP-2024-001"
                value={form.receipt}
                onChange={(e) => setF("receipt", e.target.value)}
              />
            </div>
            <div className="et-form-row et-form-row--full">
              <label>Description</label>
              <textarea
                className="et-textarea"
                rows={3}
                placeholder="Expense details..."
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
              />
            </div>
          </div>
          <div className="et-form-actions">
            <button className="et-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="et-btn-primary" onClick={handleSave}>Save Expense</button>
          </div>
          {saved && <div className="et-toast">✅ Expense added successfully!</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="et-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`et-tab ${tab === t ? "et-tab--on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="et-body">
        {tab === "Overview" && <OverviewTab categories={EXPENSE_CATEGORIES_OLD} />}
        {tab === "Expenses" && (
          <ExpensesTab
            filteredExpenses={filteredExpenses}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            // ✅ REMOVED: filterCategory, setFilterCategory, allExpenses
            filterExpenseType={filterExpenseType}
            setFilterExpenseType={setFilterExpenseType}
          />
        )}
        {tab === "Budget Analysis" && <BudgetAnalysisTab categories={EXPENSE_CATEGORIES_OLD} />}
        {tab === "By Department" && <ByDepartmentTab />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */
function OverviewTab({ categories }) {
  const EXPENSES = [
    { id: 1, date: "2024-12-15", vendor: "Global Steel Ltd", category: "Materials", amount: 2800000, status: "Approved" },
    { id: 2, date: "2024-12-14", vendor: "SafeWork Equipment", category: "Safety", amount: 450000, status: "Approved" },
    { id: 3, date: "2024-12-13", vendor: "Transport Hub Co", category: "Transportation", amount: 1200000, status: "Pending" },
  ];

  return (
    <div className="et-overview">
      {/* Category Breakdown */}
      <div className="et-section">
        <h2 className="et-section-title">Budget by Category</h2>
        <div className="et-category-grid">
          {categories.map((cat) => {
            const used = pct(cat.spent, cat.budget);
            const status = cls(used);
            return (
              <div key={cat.id} className={`et-category-card et-category-card--${status}`}>
                <div className="et-cat-header">
                  <div className="et-cat-icon">{cat.icon}</div>
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
      </div>

      {/* Recent Expenses */}
      <div className="et-section">
        <h2 className="et-section-title">Recent Expenses</h2>
        <div className="et-expense-list">
          {EXPENSES.map((exp) => (
            <div key={exp.id} className="et-expense-item">
              <div className="et-exp-left">
                <div className="et-exp-dot" style={{ background: getStatusColor(exp.status) }} />
                <div className="et-exp-info">
                  <p className="et-exp-vendor">{exp.vendor}</p>
                  <p className="et-exp-meta">{exp.category} • {formatDate(exp.date)}</p>
                </div>
              </div>
              <div className="et-exp-right">
                <p className="et-exp-amount">{fmt(exp.amount)}</p>
                <span className="et-exp-status" style={{
                  background: getStatusBg(exp.status),
                  color: getStatusColor(exp.status)
                }}>
                  {exp.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 2 — EXPENSES
   ✅ REMOVED unused props: filterCategory, setFilterCategory, allExpenses
════════════════════════════════════════════════════════════ */
function ExpensesTab({
  filteredExpenses,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterExpenseType,
  setFilterExpenseType,
}) {
  return (
    <div className="et-expenses">
      {/* Filters */}
      <div className="et-filters">
        <div className="et-search">
          <input
            type="text"
            placeholder="Search by vendor or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="et-search-input"
          />
        </div>
        <div className="et-filter-group">
          <label>Type:</label>
          <select
            value={filterExpenseType}
            onChange={(e) => setFilterExpenseType(e.target.value)}
            className="et-filter-select"
          >
            <option>All</option>
            <option>COMPANY</option>
            <option>PROJECT</option>
          </select>
        </div>
        <div className="et-filter-group">
          <label>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="et-filter-select"
          >
            <option>All</option>
            <option>Approved</option>
            <option>Pending</option>
            <option>Under Review</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>

      {/* Expense Table */}
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
            {filteredExpenses.map((exp) => {
              const categoryLabel =
                EXPENSE_TYPES[exp.expenseType]?.categories.find(c => c.id === exp.category)?.label || exp.category;
              const projectName = exp.projectId
                ? PROJECTS.find(p => p.id === exp.projectId)?.name
                : '-';

              return (
                <tr key={exp.id} className="et-trow">
                  <td className="et-date">{formatDate(exp.date)}</td>
                  <td className="et-vendor">{exp.vendor}</td>
                  <td className="et-receipt">{exp.receipt}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: exp.expenseType === 'COMPANY' ? '#FEF3C7' : '#DCFCE7',
                      color: exp.expenseType === 'COMPANY' ? '#B45309' : '#047857'
                    }}>
                      {exp.expenseType === 'COMPANY' ? '🏢 Company' : '🏗️ Project'}
                    </span>
                  </td>
                  <td className="et-category">{categoryLabel}</td>
                  <td className="et-project">{projectName}</td>
                  <td className="et-amount">{fmt(exp.amount)}</td>
                  <td>
                    <span className="et-status-badge" style={{
                      background: getStatusBg(exp.status),
                      color: getStatusColor(exp.status)
                    }}>
                      {exp.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredExpenses.length === 0 && (
          <div className="et-empty">
            <p>No expenses found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="et-summary-stats">
        <div className="et-stat-box">
          <p className="et-stat-label">Total Expenses</p>
          <p className="et-stat-value">{fmt(filteredExpenses.reduce((s, e) => s + e.amount, 0))}</p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Approved</p>
          <p className="et-stat-value">
            {fmt(filteredExpenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Pending</p>
          <p className="et-stat-value" style={{ color: "#f59e0b" }}>
            {fmt(filteredExpenses.filter(e => e.status === "Pending").reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
        <div className="et-stat-box">
          <p className="et-stat-label">Rejected</p>
          <p className="et-stat-value" style={{ color: "#dc2626" }}>
            {fmt(filteredExpenses.filter(e => e.status === "Rejected").reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — BUDGET ANALYSIS
════════════════════════════════════════════════════════════ */
function BudgetAnalysisTab({ categories }) {
  return (
    <div className="et-budget-analysis">
      <div className="et-section">
        <h2 className="et-section-title">Quarterly Budget vs Actual</h2>
        <div className="et-budget-grid">
          {BUDGET_ALLOCATION.map((q) => (
            <div key={q.quarter} className="et-budget-card">
              <p className="et-budget-quarter">{q.quarter}</p>
              <div className="et-budget-amounts">
                <div>
                  <span className="et-budget-label">Budget</span>
                  <p className="et-budget-val">{fmt(q.budget)}</p>
                </div>
                <div>
                  <span className="et-budget-label">Spent</span>
                  <p className="et-budget-val" style={{ color: "#f59e0b" }}>{fmt(q.spent)}</p>
                </div>
              </div>
              <div className="et-progress-bar">
                <div
                  className="et-progress-fill"
                  style={{ width: `${q.percentage}%`, background: `hsl(${q.percentage * 1.2}, 70%, 50%)` }}
                />
              </div>
              <p className="et-budget-percentage">{q.percentage}% utilised</p>
            </div>
          ))}
        </div>
      </div>

      <div className="et-section">
        <h2 className="et-section-title">Category-wise Analysis</h2>
        <div className="et-analysis-table">
          <table className="et-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Utilisation</th>
                <th>Status</th>
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
   TAB 4 — BY DEPARTMENT
════════════════════════════════════════════════════════════ */
function ByDepartmentTab() {
  const totalDeptExpense = DEPARTMENT_EXPENSES.reduce((s, d) => s + d.total, 0);

  return (
    <div className="et-by-dept">
      <div className="et-section">
        <h2 className="et-section-title">Department-wise Expenses</h2>

        <div className="et-chart-section">
          <div className="et-pie-chart">
            {DEPARTMENT_EXPENSES.map((dept, idx) => (
              <div
                key={dept.dept}
                style={{
                  background: dept.color,
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${DEPARTMENT_EXPENSES.slice(0, idx).reduce((s, d) => s + (d.percentage * 3.6), 0)}deg) translateY(-70px)`,
                }}
                title={`${dept.dept}: ${fmt(dept.total)}`}
              />
            ))}
          </div>
          <div className="et-legend">
            {DEPARTMENT_EXPENSES.map((dept) => (
              <div key={dept.dept} className="et-legend-item">
                <span className="et-legend-dot" style={{ background: dept.color }} />
                <span className="et-legend-name">{dept.dept}</span>
                <span className="et-legend-pct">{dept.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="et-section">
        <h2 className="et-section-title">Department Details</h2>
        <div className="et-dept-cards">
          {DEPARTMENT_EXPENSES.map((dept) => (
            <div key={dept.dept} className="et-dept-card">
              <div className="et-dept-header">
                <p className="et-dept-name">{dept.dept}</p>
                <span className="et-dept-pct">{dept.percentage}%</span>
              </div>
              <p className="et-dept-amount">{fmt(dept.total)}</p>
              <div className="et-progress-bar">
                <div
                  className="et-progress-fill"
                  style={{ width: `${dept.percentage}%`, background: dept.color }}
                />
              </div>
              <p className="et-dept-of-total">of {fmt(totalDeptExpense)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}