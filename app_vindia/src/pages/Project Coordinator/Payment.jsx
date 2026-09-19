import React, { useState, useEffect, useMemo, useCallback } from "react";
import pcPaymentService from "../../services/pcPaymentService";
import "./Payment.css";

/* ══════════════════════════════════════════════════════════
   Data now comes from Finance.

   GET /api/pc/payments  →  the same invoices + payments the
   Accountant maintains, filtered to this coordinator's projects
   and to client receivables only. Nothing is hardcoded here.
══════════════════════════════════════════════════════════ */

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
const fmtCr = (n) => {
  const v = Number(n || 0);
  return v >= 10000000 ? `₹${(v/10000000).toFixed(2)}Cr`
    : v >= 100000  ? `₹${(v/100000).toFixed(1)}L`
    : `₹${v.toLocaleString("en-IN")}`;
};
const today       = new Date();
const daysOverdue = (d) => Math.ceil((today - new Date(d)) / 86400000);
const daysLeft    = (d) => Math.ceil((new Date(d) - today) / 86400000);

/* Real collected amount from Finance — no more 65% guesswork. */
const getPaid = (payments = []) =>
  payments.reduce((s, p) => s + Number(p.paidAmount || 0), 0);

const STATUS_CFG = {
  paid:      { label: "Paid",      bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  partial:   { label: "Partial",   bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
  pending:   { label: "Pending",   bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
  overdue:   { label: "Overdue",   bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  cancelled: { label: "Cancelled", bg: "#f8fafc", color: "#64748b", border: "#cbd5e1" },
};
const TYPE_COLOR = {
  "Advance": "#7c3aed", "Milestone": "#2563eb", "Milestone 1": "#2563eb",
  "Milestone 2": "#0891b2", "Milestone 3": "#0891b2",
  "Retention": "#6366f1", "Final": "#0f766e", "Invoice": "#475569",
};

/* ─── month helpers, now driven by live data ─── */
const buildActivityMonths = (projects) => {
  const set = new Set();
  projects.forEach((proj) => {
    [proj.startDate, proj.deadline, ...proj.payments.map((p) => p.dueDate)]
      .filter(Boolean)
      .forEach((d) => {
        const dt = new Date(d);
        if (!Number.isNaN(dt.getTime())) {
          set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
        }
      });
  });
  return [...set].sort();
};

const getMonthActivity = (projects, ym) => {
  if (!ym) return null;
  const [year, month] = ym.split("-").map(Number);
  const mo = month - 1;
  const inMonth = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    return dt.getFullYear() === year && dt.getMonth() === mo;
  };
  const starts    = projects.filter((p) => inMonth(p.startDate)).map((p) => ({ project: p.name, date: p.startDate }));
  const deadlines = projects.filter((p) => inMonth(p.deadline)).map((p) => ({ project: p.name, date: p.deadline }));
  const payments  = projects.flatMap((p) =>
    p.payments.filter((pay) => inMonth(pay.dueDate)).map((pay) => ({ ...pay, projectName: p.name }))
  );
  return { year, month: mo, starts, deadlines, payments };
};

/* ─── small components ─── */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.pending;
  return <span className="pay-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.label}</span>;
};
const TypeChip = ({ type }) => (
  <span className="pay-type-chip" style={{ color: TYPE_COLOR[type] || "#475569", background: `${TYPE_COLOR[type] || "#475569"}12`, border: `1px solid ${TYPE_COLOR[type] || "#475569"}30` }}>{type}</span>
);

/* ─── Month Year Picker ─── */
const MonthYearPicker = ({ value, onChange, projects, activityMonths }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() =>
    value ? parseInt(value.split("-")[0]) : new Date().getFullYear()
  );

  const activeYears = [...new Set(activityMonths.map((m) => parseInt(m.split("-")[0])))].sort();
  const minYear = activeYears[0] || new Date().getFullYear();
  const maxYear = activeYears[activeYears.length - 1] || new Date().getFullYear();

  const activeMonthsInYear = activityMonths
    .filter((m) => parseInt(m.split("-")[0]) === viewYear)
    .map((m) => parseInt(m.split("-")[1]) - 1);

  const displayLabel = value
    ? (() => { const [y, m] = value.split("-"); return `${MONTH_SHORT[parseInt(m)-1]} ${y}`; })()
    : "Select Month";

  return (
    <>
      <button className={`myp-trigger ${open ? "open" : ""} ${value ? "has-value" : ""}`}
        onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{displayLabel}</span>
        {value && (
          <span className="myp-clear" onClick={(e) => { e.stopPropagation(); onChange(null); }}>✕</span>
        )}
        <svg className="myp-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="myp-overlay" onClick={() => setOpen(false)}>
          <div className="myp-panel" onClick={e => e.stopPropagation()}>

            <div className="myp-panel-header">
              <h3 className="myp-panel-title">Select Month</h3>
              <button className="myp-panel-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="myp-year-nav">
              <button className="myp-year-btn" disabled={viewYear <= minYear}
                onClick={() => setViewYear(v => v - 1)}>‹</button>
              <span className="myp-year-label">{viewYear}</span>
              <button className="myp-year-btn" disabled={viewYear >= maxYear}
                onClick={() => setViewYear(v => v + 1)}>›</button>
            </div>

            <div className="myp-month-grid">
              {MONTH_SHORT.map((name, i) => {
                const ym = `${viewYear}-${String(i+1).padStart(2,"0")}`;
                const hasActivity = activeMonthsInYear.includes(i);
                const isSelected  = value === ym;
                const act = hasActivity ? getMonthActivity(projects, ym) : null;
                const hasOverdue  = act?.payments.some(p => p.status === "overdue");
                const hasDeadline = act?.deadlines.length > 0;
                const hasStart    = act?.starts.length > 0;
                return (
                  <button key={i}
                    className={`myp-month-btn ${isSelected ? "selected" : ""} ${hasActivity ? "has-activity" : "no-activity"}`}
                    onClick={() => { if (hasActivity) { onChange(isSelected ? null : ym); setOpen(false); } }}>
                    <span className="myp-month-name">{name}</span>
                    <div className="myp-dots">
                      {hasStart    && <span className="myp-dot myp-dot--start" />}
                      {hasDeadline && <span className="myp-dot myp-dot--deadline" />}
                      {hasOverdue  && <span className="myp-dot myp-dot--overdue" />}
                      {hasActivity && !hasStart && !hasDeadline && !hasOverdue &&
                        <span className="myp-dot myp-dot--pay" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="myp-legend">
              {[["#10b981","Project Start"],["#ef4444","Deadline"],["#f59e0b","Overdue"],["#2563eb","Payment Due"]].map(([c,l]) => (
                <span key={l}><span className="myp-dot" style={{ background: c }} />{l}</span>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

/* ─── Month Activity Detail ─── */
const MonthActivityPanel = ({ projects, ym }) => {
  const activity = getMonthActivity(projects, ym);
  if (!activity) return null;
  const { year, month, starts, deadlines, payments } = activity;
  if (!starts.length && !deadlines.length && !payments.length) return null;

  return (
    <div className="month-activity-panel">
      <h3 className="month-activity-panel__title">
        {MONTH_NAMES[month]} {year} — Activity Overview
      </h3>
      <div className="month-activity-grid">
        {starts.length > 0 && (
          <div className="month-activity-col">
            <p className="month-activity-label" style={{ color: "#10b981" }}>Project Starts</p>
            {starts.map((s, i) => (
              <div key={i} className="month-activity-row">
                <span className="month-activity-dot" style={{ background: "#10b981" }} />
                <span className="month-activity-name">{s.project}</span>
                <span className="month-activity-date">{fmtShort(s.date)}</span>
              </div>
            ))}
          </div>
        )}
        {deadlines.length > 0 && (
          <div className="month-activity-col">
            <p className="month-activity-label" style={{ color: "#ef4444" }}>Deadlines</p>
            {deadlines.map((d, i) => (
              <div key={i} className="month-activity-row">
                <span className="month-activity-dot" style={{ background: "#ef4444" }} />
                <span className="month-activity-name">{d.project}</span>
                <span className="month-activity-date">{fmtShort(d.date)}</span>
              </div>
            ))}
          </div>
        )}
        {payments.length > 0 && (
          <div className="month-activity-col month-activity-col--wide">
            <p className="month-activity-label" style={{ color: "#2563eb" }}>Payments Due</p>
            {payments.map((p, i) => {
              const sc = STATUS_CFG[p.status] || STATUS_CFG.pending;
              return (
                <div key={i} className="month-activity-pay-row">
                  <span className="month-activity-dot" style={{ background: sc.border }} />
                  <div className="month-activity-pay-info">
                    <span className="month-activity-name">{p.projectName}</span>
                    <span className="month-activity-mile">{p.milestone}</span>
                  </div>
                  <span className="month-activity-amt">{fmtCr(p.amount)}</span>
                  <StatusBadge status={p.status} />
                  <span className="month-activity-date">{fmtShort(p.dueDate)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Payment Card ─── */
const PaymentCard = ({ p, isOpen, onToggle }) => {
  const sc      = STATUS_CFG[p.status] || STATUS_CFG.pending;
  const overdue = p.status === "overdue";
  const days    = overdue ? daysOverdue(p.dueDate) : (p.status !== "paid" && p.dueDate) ? daysLeft(p.dueDate) : null;

  const balance = Math.max(Number(p.amount || 0) - Number(p.paidAmount || 0), 0);

  /* Individual receipts behind this invoice, fetched on expand. */
  const [txns, setTxns] = useState(null);
  const [txnError, setTxnError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || txns !== null) return;
    pcPaymentService
      .getInvoiceTransactions(p.id)
      .then((res) => { if (!cancelled) setTxns(res.data?.data ?? []); })
      .catch(() => { if (!cancelled) { setTxns([]); setTxnError("Could not load payment history."); } });
    return () => { cancelled = true; };
  }, [isOpen, p.id, txns]);

  return (
    <div className={`pay-card ${isOpen ? "open" : ""} ${overdue ? "overdue" : ""}`}>
      <div className="pay-card__accent" style={{ background: sc.border }} />
      <div className="pay-card__header" onClick={onToggle}>
        <div className="pay-card__main">
          <div className="pay-card__top">
            <span className="pay-card__invoice">{p.invoiceNo}</span>
            <TypeChip type={p.type} />
            <StatusBadge status={p.status} />
          </div>
          <p className="pay-card__milestone">{p.milestone}</p>
        </div>
        <div className="pay-card__right">
          <div className="pay-card__amount">{fmtCr(p.amount)}</div>
          <div className="pay-card__meta-row">
            <div className="pay-meta-item">
              <p className="pay-meta-label">Due Date</p>
              <p className="pay-meta-val">{fmt(p.dueDate)}</p>
            </div>
            {days !== null && (
              <div className="pay-meta-item">
                <p className="pay-meta-label">{overdue ? "Overdue by" : "Due in"}</p>
                <p className="pay-meta-val" style={{ color: overdue ? "#dc2626" : days <= 7 ? "#ca8a04" : "#475569", fontWeight: 700 }}>
                  {overdue ? `${days} days` : days > 0 ? `${days} days` : "Due today"}
                </p>
              </div>
            )}
            {p.paidOn && (
              <div className="pay-meta-item">
                <p className="pay-meta-label">Paid On</p>
                <p className="pay-meta-val" style={{ color: "#16a34a" }}>{fmt(p.paidOn)}</p>
              </div>
            )}
          </div>
          <span className="pay-chevron">{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>
      {isOpen && (
        <div className="pay-card__body">
          <div className="pay-detail-grid">
            <div className="pay-detail-block"><p className="pay-detail-label">Invoice No.</p><p className="pay-detail-val">{p.invoiceNo}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Type</p><p className="pay-detail-val">{p.type}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Method</p><p className="pay-detail-val">{p.method}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Issued On</p><p className="pay-detail-val">{fmt(p.issueDate)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Due Date</p><p className="pay-detail-val">{fmt(p.dueDate)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Paid On</p><p className="pay-detail-val" style={{ color: p.paidOn ? "#16a34a" : "#94a3b8" }}>{fmt(p.paidOn)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Invoice Amount</p><p className="pay-detail-val" style={{ color: "#2563eb", fontWeight: 800 }}>{fmtCr(p.amount)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Received</p><p className="pay-detail-val" style={{ color: "#16a34a", fontWeight: 800 }}>{fmtCr(p.paidAmount)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Balance</p><p className="pay-detail-val" style={{ color: balance > 0 ? "#dc2626" : "#16a34a", fontWeight: 800 }}>{fmtCr(balance)}</p></div>
            <div className="pay-detail-block pay-detail-block--wide"><p className="pay-detail-label">Remarks</p><p className="pay-detail-val">{p.remarks || "—"}</p></div>
          </div>

          {/* Receipt history straight from Finance */}
          <div className="pay-txn-section">
            <p className="pay-detail-label">Payment History</p>
            {txns === null ? (
              <p className="pay-txn-empty">Loading…</p>
            ) : txnError ? (
              <p className="pay-txn-empty">{txnError}</p>
            ) : txns.length === 0 ? (
              <p className="pay-txn-empty">No payments recorded against this invoice yet.</p>
            ) : (
              <div className="pay-txn-list">
                {txns.map((t) => (
                  <div key={t.id} className="pay-txn-row">
                    <span className="pay-txn-date">{fmt(t.payment_date)}</span>
                    <span className="pay-txn-amt">{fmtCr(t.amount)}</span>
                    <span className="pay-txn-method">{t.payment_method || "—"}</span>
                    <span className="pay-txn-ref">{t.reference_number || "—"}</span>
                    <StatusBadge status={t.status === "completed" ? "paid" : "pending"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {overdue && <div className="pay-overdue-alert">This payment is {daysOverdue(p.dueDate)} days overdue. Follow up with Project Manager.</div>}
        </div>
      )}
    </div>
  );
};

/* ─── Project Section ─── */
const ProjectSection = ({ proj, expandedId, onToggle, filterMonth }) => {
  const payments = filterMonth
    ? proj.payments.filter(p => {
        if (!p.dueDate) return false;
        const d = new Date(p.dueDate);
        const [y, m] = filterMonth.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      })
    : proj.payments;

  if (payments.length === 0) return null;

  const totalAmount  = proj.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const received     = getPaid(proj.payments);
  const outstanding  = Math.max(totalAmount - received, 0);
  const receivedPct  = totalAmount ? Math.round((received / totalAmount) * 100) : 0;
  const profitTarget = Math.round(Number(proj.contractValue || 0) * (Number(proj.targetProfit || 0) / 100));
  const overduePay   = proj.payments.filter(p => p.status === "overdue");
  const pendingPay   = proj.payments.filter(p => p.status === "pending");

  return (
    <div className="pay-project-section">
      <div className="pay-project-header">
        <div className="pay-project-header__left">
          <h2 className="pay-project-name">{proj.name}</h2>
          <p className="pay-project-client">{proj.client}</p>
        </div>
        <div className="pay-project-header__right">
          {overduePay.length > 0 && <span className="pay-project-alert">{overduePay.length} overdue</span>}
          {pendingPay.length > 0 && <span className="pay-project-pending">{pendingPay.length} pending</span>}
        </div>
      </div>
      <div className="pay-project-stats">
        {[
          { label: "Contract Value", val: fmtCr(proj.contractValue), color: "#0a2540" },
          { label: "Received",       val: fmtCr(received),           color: "#16a34a" },
          { label: "Outstanding",    val: fmtCr(outstanding),        color: "#2563eb" },
        ].map(s => (
          <div key={s.label} className="pay-project-stat">
            <p className="pay-project-stat__label">{s.label}</p>
            <p className="pay-project-stat__val" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
        <div className="pay-project-stat pay-project-stat--profit">
          <p className="pay-project-stat__label">Target Profit ({proj.targetProfit}%)</p>
          <p className="pay-project-stat__val" style={{ color: "#7c3aed" }}>{fmtCr(profitTarget)}</p>
          <p className="pay-project-stat__note">View only</p>
        </div>
      </div>
      <div className="pay-proj-bar-wrap">
        <div className="pay-proj-bar-track">
          <div className="pay-proj-bar-fill" style={{ width: `${Math.min(receivedPct, 100)}%` }} />
        </div>
        <span className="pay-proj-bar-pct">{receivedPct}%</span>
      </div>
      {filterMonth && (
        <p className="pay-filter-note">
          Showing {payments.length} payment{payments.length !== 1 ? "s" : ""} due in {MONTH_NAMES[parseInt(filterMonth.split("-")[1]) - 1]} {filterMonth.split("-")[0]}
        </p>
      )}
      <div className="pay-list">
        {payments.map(p => (
          <PaymentCard key={p.id} p={p} isOpen={expandedId === p.id} onToggle={() => onToggle(p.id)} />
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Payment() {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [expandedId,  setExpanded]    = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pcPaymentService.getPayments();
      setProjects(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load payments:", err);
      const status = err?.response?.status;
      setError(
        status === 403
          ? "You don't have permission to view payments."
          : status === 401
            ? "Your session expired. Please log in again."
            : "Could not load payments from Finance. Please try again."
      );
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const onToggle = (id) => setExpanded(prev => prev === id ? null : id);

  const activityMonths = useMemo(() => buildActivityMonths(projects), [projects]);

  const allPayments      = useMemo(() => projects.flatMap(p => p.payments), [projects]);
  const totalContract    = projects.reduce((s, p) => s + Number(p.contractValue || 0), 0);
  const totalInvoiced    = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalReceived    = getPaid(allPayments);
  const totalOutstanding = Math.max(totalInvoiced - totalReceived, 0);
  const totalOverdue     = allPayments.filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount || 0), 0);
  const overallPct       = totalInvoiced ? Math.round((totalReceived / totalInvoiced) * 100) : 0;

  /* Reset a stale month filter when the data changes. */
  useEffect(() => {
    if (filterMonth && !activityMonths.includes(filterMonth)) setFilterMonth(null);
  }, [activityMonths, filterMonth]);

  return (
    <div className="pay-page">

      {/* HEADER */}
      <div className="pay-header">
        <div>
          <p className="pay-breadcrumb">Project Coordinator / Payments</p>
          <h1 className="pay-title">Payments</h1>
        </div>
        <button className="pay-refresh-btn" onClick={loadPayments} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {loading && projects.length === 0 && (
        <div className="pay-empty">Loading payments from Finance…</div>
      )}

      {error && (
        <div className="pay-error">
          {error}
          <button onClick={loadPayments}>Retry</button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="pay-empty">
          No projects are assigned to you yet, so there are no payments to show.
        </div>
      )}

      {projects.length > 0 && (
        <>
          {/* SUMMARY */}
          <div className="pay-summary">
            {[
              { label: "Total Contract Value", val: fmtCr(totalContract),    color: "#0a2540" },
              { label: "Amount Received",      val: fmtCr(totalReceived),    color: "#16a34a" },
              { label: "Outstanding",          val: fmtCr(totalOutstanding), color: "#2563eb" },
              { label: "Overdue Amount",       val: fmtCr(totalOverdue),     color: "#dc2626" },
            ].map(s => (
              <div key={s.label} className="pay-summary-card">
                <p className="pay-summary-card__label">{s.label}</p>
                <p className="pay-summary-card__val" style={{ color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* PROGRESS */}
          <div className="pay-progress-card">
            <div className="pay-progress-card__top">
              <span className="pay-progress-card__label">Overall Payment Progress — All Projects</span>
              <span className="pay-progress-card__pct">{overallPct}% received</span>
            </div>
            <div className="pay-progress-track">
              <div className="pay-progress-fill pay-progress-fill--paid" style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
          </div>

          {/* FILTER ROW */}
          <div className="pay-filter-bar">
            <div className="pay-all-projects-tag">
              All Projects
              <span className="pay-tab-count">{allPayments.length}</span>
            </div>
            <MonthYearPicker
              value={filterMonth}
              onChange={setFilterMonth}
              projects={projects}
              activityMonths={activityMonths}
            />
          </div>

          {/* ACTIVE FILTER CHIPS */}
          {filterMonth && (
            <div className="pay-active-filters">
              <span className="pay-filter-chip">
                {MONTH_NAMES[parseInt(filterMonth.split("-")[1]) - 1]} {filterMonth.split("-")[0]}
                <button onClick={() => setFilterMonth(null)}>✕</button>
              </span>
            </div>
          )}

          {/* MONTH ACTIVITY PANEL */}
          {filterMonth && <MonthActivityPanel projects={projects} ym={filterMonth} />}

          {/* PROJECT SECTIONS */}
          {projects.map(proj => (
            <ProjectSection key={proj.id} proj={proj}
              expandedId={expandedId} onToggle={onToggle}
              filterMonth={filterMonth} />
          ))}

          {allPayments.length === 0 && (
            <div className="pay-empty">
              Finance hasn't raised any invoices for your projects yet.
            </div>
          )}

          {filterMonth && projects.every(proj =>
            proj.payments.filter(p => {
              if (!p.dueDate) return false;
              const d = new Date(p.dueDate);
              const [y, m] = filterMonth.split("-").map(Number);
              return d.getFullYear() === y && d.getMonth() === m - 1;
            }).length === 0
          ) && (
            <div className="pay-empty">
              No payments due in {MONTH_NAMES[parseInt(filterMonth.split("-")[1]) - 1]} {filterMonth.split("-")[0]}.
            </div>
          )}
        </>
      )}

    </div>
  );
}