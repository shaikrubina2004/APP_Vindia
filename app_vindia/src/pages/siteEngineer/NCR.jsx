// src/pages/siteEngineer/NCR.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/NCR.css";

/* ── constants ───────────────────────────────────────────── */
const DRAFT_KEY = "ncr:draft:v3";
const QUEUE_KEY = "ncr:queue:v3";
const PAGE_SIZE = 8;

const SEVERITIES = ["low", "medium", "high", "critical"];
const STATUSES   = ["open", "in_progress", "closed"];

const SEV_COLOR = {
  critical: "#b83232",
  high:     "#b07020",
  medium:   "#0A4174",
  low:      "#A8BFD0",
};

const BLANK = {
  title: "", description: "", severity: "medium",
  zone: "", assignedTo: "", immediateAction: "",
  holdPlaced: false, attachments: [],
};

/* ── demo data ───────────────────────────────────────────── */
const DEMO = [
  { id: 1, title: "Concrete cylinder strength below spec — Level 2 Pour 14", description: "Lab tests show 7-day compressive strength of 18 MPa against specified 30 MPa C30. Work held pending engineering review and core testing.", severity: "critical", zone: "Level 2 / Pour 14", status: "open", holdPlaced: true, immediateAction: "Quarantine pour area. 3 cylinders sent for additional testing. QC Officer notified.", assignedToName: "QC Officer", createdAt: new Date(Date.now()-2*3600000).toISOString(), refNo: "NCR-031" },
  { id: 2, title: "Column alignment — 50mm out of tolerance", description: "Column grid C3 found 50mm out of alignment in north-south direction during setout check. Exceeds 20mm tolerance.", severity: "high", zone: "Level 3 / Grid C3", status: "in_progress", holdPlaced: false, immediateAction: "Surveyor re-checked. Column marked. Structural engineer consulted.", assignedToName: "Ahmed Al-Rashid", createdAt: new Date(Date.now()-26*3600000).toISOString(), refNo: "NCR-030" },
  { id: 3, title: "Rebar spacing non-conformance — Slab S7", description: "Rebar spacing in slab S7 measured at 250mm centres. Specification requires 200mm max centres.", severity: "medium", zone: "Level 1 / Slab S7", status: "closed", holdPlaced: false, immediateAction: "Additional bars inserted. ITP signed off by QC.", assignedToName: "Priya Sharma", createdAt: new Date(Date.now()-3*86400000).toISOString(), refNo: "NCR-029" },
  { id: 4, title: "Waterproofing membrane applied in wet conditions", description: "Waterproofing applied to basement B1 slab during light rain contrary to manufacturer's spec which requires dry conditions.", severity: "high", zone: "Basement B1", status: "open", holdPlaced: true, immediateAction: "Application stopped. Area tarped. Re-application scheduled for dry weather.", assignedToName: "Khalid Noor", createdAt: new Date(Date.now()-4*86400000).toISOString(), refNo: "NCR-028" },
  { id: 5, title: "MEP pipe penetration through main structural beam", description: "50mm diameter pipe run through main beam — structural drawings prohibit penetrations in main beams.", severity: "critical", zone: "Level 2 / Grid D4", status: "open", holdPlaced: true, immediateAction: "Pipe installation halted. RFI raised to structural engineer for remedial design.", assignedToName: "Mohammed Farhan", createdAt: new Date(Date.now()-5*86400000).toISOString(), refNo: "NCR-027" },
];

/* ── helpers ─────────────────────────────────────────────── */
const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

function enqueue(payload) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

