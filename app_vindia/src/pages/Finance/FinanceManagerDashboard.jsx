import { useState, useEffect } from "react";
import "./FinanceManagerDashboard.css";

/* ── Static mock data ─────────────────────────────────────── */
const mockStats = {
  totalRevenue:    48750000,
  totalExpenses:   31200000,
  netProfit:       17550000,
  pendingInvoices: 12,
  pendingAmount:    6840000,
};

const mockMonthlyData = [
  { month: "Jul", revenue: 3200000, expenses: 2100000 },
  { month: "Aug", revenue: 3800000, expenses: 2400000 },
  { month: "Sep", revenue: 3500000, expenses: 2200000 },
  { month: "Oct", revenue: 4200000, expenses: 2800000 },
  { month: "Nov", revenue: 4600000, expenses: 3000000 },
  { month: "Dec", revenue: 5100000, expenses: 3400000 },
  { month: "Jan", revenue: 4800000, expenses: 3100000 },
  { month: "Feb", revenue: 5200000, expenses: 3300000 },
  { month: "Mar", revenue: 4900000, expenses: 3150000 },
  { month: "Apr", revenue: 5400000, expenses: 3500000 },
  { month: "May", revenue: 4750000, expenses: 3250000 },
];

const mockExpenseCategories = [
  { name: "Materials", amount: 14200000, color: "#7BBDE8", pct: 45 },
  { name: "Labour",    amount:  8800000, color: "#4E8EA2", pct: 28 },
  { name: "Equipment", amount:  4700000, color: "#49769F", pct: 15 },
  { name: "Overheads", amount:  2500000, color: "#0A4174", pct:  8 },
  { name: "Misc",      amount:  1000000, color: "#6EA2B3", pct:  4 },
];

const mockInvoices = [
  { id: "INV-2024-0041", client: "Skyline Infra Pvt Ltd",   amount: 1250000, status: "pending", dueDate: "2024-05-20", project: "Tower B Construction"  },
  { id: "INV-2024-0040", client: "Green Valley Developers", amount:  980000, status: "paid",    dueDate: "2024-05-10", project: "Villa Complex Phase 2" },
  { id: "INV-2024-0039", client: "Metro Constructions",     amount: 2100000, status: "overdue", dueDate: "2024-05-01", project: "Commercial Hub"         },
  { id: "INV-2024-0038", client: "Horizon Realty",          amount:  650000, status: "paid",    dueDate: "2024-04-28", project: "Residential Block A"    },
  { id: "INV-2024-0037", client: "BuildRight Corp",         amount: 1750000, status: "pending", dueDate: "2024-05-25", project: "Highway Bridge"         },
];

const mockProjects = [
  { name: "Tower B Construction",  allocated: 18000000, spent: 13500000 },
  { name: "Villa Complex Phase 2", allocated:  9500000, spent:  7200000 },
  { name: "Commercial Hub",        allocated: 22000000, spent: 20800000 },
  { name: "Residential Block A",   allocated:  6000000, spent:  2900000 },
  { name: "Highway Bridge",        allocated: 31000000, spent: 19500000 },
];

/* ── Helpers ──────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${n.toLocaleString("en-IN")}`;

const maxRevenue = Math.max(...mockMonthlyData.map((d) => d.revenue));

/* ── Pre-compute donut segments outside component
   (pure function – no mutation inside JSX map) ────────────── */
const buildDonutSegments = () => {
  const r    = 50;
  const circ = 2 * Math.PI * r;
  let acc    = 0;
  return mockExpenseCategories.map((cat) => {
    const dash = (cat.pct / 100) * circ;
    const seg  = { ...cat, r, circ, dash, offset: acc };
    acc += dash;
    return seg;
  });
};
const donutSegments = buildDonutSegments();

