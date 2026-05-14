// src/pages/siteEngineer/ApprovalWorkflow.jsx
// FIXED:
//   - Notification import casing fixed (NotificationContext)
//   - QS added as assignable role for measurement/material approvals
//   - Smart role suggestion based on approval type selected
//   - Graceful fallback if notifications not available

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/ApprovalWorkflow.css";

const QUEUE_KEY = "approvals:queue:v1";
const PAGE_SIZE = 8;

const APPROVAL_TYPES = [
  {
    value: "work",
    label: "Work Approval",
    desc: "Completed work ready for PM / QC review",
    defaultRole: "project_manager",
    roles: ["project_manager", "qc_officer"],
  },
  {
    value: "inspection",
    label: "Inspection Request",
    desc: "Request QC inspection before proceeding",
    defaultRole: "qc_officer",
    roles: ["qc_officer", "project_manager", "architect"],
  },
  {
    value: "material",
    label: "Material Approval",
    desc: "Material on site — request QS acceptance for billing",
    defaultRole: "quantity_surveyor",
    roles: ["quantity_surveyor", "project_manager", "qc_officer"],
  },
  {
    value: "measurement",
    label: "Measurement Submission",
    desc: "Submit completed quantities to QS for verification and billing",
    defaultRole: "quantity_surveyor",
    roles: ["quantity_surveyor"],
  },
  {
    value: "method",
    label: "Method Statement",
    desc: "Approval of construction method / sequence",
    defaultRole: "project_manager",
    roles: ["project_manager", "architect", "structural_engineer"],
  },
];

/* Role labels shown in dropdown */
const ROLE_LABELS = {
  project_manager:     "Project Manager",
  qc_officer:          "QC Officer",
  quantity_surveyor:   "Quantity Surveyor (QS)",
  architect:           "Architect",
  structural_engineer: "Structural Engineer",
};

