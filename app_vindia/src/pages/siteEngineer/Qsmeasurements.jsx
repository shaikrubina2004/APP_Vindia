// src/pages/qs/QSMeasurements.jsx
// QS view: Receive SE measurements → verify quantities vs BOQ → approve/reject → generate billing %
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/QSMeasurements.css";

/* ── constants ───────────────────────────────────────────── */
const PAGE_SIZE = 8;

const STATUS_FLOW = ["pending", "verified", "approved", "rejected"];

const STATUS_CFG = {
  pending:  { label: "Pending QS",    icon: "⏳" },
  verified: { label: "Verified",      icon: "🔍" },
  approved: { label: "Approved",      icon: "✅" },
  rejected: { label: "Rejected",      icon: "❌" },
};

const UNITS = ["m³", "m²", "m", "kg", "tonne", "nos", "bag", "litre", "LS"];

/* ── demo data ───────────────────────────────────────────── */
const DEMO = [
  {
    id: 1, refNo: "MSR-001", zone: "Level 2 / Grid A–D", activity: "Column Casting",
    submittedBy: "Ahmed Al-Rashid", submittedAt: new Date(Date.now() - 2*3600000).toISOString(),
    status: "pending",
    linked_rfi: "", linked_ncr: "",
    notes: "All 12 columns poured. Lab cylinders collected. Batch certs attached.",
    items: [
      { description: "Concrete C30",    unit: "m³",  qty_actual: 18.4, qty_boq: 20.0 },
      { description: "TMT Rebar Fe500", unit: "kg",  qty_actual: 2840, qty_boq: 3000 },
      { description: "Formwork",        unit: "m²",  qty_actual: 112,  qty_boq: 120  },
    ],
  },
  {
    id: 2, refNo: "MSR-002", zone: "Basement B1", activity: "Waterproofing Membrane",
    submittedBy: "Priya Sharma", submittedAt: new Date(Date.now() - 26*3600000).toISOString(),
    status: "verified",
    linked_rfi: "", linked_ncr: "NCR-028",
    notes: "60% complete — remainder halted pending NCR-028 resolution (wet conditions).",
    items: [
      { description: "Waterproofing membrane", unit: "m²", qty_actual: 320, qty_boq: 530 },
      { description: "Primer coat",            unit: "m²", qty_actual: 320, qty_boq: 530 },
    ],
    qs_notes: "Quantities confirmed on site visit 24 Apr. NCR-028 noted — partial approval.",
  },
  {
    id: 3, refNo: "MSR-003", zone: "Level 1 / Slab S7", activity: "Rebar Fixing",
    submittedBy: "Ahmed Al-Rashid", submittedAt: new Date(Date.now() - 3*86400000).toISOString(),
    status: "approved",
    linked_rfi: "", linked_ncr: "",
    notes: "Rebar complete. Additional bars added per NCR-029 corrective action.",
    items: [
      { description: "TMT Rebar 12mm", unit: "kg", qty_actual: 1850, qty_boq: 1800 },
      { description: "Binding wire",   unit: "kg", qty_actual: 45,   qty_boq: 40   },
    ],
    qs_notes: "Approved. Variance on rebar (+50 kg) within 3% BOQ tolerance. Billing authorised.",
    approved_at: new Date(Date.now() - 2*86400000).toISOString(),
  },
  {
    id: 4, refNo: "MSR-004", zone: "Level 4 / Staircore", activity: "Formwork Erection",
    submittedBy: "Khalid Noor", submittedAt: new Date(Date.now() - 5*86400000).toISOString(),
    status: "rejected",
    linked_rfi: "RFI-028", linked_ncr: "",
    notes: "30% complete. Stopped pending RFI-028 design clarification.",
    items: [
      { description: "Formwork panels", unit: "m²", qty_actual: 48, qty_boq: 160 },
    ],
    rejection_reason: "Measurement rejected — work stopped due to RFI-028. Resubmit when RFI resolved and work resumes to at least 50% completion.",
  },
  {
    id: 5, refNo: "MSR-005", zone: "Level 3 / Grid A–D", activity: "Column Casting",
    submittedBy: "Ahmed Al-Rashid", submittedAt: new Date(Date.now() - 1*3600000).toISOString(),
    status: "pending",
    linked_rfi: "", linked_ncr: "",
    notes: "7 of 12 columns cast today. Remaining 5 scheduled tomorrow.",
    items: [
      { description: "Concrete C30",    unit: "m³", qty_actual: 10.8, qty_boq: 16.8 },
      { description: "TMT Rebar Fe500", unit: "kg", qty_actual: 1620, qty_boq: 2520 },
    ],
  },
];

