import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import financeService from "../../services/financeService";
import "./FinanceManagerDashboard.css";

/* ── Helpers ──────────────────────────────────────────────── */
const fmt = (n) => {
  const num = Number(n) || 0;
  return num >= 10000000
    ? `₹${(num / 10000000).toFixed(2)}Cr`
    : num >= 100000
    ? `₹${(num / 100000).toFixed(1)}L`
    : `₹${num.toLocaleString("en-IN")}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Palette cycled across however many expense categories the DB returns
const DONUT_COLORS = ["#7BBDE8", "#4E8EA2", "#49769F", "#0A4174", "#6EA2B3", "#BDD8E9"];

const buildDonutSegments = (categories) => {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const total = categories.reduce((sum, c) => sum + Number(c.total), 0);
  let acc = 0;
  return categories.map((cat, i) => {
    const pct = total > 0 ? (Number(cat.total) / total) * 100 : 0;
    const dash = (pct / 100) * circ;
    const seg = {
      name: cat.category,
      amount: Number(cat.total),
      pct,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      r, circ, dash, offset: acc,
    };
    acc += dash;
    return seg;
  });
};

/* ── Check In / Out (daily attendance, backed by /api/attendance) ── */
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTodayAttendance();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("");
    }
  }, [attendance]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/attendance/today?employee_id=${employeeId}`
      );
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const dateStr = now.toISOString().slice(0, 10);
      const res = await axios.post("http://localhost:5000/api/attendance", {
        employee_id: employeeId,
        date: dateStr,
        check_in: timeStr,
        shift: "morning",
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      alert("Check-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const res = await axios.put(
        `http://localhost:5000/api/attendance/${attendance.id}`,
        { check_out: timeStr }
      );
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert("Check-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isCheckedIn = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  if (loading) {
    return (
      <button disabled className="fm-checkin-btn fm-checkin-loading">
        <span className="fm-checkin-dot" /> Loading…
      </button>
    );
  }

  if (isCheckedOut) {
    return (
      <div className="fm-checkin-wrap">
        <button disabled className="fm-checkin-btn fm-checkin-done">
          <span className="fm-checkin-dot fm-checkin-dot-green" /> ✓ Done for Today
        </button>
        <span className="fm-checkin-sub">
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="fm-checkin-wrap">
        <button onClick={handleCheckOut} disabled={busy} className="fm-checkin-btn fm-checkin-out">
          <span className="fm-checkin-dot fm-checkin-dot-pulse" />
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span className="fm-checkin-sub">
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong className="fm-checkin-elapsed">{elapsed}</strong></>}
        </span>
      </div>
    );
  }

  return (
    <button onClick={handleCheckIn} disabled={busy} className="fm-checkin-btn fm-checkin-in">
      <span className="fm-checkin-dot" />
      {busy ? "Saving…" : "Check In"}
    </button>
  );
};

