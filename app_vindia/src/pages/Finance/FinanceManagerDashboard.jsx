import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import financeService from "../../services/financeService";
import CheckInButton from "../../SharedResourse/CheckInButton";

import "./FinanceManagerDashboard.css";

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/Cr/gi, "")
    .replace(/L/gi, "")
    .trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const getAmount = (item = {}) =>
  toNumber(item.amount) ||
  toNumber(item.total) ||
  toNumber(item.balance) ||
  toNumber(item.outstanding_amount) ||
  toNumber(item.outstandingAmount) ||
  toNumber(item.pending_amount) ||
  toNumber(item.pendingAmount) ||
  toNumber(item.invoice_amount) ||
  toNumber(item.invoiceAmount) ||
  toNumber(item.net_amount) ||
  toNumber(item.netAmount) ||
  0;

const getClientName = (item = {}) =>
  item.client_name || item.clientName || item.client ||
  item.customer_name || item.customerName || item.customer ||
  item.company_name || item.companyName || "—";

const getVendorName = (item = {}) =>
  item.vendor_name || item.vendorName || item.vendor ||
  item.supplier_name || item.supplierName || item.supplier ||
  item.company_name || item.companyName || "—";

const getInvoiceNumber = (item = {}) =>
  item.invoice_number || item.invoiceNumber || item.invoice_no ||
  item.invoiceNo || item.invoice_id || item.invoiceId ||
  item.reference_number || item.referenceNumber || item.id || "—";

const getDueDate = (item = {}) =>
  item.due_date || item.dueDate || item.payment_due_date ||
  item.paymentDueDate || item.date || null;

const getProjectName = (item = {}) =>
  item.project_name || item.projectName || item.project || "—";

