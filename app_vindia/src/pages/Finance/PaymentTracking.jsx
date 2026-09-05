// ===== FILE: APP_Vindia/app_vindia/src/pages/Finance/PaymentTracking.jsx =====
import { useState, useEffect, useCallback } from "react";
import financeService from "../../services/financeService";
import { getProjects } from "../../services/projectService";
import "./PaymentTracking.css";

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n || 0).toLocaleString("en-IN")}`;

const getStatusColor = (status) => {
  switch (status) {
    case "completed": return "#059669";
    case "pending": return "#f59e0b";
    case "processing": return "#0A4174";
    case "failed": return "#dc2626";
    default: return "#6b7280";
  }
};
const getStatusBgColor = (status) => {
  switch (status) {
    case "completed": return "#dcfce7";
    case "pending": return "#fef3c7";
    case "processing": return "#dbeafe";
    case "failed": return "#fee2e2";
    default: return "#f3f4f6";
  }
};
const STATUS_LABEL = { completed: "Completed", pending: "Pending", processing: "Processing", failed: "Failed" };

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const daysUntil = (dateString) => {
  const diff = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const EMPTY_PAYMENT = {
  payment_type: "outgoing",
  project_id: "",
  vendor_id: "",
  invoice_id: "",
  amount: "",
  payment_method: "",
  reference_number: "",
  status: "completed",
  payment_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const TABS = ["Overview", "Payment History", "Schedule", "Methods"];

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function PaymentTracking() {
  const [tab, setTab] = useState("Overview");
  const [animIn, setAnimIn] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    const f = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, vendorRes, projRes, invRes, settingsRes] = await Promise.all([
        financeService.getAllPayments(),
        financeService.getAllVendors(),
        getProjects(),
        financeService.getAllInvoices({ status: "pending" }),
        financeService.getSettings(),
      ]);
      setPayments(payRes.data.data || []);
      setVendors(vendorRes.data.data || []);
      setProjects(projRes.data.projects || projRes.data || []);
      setInvoices(invRes.data.data || []);
      setBankAccounts(settingsRes.data.data.bankAccounts || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.project_id || !form.amount) {
      setFormError("Project and amount are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await financeService.createPayment({
        payment_type: form.payment_type,
        project_id: form.project_id,
        vendor_id: form.vendor_id || null,
        invoice_id: form.invoice_id || null,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        status: form.status,
        payment_date: form.payment_date,
        notes: form.notes,
      });
      await loadAll();
      setShowForm(false);
      setForm(EMPTY_PAYMENT);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async (payment) => {
    try {
      await financeService.updatePayment(payment.id, { status: "completed" });
      await loadAll();
      setSelectedPayment(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update payment");
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete this ${fmt(payment.amount)} payment record?`)) return;
    try {
      await financeService.deletePayment(payment.id);
      await loadAll();
      setSelectedPayment(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete payment");
    }
  };

  const filteredHistory = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.vendor_name || "").toLowerCase().includes(term) ||
      (p.invoice_number || "").toLowerCase().includes(term) ||
      (p.reference_number || "").toLowerCase().includes(term);
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesType = filterType === "all" || p.payment_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ── Real stats, computed from actual payment records ──────────
  const totalPaid = payments
    .filter((p) => p.payment_type === "outgoing" && p.status === "completed")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.payment_type === "outgoing" && p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalReceived = payments
    .filter((p) => p.payment_type === "incoming" && p.status === "completed")
    .reduce((s, p) => s + Number(p.amount), 0);
  const activeVendors = new Set(payments.filter((p) => p.vendor_id).map((p) => p.vendor_id)).size;

  // ── Monthly trend, aggregated client-side from real payment_date values ──
  const trendMap = {};
  payments.forEach((p) => {
    if (!p.payment_date) return;
    const d = new Date(p.payment_date);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (!trendMap[key]) trendMap[key] = { month: key, sortKey: d.getFullYear() * 12 + d.getMonth(), paid: 0, pending: 0 };
    if (p.payment_type === "outgoing") {
      if (p.status === "completed") trendMap[key].paid += Number(p.amount);
      else if (p.status === "pending") trendMap[key].pending += Number(p.amount);
    }
  });
  const trend = Object.values(trendMap).sort((a, b) => a.sortKey - b.sortKey).slice(-12);
  const maxTrend = Math.max(...trend.map((d) => d.paid + d.pending), 1);

  // ── Schedule: real pending payments, soonest due first ─────────
  const scheduled = payments
    .filter((p) => p.status === "pending")
    .slice()
    .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));

  if (loading) {
    return <div className="pt-root"><p style={{ padding: 40, textAlign: "center" }}>Loading payments…</p></div>;
  }

  return (
    <div className={`pt-root ${animIn ? "pt-in" : ""}`}>

      {/* Header */}
      <div className="pt-header">
        <div>
          <p className="pt-eyebrow">Finance Manager</p>
          <h1 className="pt-title">Payment Tracking</h1>
        </div>
        <button className="pt-btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ New Payment"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>}

      {showForm && (
        <div className="pt-form-card">
          <h4>Record New Payment</h4>
          {formError && <p style={{ color: "#dc2626", fontSize: 13 }}>{formError}</p>}
          <div className="pt-form-grid">
            <div className="pt-form-row">
              <label>Type</label>
              <select className="pt-input" value={form.payment_type} onChange={(e) => setF("payment_type", e.target.value)}>
                <option value="outgoing">Outgoing (to vendor)</option>
                <option value="incoming">Incoming (from client)</option>
              </select>
            </div>
            <div className="pt-form-row">
              <label>Project</label>
              <select className="pt-input" value={form.project_id} onChange={(e) => setF("project_id", e.target.value)}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {form.payment_type === "outgoing" && (
              <div className="pt-form-row">
                <label>Vendor</label>
                <select className="pt-input" value={form.vendor_id} onChange={(e) => setF("vendor_id", e.target.value)}>
                  <option value="">Select vendor (optional)</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
            {form.payment_type === "incoming" && (
              <div className="pt-form-row">
                <label>Invoice</label>
                <select className="pt-input" value={form.invoice_id} onChange={(e) => setF("invoice_id", e.target.value)}>
                  <option value="">Select invoice (optional)</option>
                  {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}
                </select>
              </div>
            )}
            <div className="pt-form-row">
              <label>Amount (₹)</label>
              <input type="number" className="pt-input" value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="e.g., 500000" />
            </div>
            <div className="pt-form-row">
              <label>Payment Method</label>
              <input type="text" className="pt-input" value={form.payment_method} onChange={(e) => setF("payment_method", e.target.value)} placeholder="e.g., Bank Transfer" />
            </div>
            <div className="pt-form-row">
              <label>Reference Number</label>
              <input type="text" className="pt-input" value={form.reference_number} onChange={(e) => setF("reference_number", e.target.value)} placeholder="e.g., UTR / cheque no." />
            </div>
            <div className="pt-form-row">
              <label>Status</label>
              <select className="pt-input" value={form.status} onChange={(e) => setF("status", e.target.value)}>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="pt-form-row">
              <label>Date</label>
              <input type="date" className="pt-input" value={form.payment_date} onChange={(e) => setF("payment_date", e.target.value)} />
            </div>
            <div className="pt-form-row" style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input type="text" className="pt-input" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
            </div>
          </div>
          <div className="pt-form-actions">
            <button className="pt-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="pt-btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="pt-summary">
        <div className="pt-summary-card" style={{ "--accent": "#059669" }}>
          <div className="pt-summary-top"><p className="pt-summary-label">Total Paid (Outgoing)</p></div>
          <p className="pt-summary-value">{fmt(totalPaid)}</p>
        </div>
        <div className="pt-summary-card" style={{ "--accent": "#f59e0b" }}>
          <div className="pt-summary-top"><p className="pt-summary-label">Total Pending (Outgoing)</p></div>
          <p className="pt-summary-value">{fmt(totalPending)}</p>
        </div>
        <div className="pt-summary-card" style={{ "--accent": "#0A4174" }}>
          <div className="pt-summary-top"><p className="pt-summary-label">Total Received (Incoming)</p></div>
          <p className="pt-summary-value">{fmt(totalReceived)}</p>
        </div>
        <div className="pt-summary-card" style={{ "--accent": "#6EA2B3" }}>
          <div className="pt-summary-top"><p className="pt-summary-label">Active Vendors</p></div>
          <p className="pt-summary-value">{activeVendors}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="pt-tabs">
        {TABS.map((t) => (
          <button key={t} className={`pt-tab ${tab === t ? "pt-tab--on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-body">
        {tab === "Overview" && (
          <OverviewTab
            payments={payments}
            trend={trend}
            maxTrend={maxTrend}
            onSelect={setSelectedPayment}
          />
        )}
        {tab === "Payment History" && (
          <HistoryTab
            filteredHistory={filteredHistory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            onSelect={setSelectedPayment}
          />
        )}
        {tab === "Schedule" && <ScheduleTab scheduled={scheduled} />}
        {tab === "Methods" && <MethodsTab bankAccounts={bankAccounts} />}
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onMarkCompleted={handleMarkCompleted}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════ */
function OverviewTab({ payments, trend, maxTrend, onSelect }) {
  const recent = payments.slice().sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).slice(0, 5);
  const overdueCount = payments.filter((p) => p.status === "pending" && new Date(p.payment_date) < new Date()).length;

  return (
    <div className="pt-overview">
      <div className="pt-stats">
        <div className="pt-stat-card">
          <p>Total Payment Records</p>
          <h3>{payments.length}</h3>
          <span className="pt-stat-sub">Across all projects</span>
        </div>
        <div className="pt-stat-card">
          <p>Overdue Payments</p>
          <h3 style={{ color: "#dc2626" }}>{overdueCount}</h3>
          <span className="pt-stat-sub">Pending, past due date</span>
        </div>
      </div>

      {trend.length > 0 && (
        <div className="pt-chart-card">
          <div className="pt-chart-head">
            <h3>Monthly Payment Trend (Outgoing)</h3>
            <div className="pt-chart-legend">
              <span><i className="pt-dot" style={{ background: "#0A4174" }} /> Paid</span>
              <span><i className="pt-dot" style={{ background: "#f59e0b" }} /> Pending</span>
            </div>
          </div>
          <div className="pt-trend-chart">
            {trend.map((d) => (
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
      )}

      <div className="pt-recent">
        <h3>Recent Payments</h3>
        {recent.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13 }}>No payment records yet.</p>
        ) : (
          <div className="pt-payment-list">
            {recent.map((p) => (
              <div key={p.id} className="pt-payment-item" onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
                <div className="pt-payment-info">
                  <p className="pt-payment-vendor">{p.vendor_name || p.invoice_number || "—"}</p>
                  <p className="pt-payment-meta">
                    {p.payment_type === "incoming" ? "Incoming" : "Outgoing"} • {formatDate(p.payment_date)}
                  </p>
                </div>
                <div className="pt-payment-right">
                  <p className="pt-payment-amount">{fmt(p.amount)}</p>
                  <span className="pt-payment-status" style={{ background: getStatusBgColor(p.status), color: getStatusColor(p.status) }}>
                    {STATUS_LABEL[p.status] || p.status}
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
   TAB 2 — PAYMENT HISTORY
════════════════════════════════════════════════════════════ */
function HistoryTab({ filteredHistory, searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterType, setFilterType, onSelect }) {
  return (
    <div className="pt-history">
      <div className="pt-filters">
        <div className="pt-search">
          <input
            type="text"
            placeholder="Search by vendor, invoice, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pt-search-input"
          />
        </div>
        <div className="pt-filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="pt-filter-select">
            <option value="all">All</option>
            <option value="outgoing">Outgoing</option>
            <option value="incoming">Incoming</option>
          </select>
        </div>
        <div className="pt-filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pt-filter-select">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Party</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((p) => (
              <tr key={p.id} className="pt-trow" onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
                <td className="pt-date">{formatDate(p.payment_date)}</td>
                <td className="pt-vendor">{p.vendor_name || p.invoice_number || "—"}</td>
                <td className="pt-category">{p.payment_type === "incoming" ? "Incoming" : "Outgoing"}</td>
                <td className="pt-invoice">{p.reference_number || "—"}</td>
                <td className="pt-amount">{fmt(p.amount)}</td>
                <td className="pt-method">{p.payment_method || "—"}</td>
                <td>
                  <span className="pt-status" style={{ background: getStatusBgColor(p.status), color: getStatusColor(p.status) }}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredHistory.length === 0 && (
          <div className="pt-empty"><p>No payments found matching your criteria</p></div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 3 — SCHEDULE (real pending payments, soonest due first)
════════════════════════════════════════════════════════════ */
function ScheduleTab({ scheduled }) {
  return (
    <div className="pt-schedule">
      <div className="pt-schedule-head">
        <h3>Upcoming / Pending Payments</h3>
      </div>

      {scheduled.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>No pending payments scheduled.</p>
      ) : (
        <div className="pt-schedule-list">
          {scheduled.map((p) => {
            const days = daysUntil(p.payment_date);
            const overdue = days < 0;
            return (
              <div key={p.id} className={`pt-schedule-item ${overdue ? "pt-schedule-item--due-soon" : "pt-schedule-item--upcoming"}`}>
                <div className="pt-schedule-left">
                  <div className="pt-schedule-days">{overdue ? `${Math.abs(days)}d late` : `${days}d`}</div>
                  <div className="pt-schedule-content">
                    <p className="pt-schedule-vendor">{p.vendor_name || p.invoice_number || "—"}</p>
                    <p className="pt-schedule-meta">Due: {formatDate(p.payment_date)}</p>
                  </div>
                </div>
                <div className="pt-schedule-right">
                  <p className="pt-schedule-amount">{fmt(p.amount)}</p>
                  <span className="pt-schedule-status" style={{
                    background: overdue ? "#fee2e2" : "#dbeafe",
                    color: overdue ? "#dc2626" : "#0A4174",
                  }}>
                    {overdue ? "Overdue" : "Upcoming"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB 4 — METHODS (read-only mirror of Finance Settings bank accounts)
════════════════════════════════════════════════════════════ */
function MethodsTab({ bankAccounts }) {
  return (
    <div className="pt-methods">
      <div className="pt-methods-head">
        <h3>Registered Bank Accounts</h3>
        <a href="/finance-manager/settings" className="pt-btn-outline" style={{ textDecoration: "none", display: "inline-block" }}>
          Manage in Settings →
        </a>
      </div>

      {bankAccounts.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          No bank accounts on file yet — add one from Finance Settings.
        </p>
      ) : (
        <div className="pt-methods-grid">
          {bankAccounts.map((b) => (
            <div key={b.id} className="pt-method-card pt-method-card--active">
              <div className="pt-method-header">
                <p className="pt-method-type">{b.is_primary ? "Primary Account" : "Bank Account"}</p>
              </div>
              <p className="pt-method-provider">{b.bank_name}</p>
              <p className="pt-method-account">{b.account_holder} • A/C ending in {String(b.account_number).slice(-4)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAYMENT DETAIL MODAL
════════════════════════════════════════════════════════════ */
function PaymentModal({ payment, onClose, onMarkCompleted, onDelete }) {
  return (
    <div className="pt-modal-overlay" onClick={onClose}>
      <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pt-modal-close" onClick={onClose}>✕</button>
        <h2>Payment Details</h2>
        <div className="pt-modal-content">
          <div className="pt-modal-row">
            <label>Reference / Invoice</label>
            <p>{payment.reference_number || payment.invoice_number || "—"}</p>
          </div>
          <div className="pt-modal-row">
            <label>Party</label>
            <p>{payment.vendor_name || payment.invoice_number || "—"}</p>
          </div>
          <div className="pt-modal-row">
            <label>Amount</label>
            <p style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0A4174" }}>{fmt(payment.amount)}</p>
          </div>
          <div className="pt-modal-row">
            <label>Type</label>
            <p>{payment.payment_type === "incoming" ? "Incoming" : "Outgoing"}</p>
          </div>
          <div className="pt-modal-row">
            <label>Payment Method</label>
            <p>{payment.payment_method || "—"}</p>
          </div>
          <div className="pt-modal-row">
            <label>Date</label>
            <p>{formatDate(payment.payment_date)}</p>
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
              {STATUS_LABEL[payment.status] || payment.status}
            </span>
          </div>
          {payment.notes && (
            <div className="pt-modal-row">
              <label>Notes</label>
              <p>{payment.notes}</p>
            </div>
          )}
        </div>
        <div className="pt-modal-actions">
          <button className="pt-btn-outline" onClick={onClose}>Close</button>
          {payment.status === "pending" && (
            <button className="pt-btn-primary" onClick={() => onMarkCompleted(payment)}>Mark Completed</button>
          )}
          <button className="pt-btn-outline" style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={() => onDelete(payment)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}