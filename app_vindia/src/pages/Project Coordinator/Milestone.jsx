import React, { useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./Milestone.css";

/* ─────────────────────────────────────────
   MOCK DATA
   In production: PM creates these via API
───────────────────────────────────────── */
const MOCK_MILESTONES = [
  {
    id: 1,
    title: "Foundation Completion",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete all foundation work including concrete pouring and curing for Block A and Block B.",
    startDate: "2025-05-01",
    dueDate: "2025-06-10",
    progress: 100,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "None",
    dependencies: "Site clearance and soil testing",
    budget: 4200000,
    payment: {
      amount: 4200000,
      status: "paid",
      paidOn: "2025-06-12",
      method: "Bank Transfer",
      invoiceNo: "INV-2025-001",
    },
    nextPlan: {
      title: "Block A Structure",
      startDate: "2025-06-15",
      notes: "Begin column casting for Block A immediately after foundation curing.",
    },
    visibleToClient: true,
  },
  {
    id: 2,
    title: "Block A Structure Complete",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete the full structural work for Block A — columns, beams, and slab.",
    startDate: "2025-06-01",
    dueDate: "2025-07-15",
    progress: 65,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Material delay risk — steel procurement pending",
    dependencies: "Foundation Completion",
    budget: 8700000,
    payment: {
      amount: 5655000,
      status: "partial",
      paidOn: "2025-07-01",
      method: "Cheque",
      invoiceNo: "INV-2025-002",
    },
    nextPlan: {
      title: "Block B Structure",
      startDate: "2025-07-20",
      notes: "Mobilise additional workforce. Ensure steel stock before start.",
    },
    visibleToClient: true,
  },
  {
    id: 3,
    title: "Electrical Work Phase 1",
    project: "Eiffel Tower – Paris",
    phase: "MEP",
    description: "Complete electrical conduit laying and wiring for ground and first floor.",
    startDate: "2025-07-01",
    dueDate: "2025-08-10",
    progress: 20,
    assignedTo: "MEP Engineer",
    risks: "Coordination with structural team required",
    dependencies: "Block A Structure Complete",
    budget: 2500000,
    payment: {
      amount: 0,
      status: "pending",
      paidOn: null,
      method: "Bank Transfer",
      invoiceNo: "INV-2025-003",
    },
    nextPlan: {
      title: "Electrical Phase 2",
      startDate: "2025-08-15",
      notes: "Cover upper floors once Phase 1 inspection is cleared.",
    },
    visibleToClient: false,
  },
  {
    id: 4,
    title: "NH-66 Road Base Layer",
    project: "NH-66",
    phase: "Civil",
    description: "Lay the base layer (sub-base and base course) for 5km stretch of NH-66.",
    startDate: "2025-05-15",
    dueDate: "2025-06-05",
    progress: 40,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Weather dependency — monsoon risk",
    dependencies: "Survey and alignment approval",
    budget: 12000000,
    payment: {
      amount: 0,
      status: "overdue",
      paidOn: null,
      method: "Bank Transfer",
      invoiceNo: "INV-2025-004",
    },
    nextPlan: {
      title: "Road Surface Layer",
      startDate: "2025-06-20",
      notes: "Surface layer to begin after base layer QC approval from government inspector.",
    },
    visibleToClient: true,
  },
  {
    id: 5,
    title: "Tajmahal Site Clearance",
    project: "Tajmahal",
    phase: "Pre-Construction",
    description: "Complete full site clearance, leveling and boundary marking.",
    startDate: "2025-06-20",
    dueDate: "2025-07-05",
    progress: 0,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Permit approval delay",
    dependencies: "None",
    budget: 500000,
    payment: {
      amount: 0,
      status: "pending",
      paidOn: null,
      method: "Cheque",
      invoiceNo: "INV-2025-005",
    },
    nextPlan: {
      title: "Foundation Survey",
      startDate: "2025-07-10",
      notes: "Soil testing and foundation survey to begin after site clearance.",
    },
    visibleToClient: false,
  },
];

/* ─── helpers ─── */
const today = new Date();

const getStatus = (m) => {
  if (m.progress === 100) return "completed";
  if (new Date(m.dueDate) < today && m.progress < 100) return "delayed";
  if (m.progress > 0) return "in-progress";
  return "not-started";
};

const STATUS_CFG = {
  "completed":   { label: "Completed",   bg: "#d1fae5", color: "#065f46", border: "#10b981", bar: "#10b981" },
  "in-progress": { label: "In Progress", bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb", bar: "#2563eb" },
  "delayed":     { label: "Delayed",     bg: "#fee2e2", color: "#991b1b", border: "#ef4444", bar: "#ef4444" },
  "not-started": { label: "Not Started", bg: "#f1f5f9", color: "#475569", border: "#94a3b8", bar: "#cbd5e1" },
};

const PAY_CFG = {
  paid:    { label: "Paid",         bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  partial: { label: "Partial",      bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb" },
  pending: { label: "Pending",      bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  overdue: { label: "Payment Overdue", bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

const TABS = ["All", "In Progress", "Completed", "Delayed", "Not Started"];

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtCr = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;
const daysLeft = (due) => Math.ceil((new Date(due) - today) / (1000 * 60 * 60 * 24));

/* ─── small components ─── */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status];
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      <span className="ms-badge__dot" style={{ background: c.color }} />
      {c.label}
    </span>
  );
};

const PayBadge = ({ status }) => {
  const c = PAY_CFG[status] || PAY_CFG.pending;
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      {c.label}
    </span>
  );
};

const DetailBlock = ({ label, val, wide, highlight }) => (
  <div className={`ms-detail-block ${wide ? "ms-detail-block--wide" : ""}`}
    style={highlight ? { borderColor: highlight, background: `${highlight}08` } : {}}>
    <p className="ms-detail-label">{label}</p>
    <p className="ms-detail-val">{val || "—"}</p>
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Milestone() {
  const milestones = MOCK_MILESTONES.map(m => ({ ...m, status: getStatus(m) }));

  const [activeTab,    setActiveTab]    = useState("All");
  const [expandedId,   setExpanded]     = useState(null);
  const [filterProj,   setFilterProj]   = useState("All");
  const [clientView,   setClientView]   = useState(false); // toggle client view
  const [activeSection, setActiveSection] = useState({}); // per-card tab: "details"|"payment"|"next"

  const projects = ["All", ...new Set(milestones.map(m => m.project))];

  const visibleMilestones = clientView
    ? milestones.filter(m => m.visibleToClient)
    : milestones;

  const filtered = visibleMilestones.filter(m => {
    const tabMatch =
      activeTab === "All" ||
      (activeTab === "In Progress"  && m.status === "in-progress")  ||
      (activeTab === "Completed"    && m.status === "completed")     ||
      (activeTab === "Delayed"      && m.status === "delayed")       ||
      (activeTab === "Not Started"  && m.status === "not-started");
    const projMatch = filterProj === "All" || m.project === filterProj;
    return tabMatch && projMatch;
  });

  const counts = {
    total:      visibleMilestones.length,
    completed:  visibleMilestones.filter(m => m.status === "completed").length,
    inProgress: visibleMilestones.filter(m => m.status === "in-progress").length,
    delayed:    visibleMilestones.filter(m => m.status === "delayed").length,
    notStarted: visibleMilestones.filter(m => m.status === "not-started").length,
  };

  const totalBudget = visibleMilestones.reduce((s, m) => s + (m.budget || 0), 0);
  const totalPaid   = visibleMilestones.reduce((s, m) => s + (m.payment?.amount || 0), 0);
  const payPct      = totalBudget ? Math.round((totalPaid / totalBudget) * 100) : 0;

  const overallPct  = visibleMilestones.length
    ? Math.round(visibleMilestones.reduce((s, m) => s + m.progress, 0) / visibleMilestones.length)
    : 0;

  const radialData = [
    { name: "Completed",   value: counts.completed,  fill: "#10b981" },
    { name: "In Progress", value: counts.inProgress,  fill: "#2563eb" },
    { name: "Delayed",     value: counts.delayed,     fill: "#ef4444" },
    { name: "Not Started", value: counts.notStarted,  fill: "#cbd5e1" },
  ];

  const getSec = (id) => activeSection[id] || "details";
  const setSec = (id, sec) => setActiveSection(p => ({ ...p, [id]: sec }));

  return (
    <div className="ms-page">

      {/* HEADER */}
      <div className="ms-header">
        <div>
          <h1 className="ms-title">Milestones</h1>
        </div>
        <div className="ms-header-right">
          {/* client view toggle */}
          <div className="ms-toggle-wrap">
            <span className="ms-toggle-label">Client View</span>
            <button
              className={`ms-toggle ${clientView ? "on" : ""}`}
              onClick={() => setClientView(v => !v)}>
              <span className="ms-toggle__knob" />
            </button>
          </div>
          <select className="ms-select"
            value={filterProj} onChange={e => setFilterProj(e.target.value)}>
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* CLIENT VIEW BANNER */}
      {clientView && (
        <div className="ms-client-banner">
          <span className="ms-client-banner__dot" />
          <span>Client View — showing only milestones marked visible to client ({counts.total} milestones)</span>
        </div>
      )}

      {/* SUMMARY ROW */}
      <div className="ms-summary">

        {/* stat cards - full width row */}
        <div className="ms-stat-grid">
          {[
            { label: "Total",       val: counts.total,      color: "#0a2540" },
            { label: "Completed",   val: counts.completed,  color: "#10b981" },
            { label: "In Progress", val: counts.inProgress, color: "#2563eb" },
            { label: "Delayed",     val: counts.delayed,    color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="ms-stat-card">
              <p className="ms-stat-card__label">{s.label}</p>
              <p className="ms-stat-card__val" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* chart + payment side by side */}
        <div className="ms-summary-row2">

        {/* radial chart */}
        <div className="ms-chart-card">
          <div className="ms-chart-card__left">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%"
                data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#f0f6ff" }} />
                <Tooltip content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="ms-tooltip">
                      <p style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].payload.name}</p>
                      <p>{payload[0].value} milestones</p>
                    </div>
                  ) : null} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="ms-chart-card__right">
            <p className="ms-chart-card__pct">{overallPct}%</p>
            <p className="ms-chart-card__sublabel">Overall Progress</p>
            <div className="ms-chart-legend">
              {radialData.map(d => (
                <div key={d.name} className="ms-legend-row">
                  <span className="ms-legend-dot" style={{ background: d.fill }} />
                  <span className="ms-legend-label">{d.name}</span>
                  <span className="ms-legend-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* payment summary card — minimal, full details on Payments page */}
        <div className="ms-pay-summary">
          <p className="ms-pay-summary__title">Payment Overview</p>
          <div className="ms-pay-summary__row">
            <div>
              <p className="ms-pay-summary__label">Total Budget</p>
              <p className="ms-pay-summary__val">{fmtCr(totalBudget)}</p>
            </div>
            <div>
              <p className="ms-pay-summary__label">Received</p>
              <p className="ms-pay-summary__val" style={{ color: "#10b981" }}>{fmtCr(totalPaid)}</p>
            </div>
          </div>
          <div className="ms-pay-bar-track">
            <div className="ms-pay-bar-fill" style={{ width: `${payPct}%` }} />
          </div>
          <p className="ms-pay-pct">{payPct}% received · {fmtCr(totalBudget - totalPaid)} outstanding</p>
          <p className="ms-pay-note">Full payment details available in the Payments section.</p>
        </div>
        </div>

      </div>

      {/* TABS */}
      <div className="ms-tabs">
        {TABS.map(t => {
          const cnt =
            t === "All"         ? counts.total :
            t === "In Progress" ? counts.inProgress :
            t === "Completed"   ? counts.completed :
            t === "Delayed"     ? counts.delayed : counts.notStarted;
          return (
            <button key={t} className={`ms-tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}>
              {t}
              <span className="ms-tab__count">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* MILESTONE LIST */}
      {filtered.length === 0 && (
        <div className="ms-empty">No milestones found for this filter.</div>
      )}

      <div className="ms-list">
        {filtered.map(m => {
          const sc      = STATUS_CFG[m.status];
          const pc      = PAY_CFG[m.payment?.status] || PAY_CFG.pending;
          const isOpen  = expandedId === m.id;
          const days    = daysLeft(m.dueDate);
          const isOverdue = m.status === "delayed";
          const paidPct = m.budget ? Math.round(((m.payment?.amount || 0) / m.budget) * 100) : 0;
          const sec     = getSec(m.id);

          return (
            <div key={m.id} className={`ms-card ${isOpen ? "open" : ""} ${isOverdue ? "overdue" : ""}`}>
              <div className="ms-card__accent" style={{ background: sc.bar }} />

              {/* collapsed header */}
              <div className="ms-card__header" onClick={() => setExpanded(isOpen ? null : m.id)}>
                <div className="ms-card__main">
                  <div className="ms-card__top">
                    <h3 className="ms-card__title">{m.title}</h3>
                    <StatusBadge status={m.status} />
                    <PayBadge status={m.payment?.status} />
                    {m.visibleToClient && <span className="ms-client-chip">Client</span>}
                  </div>
                  <p className="ms-card__project">{m.project} &nbsp;·&nbsp; {m.phase}</p>
                  <div className="ms-card__progress-row">
                    <div className="ms-bar-track">
                      <div className="ms-bar-fill" style={{ width: `${m.progress}%`, background: sc.bar }} />
                    </div>
                    <span className="ms-card__pct" style={{ color: sc.bar }}>{m.progress}%</span>
                  </div>
                </div>

                <div className="ms-card__meta">
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">Budget</p>
                    <p className="ms-meta-val">{fmtCr(m.budget)}</p>
                  </div>
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">Due Date</p>
                    <p className="ms-meta-val">{fmt(m.dueDate)}</p>
                  </div>
                  <div className="ms-meta-item">
                    <p className="ms-meta-label">{isOverdue ? "Overdue by" : "Days Left"}</p>
                    <p className="ms-meta-val"
                      style={{ color: isOverdue ? "#ef4444" : days <= 7 ? "#f59e0b" : "#0a2540", fontWeight: 700 }}>
                      {isOverdue ? `${Math.abs(days)} days` : days > 0 ? `${days} days` : "Due today"}
                    </p>
                  </div>
                  <span className="ms-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* expanded body */}
              {isOpen && (
                <div className="ms-card__body">

                  {/* inner tabs */}
                  <div className="ms-inner-tabs">
                    {["details", "payment", "next"].map(s => (
                      <button key={s}
                        className={`ms-inner-tab ${sec === s ? "active" : ""}`}
                        onClick={() => setSec(m.id, s)}>
                        {s === "details" ? "Milestone Details" :
                         s === "payment" ? "Payment Details" : "Next Planning"}
                      </button>
                    ))}
                  </div>

                  {/* ── DETAILS ── */}
                  {sec === "details" && (
                    <div className="ms-detail-grid">
                      <DetailBlock label="Description" val={m.description} wide />
                      <DetailBlock label="Start Date"    val={fmt(m.startDate)} />
                      <DetailBlock label="Due Date"      val={fmt(m.dueDate)} />
                      <DetailBlock label="Assigned To"   val={m.assignedTo} />
                      <DetailBlock label="Phase"         val={m.phase} />
                      <DetailBlock label="Dependencies"  val={m.dependencies} />
                      <DetailBlock label="Risks / Issues" val={m.risks}
                        highlight={m.risks !== "None" ? "#ef4444" : null} />
                      <div className="ms-detail-block">
                        <p className="ms-detail-label">Progress</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                          <div className="ms-bar-track" style={{ flex: 1 }}>
                            <div className="ms-bar-fill" style={{ width: `${m.progress}%`, background: sc.bar }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sc.bar }}>{m.progress}%</span>
                        </div>
                      </div>
                      <div className="ms-detail-block">
                        <p className="ms-detail-label">Visible to Client</p>
                        <p className="ms-detail-val" style={{ color: m.visibleToClient ? "#10b981" : "#94a3b8", fontWeight: 700 }}>
                          {m.visibleToClient ? "Yes — visible" : "No — internal only"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── PAYMENT ── */}
                  {sec === "payment" && (
                    <div className="ms-payment-body">
                      <div className="ms-payment-hero">
                        <div>
                          <p className="ms-payment-hero__label">Milestone Budget</p>
                          <p className="ms-payment-hero__val">{fmtCr(m.budget)}</p>
                        </div>
                        <div>
                          <p className="ms-payment-hero__label">Amount Received</p>
                          <p className="ms-payment-hero__val" style={{ color: "#10b981" }}>
                            {fmtCr(m.payment?.amount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="ms-payment-hero__label">Payment Status</p>
                          <PayBadge status={m.payment?.status} />
                        </div>
                        <div>
                          <p className="ms-payment-hero__label">Invoice No.</p>
                          <p className="ms-payment-hero__val" style={{ fontSize: 14 }}>{m.payment?.invoiceNo}</p>
                        </div>
                      </div>

                      <div className="ms-payment-bar-wrap">
                        <div className="ms-pay-bar-track">
                          <div className="ms-pay-bar-fill"
                            style={{ width: `${paidPct}%`,
                              background: m.payment?.status === "paid" ? "#10b981"
                                : m.payment?.status === "overdue" ? "#ef4444" : "#2563eb" }} />
                        </div>
                        <span className="ms-pay-pct-label">{paidPct}% paid</span>
                      </div>

                      {m.payment?.status === "overdue" && (
                        <div className="ms-overdue-alert">
                          Payment is overdue for this milestone. Please follow up with the Project Manager.
                        </div>
                      )}

                      <div className="ms-pay-redirect-note">
                        For full payment history, invoices and transactions — go to the
                        <strong> Payments</strong> section in the sidebar.
                      </div>
                    </div>
                  )}

                  {/* ── NEXT PLANNING ── */}
                  {sec === "next" && (
                    <div className="ms-next-body">
                      <div className="ms-next-card">
                        <div className="ms-next-card__header">
                          <div>
                            <p className="ms-next-card__label">Next Milestone</p>
                            <h3 className="ms-next-card__title">{m.nextPlan?.title || "—"}</h3>
                          </div>
                          <div className="ms-next-card__date">
                            <p className="ms-next-card__label">Planned Start</p>
                            <p className="ms-next-card__dateval">{fmt(m.nextPlan?.startDate)}</p>
                          </div>
                        </div>
                        <div className="ms-next-card__notes">
                          <p className="ms-detail-label">Planning Notes</p>
                          <p className="ms-next-card__notetext">{m.nextPlan?.notes || "—"}</p>
                        </div>

                        {/* timeline visual */}
                        <div className="ms-timeline">
                          <div className="ms-timeline__item ms-timeline__item--done">
                            <div className="ms-timeline__dot" style={{ background: sc.bar }} />
                            <div className="ms-timeline__content">
                              <p className="ms-timeline__title">{m.title}</p>
                              <p className="ms-timeline__sub">Due: {fmt(m.dueDate)} · {m.progress}% complete</p>
                            </div>
                          </div>
                          <div className="ms-timeline__line" />
                          <div className="ms-timeline__item">
                            <div className="ms-timeline__dot ms-timeline__dot--next" />
                            <div className="ms-timeline__content">
                              <p className="ms-timeline__title">{m.nextPlan?.title}</p>
                              <p className="ms-timeline__sub">Planned Start: {fmt(m.nextPlan?.startDate)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}