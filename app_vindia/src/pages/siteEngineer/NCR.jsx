// src/pages/ncr/NCR.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/NCR.css";
const DRAFT_KEY = "ncr:draft:v3";
const QUEUE_KEY = "ncr:queue:v3";
const PAGE_SIZE  = 8;

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
  if (!f.title || f.title.trim().length < 3) e.title = "Title required (min 3 chars)";
  if (!f.description || f.description.trim().length < 8) e.description = "Description required (min 8 chars)";
  if (!f.severity) e.severity = "Select a severity";
  return e;
}

function PBadge({ p }) {
  const m = { critical: "ncr-badge--critical", high: "ncr-badge--high", medium: "ncr-badge--medium", low: "ncr-badge--low" };
  return <span className={`ncr-badge ${m[p] || "ncr-badge--low"}`}>{p || "medium"}</span>;
}
function SBadge({ s }) {
  const m = { open: "ncr-badge--open", in_progress: "ncr-badge--responded", closed: "ncr-badge--closed" };
  return <span className={`ncr-badge ${m[s] || "ncr-badge--open"}`}>{(s || "open").replace("_", " ")}</span>;
}

const BLANK = { title: "", description: "", severity: "medium", zone: "", assignedTo: "", immediateAction: "", holdPlaced: false, attachments: [] };