/* ════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════ */
export default function FinanceManagerDashboard() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [time, setTime] = useState(new Date());
  const [animIn, setAnimIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimIn(true));
    const tick = setInterval(() => setTime(new Date()), 60000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, costReportRes, invoicesRes] = await Promise.all([
        financeService.getDashboard(),
        financeService.getCostReport(),
        financeService.getAllInvoices(),
      ]);

      const dashboardData = dashboardRes.data.data;
      const costReportData = costReportRes.data.data;
      const invoicesData = invoicesRes.data.data || [];

      setStats(dashboardData.stats);
      setMonthlyTrend(
        (dashboardData.monthlyTrend || []).map((m) => ({
          month: m.month,
          revenue: Number(m.revenue),
          expenses: Number(m.expenses),
        }))
      );
      setExpenseCategories(costReportData.byExpenseCategory || []);
      setProjectBudgets(costReportData.projectTotals || []);
      setRecentInvoices(invoicesData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load finance dashboard:", err);
      setError(
        err?.response?.data?.message ||
          "Couldn't load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleExport = () => {
    if (!stats) return;

    // Escape a value for safe CSV placement
    const esc = (val) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (cells) => cells.map(esc).join(",") + "\n";

    let csv = "";

    csv += row(["Finance Manager Dashboard Export"]);
    csv += row([`Generated on ${new Date().toLocaleString("en-IN")}`]);
    csv += "\n";

    csv += row(["Summary"]);
    csv += row(["Total Revenue", totalRevenue]);
    csv += row(["Total Expenses", totalExpenses]);
    csv += row(["Net Profit", netProfit]);
    csv += row(["Profit Margin %", profitPct]);
    csv += row(["Pending Invoices", pendingInvoices]);
    csv += row(["Pending Amount", pendingAmount]);
    csv += "\n";

    csv += row(["Monthly Revenue vs Expenses"]);
    csv += row(["Month", "Revenue", "Expenses"]);
    monthlyTrend.forEach((m) => csv += row([m.month, m.revenue, m.expenses]));
    csv += "\n";

    csv += row(["Expense Breakdown"]);
    csv += row(["Category", "Amount", "Percent"]);
    donutSegments.forEach((c) => csv += row([c.name, c.amount, `${c.pct.toFixed(1)}%`]));
    csv += "\n";

    csv += row(["Budget Utilization"]);
    csv += row(["Project", "Allocated", "Spent"]);
    projectBudgets.forEach((p) => csv += row([p.name, p.allocated, p.spent]));
    csv += "\n";

    csv += row(["Recent Invoices"]);
    csv += row(["Invoice ID", "Client", "Project", "Amount", "Due Date", "Status"]);
    recentInvoices.forEach((inv) =>
      csv += row([
        inv.invoice_number,
        inv.client_name,
        inv.project_name,
        inv.amount,
        fmtDate(inv.due_date),
        inv.effectiveStatus || inv.status,
      ])
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `finance-dashboard-report-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ── Loading / Error states ──────────────────────────── */
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
          <button className="fm-retry-btn" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = Number(stats?.totalRevenue) || 0;
  const totalExpenses = Number(stats?.totalExpenses) || 0;
  const netProfit = Number(stats?.netProfit) || 0;
  const pendingInvoices = stats?.pendingInvoices ?? 0;
  const pendingAmount = Number(stats?.pendingAmount) || 0;
  const profitPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const maxRevenue =
    monthlyTrend.length > 0
      ? Math.max(...monthlyTrend.map((d) => d.revenue), 1)
      : 1;

  const donutSegments = buildDonutSegments(expenseCategories);

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
                month: "long", year: "numeric",
              })}
            </span>
          </div>
          {user?.id && <CheckInButton employeeId={user.id} />}
          <button className="fm-export-btn" onClick={handleExport}>↓ Export Report</button>
        </div>
      </header>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <section className="fm-kpis">
        <div className="fm-kpi fm-kpi--revenue">
          <div className="fm-kpi-icon">💹</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Revenue</p>
            <h2 className="fm-kpi-value">{fmt(totalRevenue)}</h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--expense">
          <div className="fm-kpi-icon">📉</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Total Expenses</p>
            <h2 className="fm-kpi-value">{fmt(totalExpenses)}</h2>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--profit">
          <div className="fm-kpi-icon">🏦</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Net Profit</p>
            <h2 className="fm-kpi-value">{fmt(netProfit)}</h2>
            <p className="fm-kpi-sub fm-accent-text">Margin {profitPct}%</p>
          </div>
        </div>

        <div className="fm-kpi fm-kpi--pending">
          <div className="fm-kpi-icon">⏳</div>
          <div className="fm-kpi-body">
            <p className="fm-kpi-label">Pending Invoices</p>
            <h2 className="fm-kpi-value">{pendingInvoices}</h2>
            <p className="fm-kpi-sub fm-warn">≈ {fmt(pendingAmount)} due</p>
          </div>
        </div>
      </section>

      {/* ── Charts Row ──────────────────────────────────── */}
      <section className="fm-charts-row">

        {/* Bar Chart */}
        <div className="fm-card fm-chart-card">
          <div className="fm-card-header">
            <h3>Monthly Revenue vs Expenses</h3>
          </div>
          {monthlyTrend.length === 0 ? (
            <p className="fm-empty-text">
              No monthly data yet.
            </p>
          ) : (
            <>
              <div className="fm-bar-chart">
                {monthlyTrend.map((d) => (
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
            </>
          )}
        </div>

        {/* Donut Chart */}
        <div className="fm-card fm-donut-card">
          <div className="fm-card-header">
            <h3>Expense Breakdown</h3>
          </div>
          {donutSegments.length === 0 ? (
            <p className="fm-empty-text">
              No expenses recorded yet.
            </p>
          ) : (
            <>
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
                    {fmt(totalExpenses)}
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
                      <div
                        className="fm-expense-bar-fill"
                        style={{ width: `${cat.pct}%`, background: cat.color }}
                      />
                    </div>
                    <span className="fm-expense-pct">{cat.pct.toFixed(0)}%</span>
                    <span className="fm-expense-amt">{fmt(cat.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* ── Budget Utilization ───────────────────────────── */}
      <section className="fm-card fm-budget-card">
        <div className="fm-card-header">
          <h3>Budget Utilization — Active Projects</h3>
        </div>
        {projectBudgets.length === 0 ? (
          <p className="fm-empty-text">
            No project budgets set up yet.
          </p>
        ) : (
          <div className="fm-budget-list">
            {projectBudgets.map((p) => {
              const allocated = Number(p.allocated) || 0;
              const spent = Number(p.spent) || 0;
              const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
              const cls = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok";
              return (
                <div className="fm-budget-row" key={p.id}>
                  <div className="fm-budget-meta">
                    <span className="fm-budget-name">{p.name}</span>
                    <span className="fm-budget-nums">
                      {fmt(spent)} / {fmt(allocated)}
                    </span>
                  </div>
                  <div className="fm-progress-track">
                    <div
                      className={`fm-progress-fill fm-progress--${cls}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`fm-budget-pct fm-pct--${cls}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Invoices ──────────────────────────────── */}
      <section className="fm-card fm-invoice-card">
        <div className="fm-card-header">
          <h3>Recent Invoices</h3>
          <a href="/finance-manager/invoices" className="fm-view-all">View All →</a>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="fm-empty-text">
            No invoices yet.
          </p>
        ) : (
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
                {recentInvoices.map((inv) => {
                  const status = inv.effectiveStatus || inv.status;
                  return (
                    <tr key={inv.id} className="fm-table-row">
                      <td className="fm-inv-id">{inv.invoice_number}</td>
                      <td>{inv.client_name || "—"}</td>
                      <td className="fm-inv-project">{inv.project_name || "—"}</td>
                      <td className="fm-inv-amount">{fmt(inv.amount)}</td>
                      <td>{fmtDate(inv.due_date)}</td>
                      <td>
                        <span className={`fm-status fm-status--${status}`}>
                          {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
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

      {/* ── Quick Actions ────────────────────────────────── */}
      <section className="fm-quick-actions">
        <h3 className="fm-qa-title">Quick Actions</h3>
        <div className="fm-qa-grid">
          {[
            { icon: "📄", label: "Create Invoice", color: "#7BBDE8", path: "/finance-manager/invoices" },
            { icon: "💳", label: "Plan Budget", color: "#4E8EA2", path: "/finance-manager/budget" },
            { icon: "💸", label: "Add Expense", color: "#49769F", path: "/finance-manager/expenses" },
            { icon: "📊", label: "Cost Report", color: "#6EA2B3", path: "/finance-manager/cost-analysis" },
            { icon: "💰", label: "Track Payment", color: "#BDD8E9", path: "/finance-manager/payments" },
          ].map((a) => (
            <button
              key={a.label}
              className="fm-qa-btn"
              style={{ "--accent": a.color }}
              onClick={() => navigate(a.path)}
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