const STATUS_CFG = {
  pending:  { label: "Pending",           bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  approved: { label: "Approved",          bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  rejected: { label: "Rejected",          bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
  revision: { label: "Revision Required", bg: "#F3EDF8", color: "#4A1A6E", border: "#C49FDC" },
};

const BLANK = {
  type: "work", title: "", description: "",
  zone: "", activity: "",
  linked_task: "", linked_rfi: "", linked_diary: "",
  qty_completed: "", qty_unit: "sqft",
  assign_to_role: "project_manager",
  attachments: [],
};

/* ── localStorage helpers ─────────────────────────────────── */
const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function enqueue(p) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload: p, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

async function flushQueue() {
  const q = ls.load(QUEUE_KEY);
  if (!Array.isArray(q) || !q.length) return;
  const rem = [];
  for (const item of q) {
    try {
      const r = await api.post("/approvals", item.payload);
      if (!r || (r.status && r.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function stableKey(it) {
  return it?.id != null ? String(it.id) : `${it?.title || ""}|${it?.type || ""}|${it?.createdAt || ""}`;
}

function validate(f) {
  const e = {};
  if (!f.title || f.title.trim().length < 3) e.title = "Title required (min 3 chars)";
  if (!f.type) e.type = "Select approval type";
  if ((f.type === "measurement" || f.type === "material") && !f.qty_completed) {
    e.qty_completed = "Enter the quantity for QS verification";
  }
  return e;
}

function StatusBadge({ s }) {
  const c = STATUS_CFG[s] || STATUS_CFG.pending;
  return (
    <span className="aw-badge" style={{ background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
export default function ApprovalWorkflow() {

  /* Try to use notifications — graceful fallback if provider missing */
  let push = () => {};
  try {
    const ctx = require("../../context/NotificationContext");
    if (ctx?.useNotifications) {
      const n = ctx.useNotifications();
      push = n?.push || (() => {});
    }
  } catch { /* no notification provider — silent */ }

  const [form, setForm]           = useState({ ...BLANK });
  const [errors, setErrors]       = useState({});
  const [status, setStatus]       = useState("");
  const [submitting, setSub]      = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [listLoading, setLL]      = useState(true);
  const [filterType, setFT]       = useState("all");
  const [filterStat, setFS]       = useState("all");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadList();
    flushQueue().catch(() => {});
    return () => { alive.current = false; };
  }, []);

  async function loadList() {
    setLL(true);
    try {
      const res = await api.get("/approvals");
      if (!alive.current) return;
      const raw  = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setApprovals(raw.filter(it => {
        const k = stableKey(it);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }));
    } catch { /* offline */ }
    finally { if (alive.current) setLL(false); }
  }

  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  }, []);

  /* When type changes, auto-set the default assignee role */
  const handleTypeChange = useCallback((typeValue) => {
    const typeCfg = APPROVAL_TYPES.find(t => t.value === typeValue);
    setForm(f => ({
      ...f,
      type: typeValue,
      assign_to_role: typeCfg?.defaultRole || "project_manager",
    }));
    setErrors(e => { const c = { ...e }; delete c.type; return c; });
    setStatus("");
  }, []);

  const handleFiles = useCallback(e => {
    setForm(f => ({ ...f, attachments: [...f.attachments, ...Array.from(e.target.files || [])] }));
    e.target.value = null;
  }, []);

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form); setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Submitting…");

    const opt = {
      id: `local_${Date.now()}`, ...form,
      status: "pending", createdAt: new Date().toISOString(), optimistic: true,
    };
    setApprovals(s => [opt, ...s]);

    try {
      let res;
      if (form.attachments.length) {
        const fd = new FormData();
        ["type","title","description","zone","activity","linked_task","linked_rfi",
         "linked_diary","assign_to_role","qty_completed","qty_unit"].forEach(k => fd.append(k, form[k] || ""));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/approvals", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { attachments: _, ...payload } = form;
        res = await api.post("/approvals", payload);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      try { push(`Approval request submitted: "${form.title}"`, "approval", { linked_ref: form.linked_task || "" }); } catch {}
      await loadList();
      setForm({ ...BLANK });
      setStatus("Approval request submitted ✓");
    } catch {
      enqueue((({ attachments: _, ...p }) => p)(form));
      setApprovals(s => s.map(it => it.id === opt.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  }, [form, submitting, push]);

  const filtered = useMemo(() => {
    let list = approvals.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => (it.title || "").toLowerCase().includes(q) || (it.zone || "").toLowerCase().includes(q));
    }
    if (filterType !== "all") list = list.filter(it => it.type === filterType);
    if (filterStat !== "all") list = list.filter(it => (it.status || "pending") === filterStat);
    return list;
  }, [approvals, search, filterType, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    pending:  approvals.filter(a => !a.status || a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    rejected: approvals.filter(a => a.status === "rejected").length,
  }), [approvals]);

  const fmtDate = s => s ? new Date(s).toLocaleDateString("en-GB") : "—";

  /* Roles available for current type */
  const currentTypeCfg   = APPROVAL_TYPES.find(t => t.value === form.type);
  const availableRoles   = currentTypeCfg?.roles || Object.keys(ROLE_LABELS);
  const isQSType         = form.type === "measurement" || form.type === "material";

  return (
    <div className="aw-page">

      {/* HEADER */}
      <div className="aw-page-header">
        <div>
          <div className="aw-eyebrow">Quality Control &amp; Billing</div>
          <h1 className="aw-title">Approval Requests</h1>
          <div className="aw-sub">Work / Inspection → QC/PM · Measurements / Materials → QS for billing</div>
        </div>
        <div className="aw-stats-row">
          <div className="aw-stat-chip aw-stat-chip--warning">{stats.pending} Pending</div>
          <div className="aw-stat-chip aw-stat-chip--success">{stats.approved} Approved</div>
          <div className="aw-stat-chip aw-stat-chip--danger">{stats.rejected} Rejected</div>
        </div>
      </div>

      {/* FLOW STRIP */}
      <div className="aw-flow-strip">
        {[
          { label: "Site Engineer", sub: "Raises request", color: "#185FA5" },
          null,
          { label: "QC / PM", sub: "Work approvals", color: "#085041" },
          { label: "or" },
          { label: "QS", sub: "Measurement / billing", color: "#633806", bg: "#FAEEDA" },
          null,
          { label: "Approved ✓", sub: "Proceed / Bill", color: "#085041", bg: "#E1F5EE" },
        ].map((s, i) =>
          !s
            ? <div key={i} className="aw-flow-arrow">→</div>
            : s.label === "or"
              ? <div key={i} className="aw-flow-or">or</div>
              : (
                <div key={i} className="aw-flow-step" style={{ background: s.bg || "var(--c-surface,#fff)" }}>
                  <div className="aw-flow-step-label" style={{ color: s.color }}>{s.label}</div>
                  {s.sub && <div className="aw-flow-step-sub">{s.sub}</div>}
                </div>
              )
        )}
      </div>

      <div className="aw-layout">

        {/* ── MAIN ────────────────────────────────────────── */}
        <div className="aw-main">

          {/* FORM */}
          <div className="aw-panel">
            <div className="aw-panel-head">
              <div className="aw-panel-title">New Approval Request</div>
              {isQSType && (
                <span style={{ fontSize: 11, padding: "3px 10px", background: "#FAEEDA", color: "#633806", border: "1px solid #EF9F27", borderRadius: 99, fontWeight: 700 }}>
                  📏 Goes to QS for billing verification
                </span>
              )}
            </div>
            <div className="aw-panel-body">
              <form onSubmit={submit} noValidate>

                {/* Type cards */}
                <div className="aw-form-section">
                  <div className="aw-section-title">Approval Type</div>
                  <div className="aw-type-grid">
                    {APPROVAL_TYPES.map(t => (
                      <div
                        key={t.value}
                        className={`aw-type-card${form.type === t.value ? " aw-type-card--active" : ""}`}
                        onClick={() => handleTypeChange(t.value)}
                      >
                        <div className="aw-type-card-label">{t.label}</div>
                        <div className="aw-type-card-desc">{t.desc}</div>
                        <div style={{ fontSize: 10, marginTop: 4, color: "#7D9AB5", fontFamily: "monospace" }}>
                          → {ROLE_LABELS[t.defaultRole]}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.type && <div className="aw-error">{errors.type}</div>}
                </div>

                {/* QS measurement fields — show when type is measurement or material */}
                {isQSType && (
                  <div className="aw-form-section">
                    <div className="aw-section-title">Quantity for QS Verification *</div>
                    <div style={{ background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "#633806" }}>
                      ⚠ These quantities will be sent to the Quantity Surveyor for verification before billing. Make sure they match your site measurements exactly.
                    </div>
                    <div className="aw-grid-2">
                      <div className="aw-field">
                        <label className="aw-label">Quantity Completed *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="aw-input"
                          value={form.qty_completed}
                          onChange={e => setF("qty_completed", e.target.value)}
                          placeholder="e.g. 450"
                          style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}
                        />
                        {errors.qty_completed && <div className="aw-error">{errors.qty_completed}</div>}
                      </div>
                      <div className="aw-field">
                        <label className="aw-label">Unit</label>
                        <select className="aw-select" value={form.qty_unit} onChange={e => setF("qty_unit", e.target.value)}>
                          {["sqft","sqm","cu m","RMT","nos","kg","tonnes","bags","LS"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="aw-form-section">
                  <div className="aw-section-title">Details</div>
                  <div className="aw-field aw-mb">
                    <label className="aw-label">Title *</label>
                    <input className="aw-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Brief description of what requires approval" autoComplete="off" />
                    {errors.title && <div className="aw-error">{errors.title}</div>}
                  </div>
                  <div className="aw-field aw-mb">
                    <label className="aw-label">Description</label>
                    <textarea className="aw-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder={isQSType ? "Describe what was measured — zone, activity, method of measurement, drawings referenced…" : "What specifically needs to be inspected or approved?"} />
                  </div>
                  <div className="aw-grid-2 aw-mb">
                    <div className="aw-field">
                      <label className="aw-label">Zone / Location</label>
                      <input className="aw-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 3 / Grid B2" />
                    </div>
                    <div className="aw-field">
                      <label className="aw-label">Activity</label>
                      <input className="aw-input" value={form.activity} onChange={e => setF("activity", e.target.value)} placeholder="e.g. Column rebar fixing" />
                    </div>
                  </div>
                  <div className="aw-field">
                    <label className="aw-label">Assign To</label>
                    <select className="aw-select" value={form.assign_to_role} onChange={e => setF("assign_to_role", e.target.value)}>
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                      ))}
                    </select>
                    {isQSType && (
                      <div style={{ fontSize: 11, color: "#7D9AB5", marginTop: 4 }}>
                        QS will verify the quantity against BOQ before certifying for billing.
                      </div>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div className="aw-form-section">
                  <div className="aw-section-title">Link to Existing Records</div>
                  <div className="aw-grid-3">
                    {[
                      ["linked_task",  "Linked Task",  "TASK-001"],
                      ["linked_rfi",   "Linked RFI",   "RFI-007"],
                      ["linked_diary", "Linked Diary", "YYYY-MM-DD"],
                    ].map(([k, label, ph]) => (
                      <div key={k} className="aw-field">
                        <label className="aw-label">{label}</label>
                        <input className="aw-input" value={form[k]} onChange={e => setF(k, e.target.value)} placeholder={ph} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div className="aw-form-section">
                  <div className="aw-section-title">Photos / Documents</div>
                  <input type="file" multiple onChange={handleFiles} className="aw-file-input" />
                  {form.attachments.length > 0 && (
                    <div className="aw-file-list">
                      {form.attachments.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="aw-file-item">
                          <span>📎</span>
                          <span className="aw-file-name">{f.name}</span>
                          <button type="button" className="aw-file-remove" onClick={() => setForm(f2 => ({ ...f2, attachments: f2.attachments.filter((_, j) => j !== i) }))}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="aw-submit-row">
                  <button type="submit" className="aw-btn aw-btn--primary" disabled={submitting}>
                    {submitting ? "Submitting…" : isQSType ? "Submit to QS for Verification" : "Submit for Approval"}
                  </button>
                  {status && (
                    <span className={`aw-status${status.includes("✓") ? " aw-status--ok" : status.includes("Offline") ? " aw-status--err" : " aw-status--saving"}`}>
                      {status}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* LIST */}
          <div className="aw-panel">
            <div className="aw-panel-head">
              <div className="aw-panel-title">Approval Register</div>
              <span className="aw-pill aw-pill--muted">{filtered.length} records</span>
            </div>
            <div className="aw-controls">
              <div className="aw-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search approvals…" />
              </div>
              <select className="aw-select aw-select--sm" value={filterType} onChange={e => { setFT(e.target.value); setPage(1); }}>
                <option value="all">All types</option>
                {APPROVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select className="aw-select aw-select--sm" value={filterStat} onChange={e => { setFS(e.target.value); setPage(1); }}>
                <option value="all">All status</option>
                {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>

            {listLoading ? (
              <div className="aw-loading"><div className="aw-spinner" />Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="aw-empty"><div className="aw-empty-icon">✅</div>No approval requests found</div>
            ) : (
              <>
                {pageItems.map(a => (
                  <div key={stableKey(a)} className="aw-list-item">
                    <div className="aw-item-tags">
                      <span className="aw-ref">{a.refNo || `APR-${String(a.id ?? "").padStart(3, "0")}`}</span>
                      <span className="aw-type-tag">{APPROVAL_TYPES.find(t => t.value === a.type)?.label || a.type}</span>
                      <StatusBadge s={a.status || "pending"} />
                      {/* QS badge */}
                      {(a.type === "measurement" || a.type === "material") && (
                        <span style={{ fontSize: 10, padding: "2px 7px", background: "#FAEEDA", color: "#633806", border: "1px solid #EF9F27", borderRadius: 99, fontWeight: 700 }}>
                          QS
                        </span>
                      )}
                      {a.queued && <span className="aw-badge aw-badge--queued">Queued</span>}
                    </div>
                    <div className="aw-item-title">{a.title}</div>
                    {(a.qty_completed) && (
                      <div style={{ fontSize: 12, color: "#633806", background: "#FAEEDA", padding: "3px 10px", borderRadius: 6, marginBottom: 4, display: "inline-block" }}>
                        📏 {a.qty_completed} {a.qty_unit || "sqft"}
                      </div>
                    )}
                    <div className="aw-item-meta">
                      {a.zone         && <span>Zone: {a.zone}</span>}
                      {a.activity     && <span>{a.activity}</span>}
                      {a.assign_to_role && <span>→ {ROLE_LABELS[a.assign_to_role] || a.assign_to_role}</span>}
                      {a.createdAt    && <span>Raised: {fmtDate(a.createdAt)}</span>}
                    </div>
                    {(a.linked_task || a.linked_rfi || a.linked_diary) && (
                      <div className="aw-item-links">
                        {a.linked_task  && <span className="aw-link-tag aw-link-tag--task">{a.linked_task}</span>}
                        {a.linked_rfi   && <span className="aw-link-tag aw-link-tag--rfi">{a.linked_rfi}</span>}
                        {a.linked_diary && <span className="aw-link-tag aw-link-tag--diary">Diary: {a.linked_diary}</span>}
                      </div>
                    )}
                    {a.status === "rejected" && a.rejection_reason && (
                      <div className="aw-rejection-note">Rejected: {a.rejection_reason}</div>
                    )}
                  </div>
                ))}

                <div className="aw-pagination">
                  <span className="aw-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
                  <div className="aw-page-btns">
                    <button className="aw-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                    <button className="aw-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── ASIDE ───────────────────────────────────────── */}
        <aside className="aw-aside">
          <div className="aw-aside-card">
            <div className="aw-aside-title">Stats</div>
            {[
              ["Pending Review",   stats.pending,           "#BA7517"],
              ["Approved",         stats.approved,          "#085041"],
              ["Rejected",         stats.rejected,          "#791F1F"],
              ["Total",            approvals.length,        "var(--c-navy-700,#0A4174)"],
            ].map(([l, v, c]) => (
              <div key={l} className="aw-aside-row">
                <span>{l}</span>
                <strong style={{ color: c }}>{v}</strong>
              </div>
            ))}
          </div>

          <div className="aw-aside-card">
            <div className="aw-aside-title">Who Reviews What</div>
            <div style={{ fontSize: 12, color: "var(--c-text-2,#49769F)", lineHeight: 2 }}>
              <div><strong style={{ color: "#085041" }}>QC Officer</strong> — Inspections, NCRs</div>
              <div><strong style={{ color: "#0A4174" }}>Project Manager</strong> — Work approvals, method statements</div>
              <div><strong style={{ color: "#633806" }}>QS</strong> — Measurements, material quantities for billing</div>
              <div><strong style={{ color: "#4A1A6E" }}>Architect</strong> — Design-related approvals</div>
            </div>
          </div>

          <div className="aw-aside-card">
            <div className="aw-aside-title">Rules</div>
            <ul className="aw-rules-list">
              <li>No work proceeds without approval</li>
              <li>Concrete pours need QC inspection first</li>
              <li>Submit measurements to QS before month-end billing</li>
              <li>Rejected items must be re-submitted with revisions</li>
              <li>Link to Task, RFI, or Diary for full traceability</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}