const formatCurrency = (value) => {
  const number = toNumber(value);
  if (number >= 10000000) return `₹${(number / 10000000).toFixed(2)}Cr`;
  if (number >= 100000)   return `₹${(number / 100000).toFixed(1)}L`;
  return `₹${number.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const normalizeStatus = (status) => {
  if (!status) return "—";
  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getStatusClass = (status) => {
  const s = String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["paid", "approved", "completed", "received"].includes(s)) return "success";
  if (["overdue", "rejected", "cancelled", "failed"].includes(s))  return "danger";
  if (["pending", "partially_paid", "processing", "draft"].includes(s)) return "warning";
  return "default";
};

const getArray  = (v) => (Array.isArray(v) ? v : []);
const getObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

const getApiPayload = (response) => {
  const first  = response?.data;
  const second = first?.data;
  return second !== undefined ? second : first || {};
};

/* =========================================================
   DONUT CHART
========================================================= */

const DONUT_COLORS = [
  "#7BBDE8", "#4E8EA2", "#49769F",
  "#0A4174", "#6EA2B3", "#BDD8E9",
];

const buildDonutSegments = (categories = []) => {
  const radius        = 50;
  const circumference = 2 * Math.PI * radius;

  const valid = categories
    .map((c) => ({
      name:   c.category || c.name || c.expense_category || c.expenseCategory || "Other",
      amount: toNumber(c.total) || toNumber(c.amount) || toNumber(c.value) || 0,
    }))
    .filter((c) => c.amount > 0);

  const total = valid.reduce((s, c) => s + c.amount, 0);
  let acc = 0;

  return valid.map((c, i) => {
    const pct  = total > 0 ? (c.amount / total) * 100 : 0;
    const dash = (pct / 100) * circumference;
    const seg  = {
      name: c.name, amount: c.amount, pct,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      radius, circumference, dashLength: dash, offset: acc,
    };
    acc += dash;
    return seg;
  });
};

/* =========================================================
   BUDGET COLOR HELPER
========================================================= */
const budgetColor = (pct) => {
  if (pct >= 90) return "#c0404a";
  if (pct >= 70) return "#c07a28";
  return "#1e8a5e";
};

/* =========================================================
   COMPONENT
========================================================= */

export default function FinanceManagerDashboard() {
  const navigate = useNavigate();

  /* ── User ─────────────────────────────────────────────── */
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  const normalizedRole  = String(user?.role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const isAccountant    = normalizedRole === "accountant";
  const financeBasePath = isAccountant ? "/accountant" : "/finance-manager";
  const dashboardTitle  = isAccountant ? "Accountant Dashboard" : "Finance Manager Dashboard";
  const dashboardGreeting = isAccountant ? "Finance Operations" : "Finance Overview";
  const employeeId = user?.employee_id || user?.employeeId || user?.id || null;
  const designation = user?.designation || user?.role || null;

  /* ── UI state ─────────────────────────────────────────── */
  const [time, setTime]     = useState(new Date());
  const [animIn, setAnimIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  /* ── Data state ───────────────────────────────────────── */
  const [stats,              setStats]              = useState({});
  const [monthlyTrend,       setMonthlyTrend]       = useState([]);
  const [expenseCategories,  setExpenseCategories]  = useState([]);
  const [projectBudgets,     setProjectBudgets]     = useState([]);
  const [recentInvoices,     setRecentInvoices]     = useState([]);
  const [receivablesPayables, setReceivablesPayables] = useState({
    receivables: [], payables: [], totalReceivables: 0, totalPayables: 0,
  });

  /* ── Clock + animation ────────────────────────────────── */
  useEffect(() => {
    const af = requestAnimationFrame(() => setAnimIn(true));
    const cl = setInterval(() => setTime(new Date()), 60000);
    return () => { cancelAnimationFrame(af); clearInterval(cl); };
  }, []);

  /* ── Load data ────────────────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, costRes, invRes, rpRes] = await Promise.all([
        financeService.getDashboard(),
        financeService.getCostReport(),
        financeService.getAllInvoices(),
        financeService.getReceivablesPayables(),
      ]);

      /* Dashboard */
      const dash      = getObject(getApiPayload(dashRes));
      const dashStats = getObject(dash.stats || dash.metrics || dash.summary);
      setStats(dashStats);

      const trend = dash.monthlyTrend || dash.monthly_trend || dash.monthly || dash.trend || [];
      setMonthlyTrend(getArray(trend).map((item, i) => ({
        month:    item.month || item.label || item.period || `Month ${i + 1}`,
        revenue:  toNumber(item.revenue) || toNumber(item.totalRevenue) || toNumber(item.income) || 0,
        expenses: toNumber(item.expenses) || toNumber(item.totalExpenses) || toNumber(item.cost) || 0,
      })));

      /* Cost report */
      const cost = getObject(getApiPayload(costRes));
      setExpenseCategories(getArray(
        cost.byExpenseCategory || cost.by_expense_category ||
        cost.expenseCategories || cost.expense_categories || cost.categories || [],
      ));

      setProjectBudgets(getArray(
        cost.projectTotals || cost.project_totals ||
        cost.projectBudgets || cost.project_budgets || cost.projects || [],
      ).map((p, i) => ({
        id:        p.id || p.project_id || p.projectId || i,
        name:      p.name || p.project_name || p.projectName || p.project || "Unnamed Project",
        allocated: toNumber(p.allocated) || toNumber(p.budget) || toNumber(p.total_budget) || toNumber(p.totalBudget) || 0,
        spent:     toNumber(p.spent) || toNumber(p.expenses) || toNumber(p.total_spent) || toNumber(p.totalSpent) || 0,
      })));

      /* Invoices */
      const invPayload = getApiPayload(invRes);
      const invData    = Array.isArray(invPayload)
        ? invPayload
        : invPayload.invoices || invPayload.rows || invPayload.items || [];
      setRecentInvoices(getArray(invData).slice(0, 5));

      /* Receivables & payables */
      const rp   = getObject(getApiPayload(rpRes));
      const receivables = getArray(
        rp.receivables || rp.accountsReceivable || rp.accounts_receivable ||
        rp.receivable || rp.receivableInvoices || rp.receivable_invoices,
      );
      const payables = getArray(
        rp.payables || rp.accountsPayable || rp.accounts_payable ||
        rp.payable || rp.payableInvoices || rp.payable_invoices,
      );

      const calcRec = receivables.reduce((s, i) => s + getAmount(i), 0);
      const calcPay = payables.reduce((s, i) => s + getAmount(i), 0);

      const backRec = toNumber(rp.totalReceivables) || toNumber(rp.total_receivables) ||
                      toNumber(rp.receivableTotal)  || toNumber(rp.receivable_total) || 0;
      const backPay = toNumber(rp.totalPayables) || toNumber(rp.total_payables) ||
                      toNumber(rp.payableTotal)  || toNumber(rp.payable_total) || 0;

      setReceivablesPayables({
        receivables,
        payables,
        totalReceivables: calcRec > 0 ? calcRec : backRec,
        totalPayables:    calcPay > 0 ? calcPay : backPay,
      });
    } catch (err) {
      console.error("Failed to load finance dashboard:", err);
      setError(err?.response?.data?.message || err?.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  /* ── KPI derivations ──────────────────────────────────── */
  const totalRevenue  = toNumber(stats?.totalRevenue)  || toNumber(stats?.total_revenue)  || toNumber(stats?.revenue)  || 0;
  const totalExpenses = toNumber(stats?.totalExpenses) || toNumber(stats?.total_expenses) || toNumber(stats?.expenses) || 0;
  const netProfit     = toNumber(stats?.netProfit)     || toNumber(stats?.net_profit)     || toNumber(stats?.profit)   || totalRevenue - totalExpenses;
  const pendingInvoices = stats?.pendingInvoices ?? stats?.pending_invoices ?? stats?.pendingInvoiceCount ?? stats?.pending_invoice_count ?? 0;
  const pendingAmount   = toNumber(stats?.pendingAmount) || toNumber(stats?.pending_amount) || 0;
  const profitPercentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const donutSegments = useMemo(() => buildDonutSegments(expenseCategories), [expenseCategories]);

  const maxChartValue = useMemo(() => {
    const vals = monthlyTrend.flatMap((i) => [i.revenue, i.expenses]);
    return Math.max(...vals, 1);
  }, [monthlyTrend]);

  /* ── CSV export ───────────────────────────────────────── */
  const handleExport = () => {
    const esc = (v) => {
      const t = String(v ?? "");
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const row = (vals) => vals.map(esc).join(",") + "\n";
    let csv = "";
    csv += row([`${dashboardTitle} Export`]);
    csv += row([`Generated on ${new Date().toLocaleString("en-IN")}`]);
    csv += "\n";
    csv += row(["Summary"]);
    csv += row(["Total Revenue", totalRevenue]);
    csv += row(["Total Expenses", totalExpenses]);
    csv += row(["Net Profit", netProfit]);
    csv += row(["Profit Margin %", profitPercentage]);
    csv += row(["Pending Invoices", pendingInvoices]);
    csv += row(["Pending Amount", pendingAmount]);
    csv += row(["Total Receivables", receivablesPayables.totalReceivables]);
    csv += row(["Total Payables", receivablesPayables.totalPayables]);
    csv += "\n";
    csv += row(["Monthly Revenue vs Expenses"]);
    csv += row(["Month", "Revenue", "Expenses"]);
    monthlyTrend.forEach((i) => { csv += row([i.month, i.revenue, i.expenses]); });
    csv += "\n";
    csv += row(["Expense Breakdown"]);
    csv += row(["Category", "Amount", "Percentage"]);
    donutSegments.forEach((i) => { csv += row([i.name, i.amount, `${i.pct.toFixed(1)}%`]); });
    csv += "\n";
    csv += row(["Project Budget Utilization"]);
    csv += row(["Project", "Allocated", "Spent"]);
    projectBudgets.forEach((p) => { csv += row([p.name, p.allocated, p.spent]); });
    csv += "\n";
    csv += row(["Receivables"]);
    csv += row(["Client", "Invoice", "Amount", "Due Date"]);
    receivablesPayables.receivables.forEach((i) => {
      csv += row([getClientName(i), getInvoiceNumber(i), getAmount(i), formatDate(getDueDate(i))]);
    });
    csv += "\n";
    csv += row(["Payables"]);
    csv += row(["Vendor", "Reference", "Amount", "Due Date"]);
    receivablesPayables.payables.forEach((i) => {
      csv += row([getVendorName(i), getInvoiceNumber(i), getAmount(i), formatDate(getDueDate(i))]);
    });
    csv += "\n";
    csv += row(["Recent Invoices"]);
    csv += row(["Invoice ID", "Client", "Project", "Amount", "Due Date", "Status"]);
    recentInvoices.forEach((inv) => {
      const status = inv.effectiveStatus || inv.status || inv.invoice_status || "";
      csv += row([getInvoiceNumber(inv), getClientName(inv), getProjectName(inv), getAmount(inv), formatDate(getDueDate(inv)), normalizeStatus(status)]);
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = isAccountant
      ? `accountant-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`
      : `finance-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ── Loading / error states ───────────────────────────── */
  if (loading) {
    return (
      <div className="fm-root fm-animate-in">
        <div className="fm-state">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fm-root fm-animate-in">
        <div className="fm-state fm-state--error">
          <p>{error}</p>
          <button type="button" className="fm-retry-btn" onClick={loadDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className={`fm-root ${animIn ? "fm-animate-in" : ""}`}>

      {/* ── HEADER ── */}
      <header className="fm-header">
        <div className="fm-header-left">
          <p className="fm-greeting">{dashboardGreeting}</p>
          <h1 className="fm-title">{dashboardTitle}</h1>
        </div>
        <div className="fm-header-right">
          <div className="fm-date-pill">
            <span>📅</span>
            <span>
              {time.toLocaleDateString("en-IN", {
                weekday: "short", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>
          {employeeId && <CheckInButton employeeId={employeeId} designation={designation} />}
          <button type="button" className="fm-export-btn" onClick={handleExport}>
            ↓ Export Report
          </button>
        </div>
      </header>

      {/* ── KPI CARDS ── */}
      <section className="fm-kpis">
        <div className="fm-kpi fm-kpi--revenue">
          <div className="fm-kpi-icon">💹</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Revenue</p>
            <h2 className="fm-kpi-value">{formatCurrency(totalRevenue)}</h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--expense">
          <div className="fm-kpi-icon">📉</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Expenses</p>
            <h2 className="fm-kpi-value">{formatCurrency(totalExpenses)}</h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--profit">
          <div className="fm-kpi-icon">🏦</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Net Profit</p>
            <h2 className="fm-kpi-value">{formatCurrency(netProfit)}</h2>
            <p className="fm-kpi-sub fm-accent-text">Margin {profitPercentage}%</p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--pending">
          <div className="fm-kpi-icon">⏳</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Pending Invoices</p>
            <h2 className="fm-kpi-value">{pendingInvoices}</h2>
            <p className="fm-kpi-sub fm-warn">≈ {formatCurrency(pendingAmount)} due</p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--receivable">
          <div className="fm-kpi-icon">💰</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Receivables</p>
            <h2 className="fm-kpi-value">{formatCurrency(receivablesPayables.totalReceivables)}</h2>
            <p className="fm-kpi-sub fm-up">Amount to receive</p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--payable">
          <div className="fm-kpi-icon">💸</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Payables</p>
            <h2 className="fm-kpi-value">{formatCurrency(receivablesPayables.totalPayables)}</h2>
            <p className="fm-kpi-sub fm-warn">Amount to pay</p>
          </div>
        </div>
      </section>

      {/* ── CHARTS ── */}
      <section className="fm-charts-row">

        {/* Bar chart */}
        <div className="fm-card fm-chart-card">
          <div className="fm-card-header">
            <h3>Monthly Revenue vs Expenses</h3>
          </div>
          {monthlyTrend.length === 0 ? (
            <p className="fm-empty-text">No monthly data yet.</p>
          ) : (<>
            <div className="fm-bar-chart">
              {monthlyTrend.map((item, i) => (
                <div className="fm-bar-group" key={`${item.month}-${i}`}>
                  <div className="fm-bars">
                    <div
                      className="fm-bar fm-bar--rev"
                      style={{ "--h": `${(item.revenue / maxChartValue) * 100}%` }}
                      title={`Revenue: ${formatCurrency(item.revenue)}`}
                    />
                    <div
                      className="fm-bar fm-bar--exp"
                      style={{ "--h": `${(item.expenses / maxChartValue) * 100}%` }}
                      title={`Expenses: ${formatCurrency(item.expenses)}`}
                    />
                  </div>
                  <span className="fm-bar-label">{item.month}</span>
                </div>
              ))}
            </div>
            <div className="fm-chart-legend">
              <span><i className="fm-dot fm-dot--rev" /> Revenue</span>
              <span><i className="fm-dot fm-dot--exp" /> Expenses</span>
            </div>
          </>)}
        </div>

        {/* Donut chart */}
        <div className="fm-card fm-donut-card">
          <div className="fm-card-header">
            <h3>Expense Breakdown</h3>
          </div>
          {donutSegments.length === 0 ? (
            <p className="fm-empty-text">No expenses recorded yet.</p>
          ) : (<>
            <div className="fm-donut-container">
              <svg viewBox="0 0 140 140" className="fm-donut-svg">
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.name}
                    cx="70" cy="70"
                    r={seg.radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="22"
                    strokeDasharray={`${seg.dashLength} ${seg.circumference - seg.dashLength}`}
                    strokeDashoffset={-seg.offset}
                    transform="rotate(-90 70 70)"
                    className="fm-donut-seg"
                  />
                ))}
                <text x="70" y="65" textAnchor="middle" className="fm-donut-center-val">
                  {formatCurrency(totalExpenses)}
                </text>
                <text x="70" y="82" textAnchor="middle" className="fm-donut-center-label">
                  Total Spend
                </text>
              </svg>
            </div>
            <ul className="fm-expense-list">
              {donutSegments.map((cat) => (
                <li key={cat.name} className="fm-expense-item">
                  <span className="fm-expense-dot" style={{ background: cat.color }} />
                  <span className="fm-expense-name">{cat.name}</span>
                  <div className="fm-expense-bar-wrap">
                    <div className="fm-expense-bar-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                  </div>
                  <span className="fm-expense-pct">{cat.pct.toFixed(0)}%</span>
                  <span className="fm-expense-amt">{formatCurrency(cat.amount)}</span>
                </li>
              ))}
            </ul>
          </>)}
        </div>
      </section>

      {/* ── BUDGET UTILIZATION — grid card layout ── */}
      <section className="fm-card fm-budget-card">
        <div className="fm-card-header">
          <h3>Budget Utilization — Active Projects</h3>
          <span className="fm-badge">{projectBudgets.length} projects</span>
        </div>

        {projectBudgets.length === 0 ? (
          <p className="fm-empty-text">No project budgets set up yet.</p>
        ) : (
          <div className="fm-budget-grid">
            {projectBudgets.map((project) => {
              const allocated  = toNumber(project.allocated);
              const spent      = toNumber(project.spent);
              const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
              const remaining  = allocated - spent;
              const color      = budgetColor(percentage);

              return (
                <div
                  className="fm-budget-item"
                  key={project.id}
                  style={{ "--fm-item-color": color }}
                >
                  <p className="fm-budget-item-name" title={project.name}>
                    {project.name}
                  </p>
                  <div className="fm-budget-item-amounts">
                    <span className="fm-budget-item-spent">{formatCurrency(spent)}</span>
                    <span className="fm-budget-item-allocated">of {formatCurrency(allocated)}</span>
                  </div>
                  <div className="fm-budget-item-track">
                    <div
                      className="fm-budget-item-fill"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="fm-budget-item-meta">
                    <span className="fm-budget-item-pct" style={{ color }}>
                      {percentage}% used
                    </span>
                    <span className="fm-budget-item-remaining">
                      {remaining >= 0 ? `${formatCurrency(remaining)} left` : "Over budget"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── RECEIVABLES & PAYABLES ── */}
      <section className="fm-card fm-receivables-card">
        <div className="fm-card-header">
          <h3>Receivables & Payables</h3>
          <span className="fm-badge">Finance Overview</span>
        </div>

        <div className="fm-rp-grid">
          <div className="fm-rp-box fm-rp-box--receivable">
            <div className="fm-rp-icon">💰</div>
            <div>
              <p className="fm-rp-label">Total Receivables</p>
              <h2 className="fm-rp-value">{formatCurrency(receivablesPayables.totalReceivables)}</h2>
              <p className="fm-rp-description">Money expected from clients</p>
            </div>
          </div>
          <div className="fm-rp-box fm-rp-box--payable">
            <div className="fm-rp-icon">💸</div>
            <div>
              <p className="fm-rp-label">Total Payables</p>
              <h2 className="fm-rp-value">{formatCurrency(receivablesPayables.totalPayables)}</h2>
              <p className="fm-rp-description">Money payable to vendors</p>
            </div>
          </div>
        </div>

        <div className="fm-rp-tables">
          {/* Receivables table */}
          <div className="fm-rp-table-section">
            <h4>Receivables</h4>
            {receivablesPayables.receivables.length === 0 ? (
              <p className="fm-empty-text">No receivables found.</p>
            ) : (
              <div className="fm-table-wrap">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Client</th><th>Invoice</th><th>Amount</th><th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivablesPayables.receivables.slice(0, 5).map((item, i) => (
                      <tr key={item.id || item.invoice_id || item.invoiceId || i} className="fm-table-row">
                        <td>{getClientName(item)}</td>
                        <td>{getInvoiceNumber(item)}</td>
                        <td className="fm-inv-amount">{formatCurrency(getAmount(item))}</td>
                        <td>{formatDate(getDueDate(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payables table */}
          <div className="fm-rp-table-section">
            <h4>Payables</h4>
            {receivablesPayables.payables.length === 0 ? (
              <p className="fm-empty-text">No payables found.</p>
            ) : (
              <div className="fm-table-wrap">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Vendor</th><th>Reference</th><th>Amount</th><th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivablesPayables.payables.slice(0, 5).map((item, i) => (
                      <tr key={item.id || item.payment_id || item.paymentId || i} className="fm-table-row">
                        <td>{getVendorName(item)}</td>
                        <td>{getInvoiceNumber(item)}</td>
                        <td className="fm-inv-amount">{formatCurrency(getAmount(item))}</td>
                        <td>{formatDate(getDueDate(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── RECENT INVOICES ── */}
      <section className="fm-card fm-invoice-card">
        <div className="fm-card-header">
          <h3>Recent Invoices</h3>
          <button type="button" className="fm-view-all" onClick={() => navigate(`${financeBasePath}/invoices`)}>
            View All →
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <p className="fm-empty-text">No invoices yet.</p>
        ) : (
          <div className="fm-table-wrap">
            <table className="fm-table">
              <thead>
                <tr>
                  <th>Invoice ID</th><th>Client</th><th>Project</th>
                  <th>Amount</th><th>Due Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv, i) => {
                  const status = inv.effectiveStatus || inv.status || inv.invoice_status || inv.invoiceStatus || "";
                  return (
                    <tr key={inv.id || inv.invoice_id || i} className="fm-table-row">
                      <td className="fm-inv-id">{getInvoiceNumber(inv)}</td>
                      <td>{getClientName(inv)}</td>
                      <td className="fm-inv-project">{getProjectName(inv)}</td>
                      <td className="fm-inv-amount">{formatCurrency(getAmount(inv))}</td>
                      <td>{formatDate(getDueDate(inv))}</td>
                      <td>
                        <span className={`fm-status fm-status--${getStatusClass(status)}`}>
                          {normalizeStatus(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── QUICK ACTIONS ── */}
      <section className="fm-quick-actions">
        <h3 className="fm-qa-title">
          {isAccountant ? "Accountant Actions" : "Quick Actions"}
        </h3>
        <div className="fm-qa-grid">
          {[
            { icon: "📄", label: "Create Invoice",  color: "#7BBDE8", path: `${financeBasePath}/invoices` },
            { icon: "💳", label: "Manage Budget",   color: "#4E8EA2", path: `${financeBasePath}/budget` },
            { icon: "💸", label: "Add Expense",     color: "#49769F", path: `${financeBasePath}/expenses` },
            { icon: "📊", label: "Cost Report",     color: "#6EA2B3", path: `${financeBasePath}/cost-analysis` },
            { icon: "💰", label: "Track Payment",   color: "#BDD8E9", path: `${financeBasePath}/payments` },
            ...(isAccountant
              ? [{ icon: "👥", label: "Manage Vendors", color: "#6EA2B3", path: `${financeBasePath}/vendors` }]
              : []),
          ].map((action) => (
            <button
              type="button"
              key={action.label}
              className="fm-qa-btn"
              style={{ "--accent": action.color }}
              onClick={() => navigate(action.path)}
            >
              <span className="fm-qa-icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}