async function flushQueue() {
  const q = ls.load(QUEUE_KEY);
  if (!Array.isArray(q) || !q.length) return;
  const rem = [];
  for (const item of q) {
    try {
      if (item.payload?._fd) { rem.push(item); continue; }
      const res = await api.post("/ncr", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.title || ""}|${it.zone || ""}|${it.createdAt || ""}`;
}

function validate(f) {
  const e = {};
  if (!f.title || f.title.trim().length < 3)        e.title       = "Title required (min 3 chars)";
  if (!f.description || f.description.trim().length < 8) e.description = "Description required (min 8 chars)";
  if (!f.severity)                                   e.severity    = "Select a severity";
  return e;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

/* ── badge components ────────────────────────────────────── */
function SevBadge({ s }) {
  const cls = { critical:"ncr-badge--critical", high:"ncr-badge--high", medium:"ncr-badge--medium", low:"ncr-badge--low" };
  return <span className={`ncr-badge ${cls[s] || "ncr-badge--low"}`}>{s || "medium"}</span>;
}
function StatBadge({ s }) {
  const cls = { open:"ncr-badge--open", in_progress:"ncr-badge--in-progress", closed:"ncr-badge--closed" };
  return <span className={`ncr-badge ${cls[s] || "ncr-badge--open"}`}>{(s || "open").replace("_", " ")}</span>;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function NCR() {
  const draft = ls.load(DRAFT_KEY);

  const [form, setForm]         = useState({ ...BLANK, ...draft, attachments: [] });
  const [errors, setErrors]     = useState({});
  const [status, setStatus]     = useState("");
  const [submitting, setSub]    = useState(false);
  const [ncrs, setNCRs]         = useState([]);
  const [listLoading, setLL]    = useState(true);
  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState("");
  const [filterSev, setFSev]    = useState("all");
  const [filterStat, setFStat]  = useState("all");
  const [filterHold, setFHold]  = useState(false);
  const [page, setPage]         = useState(1);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  /* ── load ─────────────────────────────────────────────── */
  useEffect(() => {
    alive.current = true;
    loadAll();
    return () => { alive.current = false; clearTimeout(autoSave.current); };
  }, []);

  async function loadAll() {
    setLL(true);
    try {
      const [nr, ur] = await Promise.all([
        api.get("/ncr"),
        api.get("/users").catch(() => ({ data: [] })),
      ]);
      if (!alive.current) return;
      const raw  = Array.isArray(nr?.data) ? nr.data : [];
      const seen = new Set();
      const data = raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; });
      setNCRs(data.length ? data : DEMO);
      setUsers(Array.isArray(ur?.data) ? ur.data : []);
      flushQueue().catch(() => {});
    } catch { if (alive.current) setNCRs(DEMO); }
    finally { if (alive.current) setLL(false); }
  }

  /* ── autosave ─────────────────────────────────────────── */
  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments;
      ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  /* ── field handlers ───────────────────────────────────── */
  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  }, []);

  const handleFiles = useCallback(e => {
    setForm(f => ({ ...f, attachments: [...f.attachments, ...Array.from(e.target.files || [])] }));
    e.target.value = null;
  }, []);

  const removeFile = useCallback(i => {
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }));
  }, []);

  const clearForm = useCallback(() => { ls.del(DRAFT_KEY); setForm({ ...BLANK }); setErrors({}); setStatus(""); }, []);
  const saveDraft = useCallback(() => { ls.save(DRAFT_KEY, { ...form, attachments: undefined }); setStatus("Draft saved"); }, [form]);

  /* ── submit ───────────────────────────────────────────── */
  const submit = useCallback(async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form); setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Submitting…");

    const optimistic = { id: `local_${Date.now()}`, ...form, status: "open", createdAt: new Date().toISOString(), optimistic: true, attachments: form.attachments.map(f => ({ name: f.name })) };
    setNCRs(s => [optimistic, ...s]);

    try {
      let res;
      if (form.attachments.length) {
        const fd = new FormData();
        ["title","description","severity","zone","assignedTo","immediateAction"].forEach(k => fd.append(k, form[k] || ""));
        fd.append("holdPlaced", String(form.holdPlaced));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/ncr", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { attachments: _, ...payload } = form;
        res = await api.post("/ncr", payload);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadAll(); ls.del(DRAFT_KEY); setForm({ ...BLANK }); setStatus("NCR created ✓");
    } catch {
      enqueue(form.attachments.length ? { _fd: true, meta: { title: form.title } } : (({ attachments: _, ...p }) => p)(form));
      setNCRs(s => s.map(it => it.id === optimistic.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  }, [form, submitting]);

  /* ── filter ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = ncrs.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.title       || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q) ||
        (it.zone        || "").toLowerCase().includes(q)
      );
    }
    if (filterSev  !== "all") list = list.filter(it => (it.severity || "medium") === filterSev);
    if (filterStat !== "all") list = list.filter(it => (it.status   || "open")   === filterStat);
    if (filterHold)           list = list.filter(it => it.holdPlaced);
    return list;
  }, [ncrs, search, filterSev, filterStat, filterHold]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  /* ── stats (memoised) ─────────────────────────────────── */
  const stats = useMemo(() => ({
    total:      ncrs.length,
    open:       ncrs.filter(n => !n.status || n.status === "open").length,
    holds:      ncrs.filter(n => n.holdPlaced).length,
    closed:     ncrs.filter(n => n.status === "closed").length,
  }), [ncrs]);

  const sevBreakdown = useMemo(() => {
    const max = Math.max(1, ...SEVERITIES.map(s => ncrs.filter(n => (n.severity || "medium") === s).length));
    return SEVERITIES.map(s => ({
      s, count: ncrs.filter(n => (n.severity || "medium") === s).length,
      pct: Math.round(ncrs.filter(n => (n.severity || "medium") === s).length / max * 100),
    }));
  }, [ncrs]);

  /* ── handlers ─────────────────────────────────────────── */
  const onSearch    = useCallback(e => { setSearch(e.target.value); setPage(1); }, []);
  const onFSev      = useCallback(v => { setFSev(prev => prev === v ? "all" : v); setPage(1); }, []);
  const onFStat     = useCallback(e => { setFStat(e.target.value); setPage(1); }, []);

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="ncr-page">

      {/* ── HEADER ── */}
      <div className="ncr-page-header">
        <div>
          <div className="ncr-eyebrow">Quality Control</div>
          <h1 className="ncr-title">NCR Register</h1>
          <div className="ncr-sub">Non-Conformance Reports — raise, assign and resolve defects</div>
        </div>
        <div className="ncr-header-pills">
          <span className="ncr-pill ncr-pill--danger">{stats.open} Open</span>
          {stats.holds > 0 && <span className="ncr-pill" style={{ background:"rgba(184,50,50,.1)", color:"#b83232", border:"1px solid rgba(184,50,50,.2)" }}>🔴 {stats.holds} Work Hold{stats.holds > 1 ? "s" : ""}</span>}
          <span className="ncr-pill ncr-pill--muted">{stats.total} Total</span>
        </div>
      </div>

      {/* ── KPI STATS BAR ── */}
      <div className="ncr-stats-bar">
        {[
          { icon:"📋", num:stats.total,  lbl:"Total NCRs",   mod:"total",  action:() => { setFSev("all"); setFStat("all"); setFHold(false); } },
          { icon:"⚠️", num:stats.open,   lbl:"Open",         mod:"open",   action:() => { setFStat("open"); setPage(1); } },
          { icon:"🔴", num:stats.holds,  lbl:"Work Holds",   mod:"hold",   action:() => { setFHold(h => !h); setPage(1); } },
          { icon:"✅", num:stats.closed, lbl:"Closed",       mod:"closed", action:() => { setFStat("closed"); setPage(1); } },
        ].map(({ icon, num, lbl, mod, action }) => (
          <div key={lbl} className={`ncr-stat-card ncr-stat-card--${mod}`} onClick={action}>
            <div className="ncr-stat-icon">{icon}</div>
            <div className="ncr-stat-info">
              <div className="ncr-stat-num">{num}</div>
              <div className="ncr-stat-lbl">{lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ncr-layout">

        {/* ══ MAIN ════════════════════════════════════════ */}
        <div className="ncr-main">

          {/* ── NEW NCR FORM ── */}
          <div className="ncr-panel">
            <div className="ncr-panel-head">
              <div className="ncr-panel-title">Raise New NCR</div>
              <div className="ncr-panel-actions">
                <button type="button" className="ncr-btn ncr-btn--ghost ncr-btn--sm" onClick={saveDraft}>Save Draft</button>
                <button type="button" className="ncr-btn ncr-btn--ghost ncr-btn--sm" onClick={clearForm}>Clear</button>
              </div>
            </div>

            <div className="ncr-panel-body">
              <form onSubmit={submit} noValidate>

                {/* NCR Details */}
                <div className="ncr-form-section">
                  <div className="ncr-section-title">NCR Details</div>
                  <div className="ncr-grid-2">

                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Title *</label>
                      <input className="ncr-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Short descriptive title of the non-conformance" autoComplete="off" />
                      {errors.title && <div className="ncr-error">{errors.title}</div>}
                    </div>

                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Description *</label>
                      <textarea className="ncr-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe the non-conformance in full. Reference drawing numbers, spec clauses, and test results." />
                      {errors.description && <div className="ncr-error">{errors.description}</div>}
                    </div>

                    <div className="ncr-field">
                      <label className="ncr-label">Severity *</label>
                      <select className="ncr-select" value={form.severity} onChange={e => setF("severity", e.target.value)}>
                        {SEVERITIES.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                      </select>
                      {errors.severity && <div className="ncr-error">{errors.severity}</div>}
                    </div>

                    <div className="ncr-field">
                      <label className="ncr-label">Zone / Location</label>
                      <input className="ncr-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Pour 14 / Grid C3" />
                    </div>

                    <div className="ncr-field">
                      <label className="ncr-label">Assign To</label>
                      <select className="ncr-select" value={form.assignedTo} onChange={e => setF("assignedTo", e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
                      </select>
                    </div>

                    {/* Hold Toggle — interactive */}
                    <div className="ncr-field">
                      <label className="ncr-label">Work Hold</label>
                      <div
                        className={`ncr-hold-toggle${form.holdPlaced ? " ncr-hold-toggle--active" : ""}`}
                        onClick={() => setF("holdPlaced", !form.holdPlaced)}
                        role="checkbox"
                        aria-checked={form.holdPlaced}
                        tabIndex={0}
                        onKeyDown={e => e.key === " " && setF("holdPlaced", !form.holdPlaced)}
                      >
                        <div className="ncr-hold-toggle-icon">{form.holdPlaced ? "🔴" : "⬜"}</div>
                        <div>
                          <div className="ncr-hold-toggle-label">
                            {form.holdPlaced ? "WORK HOLD ACTIVE" : "Place Work Hold"}
                          </div>
                          <div className="ncr-hold-toggle-hint">
                            {form.holdPlaced ? "Work stopped pending resolution" : "Click to stop work in this zone"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Immediate Action Taken</label>
                      <textarea className="ncr-textarea ncr-textarea--sm" value={form.immediateAction} onChange={e => setF("immediateAction", e.target.value)} placeholder="What was done immediately? e.g. Material quarantined, area cordoned off, supervisor notified." />
                    </div>

                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Attachments (photos, test results, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles} className="ncr-file-input" />
                      {form.attachments.length > 0 && (
                        <div className="ncr-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="ncr-file-item">
                              <span>📎</span>
                              <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                              <button type="button" className="ncr-file-remove" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ncr-submit-row">
                  <button type="submit" className="ncr-btn ncr-btn--primary" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit NCR"}
                  </button>
                  {status && (
                    <span className={`ncr-status ${status.includes("✓") ? "ncr-status--ok" : status.includes("Offline") ? "ncr-status--err" : "ncr-status--saving"}`}>
                      {status}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ── NCR LIST ── */}
          <div className="ncr-panel">
            <div className="ncr-panel-head">
              <div className="ncr-panel-title">NCR Register</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {filterHold && <span className="ncr-hold" style={{ cursor:"pointer" }} onClick={() => setFHold(false)}>HOLD FILTER ×</span>}
                <span className="ncr-pill ncr-pill--muted">{filtered.length} results</span>
              </div>
            </div>

            {/* Search + filters */}
            <div className="ncr-controls">
              <div className="ncr-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input value={search} onChange={onSearch} placeholder="Search title, description, zone…" aria-label="Search NCRs" />
              </div>
              <select className="ncr-select ncr-select--sm" value={filterStat} onChange={onFStat} aria-label="Filter by status">
                <option value="all">All status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </div>

            {/* Quick severity chips */}
            <div className="ncr-filter-chips">
              <span className={`ncr-filter-chip${filterSev === "all" ? " ncr-filter-chip--active" : ""}`} onClick={() => { setFSev("all"); setPage(1); }}>All</span>
              {SEVERITIES.slice().reverse().map(s => (
                <span
                  key={s}
                  className={`ncr-filter-chip ncr-filter-chip--${s}${filterSev === s ? " ncr-filter-chip--active" : ""}`}
                  onClick={() => onFSev(s)}
                >
                  {s === "critical" ? "🔴" : s === "high" ? "🟠" : s === "medium" ? "🔵" : "⚪"} {cap(s)}
                </span>
              ))}
              <span
                className={`ncr-filter-chip ncr-filter-chip--hold${filterHold ? " ncr-filter-chip--active ncr-filter-chip--hold" : ""}`}
                onClick={() => { setFHold(h => !h); setPage(1); }}
              >
                🔴 Work Hold
              </span>
            </div>

            {/* List */}
            {listLoading ? (
              <div className="ncr-loading"><div className="ncr-spinner" role="status" aria-label="Loading" />Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="ncr-empty">No NCRs match this filter</div>
            ) : (
              <>
                {pageItems.map((n, idx) => (
                  <div
                    key={stableKey(n)}
                    className={`ncr-list-item ncr-list-item--${n.severity || "medium"}`}
                    style={{ animationDelay: `${idx * 35}ms` }}
                  >
                    <div className="ncr-item-main">
                      <div className="ncr-item-tags">
                        <span className="ncr-ref">{n.refNo || `NCR-${String(n.id ?? "").padStart(3,"0")}`}</span>
                        <SevBadge  s={n.severity || "medium"} />
                        <StatBadge s={n.status} />
                        {n.holdPlaced && <span className="ncr-hold">HOLD</span>}
                        {n.queued     && <span className="ncr-badge ncr-badge--low">Queued</span>}
                        {n.optimistic && <span className="ncr-badge ncr-badge--low">Pending</span>}
                      </div>
                      <div className="ncr-item-title">{n.title}</div>
                      {n.description && (
                        <div className="ncr-item-desc">
                          {n.description.slice(0, 180)}{n.description.length > 180 ? "…" : ""}
                        </div>
                      )}
                      {n.immediateAction && (
                        <div className="ncr-item-action">
                          <strong style={{ fontSize:10, color:"var(--c-teal-400)", textTransform:"uppercase", letterSpacing:".08em" }}>Immediate Action: </strong>
                          {n.immediateAction}
                        </div>
                      )}
                      <div className="ncr-item-meta">
                        {n.zone      && <span>📍 {n.zone}</span>}
                        {n.createdAt && <span>{new Date(n.createdAt).toLocaleDateString("en-GB")}</span>}
                        {n.immediateAction && <span>✅ Action recorded</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <div className="ncr-item-assignee">{n.assignedToName || n.assignedTo || "Unassigned"}</div>
                      <div className="ncr-item-arrow">›</div>
                    </div>
                  </div>
                ))}
                <div className="ncr-pagination">
                  <span className="ncr-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
                  <div className="ncr-page-btns">
                    <button className="ncr-page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page<=1}>← Prev</button>
                    <button className="ncr-page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ ASIDE ════════════════════════════════════════ */}
        <aside className="ncr-aside">

          {/* Stats */}
          <div className="ncr-aside-card">
            <div className="ncr-aside-head"><div className="ncr-aside-title">Stats</div></div>
            <div className="ncr-aside-body">
              {[
                ["Total NCRs",   stats.total,   null],
                ["Open",         stats.open,    "open"],
                ["In Progress",  ncrs.filter(n=>n.status==="in_progress").length, "in_progress"],
                ["Closed",       stats.closed,  "closed"],
                ["Work Holds",   stats.holds,   null],
              ].map(([l, v, stat]) => (
                <div
                  key={l}
                  className="ncr-aside-row"
                  onClick={stat ? () => { setFStat(stat); setPage(1); } : undefined}
                >
                  <span>{l}</span>
                  <strong style={l === "Work Holds" && v > 0 ? { color:"#b83232" } : {}}>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="ncr-aside-card">
            <div className="ncr-aside-head"><div className="ncr-aside-title">Severity Breakdown</div></div>
            <div className="ncr-aside-body">
              {sevBreakdown.map(({ s, count, pct }) => (
                <div key={s} className="ncr-sev-item" onClick={() => onFSev(s)}>
                  <div className="ncr-sev-dot" style={{ background: SEV_COLOR[s] }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span className="ncr-sev-label">{cap(s)}</span>
                      <span className="ncr-sev-count" style={count > 0 && s === "critical" ? { color:"#b83232", fontWeight:800 } : {}}>{count}</span>
                    </div>
                    <div className="ncr-sev-bar">
                      <div className="ncr-sev-fill" style={{ width:`${pct}%`, background:SEV_COLOR[s] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick filters */}
          <div className="ncr-aside-card">
            <div className="ncr-aside-head"><div className="ncr-aside-title">Quick Filter</div></div>
            <div className="ncr-aside-body">
              {[
                { label:"All NCRs",       action:() => { setFSev("all"); setFStat("all"); setFHold(false); setPage(1); } },
                { label:"🔴 Work Holds",   action:() => { setFHold(true); setPage(1); } },
                { label:"Critical Only",  action:() => { onFSev("critical"); } },
                { label:"Open Only",      action:() => { setFStat("open"); setPage(1); } },
                { label:"Closed",         action:() => { setFStat("closed"); setPage(1); } },
              ].map(f => (
                <button
                  key={f.label}
                  className="ncr-btn ncr-btn--ghost ncr-btn--block"
                  style={{ marginBottom:6, fontSize:12, justifyContent:"flex-start" }}
                  onClick={f.action}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="ncr-aside-card">
            <div className="ncr-aside-head"><div className="ncr-aside-title">Tips</div></div>
            <div className="ncr-aside-body">
              <ul className="ncr-tips">
                <li>Place a Work Hold immediately for critical structural or safety NCRs — work cannot continue without sign-off.</li>
                <li>Attach concrete test results, photos, and survey readings as evidence.</li>
                <li>Record immediate action even if verbal — it protects the contractor.</li>
                <li>Click severity chips to filter by critical, high, medium, or low.</li>
                <li>Unresolved NCRs block payment for that zone of work.</li>
              </ul>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}