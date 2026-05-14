// src/pages/siteEngineer/Progress.jsx
// UPDATED: Morning labour headcount + Evening sqft/quantity completion
// Logic: SE logs morning crew → logs evening work done (sqft or description if N/A)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/Progress.css";

const BASE_URL = import.meta.env.VITE_API_URL;
const DRAFT_KEY   = "progress:draft:v5";
const QUEUE_KEY   = "progress:queue:v5";
const PAGE_SIZE   = 8;
const MEAS_STATUS = ["draft", "submitted", "approved"];
const BLANK_M     = { item: "", qty: "", unit: "sqft", status: "draft" };

// Area units — sqft first as per requirement
const AREA_UNITS  = ["sqft","m²","m³","m","kg","tonne","no.","LS","bag","litre","rft"];

// Work types — some use sqft, some don't (description only)


const BLANK = {
  date: "", zone: "", project_id: "",activity: "", wbs_id: "", 
  // Morning fields
  morning_skilled: 0, morning_unskilled: 0, morning_supervisors: 0,
  morning_note: "",
  // Evening fields
  sqft_completed: "", sqft_unit: "sqft", sqft_applicable: true,
  evening_description: "",
  percent_complete: 0, planned_percent: 0,
  delay_type: "",
  linked_task: "", linked_rfi: "", linked_incident: "",
  remarks: "", photos: [],
  measurements: [{ ...BLANK_M }],
};

