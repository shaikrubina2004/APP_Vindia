import React, { useState, useRef, useEffect } from "react";
import "./Payment.css";

/* ─── DATA ─── */
const PROJECTS_DATA = [
  {
    id: 1, name: "Eiffel Tower – Paris", client: "XBC Developers",
    contractValue: 28900000, targetProfit: 35,
    startDate: "2025-05-01", deadline: "2025-12-15",
    payments: [
      { id: 1, invoiceNo: "INV-2025-001", milestone: "Foundation Completion", type: "Advance",     amount: 4200000,  dueDate: "2025-06-01", paidOn: "2025-06-12", status: "paid",    method: "Bank Transfer", remarks: "Received after foundation inspection." },
      { id: 2, invoiceNo: "INV-2025-002", milestone: "Block A Structure",     type: "Milestone 1", amount: 8700000,  dueDate: "2025-07-15", paidOn: "2025-07-01", status: "partial", method: "Cheque",        remarks: "65% released. Balance after completion." },
      { id: 3, invoiceNo: "INV-2025-003", milestone: "Electrical Phase 1",    type: "Milestone 2", amount: 2500000,  dueDate: "2025-08-10", paidOn: null,         status: "pending", method: "Bank Transfer", remarks: "Due after electrical phase 1 completion." },
      { id: 4, invoiceNo: "INV-2025-007", milestone: "Project Completion",    type: "Retention",   amount: 3000000,  dueDate: "2025-12-01", paidOn: null,         status: "pending", method: "Bank Transfer", remarks: "Released after defect liability period." },
    ],
  },
  {
    id: 2, name: "NH-66", client: "Govt. of India",
    contractValue: 38000000, targetProfit: 35,
    startDate: "2025-03-15", deadline: "2026-03-31",
    payments: [
      { id: 5, invoiceNo: "INV-2025-004", milestone: "Road Base Layer",       type: "Milestone 1", amount: 12000000, dueDate: "2025-06-05", paidOn: null,         status: "overdue", method: "Bank Transfer", remarks: "Pending government release order." },
      { id: 6, invoiceNo: "INV-2025-005", milestone: "Road Surface Layer",    type: "Milestone 2", amount: 8000000,  dueDate: "2025-09-01", paidOn: null,         status: "pending", method: "Bank Transfer", remarks: "Dependent on Milestone 1 clearance." },
    ],
  },
  {
    id: 3, name: "Tajmahal", client: "SHAJAHAAN",
    contractValue: 8500000, targetProfit: 35,
    startDate: "2025-06-20", deadline: "2025-12-31",
    payments: [
      { id: 7, invoiceNo: "INV-2025-006", milestone: "Site Clearance",        type: "Advance",     amount: 500000,   dueDate: "2025-07-10", paidOn: null,         status: "pending", method: "Cheque",        remarks: "Advance pending permit approval." },
    ],
  },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
const fmtCr = (n) =>
  n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr`
  : n >= 100000  ? `₹${(n/100000).toFixed(1)}L`
  : `₹${n.toLocaleString()}`;
const today       = new Date();
const daysOverdue = (d) => Math.ceil((today - new Date(d)) / 86400000);
const daysLeft    = (d) => Math.ceil((new Date(d) - today) / 86400000);
const getPaid = (payments) =>
  payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0) +
  payments.filter(p => p.status === "partial").reduce((s, p) => s + p.amount * 0.65, 0);

const STATUS_CFG = {
  paid:    { label: "Paid",    bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  partial: { label: "Partial", bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
  pending: { label: "Pending", bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
  overdue: { label: "Overdue", bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
};
const TYPE_COLOR = {
  "Advance": "#7c3aed", "Milestone 1": "#2563eb",
  "Milestone 2": "#0891b2", "Milestone 3": "#0891b2", "Retention": "#6366f1",
};

/* ─── build all months that have any activity (for the dropdown) ─── */
const buildActivityMonths = () => {
  const set = new Set();
  PROJECTS_DATA.forEach(proj => {
    [proj.startDate, proj.deadline, ...proj.payments.map(p => p.dueDate)]
      .filter(Boolean)
      .forEach(d => {
        const dt = new Date(d);
        set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
      });
  });
  return [...set].sort();
};
const ACTIVITY_MONTHS = buildActivityMonths();

/* ─── get activity for a given year-month string ─── */
const getMonthActivity = (ym) => {
  if (!ym) return null;
  const [year, month] = ym.split("-").map(Number);
  const mo = month - 1;
  const starts    = PROJECTS_DATA.filter(p => { const d = new Date(p.startDate); return d.getFullYear() === year && d.getMonth() === mo; }).map(p => ({ project: p.name, date: p.startDate }));
  const deadlines = PROJECTS_DATA.filter(p => { const d = new Date(p.deadline);  return d.getFullYear() === year && d.getMonth() === mo; }).map(p => ({ project: p.name, date: p.deadline }));
  const payments  = PROJECTS_DATA.flatMap(p => p.payments.filter(pay => { const d = new Date(pay.dueDate); return d.getFullYear() === year && d.getMonth() === mo; }).map(pay => ({ ...pay, projectName: p.name })));
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

/* ─── Month Year Picker — uses full-page overlay like notification panel ─── */
const MonthYearPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return new Date().getFullYear();
  });

  const activeYears = [...new Set(ACTIVITY_MONTHS.map(m => parseInt(m.split("-")[0])))].sort();
  const minYear = activeYears[0] || new Date().getFullYear();
  const maxYear = activeYears[activeYears.length - 1] || new Date().getFullYear();

  const activeMonthsInYear = ACTIVITY_MONTHS
    .filter(m => parseInt(m.split("-")[0]) === viewYear)
    .map(m => parseInt(m.split("-")[1]) - 1);

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
                const act = hasActivity ? getMonthActivity(ym) : null;
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
const MonthActivityPanel = ({ ym }) => {
  const activity = getMonthActivity(ym);
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
  const days    = overdue ? daysOverdue(p.dueDate) : p.status !== "paid" ? daysLeft(p.dueDate) : null;
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
            <div className="pay-detail-block"><p className="pay-detail-label">Due Date</p><p className="pay-detail-val">{fmt(p.dueDate)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Paid On</p><p className="pay-detail-val" style={{ color: p.paidOn ? "#16a34a" : "#94a3b8" }}>{fmt(p.paidOn)}</p></div>
            <div className="pay-detail-block"><p className="pay-detail-label">Amount</p><p className="pay-detail-val" style={{ color: "#2563eb", fontWeight: 800 }}>{fmtCr(p.amount)}</p></div>
            <div className="pay-detail-block pay-detail-block--wide"><p className="pay-detail-label">Remarks</p><p className="pay-detail-val">{p.remarks || "—"}</p></div>
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
        const d = new Date(p.dueDate);
        const [y, m] = filterMonth.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      })
    : proj.payments;

  if (payments.length === 0) return null;

  const totalAmount  = proj.payments.reduce((s, p) => s + p.amount, 0);
  const received     = getPaid(proj.payments);
  const outstanding  = totalAmount - received;
  const receivedPct  = totalAmount ? Math.round((received / totalAmount) * 100) : 0;
  const profitTarget = Math.round(proj.contractValue * (proj.targetProfit / 100));
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
          <p className="pay-project-stat__label">Target Profit (35%)</p>
          <p className="pay-project-stat__val" style={{ color: "#7c3aed" }}>{fmtCr(profitTarget)}</p>
          <p className="pay-project-stat__note">View only</p>
        </div>
      </div>
      <div className="pay-proj-bar-wrap">
        <div className="pay-proj-bar-track">
          <div className="pay-proj-bar-fill" style={{ width: `${receivedPct}%` }} />
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
  const [expandedId,    setExpanded]    = useState(null);
  const [filterMonth,   setFilterMonth]   = useState(null);

  const onToggle = (id) => setExpanded(prev => prev === id ? null : id);

  const allPayments      = PROJECTS_DATA.flatMap(p => p.payments);
  const totalContract    = PROJECTS_DATA.reduce((s, p) => s + p.contractValue, 0);
  const totalReceived    = PROJECTS_DATA.reduce((s, p) => s + getPaid(p.payments), 0);
  const totalOutstanding = totalContract - totalReceived;
  const totalOverdue     = allPayments.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const overallPct       = totalContract ? Math.round((totalReceived / totalContract) * 100) : 0;

  const visibleProjects = PROJECTS_DATA;

  return (
    <div className="pay-page">

      {/* HEADER */}
      <div className="pay-header">
        <div>
          <p className="pay-breadcrumb">Project Coordinator / Payments</p>
          <h1 className="pay-title">Payments</h1>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="pay-summary">
        {[
          { label: "Total Contract Value", val: fmtCr(totalContract),    color: "#0a2540" },
          { label: "Amount Received",      val: fmtCr(totalReceived),    color: "#16a34a" },
          { label: "Outstanding",          val: fmtCr(totalOutstanding), color: "#2563eb" },
          { label: "Overdue Amount",        val: fmtCr(totalOverdue),     color: "#dc2626" },
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
          <div className="pay-progress-fill pay-progress-fill--paid" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* FILTER ROW — All Projects label + month picker */}
      <div className="pay-filter-bar">
        <div className="pay-all-projects-tag">
          All Projects
          <span className="pay-tab-count">{allPayments.length}</span>
        </div>
        <MonthYearPicker value={filterMonth} onChange={setFilterMonth} />
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
      {filterMonth && <MonthActivityPanel ym={filterMonth} />}

      {/* PROJECT SECTIONS */}
      {visibleProjects.map(proj => (
        <ProjectSection key={proj.id} proj={proj}
          expandedId={expandedId} onToggle={onToggle}
          filterMonth={filterMonth} />
      ))}

      {filterMonth && visibleProjects.every(proj =>
        proj.payments.filter(p => {
          const d = new Date(p.dueDate);
          const [y, m] = filterMonth.split("-").map(Number);
          return d.getFullYear() === y && d.getMonth() === m - 1;
        }).length === 0
      ) && (
        <div className="pay-empty">
          No payments due in {MONTH_NAMES[parseInt(filterMonth.split("-")[1]) - 1]} {filterMonth.split("-")[0]}.
        </div>
      )}

    </div>
  );
}