export default function NCR() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]       = useState({ ...BLANK, ...draft, attachments: [] });
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  const [ncrs, setNCRs]       = useState([]);
  const [listLoading, setLL]  = useState(true);
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState("");
  const [filterSev, setFSev]  = useState("all");
  const [filterStat, setFStat]= useState("all");
  const [page, setPage]       = useState(1);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadAll();
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments; ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  async function loadAll() {
    setLL(true);
    try {
      const [nr, ur] = await Promise.all([api.get("/ncr"), api.get("/users").catch(() => ({ data: [] }))]);
      const raw = Array.isArray(nr?.data) ? nr.data : [];
      const seen = new Set();
      if (alive.current) {
        setNCRs(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
        setUsers(Array.isArray(ur?.data) ? ur.data : []);
      }
      await flushQueue();
    } catch (e) { console.error(e); }
    finally { if (alive.current) setLL(false); }
  }

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  };
  const handleFiles = e => { setForm(f => ({ ...f, attachments: [...f.attachments, ...Array.from(e.target.files || [])] })); e.target.value = null; };
  const removeFile  = i => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }));

  const submit = async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form); setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Submitting…");
    const opt = { id: `local_${Date.now()}`, ...form, status: "open", createdAt: new Date().toISOString(), optimistic: true, attachments: form.attachments.map(f => ({ name: f.name })) };
    setNCRs(s => [opt, ...s]);
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
      setNCRs(s => s.map(it => it.id === opt.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  };

  const filtered = useMemo(() => {
    let list = ncrs.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => (it.title || "").toLowerCase().includes(q) || (it.description || "").toLowerCase().includes(q) || (it.zone || "").toLowerCase().includes(q));
    }
    if (filterSev !== "all") list = list.filter(it => (it.severity || "medium") === filterSev);
    if (filterStat !== "all") list = list.filter(it => (it.status || "open") === filterStat);
    return list;
  }, [ncrs, search, filterSev, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  return (
    <div className="ncr-page">
      <div className="ncr-page-header">
        <div>
          <div className="ncr-eyebrow">Quality Control</div>
          <h1 className="ncr-title">NCR Register</h1>
          <div className="ncr-sub">Non-Conformance Reports — create, assign and resolve</div>
        </div>
        <div className="ncr-header-pills">
          <span className="ncr-pill ncr-pill--danger">{ncrs.filter(n => !n.status || n.status === "open").length} Open</span>
          <span className="ncr-pill ncr-pill--muted">{ncrs.length} Total</span>
        </div>
      </div>

      <div className="ncr-layout">
        <div className="ncr-main">

          {/* FORM */}
          <div className="ncr-panel">
            <div className="ncr-panel-head">
              <div className="ncr-panel-title">New NCR</div>
              <div className="ncr-panel-actions">
                <button type="button" className="ncr-btn ncr-btn--ghost ncr-btn--sm" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                <button type="button" className="ncr-btn ncr-btn--ghost ncr-btn--sm" onClick={() => { ls.del(DRAFT_KEY); setForm({ ...BLANK }); }}>Clear</button>
              </div>
            </div>
            <div className="ncr-panel-body">
              <form onSubmit={submit} noValidate>
                <div className="ncr-form-section">
                  <div className="ncr-section-title">NCR Details</div>
                  <div className="ncr-grid-2">
                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Title</label>
                      <input className="ncr-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Short descriptive title" />
                      {errors.title && <div className="ncr-error">{errors.title}</div>}
                    </div>
                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Description</label>
                      <textarea className="ncr-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe the non-conformance in detail. Reference drawing numbers and spec clauses." />
                      {errors.description && <div className="ncr-error">{errors.description}</div>}
                    </div>
                    <div className="ncr-field">
                      <label className="ncr-label">Severity</label>
                      <select className="ncr-select" value={form.severity} onChange={e => setF("severity", e.target.value)}>
                        {["low","medium","high","critical"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      {errors.severity && <div className="ncr-error">{errors.severity}</div>}
                    </div>
                    <div className="ncr-field">
                      <label className="ncr-label">Zone / Location</label>
                      <input className="ncr-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Pour 14" />
                    </div>
                    <div className="ncr-field">
                      <label className="ncr-label">Assign To (for resolution)</label>
                      <select className="ncr-select" value={form.assignedTo} onChange={e => setF("assignedTo", e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
                      </select>
                    </div>
                    <div className="ncr-field ncr-field--hold">
                      <label className="ncr-label ncr-label--hold">Work Hold</label>
                      <label className="ncr-checkbox-label">
                        <input
                          type="checkbox"
                          className="ncr-checkbox"
                          checked={form.holdPlaced}
                          onChange={e => setF("holdPlaced", e.target.checked)}
                        />
                        <span className="ncr-checkbox-text">Work stopped pending resolution</span>
                      </label>
                    </div>
                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Immediate Action Taken</label>
                      <textarea className="ncr-textarea ncr-textarea--action" value={form.immediateAction} onChange={e => setF("immediateAction", e.target.value)} placeholder="What was done immediately? e.g. Material quarantined, work halted, area cordoned off." />
                    </div>
                    <div className="ncr-field ncr-full">
                      <label className="ncr-label">Attachments (photos, test results, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles} className="ncr-file-input" />
                      {form.attachments.length > 0 && (
                        <div className="ncr-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="ncr-file-item">
                              <span>{f.name}</span>
                              <button type="button" className="ncr-file-remove" onClick={() => removeFile(i)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ncr-submit-row">
                  <button type="submit" className="ncr-btn ncr-btn--primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit NCR"}</button>
                  {status && <span className={`ncr-status ${status.includes("✓") ? "ncr-status--ok" : status.includes("Offline") ? "ncr-status--err" : "ncr-status--saving"}`}>{status}</span>}
                </div>
              </form>
            </div>
          </div>

          {/* LIST */}
          <div className="ncr-panel">
            <div className="ncr-panel-head">
              <div className="ncr-panel-title">NCR Register</div>
              <span className="ncr-pill ncr-pill--muted">{filtered.length} results</span>
            </div>
            <div className="ncr-controls">
              <div className="ncr-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, description, zone…" />
              </div>
              <select className="ncr-select ncr-select--sm" value={filterSev} onChange={e => { setFSev(e.target.value); setPage(1); }}>
                <option value="all">All severities</option>
                {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <select className="ncr-select ncr-select--sm" value={filterStat} onChange={e => { setFStat(e.target.value); setPage(1); }}>
                <option value="all">All status</option>
                {["open","in_progress","closed"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>

            {listLoading
              ? <div className="ncr-loading"><div className="ncr-spinner" />Loading…</div>
              : pageItems.length === 0
                ? <div className="ncr-empty">No NCRs match this filter</div>
                : <>
                    {pageItems.map(n => (
                      <div key={stableKey(n)} className="ncr-list-item">
                        <div className="ncr-item-main">
                          <div className="ncr-item-tags">
                            <span className="ncr-ref ncr-ref--danger">{n.refNo || `NCR-${String(n.id ?? "").padStart(3, "0")}`}</span>
                            <PBadge p={n.severity || n.priority} />
                            <SBadge s={n.status} />
                            {n.holdPlaced && <span className="ncr-hold">HOLD</span>}
                            {n.queued && <span className="ncr-badge ncr-badge--low">Queued</span>}
                          </div>
                          <div className="ncr-item-title">{n.title}</div>
                          <div className="ncr-item-desc">{(n.description || "").slice(0, 180)}{n.description?.length > 180 ? "…" : ""}</div>
                          <div className="ncr-item-meta">
                            <span>Zone: {n.zone || "—"}</span>
                            <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-GB") : ""}</span>
                            {n.immediateAction && <span>Action taken</span>}
                          </div>
                        </div>
                        <div className="ncr-item-assignee">{n.assignedToName || n.assignedTo || "Unassigned"}</div>
                      </div>
                    ))}
                    <div className="ncr-pagination">
                      <span className="ncr-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
                      <div className="ncr-page-btns">
                        <button className="ncr-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                        <button className="ncr-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                      </div>
                    </div>
                  </>
            }
          </div>
        </div>

        {/* ASIDE */}
        <aside className="ncr-aside">
          <div className="ncr-aside-card">
            <div className="ncr-aside-title">Stats</div>
            {[
              ["Total NCRs", ncrs.length],
              ["Open", ncrs.filter(n => !n.status || n.status === "open").length],
              ["In Progress", ncrs.filter(n => n.status === "in_progress").length],
              ["Closed", ncrs.filter(n => n.status === "closed").length],
              ["Work Holds", ncrs.filter(n => n.holdPlaced).length],
            ].map(([l, v]) => (
              <div key={l} className="ncr-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="ncr-aside-card">
            <div className="ncr-aside-title">Severity Breakdown</div>
            {["critical","high","medium","low"].map(s => (
              <div key={s} className="ncr-aside-row">
                <span className="ncr-aside-label">{s}</span>
                <strong className={`ncr-aside-value ncr-aside-value--${s}`}>
                  {ncrs.filter(n => (n.severity || "medium") === s).length}
                </strong>
              </div>
            ))}
          </div>
          <div className="ncr-aside-card">
            <div className="ncr-aside-title">Tips</div>
            <ul className="ncr-tips">
              <li>Attach clear photos and mark the zone precisely.</li>
              <li>Use Critical for safety or structural hold items.</li>
              <li>Record immediate action taken — even if verbal.</li>
              <li>Assign to QC Officer for immediate action.</li>
              <li>Drafts auto-save every second.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
