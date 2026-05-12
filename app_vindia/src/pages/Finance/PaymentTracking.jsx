import { useState, useEffect } from "react";
import "./PaymentTracking.css";

/* ── Mock Data ─────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  { id: 1, type: "Bank Transfer", provider: "HDFC Bank", accountLast4: "1234", balance: 450000, status: "Active" },
  { id: 2, type: "Credit Card", provider: "ICICI Bank", cardLast4: "5678", balance: 200000, status: "Active" },
  { id: 3, type: "Digital Wallet", provider: "Google Pay", accountLast4: "9876", balance: 75000, status: "Active" },
  { id: 4, type: "Cheque", provider: "Axis Bank", accountLast4: "4321", balance: 0, status: "Inactive" },
];

const PAYMENT_HISTORY = [
  { id: 1, date: "2024-12-15", vendor: "Cement Suppliers Ltd", amount: 2500000, method: "Bank Transfer", status: "Completed", invoice: "INV-2024-001", category: "Materials" },
  { id: 2, date: "2024-12-10", vendor: "Labour Contractor A", amount: 1200000, method: "Bank Transfer", status: "Completed", invoice: "INV-2024-002", category: "Labour" },
  { id: 3, date: "2024-12-08", vendor: "Equipment Rental Co", amount: 450000, method: "Credit Card", status: "Completed", invoice: "INV-2024-003", category: "Equipment" },
  { id: 4, date: "2024-12-05", vendor: "Electrical Supplies", amount: 750000, method: "Bank Transfer", status: "Pending", invoice: "INV-2024-004", category: "Materials" },
  { id: 5, date: "2024-12-01", vendor: "Safety Equipment Ltd", amount: 320000, method: "Cheque", status: "Processing", invoice: "INV-2024-005", category: "Safety" },
  { id: 6, date: "2024-11-28", vendor: "Labour Contractor B", amount: 890000, method: "Bank Transfer", status: "Completed", invoice: "INV-2024-006", category: "Labour" },
  { id: 7, date: "2024-11-25", vendor: "Concrete Mix Provider", amount: 1850000, method: "Bank Transfer", status: "Completed", invoice: "INV-2024-007", category: "Materials" },
  { id: 8, date: "2024-11-20", vendor: "Insurance Premium", amount: 500000, method: "Credit Card", status: "Pending", invoice: "INV-2024-008", category: "Overheads" },
];

const PAYMENT_SCHEDULE = [
  { id: 1, vendor: "Cement Suppliers Ltd", dueDate: "2024-12-20", amount: 3000000, status: "Due Soon", days: 5 },
  { id: 2, vendor: "Labour Contractor A", dueDate: "2024-12-25", amount: 1500000, status: "Due Soon", days: 10 },
  { id: 3, vendor: "Equipment Rental Co", dueDate: "2025-01-05", amount: 600000, status: "Upcoming", days: 24 },
  { id: 4, vendor: "Electrical Supplies", dueDate: "2025-01-15", amount: 450000, status: "Upcoming", days: 34 },
];

const PAYMENT_SUMMARY = [
  { label: "Total Paid (This Month)", value: "₹78,50,000", change: "+12%", trend: "up", color: "#059669" },
  { label: "Total Pending", value: "₹28,70,000", change: "-5%", trend: "down", color: "#f59e0b" },
  { label: "Average Payment Time", value: "4.2 days", change: "0%", trend: "stable", color: "#0A4174" },
  { label: "Payment Success Rate", value: "98.5%", change: "+2%", trend: "up", color: "#059669" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// eslint-disable-next-line no-unused-vars
const PAYMENT_TREND = MONTHS.map((m, i) => ({
  month: m,
  paid: Math.round(Math.random() * 10000000 + 50000000),
  pending: Math.round(Math.random() * 3000000 + 15000000),
}));

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const getStatusColor = (status) => {
  switch (status) {
    case "Completed": return "#059669";
    case "Pending": return "#f59e0b";
    case "Processing": return "#0A4174";
    case "Failed": return "#dc2626";
    case "Active": return "#059669";
    case "Inactive": return "#9ca3af";
    default: return "#6b7280";
  }
};

const getStatusBgColor = (status) => {
  switch (status) {
    case "Completed": return "#dcfce7";
    case "Pending": return "#fef3c7";
    case "Processing": return "#dbeafe";
    case "Failed": return "#fee2e2";
    case "Active": return "#dcfce7";
    case "Inactive": return "#f3f4f6";
    case "Due Soon": return "#fef3c7";
    case "Upcoming": return "#dbeafe";
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
export default function PaymentTracking() {
  const [tab, setTab] = useState("Overview");
  const [animIn, setAnimIn] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const filteredHistory = PAYMENT_HISTORY.filter((p) => {
    const matchesSearch = p.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.invoice.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = PAYMENT_HISTORY.filter(p => p.status === "Completed").reduce((s, p) => s + p.amount, 0);
  const totalPending = PAYMENT_HISTORY.filter(p => p.status !== "Completed").reduce((s, p) => s + p.amount, 0);
  const maxTrend = Math.max(...PAYMENT_TREND.map(d => d.paid + d.pending));

  const TABS = ["Overview", "Payment History", "Schedule", "Methods"];

  return (
    <div className={`pt-root ${animIn ? "pt-in" : ""}`}>
      
      {/* Header */}
      <div className="pt-header">
        <div>
          <p className="pt-eyebrow">Finance Manager</p>
          <h1 className="pt-title">Payment Tracking</h1>
        </div>
        <button className="pt-btn-primary">+ New Payment</button>
      </div>

      {/* Summary Cards */}
      <div className="pt-summary">
        {PAYMENT_SUMMARY.map((s) => (
          <div key={s.label} className="pt-summary-card" style={{ "--accent": s.color }}>
            <div className="pt-summary-top">
              <p className="pt-summary-label">{s.label}</p>
              <span className={`pt-trend pt-trend--${s.trend}`}>{s.change}</span>
            </div>
            <p className="pt-summary-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pt-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`pt-tab ${tab === t ? "pt-tab--on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-body">
        {tab === "Overview" && <OverviewTab filteredHistory={filteredHistory} totalPaid={totalPaid} totalPending={totalPending} maxTrend={maxTrend} />}
        {tab === "Payment History" && <HistoryTab filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />}
        {tab === "Schedule" && <ScheduleTab />}
        {tab === "Methods" && <MethodsTab />}
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <PaymentModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
function OverviewTab({ filteredHistory, totalPaid, totalPending, maxTrend }) {
  return (
    <div className="pt-overview">
      {/* Stats Row */}
      <div className="pt-stats">
        <div className="pt-stat-card">
          <p>Total Paid (This Year)</p>
          <h3>{fmt(totalPaid)}</h3>
          <span className="pt-stat-sub">Across all projects</span>
        </div>
        <div className="pt-stat-card">
          <p>Total Pending</p>
          <h3 style={{ color: "#f59e0b" }}>{fmt(totalPending)}</h3>
          <span className="pt-stat-sub">Awaiting processing</span>
        </div>
        <div className="pt-stat-card">
          <p>Active Vendors</p>
          <h3>{new Set(PAYMENT_HISTORY.map(p => p.vendor)).size}</h3>
          <span className="pt-stat-sub">Currently engaged</span>
        </div>
        <div className="pt-stat-card">
          <p>Overdue Payments</p>
          <h3 style={{ color: "#dc2626" }}>2</h3>
          <span className="pt-stat-sub">Require immediate action</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="pt-chart-card">
        <div className="pt-chart-head">
          <h3>Monthly Payment Trend</h3>
          <div className="pt-chart-legend">
            <span><i className="pt-dot" style={{ background: "#0A4174" }} /> Paid</span>
            <span><i className="pt-dot" style={{ background: "#f59e0b" }} /> Pending</span>
          </div>
        </div>
        <div className="pt-trend-chart">
          {PAYMENT_TREND.map((d) => (
            <div className="pt-trend-bar" key={d.month}>
              <div className="pt-trend-bars">
                <div className="pt-trend-segment" style={{ "--h": `${(d.paid / maxTrend) * 100}%`, background: "#0A4174" }} />
                <div className="pt-trend-segment" style={{ "--h": `${(d.pending / maxTrend) * 100}%`, background: "#f59e0b" }} />
              </div>
              <span className="pt-trend-label">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="pt-recent">
        <h3>Recent Payments</h3>
        <div className="pt-payment-list">
          {PAYMENT_HISTORY.slice(0, 5).map((p) => (
            <div key={p.id} className="pt-payment-item">
              <div className="pt-payment-info">
                <p className="pt-payment-vendor">{p.vendor}</p>
                <p className="pt-payment-meta">{p.invoice} • {formatDate(p.date)}</p>
              </div>
              <div className="pt-payment-right">
                <p className="pt-payment-amount">{fmt(p.amount)}</p>
                <span className="pt-payment-status" style={{ 
                  background: getStatusBgColor(p.status),
                  color: getStatusColor(p.status)
                }}>
                  {p.status}
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
   TAB 2 — PAYMENT HISTORY
════════════════════════════════════════════════════════════ */
function HistoryTab({ filteredHistory, searchTerm, setSearchTerm, filterStatus, setFilterStatus }) {
  return (
    <div className="pt-history">
      {/* Filters */}
      <div className="pt-filters">
        <div className="pt-search">
          <input
            type="text"
            placeholder="Search by vendor, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pt-search-input"
          />
        </div>
        <div className="pt-filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pt-filter-select">
            <option>All</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Failed</option>
          </select>
        </div>
      </div>

      {/* Payment Table */}
      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Invoice</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((p) => (
              <tr key={p.id} className="pt-trow">
                <td className="pt-date">{formatDate(p.date)}</td>
                <td className="pt-vendor">{p.vendor}</td>
                <td className="pt-invoice">{p.invoice}</td>
                <td className="pt-category">{p.category}</td>
                <td className="pt-amount">{fmt(p.amount)}</td>
                <td className="pt-method">{p.method}</td>
                <td>
                  <span className="pt-status" style={{
                    background: getStatusBgColor(p.status),
                    color: getStatusColor(p.status)
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredHistory.length === 0 && (
          <div className="pt-empty">
            <p>No payments found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — SCHEDULE
════════════════════════════════════════════════════════════ */
function ScheduleTab() {
  return (
    <div className="pt-schedule">
      <div className="pt-schedule-head">
        <h3>Upcoming Payment Schedule</h3>
        <button className="pt-btn-outline">+ Add to Schedule</button>
      </div>

      <div className="pt-schedule-list">
        {PAYMENT_SCHEDULE.map((p) => (
          <div key={p.id} className={`pt-schedule-item pt-schedule-item--${p.status.replace(" ", "-").toLowerCase()}`}>
            <div className="pt-schedule-left">
              <div className="pt-schedule-days">{p.days}</div>
              <div className="pt-schedule-content">
                <p className="pt-schedule-vendor">{p.vendor}</p>
                <p className="pt-schedule-meta">Due: {formatDate(p.dueDate)}</p>
              </div>
            </div>
            <div className="pt-schedule-right">
              <p className="pt-schedule-amount">{fmt(p.amount)}</p>
              <span className="pt-schedule-status" style={{
                background: getStatusBgColor(p.status),
                color: getStatusColor(p.status)
              }}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar View */}
      <div className="pt-calendar-card">
        <h3>Payment Calendar</h3>
        <div className="pt-calendar">
          {[...Array(35)].map((_, i) => (
            <div key={i} className={`pt-calendar-day ${i < 5 ? "pt-cal-empty" : ""} ${[8, 15, 22, 29].includes(i) ? "pt-cal-payment" : ""}`}>
              {i >= 5 ? i - 4 : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 4 — PAYMENT METHODS
════════════════════════════════════════════════════════════ */
function MethodsTab() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="pt-methods">
      <div className="pt-methods-head">
        <h3>Payment Methods</h3>
        <button className="pt-btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "✕ Cancel" : "+ Add Method"}
        </button>
      </div>

      {showAdd && (
        <div className="pt-form-card">
          <h4>Add New Payment Method</h4>
          <div className="pt-form-grid">
            <div className="pt-form-row">
              <label>Method Type</label>
              <select className="pt-input">
                <option>Bank Transfer</option>
                <option>Credit Card</option>
                <option>Cheque</option>
                <option>Digital Wallet</option>
              </select>
            </div>
            <div className="pt-form-row">
              <label>Provider / Bank</label>
              <input type="text" placeholder="e.g., HDFC Bank" className="pt-input" />
            </div>
            <div className="pt-form-row">
              <label>Account Number</label>
              <input type="text" placeholder="Enter account number" className="pt-input" />
            </div>
            <div className="pt-form-row">
              <label>Limit Amount (₹)</label>
              <input type="number" placeholder="e.g., 500000" className="pt-input" />
            </div>
          </div>
          <div className="pt-form-actions">
            <button className="pt-btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="pt-btn-primary">Add Method</button>
          </div>
        </div>
      )}

      <div className="pt-methods-grid">
        {PAYMENT_METHODS.map((m) => (
          <div key={m.id} className={`pt-method-card pt-method-card--${m.status.toLowerCase()}`}>
            <div className="pt-method-header">
              <p className="pt-method-type">{m.type}</p>
              <span className="pt-method-status" style={{
                background: getStatusBgColor(m.status),
                color: getStatusColor(m.status)
              }}>
                {m.status}
              </span>
            </div>
            <p className="pt-method-provider">{m.provider}</p>
            <p className="pt-method-account">Account ending in {m.accountLast4}</p>
            <div className="pt-method-balance">
              <span>Available Balance</span>
              <p>{fmt(m.balance)}</p>
            </div>
            <div className="pt-method-actions">
              <button className="pt-btn-sm pt-btn-sm--outline">Edit</button>
              <button className="pt-btn-sm pt-btn-sm--outline">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAYMENT DETAIL MODAL
════════════════════════════════════════════════════════════ */
function PaymentModal({ payment, onClose }) {
  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pt-modal-close" onClick={onClose}>✕</button>
        <h2>Payment Details</h2>
        <div className="pt-modal-content">
          <div className="pt-modal-row">
            <label>Invoice Number</label>
            <p>{payment.invoice}</p>
          </div>
          <div className="pt-modal-row">
            <label>Vendor Name</label>
            <p>{payment.vendor}</p>
          </div>
          <div className="pt-modal-row">
            <label>Amount</label>
            <p style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0A4174" }}>{fmt(payment.amount)}</p>
          </div>
          <div className="pt-modal-row">
            <label>Payment Method</label>
            <p>{payment.method}</p>
          </div>
          <div className="pt-modal-row">
            <label>Date</label>
            <p>{formatDate(payment.date)}</p>
          </div>
          <div className="pt-modal-row">
            <label>Status</label>
            <span style={{
              background: getStatusBgColor(payment.status),
              color: getStatusColor(payment.status),
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              display: "inline-block",
              fontWeight: "600"
            }}>
              {payment.status}
            </span>
          </div>
          <div className="pt-modal-row">
            <label>Category</label>
            <p>{payment.category}</p>
          </div>
        </div>
        <div className="pt-modal-actions">
          <button className="pt-btn-outline" onClick={onClose}>Close</button>
          <button className="pt-btn-primary">Download Receipt</button>
        </div>
      </div>
    </div>
  );
}