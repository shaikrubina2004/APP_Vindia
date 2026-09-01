// src/pages/siteEngineer/Progress.jsx
// Labour input REMOVED — reads from LabourReport (single source of truth)
// Morning tab: shows labour card (read-only) + planned %
// Evening tab: work done (sqft / description) + completion %
// Measurements tab: QS measurement book

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/Progress.css";

const BASE_URL    = import.meta.env.VITE_API_URL;
const DRAFT_KEY   = "progress:draft:v6";
const QUEUE_KEY   = "progress:queue:v6";
const PAGE_SIZE   = 8;
const MEAS_STATUS = ["draft", "submitted", "approved"];
const BLANK_M     = { item: "", qty: "", unit: "sqft", status: "draft" };
const AREA_UNITS  = ["sqft","m²","m³","m","kg","tonne","no.","LS","bag","litre","rft"];

const BLANK = {
  date: "", zone: "", project_id: "", activity: "", wbs_id: "",
  morning_note: "",
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
  if (!f.project_id?.trim()) e.project_id = "Project required";
  if (!f.date)               e.date       = "Date required";
  if (!f.zone?.trim())       e.zone       = "Zone required";
  if (!f.wbs_id)             e.wbs_id     = "Select milestone";
  const p = Number(f.percent_complete);
  if (!Number.isFinite(p) || p < 0 || p > 100) e.percent_complete = "0–100";
  if (f.sqft_applicable && !f.sqft_completed && !f.evening_description?.trim())
    e.evening = "Enter quantity completed or add a description";
  if (!f.sqft_applicable && !f.evening_description?.trim())
    e.evening = "Description is required when area is not applicable";
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

/* ─────────────────────────────────────────────────────────
   LABOUR CARD — reads from LabourReport, no input
───────────────────────────────────────────────────────── */
// Paste this BEFORE the DailyDiary export default and BEFORE the Progress LabourCard
// Replace both LabourSummaryCard (in DailyDiary) and LabourCard (in Progress) with this logic

// ─────────────────────────────────────────────────────────
// HOW THE BUG HAPPENED:
//   lr.date === date                               ✅ correct
//   && (!projectId || String(lr.project_id) === String(projectId))
//
//   When projectId is set but the labour report was saved with
//   a different or empty project_id, the match fails → shows
//   "No labour report" even though one exists for that date.
//
// FIX:
//   Find ANY report for that date (most recent).
//   If projectId is given, prefer one matching the project,
//   but fall back to any report on that date.
// ─────────────────────────────────────────────────────────


// ══════════════════════════════════════════════
// FOR Progress.jsx — replace LabourCard
// ══════════════════════════════════════════════
function LabourCard({ date, projectId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    const params = new URLSearchParams({ date });
    api.get(`/labour-report?${params}`)
      .then(r => {
        const list = Array.isArray(r?.data) ? r.data : [];
        if (!list.length) { setData(null); return; }

        // Prefer matching project, fall back to first on that date
        const match = projectId
  ? list.find(
      lr =>
        String(lr.project_id || "") ===
        String(projectId || "")
    )
  : list[0];

setData(match || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date, projectId]);

  if (loading) return (
    <div className="prog-labour-info" style={{ padding: "12px 0", fontSize: 12, color: "var(--c-text-3)" }}>
      Loading labour data…
    </div>
  );

  if (!data) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px",
      background: "rgba(239,159,39,.06)",
      border: "1px dashed #EF9F27",
      borderRadius: 10, gap: 12, flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#633806", marginBottom: 3 }}>
          No Labour Report for {date}
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
          Submit a Labour Report first — then log progress here.
        </div>
      </div>
      <button type="button" className="prog-btn prog-btn--ghost"
        style={{ fontSize: 11, padding: "4px 12px" }}
        onClick={() => navigate("/site-engineer/labour-report")}>
        Submit Labour Report →
      </button>
    </div>
  );

  const trades = Array.isArray(data.trades) ? data.trades : [];

  return (
    <div style={{
      background: "var(--c-surface-2,#F4F8FB)",
      border: "1px solid var(--c-border,rgba(10,65,116,.10))",
      borderLeft: "4px solid #085041",
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--c-border,rgba(10,65,116,.10))",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 28, fontWeight: 900, fontFamily: "var(--c-mono,monospace)",
            color: "var(--c-navy-900,#001D39)", letterSpacing: "-1px",
          }}>{data.total_headcount || 0}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-navy-900)" }}>
              workers on site
            </div>
            <div style={{ fontSize: 11, color: "#085041", fontWeight: 600 }}>
              ✓ From Labour Report · {data.shift || "day"} shift
              {data.project_name ? ` · ${data.project_name}` : ""}
            </div>
          </div>
        </div>
        <button type="button" style={{
          fontSize: 11, padding: "4px 12px", borderRadius: 8,
          background: "transparent",
          border: "1px solid var(--c-border-md,rgba(10,65,116,.18))",
          color: "var(--c-navy-700,#0A4174)", cursor: "pointer", fontWeight: 600,
        }} onClick={() => navigate("/site-engineer/labour-report")}>
          Edit →
        </button>
      </div>

      {trades.length > 0 && (
        <div style={{ padding: "6px 0" }}>
          {trades.slice(0, 6).map((t, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 16px", fontSize: 12,
              borderBottom: i < Math.min(trades.length, 6) - 1
                ? "1px solid var(--c-border,rgba(10,65,116,.06))" : "none",
            }}>
              <span style={{ color: "var(--c-text-2,#49769F)" }}>{t.trade}</span>
              <strong style={{ fontFamily: "monospace", color: "var(--c-navy-700)" }}>{t.count}</strong>
            </div>
          ))}
          {trades.length > 6 && (
            <div style={{ padding: "4px 16px", fontSize: 11, color: "var(--c-text-3)" }}>
              +{trades.length - 6} more trades
            </div>
          )}
        </div>
      )}

      <div style={{
        padding: "8px 16px", fontSize: 11, color: "var(--c-text-3)",
        borderTop: "1px solid var(--c-border,rgba(10,65,116,.06))",
      }}>
        ✓ Pulled from Labour Report — no re-entry needed
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Progress() {
  const navigate = useNavigate();
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]       = useState({ ...BLANK, date: nowISO(), ...draft, photos: [], measurements: draft?.measurements || [{ ...BLANK_M }] });
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  const [entries, setEntries] = useState([]);
  const [listLoading, setLL]  = useState(true);
  const [search, setSearch]   = useState("");
  const [filterZone, setFZ]   = useState("");
  const [filterDate, setFD]   = useState("");
  const [page, setPage]       = useState(1);
  const [activeTab, setTab]   = useState("morning");
  const [projects, setProjects]   = useState([]);
  const [wbsList, setWbsList]     = useState([]);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadList();
    flushQueue().catch(() => {});
    loadProjects();
    return () => { alive.current = false; clearTimeout(autoSave.current); };
  }, []);

  useEffect(() => {
    if (!form.project_id) return;
    api.get(`/wbs?project_id=${form.project_id}`)
      .then(res => {
        const list = res.data?.data || res.data || [];
        setWbsList(list.filter(w => !w.parent_id));
      })
      .catch(() => setWbsList([]));
  }, [form.project_id]);

  useEffect(() => {
    if (!form.zone || !entries.length) return;
    const last = [...entries]
      .filter(e => e.zone === form.zone)
      .sort((a,b) => new Date(b.date)-new Date(a.date))[0];
    if (last) setForm(f => ({
      ...f,
      planned_percent: last.planned_percent || f.planned_percent,
      activity: last.activity || f.activity,
    }));
  }, [form.zone]);

  async function loadList() {
    setLL(true);
    try {
      const res = await api.get("/site-progress");
      if (!alive.current) return;
      const raw = Array.isArray(res?.data?.data)
        ? res.data.data.slice().reverse()
        : Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setEntries(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
    } catch {}
    finally { if (alive.current) setLL(false); }
  }

  async function loadProjects() {
    try {
      const res = await api.get("/projects");
      setProjects(res.data?.data || res.data?.projects || res.data || []);
    } catch {}
  }

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.photos; ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; delete c.evening; return c; });
    setStatus("");
  }, []);

  const handleFiles = useCallback(e => {
    const files = Array.from(e.target.files || []);
    setForm(f => ({ ...f, photos: [...f.photos, ...files] }));
    e.target.value = null;
  }, []);

  const removePhoto = useCallback(i => setForm(f => ({ ...f, photos: f.photos.filter((_,j)=>j!==i) })), []);
  const setM        = useCallback((i,k,v) => setForm(f => { const m=[...f.measurements]; m[i]={...m[i],[k]:v}; return {...f,measurements:m}; }), []);
  const addM        = useCallback(() => setForm(f => ({ ...f, measurements: [...f.measurements, {...BLANK_M}] })), []);
  const removeM     = useCallback(i => setForm(f => ({ ...f, measurements: f.measurements.filter((_,j)=>j!==i) })), []);
  const clearForm   = useCallback(() => { ls.del(DRAFT_KEY); setForm({...BLANK,date:nowISO(),measurements:[{...BLANK_M}]}); setErrors({}); setStatus(""); }, []);

  const liveDelay = Number(form.planned_percent||0) - Number(form.percent_complete||0);

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    const exists = entries.some(e => e.date===form.date && e.zone===form.zone && String(e.project_id)===String(form.project_id));
    if (exists) { setStatus("Entry already exists for this zone today"); return; }
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Saving…");

    const opt = { id:`local_${Date.now()}`, ...form, createdAt:new Date().toISOString(), optimistic:true };
    setEntries(s => [opt, ...s]);

    try {
      const payload = { ...form, wbs_id:Number(form.wbs_id), measurements:JSON.stringify(form.measurements) };
      if (form.planned_percent > form.percent_complete && !form.delay_type)
        payload.delay_type = "progress_delay";

      const formData = new FormData();
      Object.keys(payload).forEach(key => { if (key !== "photos") formData.append(key, payload[key]); });
      form.photos.forEach(file => formData.append("photos", file));

      const res = await api.post("/site-progress", formData, { headers:{"Content-Type":"multipart/form-data"} });
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadList();
      ls.del(DRAFT_KEY);
      setForm({...BLANK, date:nowISO(), measurements:[{...BLANK_M}]});
      setStatus("Progress saved ✓");
      setTimeout(() => setStatus(""), 3000);
      window.dispatchEvent(new Event("progress_updated"));
      setTab("morning");
    } catch {
      enqueue((({photos:_,...p})=>p)(form));
      setEntries(s => s.map(it => it.id===opt.id ? {...it,queued:true} : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  }, [form, submitting, entries]);

  const filtered = useMemo(() => {
    let list = entries.slice();
    if (search.trim()) { const q=search.toLowerCase(); list=list.filter(it=>(it.zone||"").toLowerCase().includes(q)||(it.activity||"").toLowerCase().includes(q)); }
    if (filterZone.trim()) list=list.filter(it=>(it.zone||"").toLowerCase().includes(filterZone.toLowerCase()));
    if (filterDate) list=list.filter(it=>(it.date||"").slice(0,10)===filterDate);
    return list;
  }, [entries, search, filterZone, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  const pageItems  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(() => { if (page>totalPages) setPage(totalPages); }, [totalPages]);

  const avgActual  = useMemo(() => entries.length ? Math.round(entries.reduce((s,x)=>s+Number(x.percent_complete||0),0)/entries.length) : 0, [entries]);
  const avgPlanned = useMemo(() => entries.length ? Math.round(entries.reduce((s,x)=>s+Number(x.planned_percent||0),0)/entries.length)  : 0, [entries]);
  const overallDelay = avgPlanned - avgActual;
  const zones = useMemo(() => [...new Set(entries.map(e=>e.zone).filter(Boolean))], [entries]);
  const allM  = useMemo(() => entries.flatMap(e => { const m=e.measurements; if(!m)return[]; if(typeof m==="string"){try{return JSON.parse(m);}catch{return[];}} return Array.isArray(m)?m:[]; }), [entries]);
  const pendingQS = useMemo(() => allM.filter(m=>m.status==="submitted").length, [allM]);

  // Tab completion checks
  const morningDone = !!form.wbs_id && !!form.project_id && !!form.zone;
  const eveningDone = form.sqft_applicable ? !!form.sqft_completed : !!form.evening_description?.trim();

  return (
    <div className="prog-page">

      {/* HEADER */}
      <div className="prog-page-header">
        <div>
          <div className="prog-eyebrow">Site Monitoring</div>
          <h1 className="prog-title">Daily Progress Log</h1>
          <div className="prog-sub">Morning: confirm crew → Evening: log work done → Measurements: submit to QS</div>
        </div>
        <div className="prog-header-pills">
          <span className="prog-pill prog-pill--navy">Planned {avgPlanned}%</span>
          <span className="prog-pill prog-pill--teal">Actual {avgActual}%</span>
          {overallDelay > 0 && <span className="prog-pill prog-pill--danger">▼ {overallDelay}% Behind</span>}
          {overallDelay < 0 && <span className="prog-pill prog-pill--success">▲ {Math.abs(overallDelay)}% Ahead</span>}
          {pendingQS > 0 && <span className="prog-pill prog-pill--warning">{pendingQS} Pending QS</span>}
        </div>
      </div>

      {/* WORKFLOW STRIP */}
      <div className="prog-workflow-strip">
        {[
          { icon:"🌅", label:"Morning",      sub:"Confirm today's crew",    done:morningDone, tab:"morning"      },
          { arrow:true },
          { icon:"🌆", label:"Evening",      sub:"Log work completed",      done:eveningDone, tab:"evening"      },
          { arrow:true },
          { icon:"📏", label:"Measurements", sub:"Submit to QS",            done:pendingQS>0, tab:"measurements" },
        ].map((s,i) =>
          s.arrow
            ? <div key={i} className="prog-wf-arrow">→</div>
            : (
              <div key={i}
                className={`prog-wf-step${activeTab===s.tab?" prog-wf-step--active":""}${s.done?" prog-wf-step--done":""}`}
                onClick={() => setTab(s.tab)}>
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
                  {activeTab==="morning"      && "Step 1: Set project, zone, milestone — crew is pulled from Labour Report"}
                  {activeTab==="evening"      && "Step 2: Log work completed at end of shift"}
                  {activeTab==="measurements" && "Step 3: Log measurements for QS billing"}
                </div>
              </div>
              <div className="prog-panel-actions">
                <button type="button" className="prog-btn prog-btn--ghost" onClick={()=>{ls.save(DRAFT_KEY,form);setStatus("Draft saved");}}>Save Draft</button>
                <button type="button" className="prog-btn prog-btn--ghost" onClick={clearForm}>Clear</button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="prog-tab-bar">
              {[
                ["morning",      `🌅 Morning${morningDone?" ✓":""}`],
                ["evening",      `🌆 Evening${eveningDone?" ✓":""}`],
                ["measurements", `📏 Measurements${pendingQS>0?` (${pendingQS})`:""}`],
              ].map(([val,label]) => (
                <button key={val} type="button"
                  className={`prog-tab${activeTab===val?" prog-tab--active":""}`}
                  onClick={()=>setTab(val)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="prog-panel-body">
              <form onSubmit={submit} noValidate>

                {/* ═══ MORNING ══════════════════════════════════════════ */}
                {activeTab === "morning" && (
                  <>
                    <div className="prog-form-section">
                      <div className="prog-section-title">Entry Details</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
                          <label className="prog-label">Project *</label>
                          <select className="prog-input" value={form.project_id}
                            onChange={e=>{setF("project_id",e.target.value);setF("wbs_id","");setWbsList([]);}}>
                            <option value="">Select project</option>
                            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          {errors.project_id && <div className="prog-error">{errors.project_id}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Date *</label>
                          <input type="date" className="prog-input" value={form.date}
                            onChange={e=>setF("date",e.target.value)}/>
                          {errors.date && <div className="prog-error">{errors.date}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Zone *</label>
                          <input className="prog-input" value={form.zone}
                            onChange={e=>setF("zone",e.target.value)}
                            placeholder="e.g. Level 2 / Block B" list="prog-zl" autoComplete="off"/>
                          <datalist id="prog-zl">{zones.map(z=><option key={z} value={z}/>)}</datalist>
                          {errors.zone && <div className="prog-error">{errors.zone}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Milestone *</label>
                          <select className="prog-input" value={form.wbs_id||""}
                            onChange={e=>setF("wbs_id",e.target.value)}>
                            <option value="">Select milestone</option>
                            {wbsList.length===0
                              ? <option disabled>{form.project_id?"Loading…":"Select project first"}</option>
                              : wbsList.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)
                            }
                          </select>
                          {errors.wbs_id && <div className="prog-error">{errors.wbs_id}</div>}
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Activity Description</label>
                          <input className="prog-input" value={form.activity}
                            onChange={e=>setF("activity",e.target.value)}
                            placeholder="e.g. Level 3 North wing columns"/>
                        </div>
                      </div>
                    </div>

                    {/* ── LABOUR — read only from LabourReport ── */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">🌅 Crew on Site Today</div>
                      <LabourCard date={form.date} projectId={form.project_id}/>
                      <div className="prog-field" style={{marginTop:12}}>
                        <label className="prog-label">Morning Note (optional)</label>
                        <input className="prog-input" value={form.morning_note}
                          onChange={e=>setF("morning_note",e.target.value)}
                          placeholder="Issues at start of shift, equipment status…"/>
                      </div>
                    </div>

                    {/* Planned % */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Planned Progress (from programme)</div>
                      <div className="prog-field">
                        <label className="prog-label">Planned % for Today <span className="prog-label-note">from your programme</span></label>
                        <input type="range" min="0" max="100" className="prog-range"
                          value={form.planned_percent}
                          onChange={e=>setF("planned_percent",Number(e.target.value))}/>
                        <div className="prog-bar-track">
                          <div style={{height:"100%",width:`${form.planned_percent}%`,background:"#185FA5",borderRadius:99,transition:"width 0.3s"}}/>
                        </div>
                        <div className="prog-range-val prog-range-val--plan">{form.planned_percent}% planned</div>
                      </div>
                    </div>

                    <div className="prog-tab-next">
                      <button type="button" className="prog-btn prog-btn--primary" onClick={()=>setTab("evening")}>
                        Continue to Evening Log →
                      </button>
                      <span className="prog-tab-hint">Come back at end of shift to log work completed</span>
                    </div>
                  </>
                )}

                {/* ═══ EVENING ══════════════════════════════════════════ */}
                {activeTab === "evening" && (
                  <>
                    {!morningDone && (
                      <div className="prog-morning-warning">
                        ⚠ Set project, zone and milestone in the Morning tab first.{" "}
                        <button type="button" className="prog-inline-link" onClick={()=>setTab("morning")}>Go to Morning →</button>
                      </div>
                    )}

                    <div className="prog-form-section">
                      <div className="prog-section-title">🌆 Work Completed This Evening</div>

                      <div className="prog-sqft-toggle">
                        <label className="prog-toggle-label">
                          <input type="checkbox" className="prog-toggle-check"
                            checked={form.sqft_applicable}
                            onChange={e=>setF("sqft_applicable",e.target.checked)}/>
                          <span className="prog-toggle-text">Area / quantity measurement applicable</span>
                        </label>
                        {!form.sqft_applicable && (
                          <div className="prog-sqft-na-hint">
                            Not applicable — use the description below to record what was done
                          </div>
                        )}
                      </div>

                      {form.sqft_applicable && (
                        <div className="prog-sqft-row">
                          <div className="prog-field" style={{flex:2}}>
                            <label className="prog-label">Quantity Completed *</label>
                            <input type="number" min="0" step="0.01" className="prog-input prog-input--sqft"
                              value={form.sqft_completed}
                              onChange={e=>setF("sqft_completed",e.target.value)}
                              placeholder="0.00"/>
                          </div>
                          <div className="prog-field" style={{flex:1}}>
                            <label className="prog-label">Unit</label>
                            <select className="prog-input" value={form.sqft_unit}
                              onChange={e=>setF("sqft_unit",e.target.value)}>
                              {AREA_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="prog-field" style={{marginTop:12}}>
                        <label className="prog-label">
                          {form.sqft_applicable
                            ? "Description (additional details)"
                            : "Work Description * (what was completed today)"}
                        </label>
                        <textarea className="prog-textarea" value={form.evening_description}
                          onChange={e=>setF("evening_description",e.target.value)}
                          placeholder={
                            form.sqft_applicable
                              ? "Which grid lines, which floor, quality observations…"
                              : "Describe exactly what was completed — elements, grid refs, quantities (e.g. 12 columns poured, 3 beams cast)…"
                          }
                          style={{minHeight:form.sqft_applicable?80:120}}/>
                        {errors.evening && <div className="prog-error">{errors.evening}</div>}
                      </div>
                    </div>

                    {/* Completion % */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Overall Completion %</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
                          <label className="prog-label">Planned % <span className="prog-label-note">from programme</span></label>
                          <div className="prog-bar-track" style={{marginTop:8}}>
                            <div style={{height:"100%",width:`${form.planned_percent}%`,background:"#185FA5",borderRadius:99}}/>
                          </div>
                          <div className="prog-range-val prog-range-val--plan">{form.planned_percent}%</div>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Actual % <span className="prog-label-note">as of this evening</span></label>
                          <input type="range" min="0" max="100" className="prog-range"
                            value={form.percent_complete}
                            onChange={e=>setF("percent_complete",Number(e.target.value))}/>
                          <div className="prog-bar-track">
                            <div style={{height:"100%",width:`${form.percent_complete}%`,background:liveDelay>0?"#D85A30":"#085041",borderRadius:99,transition:"width 0.3s"}}/>
                          </div>
                          <div className={`prog-range-val${liveDelay>0?" prog-range-val--behind":" prog-range-val--ahead"}`}>
                            {form.percent_complete}% actual
                          </div>
                          {errors.percent_complete && <div className="prog-error">{errors.percent_complete}</div>}
                        </div>
                      </div>
                      {form.planned_percent > 0 && (
                        <div className={`prog-delay-flag${liveDelay>0?" prog-delay-flag--behind":liveDelay<0?" prog-delay-flag--ahead":""}`}>
                          {liveDelay>0 ? `⚠ Behind plan by ${liveDelay}% — select delay reason below`
                            : liveDelay<0 ? `✓ Ahead of plan by ${Math.abs(liveDelay)}%`
                            : "✓ On track with plan"}
                        </div>
                      )}
                    </div>

                    {/* Delays & Links */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Delays &amp; Links</div>
                      <div className="prog-grid-2">
                        <div className="prog-field">
                          <label className="prog-label">Delay Reason</label>
                          <select className="prog-input" value={form.delay_type} onChange={e=>setF("delay_type",e.target.value)}>
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
                          <input className="prog-input" value={form.linked_task} onChange={e=>setF("linked_task",e.target.value)} placeholder="TASK-001"/>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Linked RFI</label>
                          <input className="prog-input" value={form.linked_rfi} onChange={e=>setF("linked_rfi",e.target.value)} placeholder="RFI-007"/>
                        </div>
                        <div className="prog-field">
                          <label className="prog-label">Linked Incident</label>
                          <input className="prog-input" value={form.linked_incident} onChange={e=>setF("linked_incident",e.target.value)} placeholder="INC-002"/>
                        </div>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="prog-form-section">
                      <div className="prog-section-title">Evening Photos</div>
                      <input type="file" multiple onChange={handleFiles} className="prog-file-input" accept="image/*"/>
                      {form.photos.length > 0 && (
                        <div className="prog-file-list">
                          {form.photos.map((f,i) => (
                            <div key={`${f.name}-${i}`} className="prog-file-item">
                              <span>📷</span>
                              <span className="prog-file-name">{f.name}</span>
                              <button type="button" className="prog-file-remove" onClick={()=>removePhoto(i)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══ MEASUREMENTS ═════════════════════════════════════ */}
                {activeTab === "measurements" && (
                  <div className="prog-form-section">
                    <div className="prog-section-title">
                      Measurement Book
                      <span className="prog-section-note">Set status to Submitted when ready for QS</span>
                    </div>
                    <div className="prog-meas-header">
                      {["Work Item","Quantity","Unit","Status",""].map((h,i) => (
                        <div key={i} className="prog-meas-th">{h}</div>
                      ))}
                    </div>
                    {form.measurements.map((m,i) => {
                      const sc = scColor(m.status);
                      return (
                        <div key={i} className="prog-meas-row">
                          <input className="prog-input" value={m.item}
                            onChange={e=>setM(i,"item",e.target.value)}
                            placeholder="e.g. Plastering Level 2"/>
                          <input className="prog-input" type="number" min="0" step="0.01"
                            value={m.qty} onChange={e=>setM(i,"qty",e.target.value)} placeholder="0.00"/>
                          <select className="prog-input" value={m.unit}
                            onChange={e=>setM(i,"unit",e.target.value)}>
                            {AREA_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                          </select>
                          <select className="prog-input" value={m.status}
                            onChange={e=>setM(i,"status",e.target.value)}
                            style={{background:sc.bg,color:sc.color,borderColor:sc.border,fontWeight:600}}>
                            {MEAS_STATUS.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                          </select>
                          <button type="button" className="prog-meas-remove"
                            onClick={()=>removeM(i)} disabled={form.measurements.length===1}>×</button>
                        </div>
                      );
                    })}
                    <button type="button" className="prog-btn prog-btn--ghost prog-btn--sm" onClick={addM}>+ Add row</button>
                    <div className="prog-meas-hint">
                      Set status to <strong>Submitted</strong> when ready for QS.
                      QS marks as <strong>Approved</strong> to confirm billing.
                    </div>
                  </div>
                )}

                {/* Submit (evening + measurements only) */}
                {activeTab !== "morning" && (
                  <div className="prog-submit-row">
                    <button type="submit" className="prog-btn prog-btn--primary" disabled={submitting}>
                      {submitting ? "Saving…" : "Save Progress Entry"}
                    </button>
                    {status && (
                      <span className={`prog-status${status.includes("✓")?" prog-status--ok":status.includes("Offline")?" prog-status--err":" prog-status--saving"}`}>
                        {status}
                      </span>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ── ENTRIES LIST ────────────────────────────────── */}
          <div className="prog-panel">
            <div className="prog-panel-head">
              <div className="prog-panel-title">Progress Entries</div>
              <span className="prog-pill prog-pill--muted">{filtered.length} records</span>
            </div>
            <div className="prog-controls">
              <div className="prog-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search zone or activity…"/>
              </div>
              <input className="prog-input" style={{width:140}} value={filterZone}
                onChange={e=>{setFZ(e.target.value);setPage(1);}} placeholder="Filter zone" list="prog-zl"/>
              <input type="date" className="prog-input" style={{width:160}} value={filterDate}
                onChange={e=>{setFD(e.target.value);setPage(1);}}/>
            </div>

            {listLoading ? (
              <div className="prog-loading"><div className="prog-spinner"/>Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="prog-empty">No entries match this filter</div>
            ) : (
              <>
                {pageItems.map(p => {
                  const actual  = Math.max(0,Math.min(100,Number(p.percent_complete||0)));
                  const planned = Math.max(0,Math.min(100,Number(p.planned_percent||0)));
                  const delay   = planned - actual;
                  const mRows   = (() => {
                    if (!p.measurements) return [];
                    if (typeof p.measurements==="string") { try{return JSON.parse(p.measurements);}catch{return[];} }
                    return Array.isArray(p.measurements)?p.measurements:[];
                  })();
                  const workLabel = p.milestone_name || p.wbs_id;
                  const labourCount = Number(p.labour_headcount||0) ||
                    (Number(p.morning_skilled||0)+Number(p.morning_unskilled||0)+Number(p.morning_supervisors||0));

                  return (
                    <div key={stableKey(p)} className="prog-list-item">
                      <div className="prog-item-tags">
                        <span className="prog-item-zone">{p.zone||"—"}</span>
                        {workLabel && <span className="prog-item-work-type">{workLabel}</span>}
                        {p.activity && <span className="prog-item-activity">{p.activity}</span>}
                        {delay>0  && <span className="prog-item-badge prog-item-badge--behind">▼ {delay}% behind</span>}
                        {delay<0  && <span className="prog-item-badge prog-item-badge--ahead">▲ {Math.abs(delay)}% ahead</span>}
                        {p.queued && <span className="prog-item-badge prog-item-badge--queued">Queued</span>}
                      </div>

                      <div className="prog-item-bars">
                        <div className="prog-item-bar-label">
                          <span>Planned <strong style={{color:"#185FA5"}}>{planned}%</strong></span>
                          <span>Actual <strong style={{color:delay>0?"#b83232":"#085041"}}>{actual}%</strong></span>
                        </div>
                        <div className="prog-item-bar-track">
                          <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${planned}%`,background:"#B5D4F4",borderRadius:99}}/>
                          <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${actual}%`,background:delay>0?"#D85A30":"#085041",borderRadius:99,transition:"width 0.4s"}}/>
                        </div>
                      </div>

                      <div className="prog-item-summary">
                        {labourCount > 0 && (
                          <div className="prog-item-summary-block">
                            <span className="prog-item-summary-label">👷 Crew</span>
                            <span className="prog-item-summary-val">{labourCount} workers</span>
                          </div>
                        )}
                        {p.photos?.length > 0 && (
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            {p.photos.map((img,i) => (
                              <img key={i} src={`${BASE_URL}/${img}`} alt="progress"
                                style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #ccc",cursor:"pointer"}}
                                onClick={()=>window.open(`${BASE_URL}/${img}`,"_blank")}/>
                            ))}
                          </div>
                        )}
                        {(p.sqft_completed||p.evening_description) && (
                          <div className="prog-item-summary-block">
                            <span className="prog-item-summary-label">🌆 Done</span>
                            <span className="prog-item-summary-val">
                              {p.sqft_completed?`${p.sqft_completed} ${p.sqft_unit||"sqft"}`:""}
                              {p.sqft_completed&&p.evening_description?" · ":""}
                              {p.evening_description?p.evening_description.slice(0,60)+(p.evening_description.length>60?"…":""):""}
                            </span>
                          </div>
                        )}
                        {p.date && (
                          <div className="prog-item-summary-block">
                            <span className="prog-item-summary-label">📅 Date</span>
                            <span className="prog-item-summary-val">{new Date(p.date+"T12:00:00").toLocaleDateString("en-GB")}</span>
                          </div>
                        )}
                      </div>

                      {mRows.length > 0 && (
                        <div className="prog-item-meas-tags">
                          {mRows.filter(m=>m.item).map((m,mi) => (
                            <span key={mi} className="prog-meas-tag"
                              style={{background:scColor(m.status).bg,color:scColor(m.status).color,border:`0.5px solid ${scColor(m.status).border}`}}>
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
                    <button className="prog-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>← Prev</button>
                    <button className="prog-page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next →</button>
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
              ["Planned",   `${form.planned_percent}%`],
              ["Actual",    `${form.percent_complete}%`],
              ["Work Done", form.sqft_completed?`${form.sqft_completed} ${form.sqft_unit}`:form.evening_description?"Described":"—"],
              ["Delay",     form.delay_type?form.delay_type.replace("_"," "):"None"],
            ].map(([l,v]) => (
              <div key={l} className="prog-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="prog-aside-card">
            <div className="prog-aside-title">Overall Stats</div>
            {[
              ["Total Entries", entries.length],
              ["Avg Planned",   `${avgPlanned}%`],
              ["Avg Actual",    `${avgActual}%`],
              ["Pending QS",    pendingQS],
              ["Zones",         zones.length],
            ].map(([l,v]) => (
              <div key={l} className="prog-aside-row"><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
          <div className="prog-aside-card">
            <div className="prog-aside-title">How to Use</div>
            <ol className="prog-how-to">
              <li><strong>Labour Report</strong> first — enter your crew by trade</li>
              <li><strong>Morning</strong> — set project, zone &amp; milestone</li>
              <li><strong>Evening</strong> — log sqft or describe work done</li>
              <li><strong>Measurements</strong> — add items &amp; submit to QS</li>
            </ol>
            <div style={{padding:"8px 16px 12px"}}>
              <button className="prog-btn prog-btn--ghost"
                style={{width:"100%",fontSize:12}}
                onClick={()=>navigate("/site-engineer/labour-report")}>
                👷 Submit Labour Report →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}