// src/pages/Architect/ArchitectSnagList.jsx
// Architect creates snags during inspections, reviews SE resolutions,
// requests re-inspection, and closes verified snags.

import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "./ArchitectSnagList.css";

/* ── constants ───────────────────────────────────────────── */
const PAGE_SIZE = 10;

const PRIORITY_CFG = {
  low:      { label: "Low",      bg: "#F1EFE8", color: "#444441", border: "#B4B2A9" },
  medium:   { label: "Medium",   bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
  high:     { label: "High",     bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  critical: { label: "Critical", bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
};

const STATUS_CFG = {
  open:         { label: "Open",           bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
  in_progress:  { label: "In Progress",    bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  resolved:     { label: "Resolved",       bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
  reinspection: { label: "Re-inspection",  bg: "#F3EDF8", color: "#4A1A6E", border: "#C49FDC" },
  closed:       { label: "Closed ✓",       bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
};

const BLANK_FORM = {
  title: "", description: "", zone: "",
  priority: "medium", due_date: "",
  drawing_ref: "", grid_ref: "",
};

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function stableKey(it) { return it?.id != null ? String(it.id) : `${it?.title || ""}|${it?.createdAt || ""}`; }
function isOverdue(snag) {
  return snag.status !== "closed" && snag.due_date && new Date(snag.due_date) < new Date();
}

function Badge({ cfg, label }) {
  return (
    <span className="asl-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
export default function ArchitectSnagList() {
  const [snags, setSnags]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState({ ...BLANK_FORM });
  const [errors, setErrors]       = useState({});
  const [submitting, setSub]      = useState(false);
  const [submitStatus, setStatus] = useState("");
  const [updating, setUpdating]   = useState(null);
  const [expandedId, setExp]      = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState("");
  const [filterStat, setFS]       = useState("all");
  const [filterPri, setFP]        = useState("all");
  const [page, setPage]           = useState(1);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadSnags();
    return () => { alive.current = false; };
  }, []);

  async function loadSnags() {
    setLoading(true);
    try {
      const res = await api.get("/snags");
      console.log(res.data); // 👈 check status here

      if (!alive.current) return;
      const raw = Array.isArray(res?.data) ? res.data : (res?.data?.snags || []);
      setSnags(raw.slice().reverse());
    } catch (err) {
      console.error("Error loading snags:", err);
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  /* ── form field helper ─────────────────────────────────── */
  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  };

  /* ── validate ──────────────────────────────────────────── */
  function validate(f) {
    const e = {};
    if (!f.title || f.title.trim().length < 3) e.title = "Title required (min 3 chars)";
    if (!f.priority) e.priority = "Select priority";
    return e;
  }

  /* ── create snag ───────────────────────────────────────── */
  async function createSnag(e) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Creating…");
    try {
      const res = await api.post("/snags", {
        ...form,
        raised_by: "architect",
        raised_date: new Date().toISOString().slice(0, 10),
      });
      const newSnag = res?.data?.snag || res?.data || { id: Date.now(), ...form, status: "open" };
      setSnags(prev => [newSnag, ...prev]);
      setForm({ ...BLANK_FORM });
      setStatus("Snag created ✓");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setStatus("Failed to create snag — check connection");
    } finally {
      if (alive.current) setSub(false);
    }
  }

  /* ── update status ─────────────────────────────────────── */
  async function updateStatus(id, status, extra = {}) {
    if (updating) return;
    setUpdating(id);
    try {
      await api.patch(`/snags/${id}`, { status, ...extra });
      setSnags(prev => prev.map(s => s.id === id ? { ...s, status, ...extra } : s));
    } catch (err) {
      console.error(err);
      alert("Update failed — check connection");
    } finally {
      if (alive.current) setUpdating(null);
    }
  }

  /* ── filters ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = snags.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.zone  || "").toLowerCase().includes(q) ||
        (s.snag_number || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all") list = list.filter(s => (s.status || "open") === filterStat);
    if (filterPri  !== "all") list = list.filter(s => (s.priority || "medium") === filterPri);
    return list;
  }, [snags, search, filterStat, filterPri]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    total:        snags.length,
    open:         snags.filter(s => s.status === "open").length,
    in_progress:  snags.filter(s => s.status === "in_progress").length,
    resolved:     snags.filter(s => s.status === "resolved").length,
    reinspection: snags.filter(s => s.status === "reinspection").length,
    closed:       snags.filter(s => s.status === "closed").length,
    overdue:      snags.filter(s => isOverdue(s)).length,
  }), [snags]);

  /* ── render ────────────────────────────────────────────── */
  return (
    <div className="asl-page">

      {/* ── PAGE HEADER ─────────────────────────────────── */}
      <div className="asl-page-header">
        <div>
          <div className="asl-eyebrow">Architect → Site Engineer</div>
          <h1 className="asl-title">Snag / Punch List</h1>
          <div className="asl-sub">Raise snags during inspections — Site Engineer resolves — you verify and close</div>
        </div>
        <button className="asl-btn asl-btn--primary" onClick={() => { setShowForm(v => !v); setStatus(""); }}>
          {showForm ? "✕ Cancel" : "+ Raise Snag"}
        </button>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────── */}
      <div className="asl-stats-bar">
        {[
          { icon: "🔴", num: stats.open,         label: "Open",           cls: stats.open > 0 ? "asl-stat--alert" : "" },
          { icon: "🟡", num: stats.in_progress,  label: "In Progress",    cls: "" },
          { icon: "🔵", num: stats.resolved,     label: "Resolved",       cls: stats.resolved > 0 ? "asl-stat--action" : "" },
          { icon: "🟣", num: stats.reinspection, label: "Re-inspection",  cls: stats.reinspection > 0 ? "asl-stat--action" : "" },
          { icon: "🟢", num: stats.closed,       label: "Closed",         cls: "" },
          { icon: "⏰", num: stats.overdue,      label: "Overdue",        cls: stats.overdue > 0 ? "asl-stat--alert" : "" },
        ].map((s, i) => (
          <div key={i} className={`asl-stat-card ${s.cls}`}>
            <div className="asl-stat-icon">{s.icon}</div>
            <div className="asl-stat-info">
              <div className="asl-stat-num">{s.num}</div>
              <div className="asl-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ACTION NEEDED STRIP ─────────────────────────── */}
      {(stats.resolved > 0 || stats.reinspection > 0) && (
        <div className="asl-action-strip">
          <span className="asl-action-icon">👀</span>
          <div>
            <strong>Action needed:</strong>
            {stats.resolved > 0 && ` ${stats.resolved} snag${stats.resolved > 1 ? "s" : ""} resolved by SE — review and re-inspect or close.`}
            {stats.reinspection > 0 && ` ${stats.reinspection} awaiting your re-inspection.`}
          </div>
        </div>
      )}

      {/* ── CREATE FORM ─────────────────────────────────── */}
      {showForm && (
        <div className="asl-panel asl-panel--form">
          <div className="asl-panel-head">
            <div className="asl-panel-title">Raise New Snag</div>
          </div>
          <div className="asl-panel-body">
            <form onSubmit={createSnag} noValidate>

              <div className="asl-form-section">
                <div className="asl-section-title">Snag Details</div>
                <div className="asl-grid-2">
                  <div className="asl-field asl-full">
                    <label className="asl-label">Title *</label>
                    <input className="asl-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="e.g. Honeycombing on Column C3, Level 2" autoFocus />
                    {errors.title && <div className="asl-error">{errors.title}</div>}
                  </div>
                  <div className="asl-field asl-full">
                    <label className="asl-label">Description</label>
                    <textarea className="asl-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe the defect in detail — dimensions, location, extent, relevant spec clause…" />
                  </div>
                  <div className="asl-field">
                    <label className="asl-label">Zone / Location</label>
                    <input className="asl-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Grid C3" />
                  </div>
                  <div className="asl-field">
                    <label className="asl-label">Priority *</label>
                    <select className="asl-select" value={form.priority} onChange={e => setF("priority", e.target.value)}>
                      {Object.entries(PRIORITY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                    </select>
                    {errors.priority && <div className="asl-error">{errors.priority}</div>}
                  </div>
                  <div className="asl-field">
                    <label className="asl-label">Drawing Reference</label>
                    <input className="asl-input" value={form.drawing_ref} onChange={e => setF("drawing_ref", e.target.value)} placeholder="e.g. STR-COL-003 Rev 2" />
                  </div>
                  <div className="asl-field">
                    <label className="asl-label">Grid Reference</label>
                    <input className="asl-input" value={form.grid_ref} onChange={e => setF("grid_ref", e.target.value)} placeholder="e.g. Grid C3 / Level 2" />
                  </div>
                  <div className="asl-field">
                    <label className="asl-label">Resolution Due Date</label>
                    <input type="date" className="asl-input" value={form.due_date} onChange={e => setF("due_date", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="asl-submit-row">
                <button type="submit" className="asl-btn asl-btn--primary" disabled={submitting}>
                  {submitting ? "Creating…" : "Raise Snag"}
                </button>
                <button type="button" className="asl-btn asl-btn--ghost" onClick={() => { setShowForm(false); setForm({ ...BLANK_FORM }); setErrors({}); }}>
                  Cancel
                </button>
                {submitStatus && (
                  <span className={`asl-status ${submitStatus.includes("✓") ? "asl-status--ok" : submitStatus.includes("Fix") || submitStatus.includes("Failed") ? "asl-status--err" : "asl-status--saving"}`}>
                    {submitStatus}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FILTERS ─────────────────────────────────────── */}
      <div className="asl-filter-bar">
        <div className="asl-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search snag, zone, number…" />
        </div>
        <select className="asl-select asl-select--sm" value={filterStat} onChange={e => { setFS(e.target.value); setPage(1); }}>
          <option value="all">All status</option>
          {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="asl-select asl-select--sm" value={filterPri} onChange={e => { setFP(e.target.value); setPage(1); }}>
          <option value="all">All priority</option>
          {Object.entries(PRIORITY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        {(search || filterStat !== "all" || filterPri !== "all") && (
          <button className="asl-btn asl-btn--ghost asl-btn--sm" onClick={() => { setSearch(""); setFS("all"); setFP("all"); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── SNAG LIST ───────────────────────────────────── */}
      <div className="asl-panel">
        <div className="asl-panel-head">
          <div className="asl-panel-title">Snag Register</div>
          <span className="asl-pill asl-pill--muted">{filtered.length} snags</span>
        </div>

        {loading ? (
          <div className="asl-loading"><div className="asl-spinner" />Loading snags…</div>
        ) : pageItems.length === 0 ? (
          <div className="asl-empty">
            <div className="asl-empty-icon">✅</div>
            <div>{snags.length === 0 ? "No snags raised yet — raise your first snag above" : "No snags match this filter"}</div>
          </div>
        ) : pageItems.map(snag => {
          const sc      = STATUS_CFG[snag.status || "open"];
          const pc      = PRIORITY_CFG[snag.priority || "medium"];
          const overdue = isOverdue(snag);
          const isExp   = expandedId === snag.id;
          const needsAction = snag.status === "resolved" || snag.status === "reinspection";

          return (
            <div key={stableKey(snag)} className={`asl-item${needsAction ? " asl-item--action" : ""}${overdue ? " asl-item--overdue" : ""}`}>

              {/* Summary row */}
              <div className="asl-item-summary" onClick={() => setExp(isExp ? null : snag.id)}>
                <div className="asl-item-left">
                  {needsAction && <div className="asl-action-dot" title="Needs your action" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="asl-item-tags">
                      <span className="asl-snag-num">{snag.snag_number || `SNS-${String(snag.id || "").padStart(3, "0")}`}</span>
                      <Badge cfg={sc} label={sc.label} />
                      <Badge cfg={pc} label={pc.label} />
                      {overdue && <span className="asl-overdue-tag">⏰ OVERDUE</span>}
                    </div>
                    <div className="asl-item-title">{snag.title}</div>
                    <div className="asl-item-meta">
                      {snag.zone         && <span>Zone: {snag.zone}</span>}
                      {snag.drawing_ref  && <span style={{ color: "#185FA5" }}>Dwg: {snag.drawing_ref}</span>}
                      {snag.raised_date  && <span>Raised: {fmtDate(snag.raised_date)}</span>}
                      {snag.due_date     && <span style={{ color: overdue ? "#b83232" : "inherit", fontWeight: overdue ? 600 : 400 }}>Due: {fmtDate(snag.due_date)}</span>}
                    </div>
                  </div>
                </div>
                <span className="asl-expand-btn">{isExp ? "▲" : "▼"}</span>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div className="asl-item-detail">

                  {snag.description && (
                    <div className="asl-detail-section">
                      <div className="asl-detail-label">Snag Description (what you raised)</div>
                      <div className="asl-detail-text asl-detail-text--snag">{snag.description}</div>
                    </div>
                  )}

                  {snag.resolution_notes && (
                    <div className="asl-detail-section">
                      <div className="asl-detail-label">SE Resolution Notes</div>
                      <div className="asl-detail-text asl-detail-text--resolution">{snag.resolution_notes}</div>
                      {snag.resolved_at && <div className="asl-detail-sub">Resolved: {fmtDate(snag.resolved_at)} · Assigned: {snag.assigned_name || "Site Engineer"}</div>}
                    </div>
                  )}

                  {/* Architect actions */}
                  <div className="asl-item-actions">
                    {/* Resolved → Architect reviews → request reinspection or close */}
                    {snag.status === "resolved" && (
                      <>
                        <button
                          className="asl-btn asl-btn--reinspect"
                          onClick={() => updateStatus(snag.id, "reinspection", { reinspection_at: new Date().toISOString() })}
                          disabled={updating === snag.id}
                        >
                          {updating === snag.id ? "Updating…" : "🔍 Request Re-inspection"}
                        </button>
                        <button
                          className="asl-btn asl-btn--close"
                          onClick={() => updateStatus(snag.id, "closed", { closed_at: new Date().toISOString() })}
                          disabled={updating === snag.id}
                        >
                          {updating === snag.id ? "Updating…" : "✅ Close — Acceptable"}
                        </button>
                        <div className="asl-action-hint">Review the resolution notes before deciding</div>
                      </>
                    )}

                    {/* Re-inspection → Architect has visited site → close */}
                    {snag.status === "reinspection" && (
                      <>
                        <button
                          className="asl-btn asl-btn--close"
                          onClick={() => updateStatus(snag.id, "closed", { closed_at: new Date().toISOString() })}
                          disabled={updating === snag.id}
                        >
                          {updating === snag.id ? "Updating…" : "✅ Close After Re-inspection"}
                        </button>
                        <button
                          className="asl-btn asl-btn--ghost"
                          onClick={() => updateStatus(snag.id, "open")}
                          disabled={updating === snag.id}
                        >
                          ↩ Re-open (still not acceptable)
                        </button>
                        <div className="asl-action-hint">Visit site to verify before closing</div>
                      </>
                    )}

                    {snag.status === "closed" && (
                      <div className="asl-closed-msg">✅ Snag closed on {fmtDate(snag.closed_at)} — verified by you</div>
                    )}

                    {snag.status === "open" && (
                      <div className="asl-open-msg">⏳ Waiting for Site Engineer to start work on this snag</div>
                    )}

                    {snag.status === "in_progress" && (
                      <div className="asl-open-msg">🔧 Site Engineer is working on this snag</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="asl-pagination">
            <span className="asl-page-info">Page {page} of {totalPages} · {filtered.length} snags</span>
            <div className="asl-page-btns">
              <button className="asl-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
              <button className="asl-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}