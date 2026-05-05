// src/pages/siteEngineer/RFI.jsx
// MODIFIED: Added drawing_ref and grid_ref fields (required by workflow — Step 5)
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/RFI.css";

const DRAFT_KEY = "rfi:draft:v3";
const QUEUE_KEY = "rfi:queue:v3";
const PAGE_SIZE = 8;

const DISCIPLINES = ["architectural", "structural", "mep", "civil", "other"];
const PRIORITIES  = ["low", "medium", "high", "critical"];

const BLANK = {
  title: "", description: "", zone: "",
  discipline: "architectural", priority: "medium",
  assignedTo: "", attachments: [],
  // NEW
  drawing_ref: "",
  grid_ref: "",
  response_required_by: "",
};

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
      const res = await api.post("/site-engineer/rfi", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function validate(f) {
  const e = {};
  if (!f.title || f.title.trim().length < 3)             e.title       = "Title required (min 3 chars)";
  if (!f.description || f.description.trim().length < 8) e.description = "Description required (min 8 chars)";
  if (!f.priority)                                        e.priority    = "Select a priority";
  return e;
}

function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.title || ""}|${it.zone || ""}|${it.createdAt || ""}`;
}

function PBadge({ p }) {
  const cls = { critical: "rfi-badge--critical", high: "rfi-badge--high", medium: "rfi-badge--medium", low: "rfi-badge--low" };
  return <span className={`rfi-badge ${cls[p] || "rfi-badge--low"}`}>{p || "medium"}</span>;
}

function SBadge({ s }) {
  const cls = { open: "rfi-badge--open", responded: "rfi-badge--responded", closed: "rfi-badge--closed" };
  return <span className={`rfi-badge ${cls[s] || "rfi-badge--open"}`}>{s || "open"}</span>;
}

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }

export default function RFI() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]        = useState({ ...BLANK, ...draft, attachments: [] });
  const [errors, setErrors]    = useState({});
  const [status, setStatus]    = useState("");
  const [submitting, setSub]   = useState(false);
  const [rfis, setRFIs]        = useState([]);
  const [listLoading, setLL]   = useState(true);
  const [users, setUsers]      = useState([]);
  const [search, setSearch]    = useState("");
  const [filterPri, setFPri]   = useState("all");
  const [filterDisc, setFDisc] = useState("all");
  const [filterStat, setFStat] = useState("all");
  const [page, setPage]        = useState(1);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadAll();
    return () => { alive.current = false; };
  }, []);

  async function loadAll() {
    setLL(true);
    try {
      const [rr, ur] = await Promise.all([
        api.get("/site-engineer/rfi"),
        api.get("/users").catch(() => ({ data: [] })),
      ]);
      if (!alive.current) return;
      const raw  = Array.isArray(rr?.data) ? rr.data : [];
      const seen = new Set();
      setRFIs(raw.filter(it => {
        const k = stableKey(it);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));
      setUsers(Array.isArray(ur?.data) ? ur.data : []);
      flushQueue().catch(() => {});
    } catch (e) { console.error("RFI loadAll:", e); }
    finally { if (alive.current) setLL(false); }
  }

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments;
      ls.save(DRAFT_KEY, c);
    }, 1200);
    return () => clearTimeout(autoSave.current);
  }, [form]);

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

  const clearForm = useCallback(() => {
    ls.del(DRAFT_KEY);
    setForm({ ...BLANK });
    setErrors({});
    setStatus("");
  }, []);

  const saveDraft = useCallback(() => {
    ls.save(DRAFT_KEY, { ...form, attachments: undefined });
    setStatus("Draft saved");
  }, [form]);

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }

    setSub(true);
    setStatus("Submitting…");

    const optimistic = {
      id: `local_${Date.now()}`,
      ...form,
      status: "open",
      createdAt: new Date().toISOString(),
      optimistic: true,
      attachments: form.attachments.map(f => ({ name: f.name })),
    };
    setRFIs(s => [optimistic, ...s]);

    try {
      let res;
      if (form.attachments.length) {
        const fd = new FormData();
        ["title","description","zone","discipline","priority","assignedTo","drawing_ref","grid_ref","response_required_by"]
          .forEach(k => fd.append(k, form[k] || ""));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/site-engineer/rfi", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { attachments: _, ...payload } = form;
        res = await api.post("/site-engineer/rfi", payload);
      }

      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadAll();
      ls.del(DRAFT_KEY);
      setForm({ ...BLANK });
      setStatus("RFI created ✓");
    } catch {
      enqueue(
        form.attachments.length
          ? { _fd: true, meta: { title: form.title } }
          : (({ attachments: _, ...p }) => p)(form)
      );
      setRFIs(s => s.map(it => it.id === optimistic.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally {
      if (alive.current) setSub(false);
    }
  }, [form, submitting]);

  const filtered = useMemo(() => {
    let list = rfis.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.title || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q) ||
        (it.zone || "").toLowerCase().includes(q) ||
        (it.drawing_ref || "").toLowerCase().includes(q) ||
        (it.grid_ref || "").toLowerCase().includes(q)
      );
    }
    if (filterPri  !== "all") list = list.filter(it => (it.priority   || "medium")       === filterPri);
    if (filterDisc !== "all") list = list.filter(it => (it.discipline || "architectural") === filterDisc);
    if (filterStat !== "all") list = list.filter(it => (it.status || "open") === filterStat);
    return list;
  }, [rfis, search, filterPri, filterDisc, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    total:     rfis.length,
    open:      rfis.filter(r => !r.status || r.status === "open").length,
    responded: rfis.filter(r => r.status === "responded").length,
    closed:    rfis.filter(r => r.status === "closed").length,
  }), [rfis]);

  const priorityBreakdown = useMemo(() =>
    PRIORITIES.map(p => ({ p, count: rfis.filter(r => r.priority === p).length })),
    [rfis]
  );

  const onSearch     = useCallback(e => { setSearch(e.target.value); setPage(1); }, []);
  const onFilterPri  = useCallback(e => { setFPri(e.target.value);  setPage(1); }, []);
  const onFilterDisc = useCallback(e => { setFDisc(e.target.value); setPage(1); }, []);
  const onFilterStat = useCallback(e => { setFStat(e.target.value); setPage(1); }, []);

  return (
    <div className="rfi-page">
      <div className="rfi-page-header">
        <div>
          <h1 className="rfi-title">RFI Register</h1>
          <div className="rfi-sub">Request for Information — create, assign and track</div>
        </div>
        <div className="rfi-header-pills">
          <span className="rfi-pill rfi-pill--amber">{stats.open} Open</span>
          <span className="rfi-pill rfi-pill--muted">{stats.total} Total</span>
        </div>
      </div>

      <div className="rfi-layout">
        <div className="rfi-main">

          {/* NEW RFI FORM */}
          <div className="rfi-panel">
            <div className="rfi-panel-head">
              <div className="rfi-panel-title">New RFI</div>
              <div className="rfi-panel-actions">
                <button type="button" className="rfi-btn rfi-btn--ghost" onClick={saveDraft}>Save Draft</button>
                <button type="button" className="rfi-btn rfi-btn--ghost" onClick={clearForm}>Clear</button>
              </div>
            </div>

            <div className="rfi-panel-body">
              <form onSubmit={submit} noValidate>
                <div className="rfi-form-section">
                  <div className="rfi-grid-2">

                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Title *</label>
                      <input className="rfi-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Short descriptive title" autoComplete="off" />
                      {errors.title && <div className="rfi-error">{errors.title}</div>}
                    </div>

                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Description *</label>
                      <textarea className="rfi-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe the information required or the conflict on site. Reference drawing numbers and spec clauses." />
                      {errors.description && <div className="rfi-error">{errors.description}</div>}
                    </div>

                    {/* NEW: Drawing Reference fields */}
                    <div className="rfi-field">
                      <label className="rfi-label">Drawing Reference</label>
                      <input
                        className="rfi-input"
                        value={form.drawing_ref}
                        onChange={e => setF("drawing_ref", e.target.value)}
                        placeholder="e.g. STR-FDN-001 Rev 2"
                      />
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Grid / Zone Reference</label>
                      <input
                        className="rfi-input"
                        value={form.grid_ref}
                        onChange={e => setF("grid_ref", e.target.value)}
                        placeholder="e.g. Grid C3 / Level 2"
                      />
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Discipline</label>
                      <select className="rfi-select" value={form.discipline} onChange={e => setF("discipline", e.target.value)}>
                        {DISCIPLINES.map(d => <option key={d} value={d}>{cap(d)}</option>)}
                      </select>
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Priority *</label>
                      <select className="rfi-select" value={form.priority} onChange={e => setF("priority", e.target.value)}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{cap(p)}</option>)}
                      </select>
                      {errors.priority && <div className="rfi-error">{errors.priority}</div>}
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Zone / Location</label>
                      <input className="rfi-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Grid C3" />
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Response Required By</label>
                      <input
                        type="date"
                        className="rfi-input"
                        value={form.response_required_by}
                        onChange={e => setF("response_required_by", e.target.value)}
                      />
                    </div>

                    <div className="rfi-field">
                      <label className="rfi-label">Assign To</label>
                      <select className="rfi-select" value={form.assignedTo} onChange={e => setF("assignedTo", e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Attachments (photos, drawings, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles} className="rfi-file-input" />
                      {form.attachments.length > 0 && (
                        <div className="rfi-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="rfi-file-item">
                              <span>📎</span>
                              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                              <button type="button" className="rfi-file-remove" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <div className="rfi-submit-row">
                  <button type="submit" className="rfi-btn rfi-btn--primary" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit RFI"}
                  </button>
                  {status && (
                    <span className={`rfi-status ${
                      status.includes("✓")        ? "rfi-status--ok"
                      : status.includes("Offline") ? "rfi-status--err"
                      : "rfi-status--saving"
                    }`}>
                      {status}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* RFI LIST */}
          <div className="rfi-panel">
            <div className="rfi-panel-head">
              <div className="rfi-panel-title">Register</div>
              <span className="rfi-pill rfi-pill--muted">{filtered.length} results</span>
            </div>

            <div className="rfi-controls">
              <div className="rfi-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input value={search} onChange={onSearch} placeholder="Search title, drawing ref, zone…" aria-label="Search RFIs" />
              </div>
              <select className="rfi-select rfi-select--sm" value={filterPri} onChange={onFilterPri} aria-label="Priority">
                <option value="all">All priorities</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
              <select className="rfi-select rfi-select--sm" value={filterDisc} onChange={onFilterDisc} aria-label="Discipline">
                <option value="all">All disciplines</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{cap(d)}</option>)}
              </select>
              <select className="rfi-select rfi-select--sm" value={filterStat} onChange={onFilterStat} aria-label="Status">
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="responded">Responded</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {listLoading ? (
              <div className="rfi-loading"><div className="rfi-spinner" role="status" aria-label="Loading" />Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="rfi-empty">No RFIs match this filter</div>
            ) : (
              <>
                {pageItems.map(r => (
                  <div key={stableKey(r)} className="rfi-list-item">
                    <div className="rfi-item-main">
                      <div className="rfi-item-tags">
                        <span className="rfi-ref">{r.refNo || `RFI-${String(r.id ?? "").padStart(3, "0")}`}</span>
                        <PBadge p={r.priority || "medium"} />
                        <SBadge s={r.status} />
                        {r.queued    && <span className="rfi-badge rfi-badge--low">Queued</span>}
                        {r.optimistic && <span className="rfi-badge rfi-badge--low">Pending</span>}
                      </div>
                      <div className="rfi-item-title">{r.title}</div>
                      {r.description && (
                        <div className="rfi-item-desc">{r.description.slice(0, 180)}{r.description.length > 180 ? "…" : ""}</div>
                      )}
                      <div className="rfi-item-meta">
                        {r.discipline   && <span>{cap(r.discipline)}</span>}
                        {r.zone         && <span>Zone: {r.zone}</span>}
                        {r.drawing_ref  && <span style={{ color: "#185FA5", fontWeight: 500 }}>Dwg: {r.drawing_ref}</span>}
                        {r.grid_ref     && <span>Grid: {r.grid_ref}</span>}
                        {r.response_required_by && <span>Due: {new Date(r.response_required_by + "T12:00:00").toLocaleDateString("en-GB")}</span>}
                        {r.createdAt    && <span>{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>}
                      </div>
                    </div>
                    <div className="rfi-item-assignee">
                      {r.assignedToName || (r.assignedTo ? `ID: ${r.assignedTo}` : "Unassigned")}
                    </div>
                  </div>
                ))}

                <div className="rfi-pagination">
                  <span className="rfi-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
                  <div className="rfi-page-btns">
                    <button className="rfi-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                    <button className="rfi-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ASIDE */}
        <aside className="rfi-aside">
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Stats</div>
            {[["Total", stats.total],["Open", stats.open],["Responded", stats.responded],["Closed", stats.closed]].map(([l, v]) => (
              <div key={l} className="rfi-aside-row"><span>{l}</span><strong style={{ color: "var(--c-navy-700)" }}>{v}</strong></div>
            ))}
          </div>
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Priority Breakdown</div>
            {priorityBreakdown.map(({ p, count }) => (
              <div key={p} className="rfi-aside-row">
                <span className="rfi-aside-label">{cap(p)}</span>
                <strong className={`rfi-aside-value rfi-aside-value--${p}`}>{count}</strong>
              </div>
            ))}
          </div>
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Quick Filter</div>
            {[
              { label: "All",        pri: "all",       disc: "all",        stat: "all"  },
              { label: "Critical",   pri: "critical",  disc: "all",        stat: "all"  },
              { label: "Open only",  pri: "all",       disc: "all",        stat: "open" },
              { label: "Structural", pri: "all",       disc: "structural", stat: "all"  },
              { label: "MEP",        pri: "all",       disc: "mep",        stat: "all"  },
            ].map(f => (
              <button key={f.label} onClick={() => { setFPri(f.pri); setFDisc(f.disc); setFStat(f.stat); setPage(1); }} className="rfi-btn rfi-btn--ghost" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 6, fontSize: 12 }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Tips</div>
            <ul className="rfi-tips">
              <li>Always fill in drawing ref and grid — required for formal RFI.</li>
              <li>Set a response date to trigger urgency for the SE.</li>
              <li>Attach a photo of the conflict on site.</li>
              <li>No site work proceeds until RFI is closed.</li>
              <li>Drafts auto-save every 1.2 seconds.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}