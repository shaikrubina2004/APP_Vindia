// src/pages/siteEngineer/Progress.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/Progress.css";
const DRAFT_KEY = "progress:draft:v3";
const QUEUE_KEY = "progress:queue:v3";
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
      const res = await api.post("/progress", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}
function nowISO() { return new Date().toISOString().slice(0, 10); }
function validate(f) {
  const e = {};
  if (!f.date) e.date = "Date is required";
  if (!f.zone || !f.zone.trim()) e.zone = "Zone is required";
  const p = Number(f.percent_complete);
  if (!Number.isFinite(p) || p < 0 || p > 100) e.percent_complete = "Enter 0–100";
  return e;
}
function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.zone || ""}|${it.date || ""}|${it.createdAt || ""}`;
}

const BLANK = { date: "", zone: "", activity: "", percent_complete: 0, labour_skilled: 0, labour_unskilled: 0, remarks: "", photos: [] };

export function Progress() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]      = useState({ ...BLANK, date: nowISO(), ...draft, photos: [] });
  const [errors, setErrors]  = useState({});
  const [status, setStatus]  = useState("");
  const [submitting, setSub] = useState(false);
  const [entries, setEntries]= useState([]);
  const [listLoading, setLL] = useState(true);
  const [search, setSearch]  = useState("");
  const [filterZone, setFZ]  = useState("");
  const [filterDate, setFD]  = useState("");
  const [page, setPage]      = useState(1);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadList();
    flushQueue().catch(() => {});
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => { const c = { ...form }; delete c.photos; ls.save(DRAFT_KEY, c); }, 1200);
  }, [form]);

  async function loadList() {
    setLL(true);
    try {
      const res = await api.get("/progress");
      if (alive.current) {
        const raw = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
        const seen = new Set();
        setEntries(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
      }
    } catch (e) { console.error(e); }
    finally { if (alive.current) setLL(false); }
  }

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const c = { ...e }; delete c[k]; return c; }); setStatus(""); };
  const handleFiles = e => { setForm(f => ({ ...f, photos: [...f.photos, ...Array.from(e.target.files || [])] })); e.target.value = null; };
  const removePhoto = i => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }));

  const submit = async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form); setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Saving…");
    const opt = { id: `local_${Date.now()}`, ...form, createdAt: new Date().toISOString(), optimistic: true };
    setEntries(s => [opt, ...s]);
    try {
      let res;
      if (form.photos.length) {
        const fd = new FormData();
        ["date","zone","activity","remarks"].forEach(k => fd.append(k, form[k] || ""));
        ["percent_complete","labour_skilled","labour_unskilled"].forEach(k => fd.append(k, String(Number(form[k]) || 0)));
        form.photos.forEach(f => fd.append("photos", f, f.name));
        res = await api.post("/progress", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { photos: _, ...payload } = form;
        ["percent_complete","labour_skilled","labour_unskilled"].forEach(k => payload[k] = Number(payload[k] || 0));
        res = await api.post("/progress", payload);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadList(); ls.del(DRAFT_KEY); setForm({ ...BLANK, date: nowISO() }); setStatus("Progress saved ✓");
    } catch {
      enqueue({ ...(({ photos: _, ...p }) => p)(form) });
      setEntries(s => s.map(it => it.id === opt.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  };

  const filtered = useMemo(() => {
    let list = entries.slice();
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(it => (it.zone || "").toLowerCase().includes(q) || (it.activity || "").toLowerCase().includes(q) || (it.remarks || "").toLowerCase().includes(q)); }
    if (filterZone.trim()) list = list.filter(it => (it.zone || "").toLowerCase().includes(filterZone.toLowerCase()));
    if (filterDate) list = list.filter(it => (it.date || "").slice(0, 10) === filterDate);
    return list;
  }, [entries, search, filterZone, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const avgPct = entries.length ? Math.round(entries.reduce((s, x) => s + Number(x.percent_complete || 0), 0) / entries.length) : 0;
  const zones  = [...new Set(entries.map(e => e.zone).filter(Boolean))];

  return (
    <div className="prog-page">
      <div className="prog-page-header">
        <div>
          <div className="prog-eyebrow">Site Monitoring</div>
          <h1 className="prog-title">Progress Tracker</h1>
          <div className="prog-sub">Record and track completion by zone and activity</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="prog-pill prog-pill--teal">{entries.length} Entries</span>
          <span className="prog-pill prog-pill--navy">Avg {avgPct}%</span>
        </div>
      </div>

      <div className="prog-layout">
        <div className="prog-main">

          {/* FORM */}
          <div className="prog-panel">
            <div className="prog-panel-head">
              <div className="prog-panel-title">Log Progress Entry</div>
              <div className="prog-panel-actions">
                <button type="button" className="prog-btn prog-btn--ghost" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                <button type="button" className="prog-btn prog-btn--ghost" onClick={() => { ls.del(DRAFT_KEY); setForm({ ...BLANK, date: nowISO() }); }}>Clear</button>
              </div>
            </div>
            <div className="prog-panel-body">
              <form onSubmit={submit} noValidate>
                <div className="prog-form-section">
                  <div className="prog-section-title">Zone & Activity</div>
                  <div className="prog-grid-2">
                    <div className="prog-field">
                      <label className="prog-label">Date</label>
                      <input type="date" className="prog-input" value={form.date} onChange={e => setF("date", e.target.value)} />
                      {errors.date && <div className="prog-error">{errors.date}</div>}
                    </div>
                    <div className="prog-field">
                      <label className="prog-label">Zone</label>
                      <input className="prog-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Block B" list="zone-list" />
                      <datalist id="zone-list">{zones.map(z => <option key={z} value={z} />)}</datalist>
                      {errors.zone && <div className="prog-error">{errors.zone}</div>}
                    </div>
                    <div className="prog-field prog-full">
                      <label className="prog-label">Activity Description</label>
                      <input className="prog-input" value={form.activity} onChange={e => setF("activity", e.target.value)} placeholder="e.g. Column casting, Rebar fixing, Plastering" />
                    </div>
                  </div>
                </div>

                <div className="prog-form-section">
                  <div className="prog-section-title">Completion</div>
                  <div className="prog-field">
                    <label className="prog-label">
                      Percent Complete —&nbsp;
                      <strong style={{ color: "var(--c-navy-700)", fontFamily: "var(--c-mono)" }}>{form.percent_complete}%</strong>
                    </label>
                    <input
                      type="range" min="0" max="100"
                      value={form.percent_complete}
                      onChange={e => setF("percent_complete", Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--c-navy-700)", marginBottom: 8 }}
                    />
                    {/* Visual bar */}
                    <div style={{ height: 8, background: "var(--c-surface-3)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${form.percent_complete}%`, background: "linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))", borderRadius: 99, transition: "width .3s" }} />
                    </div>
                    {errors.percent_complete && <div className="prog-error">{errors.percent_complete}</div>}
                  </div>
                </div>

                <div className="prog-form-section">
                  <div className="prog-section-title">Labour</div>
                  <div className="prog-grid-2">
                    <div className="prog-field">
                      <label className="prog-label">Skilled Labour</label>
                      <input type="number" min="0" className="prog-input" value={form.labour_skilled} onChange={e => setF("labour_skilled", e.target.value)} placeholder="0" />
                    </div>
                    <div className="prog-field">
                      <label className="prog-label">Unskilled Labour</label>
                      <input type="number" min="0" className="prog-input" value={form.labour_unskilled} onChange={e => setF("labour_unskilled", e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>

                <div className="prog-form-section">
                  <div className="prog-section-title">Notes & Attachments</div>
                  <div className="prog-field">
                    <label className="prog-label">Remarks / Observations</label>
                    <textarea className="prog-textarea" value={form.remarks} onChange={e => setF("remarks", e.target.value)} placeholder="Observations, delays, blockers, quality notes…" />
                  </div>
                  <div className="prog-field" style={{ marginTop: 10 }}>
                    <label className="prog-label">Photos</label>
                    <input type="file" multiple onChange={handleFiles} className="prog-file-input" accept="image/*" />
                    {form.photos.length > 0 && (
                      <div className="prog-file-list">
                        {form.photos.map((f, i) => (
                          <div key={`${f.name}-${i}`} className="prog-file-item">
                            <span>{f.name}</span>
                            <button type="button" className="prog-file-remove" onClick={() => removePhoto(i)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="prog-submit-row">
                  <button type="submit" className="prog-btn prog-btn--primary" disabled={submitting}>{submitting ? "Saving…" : "Save Progress"}</button>
                  {status && <span className={`prog-status ${status.includes("✓") ? "prog-status--ok" : status.includes("Offline") ? "prog-status--err" : "prog-status--saving"}`}>{status}</span>}
                </div>
              </form>
            </div>
          </div>

          {/* LIST */}
          <div className="prog-panel">
            <div className="prog-panel-head">
              <div className="prog-panel-title">Progress Entries</div>
              <span className="prog-pill prog-pill--muted">{filtered.length} records</span>
            </div>
            <div className="prog-controls">
              <div className="prog-search" style={{ flex: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search zone or activity…" />
              </div>
              <input className="prog-input" style={{ width: 140 }} value={filterZone} onChange={e => { setFZ(e.target.value); setPage(1); }} placeholder="Filter zone" />
              <input type="date" className="prog-input" style={{ width: 160 }} value={filterDate} onChange={e => { setFD(e.target.value); setPage(1); }} />
            </div>

            {listLoading
              ? <div className="prog-loading"><div className="prog-spinner" />Loading…</div>
              : pageItems.length === 0
                ? <div className="prog-empty">No progress entries match this filter</div>
                : <>
                    {pageItems.map(p => {
                      const pct = Math.max(0, Math.min(100, Number(p.percent_complete || 0)));
                      return (
                        <div key={stableKey(p)} className="prog-list-item">
                          <div className="prog-item-main">
                            <div className="prog-item-tags">
                              <strong style={{ fontSize: 13, color: "var(--c-navy-900)" }}>{p.zone || "—"}</strong>
                              <span style={{ fontSize: 12, color: "var(--c-text-3)" }}>{p.activity || "—"}</span>
                              {p.queued && <span className="prog-badge prog-badge--low">Queued</span>}
                            </div>
                            {/* Progress bar */}
                            <div style={{ margin: "8px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>Completion</span>
                                <span style={{ fontFamily: "var(--c-mono)", fontSize: 11, fontWeight: 700, color: pct >= 100 ? "var(--c-success)" : pct >= 75 ? "var(--c-teal-500)" : "var(--c-navy-700)" }}>{pct}%</span>
                              </div>
                              <div style={{ height: 6, background: "var(--c-surface-3)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", width: `${pct}%`, borderRadius: 99,
                                  background: pct >= 100 ? "var(--c-success)" : `linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))`,
                                  transition: "width .4s",
                                }} />
                              </div>
                            </div>
                            <div className="prog-item-meta">
                              <span>Labour: {p.labour_skilled || 0} skilled / {p.labour_unskilled || 0} unskilled</span>
                              <span>{p.date ? new Date(p.date + "T12:00:00").toLocaleDateString("en-GB") : ""}</span>
                              {p.photos?.length > 0 && <span>{p.photos.length} photo(s)</span>}
                            </div>
                            {p.remarks && <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 5, lineHeight: 1.5 }}>{p.remarks.slice(0, 140)}{p.remarks.length > 140 ? "…" : ""}</div>}
                          </div>
                        </div>
                      );
                    })}
                    <div className="prog-pagination">
                      <span className="prog-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
                      <div className="prog-page-btns">
                        <button className="prog-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                        <button className="prog-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                      </div>
                    </div>
                  </>
            }
          </div>
        </div>

        {/* ASIDE */}
        <aside className="prog-aside">
          <div className="prog-aside-card">
            <div className="prog-aside-title">Summary</div>
            {[["Total Entries", entries.length],["Avg Completion", `${avgPct}%`],["Active Zones", zones.length],["Latest Entry", entries[0]?.date ? new Date(entries[0].date + "T12:00:00").toLocaleDateString("en-GB") : "—"]].map(([l, v]) => (
              <div key={l} className="prog-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
          {zones.length > 0 && (
            <div className="prog-aside-card">
              <div className="prog-aside-title">Zone Summary</div>
              {zones.slice(0, 8).map(z => {
                const zEntries = entries.filter(e => e.zone === z);
                const latest = zEntries[0];
                const pct = Number(latest?.percent_complete || 0);
                return (
                  <div key={z} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: "var(--c-navy-900)" }}>{z}</span>
                      <span style={{ fontFamily: "var(--c-mono)", color: "var(--c-navy-700)", fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "var(--c-surface-3)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--c-navy-700), var(--c-teal-400))", borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="prog-aside-card">
            <div className="prog-aside-title">Tips</div>
            <ul className="prog-tips">
              <li>Use consistent zone names for better reporting.</li>
              <li>Attach milestone photos for as-built records.</li>
              <li>Update progress daily for accurate programme tracking.</li>
              <li>Drafts retry automatically when online.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
// src/pages/siteEngineer/Progress.jsx
// ... all your existing code stays exactly the same ..

// ADD THIS LINE at the bottom ↓
export default Progress;