const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
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
      const r = await api.post("/site-progress", item.payload);
      if (!r || (r.status && r.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function nowISO() { return new Date().toISOString().slice(0, 10); }

function validate(f) {
  const e = {};
  if (!f.project_id?.trim())
  e.project_id = "Project required";
  if (!f.date)            e.date = "Date required";
  if (!f.zone?.trim())    e.zone = "Zone required";
  if (!f.wbs_id)
  e.wbs_id = "Select milestone";
  const p = Number(f.percent_complete);
  if (Number(f.percent_complete) === 0 && f.sqft_completed) {
  e.percent_complete = "Enter realistic % based on work done";
}
  if (!Number.isFinite(p) || p < 0 || p > 100) e.percent_complete = "0–100";
  // Evening: either sqft or description required
  if (f.sqft_applicable && !f.sqft_completed && !f.evening_description?.trim())
    e.evening = "Enter sqft completed or add a description";
  if (!f.sqft_applicable && !f.evening_description?.trim())
    e.evening = "Description is required when sqft is not applicable";
  return e;
}

function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.zone || ""}|${it.date || ""}|${it.createdAt || ""}`;
}

function scColor(s) {
  return s === "approved"
    ? { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" }
    : s === "submitted"
      ? { bg: "#FAEEDA", color: "#633806", border: "#EF9F27" }
      : { bg: "#F1EFE8", color: "#444441", border: "#B4B2A9" };
}

export default function Progress() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]        = useState({ ...BLANK, date: nowISO(), ...draft, photos: [], measurements: draft?.measurements || [{ ...BLANK_M }] });
  const [errors, setErrors]    = useState({});
  const [status, setStatus]    = useState("");
  const [submitting, setSub]   = useState(false);
  const [entries, setEntries]  = useState([]);
  const [listLoading, setLL]   = useState(true);
  const [search, setSearch]    = useState("");
  const [filterZone, setFZ]    = useState("");
  const [filterDate, setFD]    = useState("");
  const [page, setPage]        = useState(1);
  const [activeTab, setTab]    = useState("morning"); // "morning" | "evening" | "measurements"
  const autoSave = useRef(null);
  const alive    = useRef(true);
  const [projects, setProjects] = useState([]);
  
  const [wbsList, setWbsList] = useState([]);

  useEffect(() => {
    alive.current = true;
    loadList();
    flushQueue().catch(() => {});
    return () => { alive.current = false; clearTimeout(autoSave.current); };
  }, []);

  useEffect(() => {
  if (!form.project_id) return;

  async function loadWBS() {
    try {
      const res = await api.get(`/wbs?project_id=${form.project_id}`);

      console.log("WBS 👉", res.data);

      const list =
  res.data?.data ||
  res.data ||
  [];

// ✅ only top-level (1,2,3 — no decimals)
const filtered = list.filter(w => !w.parent_id);

setWbsList(filtered);
    } catch (e) {
      console.error(e);
    }
  }

  loadWBS();
}, [form.project_id]);

  useEffect(() => {
  async function loadProjects() {
    try {
      const res = await api.get("/projects");

      console.log("PROJECT API 👉", res.data);

      setProjects(
        res.data.data || 
        res.data.projects || 
        res.data || 
        []
      );

    } catch (e) {
      console.error(e);
    }
  }

  loadProjects();
}, []);
// 🔥 AUTO-FILL BASED ON LAST ENTRY
useEffect(() => {
  if (!form.zone) return;

  const last = [...entries]
  .filter(e => e.zone === form.zone)
  .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (last) {
    setForm(f => ({
      ...f,
      planned_percent: last.planned_percent || f.planned_percent,
      activity: last.activity || f.activity,
    }));
  }
}, [form.zone, entries]);

  async function loadList() {
    setLL(true);
    try {
      const res = await api.get("/site-progress");
      if (!alive.current) return;
      const raw = Array.isArray(res?.data?.data)
  ? res.data.data.slice().reverse()
  : [];
      const seen = new Set();
      setEntries(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
    } catch (e) { console.error(e); }
    finally { if (alive.current) setLL(false); }
  }

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => { const c = { ...form }; delete c.photos; ls.save(DRAFT_KEY, c); }, 1200);
  }, [form]);

  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; delete c.evening; return c; });
    setStatus("");
  }, []);

  // When work type changes, auto-set sqft_applicable
  

const handleFiles = useCallback((e) => {
  console.log("INPUT CLICKED");

  const files = e.target.files;
  console.log("FILES 👉", files);

  if (!files || files.length === 0) {
    console.log("❌ No file selected");
    return;
  }

  const fileArray = Array.from(files);
  console.log("FILE ARRAY 👉", fileArray);

  setForm(f => ({
    ...f,
    photos: [...f.photos, ...fileArray]
  }));

  console.log("UPDATED PHOTOS 👉", fileArray);

  e.target.value = null;
}, []);
  const removePhoto   = useCallback(i => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) })), []);
  const setM          = useCallback((i, k, v) => setForm(f => { const m = [...f.measurements]; m[i] = { ...m[i], [k]: v }; return { ...f, measurements: m }; }), []);
  const addM          = useCallback(() => setForm(f => ({ ...f, measurements: [...f.measurements, { ...BLANK_M }] })), []);
  const removeM       = useCallback(i  => setForm(f => ({ ...f, measurements: f.measurements.filter((_, j) => j !== i) })), []);
  const clearForm     = useCallback(() => { ls.del(DRAFT_KEY); setForm({ ...BLANK, date: nowISO(), measurements: [{ ...BLANK_M }] }); setErrors({}); setStatus(""); }, []);

  const totalLabour = (Number(form.morning_skilled) || 0) + (Number(form.morning_unskilled) || 0) + (Number(form.morning_supervisors) || 0);
  const liveDelay   = Number(form.planned_percent || 0) - Number(form.percent_complete || 0);

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    const exists = entries.some(e =>
  e.date === form.date &&
  e.zone === form.zone &&
  e.project_id === form.project_id
);

if (exists) {
  setStatus("Entry already exists for this zone today");
  return;
}
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Saving…");

    const opt = { id: `local_${Date.now()}`, ...form, createdAt: new Date().toISOString(), optimistic: true };
    setEntries(s => [opt, ...s]);

    try {
      let res;
      const payload = {
  ...form,

  wbs_id: Number(form.wbs_id),

  
  measurements: JSON.stringify(form.measurements),
};
// 🔍 DEBUG: check photos before FormData
console.log("FORM PHOTOS 👉", form.photos);

form.photos.forEach((file, i) => {
  console.log(`FILE ${i} 👉`, file.name, file.size);
});

if (form.planned_percent > form.percent_complete && !form.delay_type) {
  payload.delay_type = "progress_delay";
}

// ✅ CREATE FORMDATA
const formData = new FormData();

// add all fields
Object.keys(payload).forEach(key => {
  if (key !== "photos") {
    formData.append(key, payload[key]);
  }
});

// add files
form.photos.forEach(file => {
  formData.append("photos", file);
});

// ✅ SEND
res = await api.post("/site-progress", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

      

      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadList();
      ls.del(DRAFT_KEY);
      setForm({ ...BLANK, date: nowISO(), measurements: [{ ...BLANK_M }] });
      setStatus("Progress saved ✓");

setTimeout(() => {
  setStatus("");
}, 3000);

// 🔥 ADD THIS LINE HERE
window.dispatchEvent(new Event("progress_updated"));

setTab("morning");
    } catch {
      enqueue((({ photos: _, ...p }) => p)(form));
      setEntries(s => s.map(it => it.id === opt.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  }, [form, submitting, totalLabour]);

  const filtered = useMemo(() => {
    let list = entries.slice();
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(it => (it.zone || "").toLowerCase().includes(q) || (it.activity || "").toLowerCase().includes(q)); }
    if (filterZone.trim()) list = list.filter(it => (it.zone || "").toLowerCase().includes(filterZone.toLowerCase()));
    if (filterDate) list = list.filter(it => (it.date || "").slice(0, 10) === filterDate);
    return list;
  }, [entries, search, filterZone, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const avgActual  = useMemo(() => entries.length ? Math.round(entries.reduce((s, x) => s + Number(x.percent_complete || 0), 0) / entries.length) : 0, [entries]);
  const avgPlanned = useMemo(() => entries.length ? Math.round(entries.reduce((s, x) => s + Number(x.planned_percent  || 0), 0) / entries.length) : 0, [entries]);
  const overallDelay = avgPlanned - avgActual;
  const zones = useMemo(() => [...new Set(entries.map(e => e.zone).filter(Boolean))], [entries]);
  const allM  = useMemo(() => entries.flatMap(e => { const m = e.measurements; if (!m) return []; if (typeof m === "string") { try { return JSON.parse(m); } catch { return []; } } return Array.isArray(m) ? m : []; }), [entries]);
  const pendingQS = useMemo(() => allM.filter(m => m.status === "submitted").length, [allM]);

  // Tab completion indicators
  const morningDone = totalLabour > 0 && form.wbs_id;
  const eveningDone = form.sqft_applicable ? !!form.sqft_completed : !!form.evening_description?.trim();

  return (
    <div className="prog-page">

      {/* HEADER */}
      <div className="prog-page-header">
        <div>
          <div className="prog-eyebrow">Site Monitoring</div>
          <h1 className="prog-title">Daily Progress Log</h1>
          <div className="prog-sub">Morning: log crew → Evening: log work done → QS: measurements</div>
        </div>
        <div className="prog-header-pills">
          <span className="prog-pill prog-pill--navy">Planned {avgPlanned}%</span>
          <span className="prog-pill prog-pill--teal">Actual {avgActual}%</span>
          {overallDelay > 0 && <span className="prog-pill prog-pill--danger">▼ {overallDelay}% Behind</span>}
          {overallDelay < 0 && <span className="prog-pill prog-pill--success">▲ {Math.abs(overallDelay)}% Ahead</span>}
          {pendingQS > 0 && <span className="prog-pill prog-pill--warning">{pendingQS} Pending QS</span>}
        </div>
      </div>

      {/* WORKFLOW INDICATOR */}
      <div className="prog-workflow-strip">
        {[
          { icon: "🌅", label: "Morning",  sub: "Log crew numbers",         done: morningDone, tab: "morning"      },
          { arrow: true },
          { icon: "🌆", label: "Evening",  sub: "Log work completed",       done: eveningDone, tab: "evening"      },
          { arrow: true },
          { icon: "📏", label: "Measurements", sub: "Submit to QS",         done: pendingQS > 0, tab: "measurements" },
        ].map((s, i) =>
          s.arrow
            ? <div key={i} className="prog-wf-arrow">→</div>
            : (
              <div
                key={i}
                className={`prog-wf-step${activeTab === s.tab ? " prog-wf-step--active" : ""}${s.done ? " prog-wf-step--done" : ""}`}
                onClick={() => {
  if (s.tab === "evening" && !morningDone) return;
  setTab(s.tab);
}}
              >
                <span className="prog-wf-icon">{s.done ? "✅" : s.icon}</span>
                <div>
                  <div className="prog-wf-label">{s.label}</div>
                  <div className="prog-wf-sub">{s.sub}</div>
                </div>
              </div>
            )
        )}
      </div>

      <div className="prog-layout">
        <div className="prog-main">
          <div className="prog-panel">
            <div className="prog-panel-head">
              <div>
                <div className="prog-panel-title">Progress Entry — {form.date || "select date"}</div>
                <div className="prog-panel-sub">
                  {activeTab === "morning" && "Step 1: Log morning crew before work starts"}
                  {activeTab === "evening" && "Step 2: Log work completed by end of shift"}
                  {activeTab === "measurements" && "Step 3: Log measurements for QS billing"}
                </div>
              </div>
              <div className="prog-panel-actions">
                <button type="button" className="prog-btn prog-btn--ghost" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }}>Save Draft</button>
                <button type="button" className="prog-btn prog-btn--ghost" onClick={clearForm}>Clear</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="prog-tab-bar">
              {[
                ["morning",      `🌅 Morning${morningDone ? " ✓" : ""}`],
                ["evening",      `🌆 Evening${eveningDone ? " ✓" : ""}`],
                ["measurements", `📏 Measurements${pendingQS > 0 ? ` (${pendingQS})` : ""}`],
              ].map(([val, label]) => (
                <button key={val} type="button" className={`prog-tab${activeTab === val ? " prog-tab--active" : ""}`} onClick={() => setTab(val)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="prog-panel-body">
              <form onSubmit={submit} noValidate>

                {/* ═══ MORNING TAB ═══════════════════════════════════ */}
                {activeTab === "morning" && (
                  <>
                    {/* Date + Zone + Work type */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Entry Details</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
  <label className="prog-label">Project *</label>
  <select
  value={form.project_id}
  onChange={e => {
  setF("project_id", e.target.value);
  setF("wbs_id", "");
}}
>
  <option value="">Select project</option>
  {projects.map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
</select>
  {errors.project_id && <div className="prog-error">{errors.project_id}</div>}
</div>
                        <div className="prog-field">
                          <label className="prog-label">Date *</label>
                          <input type="date" className="prog-input" value={form.date} onChange={e => setF("date", e.target.value)} />
                          {errors.date && <div className="prog-error">{errors.date}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Zone *</label>
                          <input className="prog-input" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Block B" list="prog-zl" autoComplete="off" />
                          <datalist id="prog-zl">{zones.map(z => <option key={z} value={z} />)}</datalist>
                          {errors.zone && <div className="prog-error">{errors.zone}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Milestone *</label>
                          <select
  value={form.wbs_id || ""}
  onChange={e => setF("wbs_id", e.target.value)}
>
  <option value="">Select milestone</option>

  {wbsList.length === 0 ? (
    <option disabled>Loading...</option>
  ) : (
    wbsList.map(w => (
  <option key={w.id} value={w.id}>
    {w.code} - {w.name}
  </option>
    ))
  )}
</select>
{errors.wbs_id && <div className="prog-error">{errors.wbs_id}</div>}

                          
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Activity Description</label>
                          <input className="prog-input" value={form.activity} onChange={e => setF("activity", e.target.value)} placeholder="e.g. Level 3 North wing columns" />
                        </div>
                      </div>
                    </div>

                    {/* Morning Labour */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">🌅 Morning — Crew on Site</div>
                      <div className="prog-labour-info">Log your team before work starts. You'll log work completed in the Evening tab.</div>
                      <div className="prog-grid-3">
                        <div className="prog-field">
                          <label className="prog-label">Skilled Labour</label>
                          <div className="prog-labour-input-wrap">
                            <span className="prog-labour-icon">👷</span>
                            <input type="number" min="0" className="prog-input prog-input--labour" value={form.morning_skilled} onChange={e => setF("morning_skilled", e.target.value)} placeholder="0" />
                          </div>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Unskilled Labour</label>
                          <div className="prog-labour-input-wrap">
                            <span className="prog-labour-icon">🦺</span>
                            <input type="number" min="0" className="prog-input prog-input--labour" value={form.morning_unskilled} onChange={e => setF("morning_unskilled", e.target.value)} placeholder="0" />
                          </div>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Supervisors</label>
                          <div className="prog-labour-input-wrap">
                            <span className="prog-labour-icon">📋</span>
                            <input type="number" min="0" className="prog-input prog-input--labour" value={form.morning_supervisors} onChange={e => setF("morning_supervisors", e.target.value)} placeholder="0" />
                          </div>
                        </div>
                      </div>

                      {/* Live total */}
                      <div className="prog-labour-total">
                        <span>Total crew on site:</span>
                        <strong>{totalLabour} workers</strong>
                      </div>

                      <div className="prog-field" style={{ marginTop: 12 }}>
                        <label className="prog-label">Morning Note (optional)</label>
                        <input className="prog-input" value={form.morning_note} onChange={e => setF("morning_note", e.target.value)} placeholder="Any issues at start of shift, missing workers, equipment status…" />
                      </div>
                    </div>

                    {/* Planned % */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Planned Progress (from programme)</div>
                      <div className="prog-field">
                        <label className="prog-label">Planned % for Today <span className="prog-label-note">set from your programme</span></label>
                        <input type="range" min="0" max="100" className="prog-range" value={form.planned_percent} onChange={e => setF("planned_percent", Number(e.target.value))} />
                        <div className="prog-bar-track">
                          <div style={{ height: "100%", width: `${form.planned_percent}%`, background: "#185FA5", borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                        <div className="prog-range-val prog-range-val--plan">{form.planned_percent}% planned</div>
                      </div>
                    </div>

                    <div className="prog-tab-next">
                      <button type="button" className="prog-btn prog-btn--primary" onClick={() => setTab("evening")}>
                        Continue to Evening Log →
                      </button>
                      <span className="prog-tab-hint">Come back at end of shift to log work completed</span>
                    </div>
                  </>
                )}

                {/* ═══ EVENING TAB ═══════════════════════════════════ */}
                {activeTab === "evening" && (
                  <>
                    {!morningDone && (
                      <div className="prog-morning-warning">
                        ⚠ You haven't logged morning crew yet. <button type="button" className="prog-inline-link" onClick={() => setTab("morning")}>Go to Morning tab →</button>
                      </div>
                    )}

                    {/* Sqft / Quantity */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">🌆 Evening — Work Completed</div>

                      {/* Sqft applicable toggle */}
                      <div className="prog-sqft-toggle">
                        <label className="prog-toggle-label">
                          <input
                            type="checkbox"
                            className="prog-toggle-check"
                            checked={form.sqft_applicable}
                            onChange={e => setF("sqft_applicable", e.target.checked)}
                          />
                          <span className="prog-toggle-text">
                            {form.wbs_id
                            ? "Milestone selected"
                            : "Area measurement applicable for this work"}
                          </span>
                        </label>
                        {!form.sqft_applicable && (
                          <div className="prog-sqft-na-hint">
                            Sqft not applicable — use description below to log what was completed
                          </div>
                        )}
                      </div>

                      {form.sqft_applicable && (
                        <div className="prog-sqft-row">
                          <div className="prog-field" style={{ flex: 2 }}>
                            <label className="prog-label">Area / Quantity Completed *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="prog-input prog-input--sqft"
                              value={form.sqft_completed}
                              onChange={e => setF("sqft_completed", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="prog-field" style={{ flex: 1 }}>
                            <label className="prog-label">Unit</label>
                            <select className="prog-input" value={form.sqft_unit} onChange={e => setF("sqft_unit", e.target.value)}>
                              {AREA_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="prog-field" style={{ marginTop: 12 }}>
                        <label className="prog-label">
                          {form.sqft_applicable ? "Work Description (additional details)" : "Work Description * (required — describe what was completed)"}
                        </label>
                        <textarea
                          className="prog-textarea"
                          value={form.evening_description}
                          onChange={e => setF("evening_description", e.target.value)}
                          placeholder={
                            form.sqft_applicable
                              ? "Add details: which grid lines, which floor, any quality observations…"
                              : "Describe exactly what was completed today — elements worked on, grid references, quantities in other terms (e.g. 12 columns poured, 3 beams cast)…"
                          }
                          style={{ minHeight: form.sqft_applicable ? 80 : 120 }}
                        />
                        {errors.evening && <div className="prog-error">{errors.evening}</div>}
                      </div>
                    </div>

                    {/* Actual % completion */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Overall Completion %</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
                          <label className="prog-label">Planned % <span className="prog-label-note">from programme</span></label>
                          <div className="prog-bar-track" style={{ marginTop: 8 }}>
                            <div style={{ height: "100%", width: `${form.planned_percent}%`, background: "#185FA5", borderRadius: 99 }} />
                          </div>
                          <div className="prog-range-val prog-range-val--plan">{form.planned_percent}%</div>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Actual % <span className="prog-label-note">as of this evening</span></label>
                          <input type="range" min="0" max="100" className="prog-range" value={form.percent_complete} onChange={e => setF("percent_complete", Number(e.target.value))} />
                          <div className="prog-bar-track">
                            <div style={{ height: "100%", width: `${form.percent_complete}%`, background: liveDelay > 0 ? "#D85A30" : "#085041", borderRadius: 99, transition: "width 0.3s" }} />
                          </div>
                          <div className={`prog-range-val${liveDelay > 0 ? " prog-range-val--behind" : " prog-range-val--ahead"}`}>{form.percent_complete}% actual</div>
                          {errors.percent_complete && <div className="prog-error">{errors.percent_complete}</div>}
                        </div>
                      </div>

                      {form.planned_percent > 0 && (
                        <div className={`prog-delay-flag${liveDelay > 0 ? " prog-delay-flag--behind" : liveDelay < 0 ? " prog-delay-flag--ahead" : ""}`}>
                          {liveDelay > 0
                            ? `⚠ Behind plan by ${liveDelay}% — select delay reason below`
                            : liveDelay < 0
                              ? `✓ Ahead of plan by ${Math.abs(liveDelay)}%`
                              : "✓ On track with plan"}
                        </div>
                      )}
                    </div>

                    {/* Delay */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Delays &amp; Links</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
                          <label className="prog-label">Delay Reason</label>
                          <select className="prog-input" value={form.delay_type} onChange={e => setF("delay_type", e.target.value)}>
                            <option value="">No delay</option>
                            <option value="material">Material shortage</option>
                            <option value="weather">Weather</option>
                            <option value="design">Design / drawing issue</option>
                            <option value="labour">Labour shortage</option>
                            <option value="equipment">Equipment breakdown</option>
                            <option value="rfi_pending">Waiting for RFI response</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Linked Task</label>
                          <input className="prog-input" value={form.linked_task} onChange={e => setF("linked_task", e.target.value)} placeholder="TASK-001" />
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Linked RFI</label>
                          <input className="prog-input" value={form.linked_rfi} onChange={e => setF("linked_rfi", e.target.value)} placeholder="RFI-007" />
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Linked Incident</label>
                          <input className="prog-input" value={form.linked_incident} onChange={e => setF("linked_incident", e.target.value)} placeholder="INC-002" />
                        </div>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Evening Photos</div>
                      <input type="file" multiple onChange={handleFiles} className="prog-file-input" accept="image/*" />
                      {form.photos.length > 0 && (
                        <div className="prog-file-list">
                          {form.photos.map((f, i) => (
                            <div key={`${f.name}-${i}`} className="prog-file-item">
                              <span>📷</span>
                              <span className="prog-file-name">{f.name}</span>
                              <button type="button" className="prog-file-remove" onClick={() => removePhoto(i)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══ MEASUREMENTS TAB ══════════════════════════════ */}
                {activeTab === "measurements" && (
                  <div className="prog-form-section">
                    <div className="prog-section-title">
                      Measurement Book
                      <span className="prog-section-note">Set status to Submitted when ready for QS</span>
                    </div>
                    <div className="prog-meas-header">
                      {["Work Item", "Quantity", "Unit", "Status", ""].map((h, i) => (
                        <div key={i} className="prog-meas-th">{h}</div>
                      ))}
                    </div>
                    {form.measurements.map((m, i) => {
                      const sc = scColor(m.status);
                      return (
                        <div key={i} className="prog-meas-row">
                          <input className="prog-input" value={m.item} onChange={e => setM(i, "item", e.target.value)} placeholder="e.g. Plastering Level 2" />
                          <input className="prog-input" type="number" min="0" step="0.01" value={m.qty} onChange={e => setM(i, "qty", e.target.value)} placeholder="0.00" />
                          <select className="prog-input" value={m.unit} onChange={e => setM(i, "unit", e.target.value)}>
                            {AREA_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <select
                            className="prog-input"
                            value={m.status}
                            onChange={e => setM(i, "status", e.target.value)}
                            style={{ background: sc.bg, color: sc.color, borderColor: sc.border, fontWeight: 600 }}
                          >
                            {MEAS_STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                          <button type="button" className="prog-meas-remove" onClick={() => removeM(i)} disabled={form.measurements.length === 1}>×</button>
                        </div>
                      );
                    })}
                    <button type="button" className="prog-btn prog-btn--ghost prog-btn--sm" onClick={addM}>+ Add row</button>
                    <div className="prog-meas-hint">Set status to <strong>Submitted</strong> when ready for QS. QS marks as <strong>Approved</strong> to confirm billing.</div>
                  </div>
                )}

                {/* Submit row — visible on evening + measurements tabs */}
                {activeTab !== "morning" && (
                  <div className="prog-submit-row">
                    <button type="submit" className="prog-btn prog-btn--primary" disabled={submitting}>
                      {submitting ? "Saving…" : "Save Progress Entry"}
                    </button>
                    {status && (
                      <span className={`prog-status${status.includes("✓") ? " prog-status--ok" : status.includes("Offline") ? " prog-status--err" : " prog-status--saving"}`}>
                        {status}
                      </span>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ENTRIES LIST */}
          <div className="prog-panel">
            <div className="prog-panel-head">
              <div className="prog-panel-title">Progress Entries</div>
              <span className="prog-pill prog-pill--muted">{filtered.length} records</span>
            </div>
            <div className="prog-controls">
              <div className="prog-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search zone or activity…" />
              </div>
              <input className="prog-input" style={{ width: 140 }} value={filterZone} onChange={e => { setFZ(e.target.value); setPage(1); }} placeholder="Filter zone" list="prog-zl" />
              <input type="date" className="prog-input" style={{ width: 160 }} value={filterDate} onChange={e => { setFD(e.target.value); setPage(1); }} />
            </div>

            {listLoading ? (
              <div className="prog-loading"><div className="prog-spinner" />Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="prog-empty">No entries match this filter</div>
            ) : (
              <>
                {pageItems.map(p => {
                  const actual  = Math.max(0, Math.min(100, Number(p.percent_complete || 0)));
                  const planned = Math.max(0, Math.min(100, Number(p.planned_percent  || 0)));
                  const delay   = planned - actual;
const totalW =
  Number(p.morning_skilled || 0) +
  Number(p.morning_unskilled || 0) +
  Number(p.morning_supervisors || 0);                  const mRows   = (() => { if (!p.measurements) return []; if (typeof p.measurements === "string") { try { return JSON.parse(p.measurements); } catch { return []; } } return Array.isArray(p.measurements) ? p.measurements : []; })();
                  const workLabel = p.milestone_name || p.wbs_id;

                  return (
                    <div key={stableKey(p)} className="prog-list-item">
                      <div className="prog-item-tags">
                        <span className="prog-item-zone">{p.zone || "—"}</span>
                        {workLabel && <span className="prog-item-work-type">{workLabel}</span>}
                        {p.activity && <span className="prog-item-activity">{p.activity}</span>}
                        {delay > 0  && <span className="prog-item-badge prog-item-badge--behind">▼ {delay}% behind</span>}
                        {delay < 0  && <span className="prog-item-badge prog-item-badge--ahead">▲ {Math.abs(delay)}% ahead</span>}
                        {p.queued   && <span className="prog-item-badge prog-item-badge--queued">Queued</span>}
                      </div>

                      {/* Planned vs Actual */}
                      <div className="prog-item-bars">
                        <div className="prog-item-bar-label">
                          <span>Planned <strong style={{ color: "#185FA5" }}>{planned}%</strong></span>
                          <span>Actual <strong style={{ color: delay > 0 ? "#b83232" : "#085041" }}>{actual}%</strong></span>
                        </div>
                        <div className="prog-item-bar-track">
                          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${planned}%`, background: "#B5D4F4", borderRadius: 99 }} />
                          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${actual}%`, background: delay > 0 ? "#D85A30" : "#085041", borderRadius: 99, transition: "width 0.4s" }} />
                        </div>
                      </div>

                      {/* Morning crew + Evening work */}
                      <div className="prog-item-summary">
                        <div className="prog-item-summary-block">
                          <span className="prog-item-summary-label">🌅 Crew</span>
                          <span className="prog-item-summary-val">{totalW} workers</span>
                        </div>
                        {/* 📷 PHOTOS */}
{p.photos && p.photos.length > 0 && (
  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
    {p.photos.map((img, i) => (
      <img
        key={i}

src={`${BASE_URL}/${img}`}
        alt="progress"
        style={{
          width: 80,
          height: 80,
          objectFit: "cover",
          borderRadius: 6,
          border: "1px solid #ccc",
          cursor: "pointer"
        }}
        onClick={() => window.open(`${BASE_URL}/${img}`, "_blank")}
      />
    ))}
  </div>
)}
                        {(p.sqft_completed || p.evening_description) && (
                          <div className="prog-item-summary-block">
                            <span className="prog-item-summary-label">🌆 Completed</span>
                            <span className="prog-item-summary-val">
                              {p.sqft_completed ? `${p.sqft_completed} ${p.sqft_unit || "sqft"}` : ""}
                              {p.sqft_completed && p.evening_description ? " · " : ""}
                              {p.evening_description ? p.evening_description.slice(0, 60) + (p.evening_description.length > 60 ? "…" : "") : ""}
                            </span>
                          </div>
                        )}
                        {p.date && (
                          <div className="prog-item-summary-block">
                            <span className="prog-item-summary-label">📅 Date</span>
                            <span className="prog-item-summary-val">{new Date(p.date + "T12:00:00").toLocaleDateString("en-GB")}</span>
                          </div>
                        )}
                      </div>

                      {mRows.length > 0 && (
                        <div className="prog-item-meas-tags">
                          {mRows.filter(m => m.item).map((m, mi) => (
                            <span key={mi} className="prog-meas-tag" style={{ background: scColor(m.status).bg, color: scColor(m.status).color, border: `0.5px solid ${scColor(m.status).border}` }}>
                              {m.item} — {m.qty} {m.unit} ({m.status})
                            </span>
                          ))}
                        </div>
                      )}
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
            )}
          </div>
        </div>

        {/* ASIDE */}
        <aside className="prog-aside">
          <div className="prog-aside-card">
            <div className="prog-aside-title">Today's Summary</div>
            {[
              ["Crew on Site", `${totalLabour} workers`],
              ["Planned",      `${form.planned_percent}%`],
              ["Actual",       `${form.percent_complete}%`],
              ["Work Done",    form.sqft_completed ? `${form.sqft_completed} ${form.sqft_unit}` : form.evening_description ? "Described" : "—"],
              ["Delay",        form.delay_type ? form.delay_type.replace("_", " ") : "None"],
            ].map(([l, v]) => (
              <div key={l} className="prog-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>

          <div className="prog-aside-card">
            <div className="prog-aside-title">Overall Stats</div>
            {[
              ["Total Entries",  entries.length],
              ["Avg Planned",    `${avgPlanned}%`],
              ["Avg Actual",     `${avgActual}%`],
              ["Pending QS",     pendingQS],
              ["Zones",          zones.length],
            ].map(([l, v]) => (
              <div key={l} className="prog-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>

          <div className="prog-aside-card">
            <div className="prog-aside-title">How to Use</div>
            <ol className="prog-how-to">
              <li><strong>Morning:</strong> Log crew before work starts</li>
              <li><strong>Evening:</strong> Log sqft completed (or describe if not applicable)</li>
              <li><strong>Measurements:</strong> Add items for QS billing</li>
              <li>Submit measurements as <strong>Submitted</strong> for QS review</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}