/* ════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════ */
export default function FinanceManagerDashboard() {
  const [time,   setTime]   = useState(new Date());
  const [animIn, setAnimIn] = useState(false);

  /*
   * ✅ ESLint fix: "Calling setState synchronously within useEffect"
   * Wrap setAnimIn inside requestAnimationFrame so it fires
   * after the browser's paint cycle, not synchronously.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimIn(true));
    const tick  = setInterval(() => setTime(new Date()), 60000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
    };
  }, []);

  const profitPct = ((mockStats.netProfit / mockStats.totalRevenue) * 100).toFixed(1);

  return (
    <div className={`fm-root ${animIn ? "fm-animate-in" : ""}`}>

      {/* ── Header ──────────────────────────────────────── */}
      <header className="fm-header">
        <div className="fm-header-left">
          <p className="fm-greeting">Finance Overview</p>
          <h1 className="fm-title">Manager Dashboard</h1>
        </div>
        <div className="fm-header-right">
          <div className="fm-date-pill">
            <span>📅</span>
            <span>
              {time.toLocaleDateString("en-IN", {
                weekday: "short", day: "numeric",
                month: "long",   year: "numeric",
              })}
            </span>
          </div>
          <button className="fm-export-btn">↓ Export Report</button>
        </div>
      </header>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <section className="fm-kpis">
        <div className="fm-kpi fm-kpi--revenue">
          <div className="fm-kpi-icon">💹</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Revenue</p>
            <h2 className="fm-kpi-value">{fmt(mockStats.totalRevenue)}</h2>
            <p className="fm-kpi-sub fm-up">↑ 12.4% vs last quarter</p>
          </div>
          <div className="fm-kpi-bar" style={{ "--pct": "78%" }} />
        </div>

        <div className="fm-kpi fm-kpi--expense">
          <div className="fm-kpi-icon">📉</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Expenses</p>
            <h2 className="fm-kpi-value">{fmt(mockStats.totalExpenses)}</h2>
            <p className="fm-kpi-sub fm-down">↑ 8.1% vs last quarter</p>
          </div>
          <div className="fm-kpi-bar" style={{ "--pct": "64%" }} />
        </div>

        <div className="fm-kpi fm-kpi--profit">
          <div className="fm-kpi-icon">🏦</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Net Profit</p>
            <h2 className="fm-kpi-value">{fmt(mockStats.netProfit)}</h2>
            <p className="fm-kpi-sub fm-accent-text">↑ Margin {profitPct}%</p>
          </div>
          <div className="fm-kpi-bar" style={{ "--pct": `${profitPct}%` }} />
        </div>

        <div className="fm-kpi fm-kpi--pending">
          <div className="fm-kpi-icon">⏳</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Pending Invoices</p>
            <h2 className="fm-kpi-value">{mockStats.pendingInvoices}</h2>
            <p className="fm-kpi-sub fm-warn">≈ {fmt(mockStats.pendingAmount)} due</p>
          </div>
          <div className="fm-kpi-bar" style={{ "--pct": "40%" }} />
        </div>
      </section>

      {/* ── Charts Row ──────────────────────────────────── */}
      <section className="fm-charts-row">

        {/* Bar Chart */}
        <div className="fm-card fm-chart-card">
          <div className="fm-card-header">
            <h3>Monthly Revenue vs Expenses</h3>
            <span className="fm-badge">FY 2023-24</span>
          </div>
          <div className="fm-bar-chart">
            {mockMonthlyData.map((d) => (
              <div className="fm-bar-group" key={d.month}>
                <div className="fm-bars">
                  <div
                    className="fm-bar fm-bar--rev"
                    style={{ "--h": `${(d.revenue / maxRevenue) * 100}%` }}
                    title={`Revenue: ${fmt(d.revenue)}`}
                  />
                  <div
                    className="fm-bar fm-bar--exp"
                    style={{ "--h": `${(d.expenses / maxRevenue) * 100}%` }}
                    title={`Expenses: ${fmt(d.expenses)}`}
                  />
                </div>
                <span className="fm-bar-label">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="fm-chart-legend">
            <span><i className="fm-dot fm-dot--rev" /> Revenue</span>
            <span><i className="fm-dot fm-dot--exp" /> Expenses</span>
          </div>
        </div>

        {/* Donut Chart — segments pre-computed, pure map */}
        <div className="fm-card fm-donut-card">
          <div className="fm-card-header">
            <h3>Expense Breakdown</h3>
            <span className="fm-badge">This FY</span>
          </div>
          <div className="fm-donut-container">
            <svg viewBox="0 0 140 140" className="fm-donut-svg">
              {donutSegments.map((seg) => (
                <circle
                  key={seg.name}
                  cx="70" cy="70" r={seg.r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="22"
                  strokeDasharray={`${seg.dash} ${seg.circ - seg.dash}`}
                  strokeDashoffset={-seg.offset}
                  transform="rotate(-90 70 70)"
                  className="fm-donut-seg"
                />
              ))}
              <text x="70" y="65" textAnchor="middle" className="fm-donut-center-val">
                {fmt(mockStats.totalExpenses)}
              </text>
              <text x="70" y="82" textAnchor="middle" className="fm-donut-center-label">
                Total Spend
              </text>
            </svg>
          </div>
          <ul className="fm-expense-list">
            {mockExpenseCategories.map((cat) => (
              <li key={cat.name} className="fm-expense-item">
                <span className="fm-expense-dot" style={{ background: cat.color }} />
                <span className="fm-expense-name">{cat.name}</span>
                <div className="fm-expense-bar-wrap">
                  <div
                    className="fm-expense-bar-fill"
                    style={{ width: `${cat.pct}%`, background: cat.color }}
                  />
                </div>
                <span className="fm-expense-pct">{cat.pct}%</span>
                <span className="fm-expense-amt">{fmt(cat.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Budget Utilization ───────────────────────────── */}
      <section className="fm-card fm-budget-card">
        <div className="fm-card-header">
          <h3>Budget Utilization — Active Projects</h3>
          <span className="fm-badge fm-badge--warn">3 approaching limit</span>
        </div>
        <div className="fm-budget-list">
          {mockProjects.map((p) => {
            const pct = Math.round((p.spent / p.allocated) * 100);
            const cls = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok";
            return (
              <div className="fm-budget-row" key={p.name}>
                <div className="fm-budget-meta">
                  <span className="fm-budget-name">{p.name}</span>
                  <span className="fm-budget-nums">
                    {fmt(p.spent)} / {fmt(p.allocated)}
                  </span>
                </div>
                <div className="fm-progress-track">
                  <div
                    className={`fm-progress-fill fm-progress--${cls}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`fm-budget-pct fm-pct--${cls}`}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recent Invoices ──────────────────────────────── */}
      <section className="fm-card fm-invoice-card">
        <div className="fm-card-header">
          <h3>Recent Invoices</h3>
          <a href="/finance-manager/invoices" className="fm-view-all">View All →</a>
        </div>
        <div className="fm-table-wrap">
          <table className="fm-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Client</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="fm-table-row">
                  <td className="fm-inv-id">{inv.id}</td>
                  <td>{inv.client}</td>
                  <td className="fm-inv-project">{inv.project}</td>
                  <td className="fm-inv-amount">{fmt(inv.amount)}</td>
                  <td>{inv.dueDate}</td>
                  <td>
                    <span className={`fm-status fm-status--${inv.status}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Quick Actions ────────────────────────────────── */}
      <section className="fm-quick-actions">
        <h3 className="fm-qa-title">Quick Actions</h3>
        <div className="fm-qa-grid">
          {[
            { icon: "📄", label: "Create Invoice", color: "#7BBDE8" },
            { icon: "💳", label: "Plan Budget",    color: "#4E8EA2" },
            { icon: "💸", label: "Add Expense",    color: "#49769F" },
            { icon: "📊", label: "Cost Report",    color: "#6EA2B3" },
            { icon: "💰", label: "Track Payment",  color: "#BDD8E9" },
            { icon: "📥", label: "Export Data",    color: "#7BBDE8" },
          ].map((a) => (
            <button
              key={a.label}
              className="fm-qa-btn"
              style={{ "--accent": a.color }}
            >
              <span className="fm-qa-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}