/* ── helpers ─────────────────────────────────────────────── */
function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.refNo || ""}|${it.zone || ""}|${it.submittedAt || ""}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function completionPct(items = []) {
  if (!items.length) return 0;
  const tot = items.reduce((s, it) => s + Number(it.qty_boq || 0), 0);
  const act = items.reduce((s, it) => s + Number(it.qty_actual || 0), 0);
  if (!tot) return 0;
  return Math.min(100, Math.round((act / tot) * 100));
}

function variance(actual, boq) {
  if (!boq) return 0;
  return Math.round(((actual - boq) / boq) * 100);
}

function barColor(pct) {
  if (pct >= 100) return "var(--c-danger)";
  if (pct >= 80)  return "var(--c-success)";
  return "linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))";
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function QSMeasurements() {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStat, setFStat]  = useState("all");
  const [expandedId, setExp]    = useState(null);
  const [updating, setUpdating] = useState(null);
  const [qsNotes, setQSNotes]   = useState({});     // { [id]: "QS notes text" }
  const [rejectReason, setRej]  = useState({});     // { [id]: "rejection reason" }
  const [showReject, setShowRej]= useState({});     // { [id]: boolean }
  const [page, setPage]         = useState(1);
  const alive = useRef(true);

  /* ── load ─────────────────────────────────────────────── */
  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/measurements");
      if (!alive.current) return;
      const raw = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      const data = raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; });
      setMeasurements(data.length ? data : DEMO);
    } catch {
      if (alive.current) setMeasurements(DEMO);
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  /* ── verify action (QS reviews → pending → verified) ──── */
  const verify = useCallback(async (m) => {
    if (updating) return;
    setUpdating(m.id);
    const body = {
      status: "verified",
      qs_notes: qsNotes[m.id] || "",
      verified_at: new Date().toISOString(),
    };
    try {
      await api.patch(`/measurements/${m.id}`, body);
      setMeasurements(s => s.map(it => it.id === m.id ? { ...it, ...body } : it));
    } catch { alert("Update failed — check connection"); }
    finally { setUpdating(null); }
  }, [updating, qsNotes]);

  /* ── approve action (verified → approved) ─────────────── */
  const approve = useCallback(async (m) => {
    if (updating) return;
    setUpdating(m.id);
    const body = {
      status: "approved",
      qs_notes: qsNotes[m.id] || m.qs_notes || "",
      approved_at: new Date().toISOString(),
    };
    try {
      await api.patch(`/measurements/${m.id}`, body);
      setMeasurements(s => s.map(it => it.id === m.id ? { ...it, ...body } : it));
    } catch { alert("Update failed — check connection"); }
    finally { setUpdating(null); }
  }, [updating, qsNotes]);

  /* ── reject action ─────────────────────────────────────── */
  const reject = useCallback(async (m) => {
    if (updating) return;
    const reason = rejectReason[m.id] || "";
    if (!reason.trim()) { alert("Please enter a rejection reason before rejecting."); return; }
    setUpdating(m.id);
    const body = {
      status: "rejected",
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    };
    try {
      await api.patch(`/measurements/${m.id}`, body);
      setMeasurements(s => s.map(it => it.id === m.id ? { ...it, ...body } : it));
      setShowRej(r => ({ ...r, [m.id]: false }));
    } catch { alert("Update failed — check connection"); }
    finally { setUpdating(null); }
  }, [updating, rejectReason]);

  /* ── filter ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = measurements.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.zone        || "").toLowerCase().includes(q) ||
        (it.activity    || "").toLowerCase().includes(q) ||
        (it.submittedBy || "").toLowerCase().includes(q) ||
        (it.refNo       || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all")
      list = list.filter(it => (it.status || "pending") === filterStat);
    return list;
  }, [measurements, search, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  /* ── stats ────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    pending:  measurements.filter(m => m.status === "pending"  || !m.status).length,
    verified: measurements.filter(m => m.status === "verified").length,
    approved: measurements.filter(m => m.status === "approved").length,
    rejected: measurements.filter(m => m.status === "rejected").length,
  }), [measurements]);

  /* ── overall billing % (approved only) ───────────────── */
  const overallPct = useMemo(() => {
    const approved = measurements.filter(m => m.status === "approved");
    if (!approved.length) return 0;
    const ptot = approved.reduce((s, m) => {
      const items = parseItems(m.items);
      return s + items.reduce((ss, it) => ss + Number(it.qty_boq || 0), 0);
    }, 0);
    const aact = approved.reduce((s, m) => {
      const items = parseItems(m.items);
      return s + items.reduce((ss, it) => ss + Number(it.qty_actual || 0), 0);
    }, 0);
    return ptot ? Math.min(100, Math.round((aact / ptot) * 100)) : 0;
  }, [measurements]);

  /* billing by zone */
  const billingByZone = useMemo(() => {
    const zones = [...new Set(measurements.map(m => m.zone).filter(Boolean))];
    return zones.slice(0, 8).map(z => {
      const zItems = measurements.filter(m => m.zone === z);
      const approved = zItems.filter(m => m.status === "approved");
      const pct = completionPct(approved.flatMap(m => parseItems(m.items)));
      const hasApproved = approved.length > 0;
      const hasPending  = zItems.some(m => m.status === "pending" || !m.status);
      return { z, pct, hasApproved, hasPending };
    });
  }, [measurements]);

  function parseItems(items) {
    if (!items) return [];
    if (typeof items === "string") { try { return JSON.parse(items); } catch { return []; } }
    return Array.isArray(items) ? items : [];
  }

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="qs-page">

      {/* ── HEADER ── */}
      <div className="qs-page-header">
        <div>
          <div className="qs-eyebrow">Quantity Surveyor</div>
          <h1 className="qs-title">Measurement Verification</h1>
          <div className="qs-sub">
            Review site measurements from Engineers — verify quantities vs BOQ — approve for billing
          </div>
        </div>
        <div className="qs-header-pills">
          <span className="qs-pill qs-pill--amber">{stats.pending} Pending</span>
          <span className="qs-pill qs-pill--success">{stats.approved} Approved</span>
          <span className="qs-pill qs-pill--muted">{measurements.length} Total</span>
        </div>
      </div>

      {/* ── WORKFLOW PIPELINE ── */}
      <div className="qs-pipeline">
        {[
          { dot: "qs-pipeline-dot--se",      icon: "👷", label: "Site Engineer", sub: "Submits measurements" },
          null,
          { dot: "qs-pipeline-dot--qs",      icon: "🔍", label: "QS — Verify",   sub: "Check vs BOQ on site" },
          null,
          { dot: "qs-pipeline-dot--qs",      icon: "✅", label: "QS — Approve",  sub: "Authorise billing qty" },
          null,
          { dot: "qs-pipeline-dot--billing", icon: "💰", label: "Billing",       sub: "Interim certificate" },
        ].map((step, i) => step === null ? (
          <div key={i} className="qs-pipeline-arrow">›</div>
        ) : (
          <div key={i} className="qs-pipeline-node">
            <div className={`qs-pipeline-dot ${step.dot}`}>{step.icon}</div>
            <div className="qs-pipeline-label">{step.label}</div>
            <div className="qs-pipeline-sub">{step.sub}</div>
          </div>
        ))}
      </div>

      {/* ── KPI STATS BAR ── */}
      <div className="qs-stats-bar">
        {[
          { icon: "⏳", num: stats.pending,  lbl: "Pending Review",  mod: "pending",  action: () => { setFStat("pending");  setPage(1); } },
          { icon: "🔍", num: stats.verified, lbl: "Verified",        mod: "verified", action: () => { setFStat("verified"); setPage(1); } },
          { icon: "✅", num: stats.approved, lbl: "Approved",        mod: "approved", action: () => { setFStat("approved"); setPage(1); } },
          { icon: "❌", num: stats.rejected, lbl: "Rejected",        mod: "rejected", action: () => { setFStat("rejected"); setPage(1); } },
        ].map(({ icon, num, lbl, mod, action }) => (
          <div key={lbl} className={`qs-stat-card qs-stat-card--${mod}`} onClick={action}>
            <div className="qs-stat-icon">{icon}</div>
            <div className="qs-stat-info">
              <div className="qs-stat-num">{num}</div>
              <div className="qs-stat-lbl">{lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── BOQ BILLING BANNER ── */}
      {measurements.length > 0 && (
        <div className="qs-boq-banner">
          <div className="qs-boq-pct">{overallPct}%</div>
          <div className="qs-boq-info">
            <div className="qs-boq-label">Overall Billing Authorised — Al-Noor Residential Tower · Block C Phase 2</div>
            <div className="qs-boq-track">
              <div className="qs-boq-fill" style={{ width: `${overallPct}%` }} />
            </div>
            <div className="qs-boq-meta">
              Based on {stats.approved} approved measurement{stats.approved !== 1 ? "s" : ""} · {stats.pending} pending review
            </div>
          </div>
          <div className="qs-boq-figures">
            <div className="qs-boq-fig">
              <div className="qs-boq-fig-val">{stats.approved}</div>
              <div className="qs-boq-fig-lbl">Approved</div>
            </div>
            <div className="qs-boq-fig">
              <div className="qs-boq-fig-val">{stats.pending}</div>
              <div className="qs-boq-fig-lbl">Pending</div>
            </div>
            <div className="qs-boq-fig">
              <div className="qs-boq-fig-val">{stats.rejected}</div>
              <div className="qs-boq-fig-lbl">Rejected</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="qs-layout">

        {/* ══ LEFT — MEASUREMENT LIST ══════════════════════ */}
        <div className="qs-main">
          <div className="qs-panel">
            <div className="qs-panel-head">
              <div className="qs-panel-title">Measurement Submissions</div>
              <span className="qs-pill qs-pill--muted">{filtered.length} records</span>
            </div>

            {/* Search + status filter */}
            <div className="qs-controls">
              <div className="qs-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search zone, activity, engineer, ref…"
                  aria-label="Search measurements"
                />
              </div>
              <select
                className="qs-input qs-select"
                style={{ width: 160 }}
                value={filterStat}
                onChange={e => { setFStat(e.target.value); setPage(1); }}
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label || s}</option>)}
              </select>
            </div>

            {/* Quick filter chips */}
            <div className="qs-filter-chips">
              <span
                className={`qs-filter-chip${filterStat === "all" ? " qs-filter-chip--active" : ""}`}
                onClick={() => { setFStat("all"); setPage(1); }}
              >All</span>
              {STATUS_FLOW.map(s => (
                <span
                  key={s}
                  className={`qs-filter-chip qs-filter-chip--${s}${filterStat === s ? ` qs-filter-chip--active` : ""}`}
                  onClick={() => { setFStat(prev => prev === s ? "all" : s); setPage(1); }}
                >
                  {STATUS_CFG[s]?.icon} {STATUS_CFG[s]?.label}
                </span>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="qs-loading"><div className="qs-spinner" role="status" />Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="qs-empty">No measurement submissions match this filter</div>
            ) : (
              <>
                {pageItems.map((m, idx) => {
                  const items  = parseItems(m.items);
                  const pct    = completionPct(items);
                  const isOpen = expandedId === m.id;
                  const status = m.status || "pending";

                  return (
                    <div
                      key={stableKey(m)}
                      className={`qs-item qs-item--${status}`}
                      style={{ animationDelay: `${idx * 35}ms` }}
                    >
                      {/* Header row — click to expand */}
                      <div
                        className="qs-item-header"
                        onClick={() => setExp(isOpen ? null : m.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && setExp(isOpen ? null : m.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="qs-item-main">
                          {/* Tags row */}
                          <div className="qs-item-tags">
                            <span className="qs-ref">{m.refNo || `MSR-${String(m.id ?? "").padStart(3, "0")}`}</span>
                            <span className={`qs-badge qs-badge--${status}`}>
                              {STATUS_CFG[status]?.icon} {STATUS_CFG[status]?.label}
                            </span>
                            {m.linked_rfi && (
                              <span className="qs-pill qs-pill--amber">RFI: {m.linked_rfi}</span>
                            )}
                            {m.linked_ncr && (
                              <span className="qs-pill qs-pill--danger">NCR: {m.linked_ncr}</span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="qs-item-title">{m.zone} — {m.activity}</div>

                          {/* Completion bar */}
                          <div className="qs-item-bar-wrap">
                            <div className="qs-item-bar-head">
                              <span className="qs-item-bar-lbl">Completion vs BOQ</span>
                              <span className={`qs-item-bar-pct ${pct > 100 ? "qs-item-bar-pct--over" : status === "approved" ? "qs-item-bar-pct--approved" : "qs-item-bar-pct--normal"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="qs-item-bar-track">
                              <div className="qs-item-bar-boq" style={{ width: "100%" }} />
                              <div
                                className="qs-item-bar-actual"
                                style={{ width: `${Math.min(100, pct)}%`, background: barColor(pct) }}
                              />
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="qs-item-meta">
                            <span>👷 {m.submittedBy || "Site Engineer"}</span>
                            <span>📅 {fmtTime(m.submittedAt)}</span>
                            <span>📦 {items.length} line item{items.length !== 1 ? "s" : ""}</span>
                            {m.approved_at && <span>✅ Approved {fmtDate(m.approved_at)}</span>}
                          </div>
                        </div>

                        <div className="qs-item-arrow">
                          {isOpen ? "▲" : "›"}
                        </div>
                      </div>

                      {/* ── EXPANDED BODY ── */}
                      {isOpen && (
                        <div className="qs-expand">

                          {/* Line items table */}
                          <div>
                            <div className="qs-expand-section-title">Measurement Line Items</div>
                            <table className="qs-line-table">
                              <thead>
                                <tr>
                                  <th>Description</th>
                                  <th>Unit</th>
                                  <th>BOQ Qty</th>
                                  <th>Actual Qty</th>
                                  <th>% of BOQ</th>
                                  <th>Variance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((it, ii) => {
                                  const pBoq = Number(it.qty_boq || 0);
                                  const pAct = Number(it.qty_actual || 0);
                                  const lineP = pBoq ? Math.round((pAct / pBoq) * 100) : 0;
                                  const v = variance(pAct, pBoq);
                                  return (
                                    <tr key={ii}>
                                      <td style={{ fontWeight: 600, color: "var(--c-navy-900)" }}>{it.description}</td>
                                      <td style={{ fontFamily: "var(--c-mono)", color: "var(--c-text-3)" }}>{it.unit}</td>
                                      <td className="qs-line-boq">{pBoq.toLocaleString()}</td>
                                      <td className="qs-line-qty">{pAct.toLocaleString()}</td>
                                      <td>
                                        <span className={`qs-item-bar-pct ${lineP > 100 ? "qs-item-bar-pct--over" : "qs-item-bar-pct--normal"}`}>
                                          {lineP}%
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`qs-variance-tag qs-variance-tag--${v > 0 ? "over" : v < 0 ? "under" : "exact"}`}>
                                          {v > 0 ? `+${v}%` : v < 0 ? `${v}%` : "On BOQ"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* SE Notes */}
                          {m.notes && (
                            <div>
                              <div className="qs-expand-section-title">Site Engineer Notes</div>
                              <div style={{
                                background: "var(--c-surface-2)",
                                border: "1px solid var(--c-border)",
                                borderRadius: "var(--c-r)",
                                padding: "11px 14px",
                                fontSize: 13,
                                color: "var(--c-text-2)",
                                lineHeight: 1.65,
                              }}>
                                {m.notes}
                              </div>
                            </div>
                          )}

                          {/* Approved state */}
                          {status === "approved" && (
                            <div className="qs-approved-box">
                              ✅ Measurement approved — billing authorised for {pct}% of BOQ
                              {m.qs_notes && <span style={{ fontWeight: 400, color: "var(--c-success)" }}> · {m.qs_notes}</span>}
                            </div>
                          )}

                          {/* Rejected state */}
                          {status === "rejected" && m.rejection_reason && (
                            <div className="qs-reject-box">
                              <strong>Rejected:</strong> {m.rejection_reason}
                            </div>
                          )}

                          {/* Previous QS notes (verified) */}
                          {status === "verified" && m.qs_notes && (
                            <div>
                              <div className="qs-expand-section-title">QS Verification Notes</div>
                              <div style={{
                                background: "var(--c-info-bg)",
                                border: "1px solid var(--c-info-bdr)",
                                borderRadius: "var(--c-r)",
                                padding: "11px 14px",
                                fontSize: 13,
                                color: "var(--c-teal-500)",
                                lineHeight: 1.65,
                              }}>
                                {m.qs_notes}
                              </div>
                            </div>
                          )}

                          {/* ── QS ACTION AREA ── */}
                          {(status === "pending" || status === "verified") && (
                            <div>
                              <div className="qs-expand-section-title">
                                {status === "pending" ? "QS Verification Notes" : "QS Approval Notes"}
                              </div>
                              <textarea
                                className="qs-verify-box"
                                value={qsNotes[m.id] || ""}
                                onChange={e => setQSNotes(n => ({ ...n, [m.id]: e.target.value }))}
                                placeholder={
                                  status === "pending"
                                    ? "Record your site verification findings — measurements checked, any discrepancies noted…"
                                    : "Add approval notes for the billing certificate…"
                                }
                              />

                              {/* Rejection reason textarea */}
                              {showReject[m.id] && (
                                <div style={{ marginTop: 10 }}>
                                  <div className="qs-expand-section-title">Rejection Reason *</div>
                                  <textarea
                                    className="qs-verify-box"
                                    style={{ borderColor: "var(--c-danger-bdr)", background: "var(--c-danger-bg)" }}
                                    value={rejectReason[m.id] || ""}
                                    onChange={e => setRej(r => ({ ...r, [m.id]: e.target.value }))}
                                    placeholder="State clearly why this measurement is rejected and what the SE must do before resubmitting…"
                                  />
                                </div>
                              )}

                              <div className="qs-action-row" style={{ marginTop: 14 }}>
                                {status === "pending" && (
                                  <button
                                    className="qs-action-btn qs-action-btn--verify"
                                    onClick={() => verify(m)}
                                    disabled={updating === m.id}
                                  >
                                    {updating === m.id ? "Updating…" : "🔍 Verify Measurement"}
                                  </button>
                                )}

                                {status === "verified" && (
                                  <button
                                    className="qs-action-btn qs-action-btn--approve"
                                    onClick={() => approve(m)}
                                    disabled={updating === m.id}
                                  >
                                    {updating === m.id ? "Updating…" : "✅ Approve for Billing"}
                                  </button>
                                )}

                                {!showReject[m.id] ? (
                                  <button
                                    className="qs-action-btn qs-action-btn--reject"
                                    onClick={() => setShowRej(r => ({ ...r, [m.id]: true }))}
                                  >
                                    ✕ Reject
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="qs-action-btn qs-action-btn--reject"
                                      onClick={() => reject(m)}
                                      disabled={updating === m.id}
                                    >
                                      {updating === m.id ? "Updating…" : "Confirm Reject"}
                                    </button>
                                    <button
                                      className="qs-action-btn"
                                      style={{ background: "transparent", border: "1px solid var(--c-border-md)", color: "var(--c-text-3)" }}
                                      onClick={() => setShowRej(r => ({ ...r, [m.id]: false }))}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                <div className="qs-pagination">
                  <span className="qs-page-info">
                    Page {page} of {totalPages} · {filtered.length} submissions
                  </span>
                  <div className="qs-page-btns">
                    <button className="qs-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>← Prev</button>
                    <button className="qs-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT — ASIDE ════════════════════════════════ */}
        <aside className="qs-aside">

          {/* Summary */}
          <div className="qs-aside-card">
            <div className="qs-aside-title">Summary</div>
            {[
              ["Total Submissions", measurements.length],
              ["Pending Review",   stats.pending],
              ["Verified",         stats.verified],
              ["Approved",         stats.approved],
              ["Rejected",         stats.rejected],
              ["Billing Auth.",    `${overallPct}%`],
            ].map(([l, v]) => (
              <div key={l} className="qs-aside-row">
                <span>{l}</span>
                <strong style={l === "Pending Review" && stats.pending > 0 ? { color: "var(--c-warning)" } : {}}>{v}</strong>
              </div>
            ))}
          </div>

          {/* Billing by Zone */}
          {billingByZone.length > 0 && (
            <div className="qs-aside-card">
              <div className="qs-aside-title">Billing by Zone</div>
              {billingByZone.map(({ z, pct, hasApproved, hasPending }) => (
                <div
                  key={z}
                  className="qs-billing-item"
                  onClick={() => { setSearch(z); setPage(1); }}
                >
                  <div className="qs-billing-head">
                    <span className="qs-billing-zone" title={z}>{z}</span>
                    <span className={`qs-billing-pct ${hasApproved ? "qs-billing-pct--approved" : hasPending ? "qs-billing-pct--pending" : "qs-billing-pct--partial"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="qs-billing-track">
                    <div
                      className="qs-billing-fill"
                      style={{
                        width: `${pct}%`,
                        background: hasApproved
                          ? "var(--c-success)"
                          : hasPending
                            ? "var(--c-warning)"
                            : "linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick filters */}
          <div className="qs-aside-card">
            <div className="qs-aside-title">Quick Filter</div>
            {[
              { label: "All Submissions",  action: () => { setFStat("all"); setSearch(""); setPage(1); } },
              { label: "⏳ Pending Review", action: () => { setFStat("pending"); setPage(1); } },
              { label: "🔍 Verified",       action: () => { setFStat("verified"); setPage(1); } },
              { label: "✅ Approved",        action: () => { setFStat("approved"); setPage(1); } },
              { label: "❌ Rejected",        action: () => { setFStat("rejected"); setPage(1); } },
            ].map(f => (
              <button
                key={f.label}
                className="qs-btn qs-btn--ghost"
                style={{ width: "100%", justifyContent: "flex-start", marginBottom: 6, fontSize: 12 }}
                onClick={f.action}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* QS Rules */}
          <div className="qs-aside-card">
            <div className="qs-aside-title">QS Rules</div>
            <ul className="qs-tips">
              <li>Verify every measurement on site before approving — never approve from paper only.</li>
              <li>Quantities more than 5% over BOQ require PM sign-off before approval.</li>
              <li>Rejected measurements must clearly state what the SE must fix before resubmitting.</li>
              <li>Approved quantities directly generate the interim payment certificate.</li>
              <li>Link measurement to RFI or NCR if any constraint affected completion %.</li>
            </ul>
          </div>

        </aside>
      </div>
    </div>
  );
}