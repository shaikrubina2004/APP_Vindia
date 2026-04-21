// src/pages/rfi/RFI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/RFI.css";
const DRAFT_KEY = "rfi:draft:v3";
const QUEUE_KEY = "rfi:queue:v3";
const PAGE_SIZE  = 8;

/* ── helpers ─────────────────────────────────────────────────── */
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
function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.title || ""}|${it.zone || ""}|${it.createdAt || ""}`;
}
function validate(f) {
  const e = {};
  if (!f.title || f.title.trim().length < 3) e.title = "Title required (min 3 chars)";
  if (!f.description || f.description.trim().length < 8) e.description = "Description required (min 8 chars)";
  if (!f.priority) e.priority = "Select a priority";
  return e;
}

function PBadge({ p }) {
  const m = { critical: "rfi-badge--critical", high: "rfi-badge--high", medium: "rfi-badge--medium", low: "rfi-badge--low" };
  return <span className={`rfi-badge ${m[p] || "rfi-badge--low"}`}>{p || "medium"}</span>;
}
function SBadge({ s }) {
  const m = { open: "rfi-badge--open", responded: "rfi-badge--responded", closed: "rfi-badge--closed" };
  return <span className={`rfi-badge ${m[s] || "rfi-badge--open"}`}>{s || "open"}</span>;
}

const BLANK = { title: "", description: "", zone: "", discipline: "architectural", priority: "medium", assignedTo: "", attachments: [] };

export default function RFI() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]       = useState({ ...BLANK, ...draft, attachments: [] });
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  const [rfis, setRFIs]       = useState([]);
  const [listLoading, setLL]  = useState(true);
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState("");
  const [filterPri, setFPri]  = useState("all");
  const [filterDisc, setFDisc]= useState("all");
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
      const [rr, ur] = await Promise.all([api.get("/site-engineer/rfi"), api.get("/users").catch(() => ({ data: [] }))]);
      const raw = Array.isArray(rr?.data) ? rr.data : [];
      const seen = new Set();
      if (alive.current) {
        setRFIs(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
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
    setRFIs(s => [opt, ...s]);
    try {
      let res;
      if (form.attachments.length) {
        const fd = new FormData();
        ["title","description","zone","discipline","priority","assignedTo"].forEach(k => fd.append(k, form[k] || ""));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/site-engineer/rfi", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { attachments: _, ...payload } = form;
        res = await api.post("/site-engineer/rfi", payload);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadAll(); ls.del(DRAFT_KEY); setForm({ ...BLANK }); setStatus("RFI created ✓");
    } catch {
      enqueue(form.attachments.length ? { _fd: true, meta: { title: form.title } } : (({ attachments: _, ...p }) => p)(form));
      setRFIs(s => s.map(it => it.id === opt.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  };

  const filtered = useMemo(() => {
    let list = rfis.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => (it.title || "").toLowerCase().includes(q) || (it.description || "").toLowerCase().includes(q) || (it.zone || "").toLowerCase().includes(q));
    }
    if (filterPri !== "all") list = list.filter(it => (it.priority || "medium") === filterPri);
    if (filterDisc !== "all") list = list.filter(it => (it.discipline || "architectural") === filterDisc);
    return list;
  }, [rfis, search, filterPri, filterDisc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = {
    total: rfis.length,
    open: rfis.filter(r => !r.status || r.status === "open").length,
    responded: rfis.filter(r => r.status === "responded").length,
    closed: rfis.filter(r => r.status === "closed").length,
  };

  return (
    <div className="rfi-page">
      <div className="rfi-page-header">
        <div>
          <div className="rfi-eyebrow">Incident Management</div>
          <h1 className="rfi-title">RFI Register</h1>
          <div className="rfi-sub">Request for Information — create, assign and track</div>
        </div>
        <div className="rfi-header-pills">
          <span className="rfi-pill rfi-pill--amber">{stats.open} Open</span>
          <span className="rfi-pill rfi-pill--muted">{stats.total} Total</span>
        </div>
      </div>

      <div className="rfi-layout">
        {/* MAIN */}
        <div className="rfi-main">

          {/* FORM */}
          <div className="rfi-panel">
            <div className="rfi-panel-head">
              <div className="rfi-panel-title">New RFI</div>
              <div className="rfi-panel-actions">
                <button type="button" className="rfi-btn rfi-btn--ghost" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                <button type="button" className="rfi-btn rfi-btn--ghost" onClick={() => { ls.del(DRAFT_KEY); setForm({ ...BLANK }); }}>Clear</button>
              </div>
            </div>
            <div className="rfi-panel-body">
              <form onSubmit={submit} noValidate>
                <div className="rfi-form-section">
                  <div className="rfi-section-title">RFI Details</div>
                  <div className="rfi-grid-2">
                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Title</label>
                      <input className="rfi-input" value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Short descriptive title" />
                      {errors.title && <div className="rfi-error">{errors.title}</div>}
                    </div>
                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Description</label>
                      <textarea className="rfi-textarea" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe the information required or the conflict on site. Reference drawing numbers." />
                      {errors.description && <div className="rfi-error">{errors.description}</div>}
                    </div>
                    <div className="rfi-field">
                      <label className="rfi-label">Discipline</label>
                      <select className="rfi-select" value={form.discipline} onChange={e => setF("discipline", e.target.value)}>
                        {["architectural","structural","mep","civil","other"].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="rfi-field">
                      <label className="rfi-label">Priority</label>
                      <select className="rfi-select" value={form.priority} onChange={e => setF("priority", e.target.value)}>
                        {["low","medium","high","critical"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                      {errors.priority && <div className="rfi-error">{errors.priority}</div>}
                    </div>
                    <div className="rfi-field">
                      <label className="rfi-label">Zone / Location</label>
                      <input className="rfi-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Grid C3" />
                    </div>
                    <div className="rfi-field">
                      <label className="rfi-label">Assign To</label>
                      <select className="rfi-select" value={form.assignedTo} onChange={e => setF("assignedTo", e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
                      </select>
                    </div>
                    <div className="rfi-field rfi-full">
                      <label className="rfi-label">Attachments (photos, drawings, PDFs)</label>
                      <input type="file" multiple onChange={handleFiles} className="rfi-file-input" />
                      {form.attachments.length > 0 && (
                        <div className="rfi-file-list">
                          {form.attachments.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="rfi-file-item">
                              <span>{f.name}</span>
                              <button type="button" className="rfi-file-remove" onClick={() => removeFile(i)}>×</button>
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
                  {status && <span className={`rfi-status ${status.includes("✓") ? "rfi-status--ok" : status.includes("Offline") ? "rfi-status--err" : "rfi-status--saving"}`}>{status}</span>}
                </div>
              </form>
            </div>
          </div>

          {/* LIST */}
          <div className="rfi-panel">
            <div className="rfi-panel-head">
              <div className="rfi-panel-title">Register</div>
              <span className="rfi-pill rfi-pill--muted">{filtered.length} results</span>
            </div>
            <div className="rfi-controls">
              <div className="rfi-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, description, zone…" />
              </div>
              <select className="rfi-select rfi-select--sm" value={filterPri} onChange={e => { setFPri(e.target.value); setPage(1); }}>
                <option value="all">All priorities</option>
                {["critical","high","medium","low"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <select className="rfi-select rfi-select--sm" value={filterDisc} onChange={e => { setFDisc(e.target.value); setPage(1); }}>
                <option value="all">All disciplines</option>
                {["architectural","structural","mep","civil","other"].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>

            {listLoading
              ? <div className="rfi-loading"><div className="rfi-spinner" />Loading…</div>
              : pageItems.length === 0
                ? <div className="rfi-empty">No RFIs match this filter</div>
                : <>
                    {pageItems.map(r => (
                      <div key={stableKey(r)} className="rfi-list-item">
                        <div className="rfi-item-main">
                          <div className="rfi-item-tags">
                            <span className="rfi-ref">{r.refNo || `RFI-${String(r.id ?? "").padStart(3, "0")}`}</span>
                            <PBadge p={r.priority || "medium"} />
                            <SBadge s={r.status} />
                            {r.queued && <span className="rfi-badge rfi-badge--low">Queued</span>}
                          </div>
                          <div className="rfi-item-title">{r.title}</div>
                          <div className="rfi-item-desc">{(r.description || "").slice(0, 180)}{r.description?.length > 180 ? "…" : ""}</div>
                          <div className="rfi-item-meta">
                            <span>{r.discipline || "—"}</span>
                            <span>Zone: {r.zone || "—"}</span>
                            <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : ""}</span>
                          </div>
                        </div>
                        <div className="rfi-item-assignee">{r.assignedToName || r.assignedTo || "Unassigned"}</div>
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
            }
          </div>
        </div>

        {/* ASIDE */}
        <aside className="rfi-aside">
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Stats</div>
            {[["Total", stats.total], ["Open", stats.open], ["Responded", stats.responded], ["Closed", stats.closed]].map(([l, v]) => (
              <div key={l} className="rfi-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Priority Breakdown</div>
            {["critical","high","medium","low"].map(p => (
              <div key={p} className="rfi-aside-row">
                <span className="rfi-aside-label">{p}</span>
                <strong className={`rfi-aside-value rfi-aside-value--${p}`}>
                  {rfis.filter(r => r.priority === p).length}
                </strong>
              </div>
            ))}
          </div>
          <div className="rfi-aside-card">
            <div className="rfi-aside-title">Tips</div>
            <ul className="rfi-tips">
              <li>Attach a drawing reference or photo when possible.</li>
              <li>Use discipline and zone to speed up routing.</li>
              <li>Mark critical RFIs to trigger faster responses.</li>
              <li>Drafts auto-save every second.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
