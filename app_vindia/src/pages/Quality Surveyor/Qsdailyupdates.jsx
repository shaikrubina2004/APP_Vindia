import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Qsdailyupdates.css";

/* ─── API ─────────────────────────────────────── */
const API = "http://localhost:5000/api/qs";

/* ─── constants ───────────────────────────────── */
const UNITS = ["m³","m²","m","kg","nos","ltr","ton","bag","rft","MT","Set","RMT"];

const STATUS_OPTS = [
  { key:"on-track", label:"On Track",  emoji:"✅", desc:"Progressing as planned",  selCls:"sel-on-track" },
  { key:"delayed",  label:"Delayed",   emoji:"⏳", desc:"Behind scheduled timeline", selCls:"sel-delayed" },
  { key:"critical", label:"Critical",  emoji:"🚨", desc:"Immediate attention needed",selCls:"sel-critical" },
  { key:"ahead",    label:"Ahead",     emoji:"🚀", desc:"Ahead of schedule",         selCls:"sel-ahead" },
];

const STATUS_MAP = {
  "on-track":{ cls:"s-on-track", banner:"green" },
  "on_track":{ cls:"s-on-track", banner:"green" },
  "delayed": { cls:"s-delayed",  banner:"amber" },
  "critical":{ cls:"s-critical", banner:"red" },
  "ahead":   { cls:"s-ahead",    banner:"blue" },
};

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const blankItem = () => ({
  id:        Math.random().toString(36).substr(2,8),
  material:  "",
  unit:      "m²",
  planned:   "",
  executed:  "",
});

const EMPTY_FORM = {
  date:           new Date().toISOString().split("T")[0],
  project_id:     "",
  project_name:   "",
  milestone:      "",
  location:       "",
  work_title:     "",
  description:    "",
  workers:        "",
  equipment:      "",
  contractor:     "",
  status:         "on-track",
  daily_progress: 0,
  milestone_prog: 0,
  issues:         "",
  items:          [blankItem(), blankItem()],
};

const progColor = p => p >= 80 ? "#16a34a" : p >= 40 ? "#0f766e" : "#d97706";
const normS     = s => (s||"on-track").toLowerCase().replace(/\s+/g,"-");
const getS      = s => STATUS_MAP[normS(s)] || STATUS_MAP["on-track"];

const isoDate = d => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const dd= String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
};

const fmtDate = d =>
  new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

/* build last 7 days */
const buildWeek = () => {
  const arr = [];
  for (let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    arr.push({ iso:isoDate(d), dayName:DAYS[d.getDay()], num:d.getDate() });
  }
  return arr;
};

/* ─── SVG Icons ───────────────────────────────── */
const Ic = {
  Report: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Send:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Plus:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  X:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Cal:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Upload: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  Refresh:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Empty:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  File:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
};

/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
export default function QSDailyUpdates() {
  const [form,       setForm]       = useState({ ...EMPTY_FORM, items:[blankItem(),blankItem()] });
  const [projects,   setProjects]   = useState([]);
  const [phases,     setPhases]     = useState([]);
  const [updates,    setUpdates]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [selDay,     setSelDay]     = useState(null);
  const [viewItem,   setViewItem]   = useState(null);
  const [files,      setFiles]      = useState([]);
  const [errors,     setErrors]     = useState({});
  const fileRef = useRef();

  const todayISO = isoDate(new Date());
  const week     = buildWeek();

  /* ── notify ── */
  const notify = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── fetch on mount ── */
  useEffect(() => { fetchProjects(); fetchUpdates(); }, []);

  const fetchProjects = async () => {
    try { const r = await axios.get(`${API}/projects`); setProjects(r.data.data||[]); } catch {}
  };

  const fetchUpdates = async () => {
    try { const r = await axios.get(`${API}/daily-updates`); setUpdates(r.data.data||[]); }
    catch { notify("Failed to load updates","err"); }
  };

  /* ── project change → load WBS ── */
  const onProjectChange = async (pid) => {
    const proj = projects.find(p => String(p.id) === String(pid));
    sf("project_id",   pid);
    sf("project_name", proj?.name || "");
    sf("milestone",    "");
    if (!pid) { setPhases([]); return; }
    try {
      const r = await axios.get(`${API}/boq/wbs/${pid}`);
      setPhases((r.data.data||[]).filter(w => w.parent_id === null));
    } catch {
      setPhases([
        {id:"1",name:"Site Preparation"},{id:"2",name:"Earthwork & Foundation"},
        {id:"3",name:"Superstructure"},{id:"4",name:"Doors & Windows"},
        {id:"5",name:"Plastering Works"},{id:"6",name:"MEP Works"},
        {id:"7",name:"Tiling Works"},{id:"8",name:"Finishing Works"},
        {id:"9",name:"Project Completion"},
      ]);
    }
  };

  /* ── form helpers ── */
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setItem = (id, field, val) =>
    setForm(f => ({ ...f, items: f.items.map(r => r.id===id ? {...r,[field]:val} : r) }));

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }));

  const delItem = id => setForm(f => ({ ...f, items: f.items.filter(r => r.id!==id) }));

  const totalCompleted = item =>
    (parseFloat(item.executed) || 0);

  /* ── file upload ── */
  const onFileChange = e => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };
  const removeFile = name => setFiles(prev => prev.filter(f => f.name !== name));

  /* ── validate ── */
  const validate = () => {
    const e = {};
    if (!form.date)        e.date        = true;
    if (!form.project_id)  e.project_id  = true;
    if (!form.work_title)  e.work_title  = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!validate()) { notify("Please fill required fields *","err"); return; }
    setLoading(true);
    try {
      const remarkParts = [];
      if (form.description) remarkParts.push("Work: " + form.description);
      if (form.equipment)   remarkParts.push("Equipment: " + form.equipment);
      if (form.contractor)  remarkParts.push("Contractor: " + form.contractor);
      if (form.issues)      remarkParts.push("Issues: " + form.issues);
      const firstItem = form.items.find(it => it.material.trim());
      const payload = {
        project_id:    Number(form.project_id),
        phase:         form.milestone      || "",
        status:        form.status         || "on-track",
        activity:      form.work_title,
        quantity:      firstItem ? (Number(firstItem.executed) || 0) : 0,
        unit:          firstItem ? firstItem.unit : "nos",
        location:      form.location       || "",
        manpower:      Number(form.workers) || 0,
        progress:      Number(form.daily_progress) || 0,
        boq_item:      form.work_title,
        cost_estimate: "",
        cost_actual:   "",
        remarks:       remarkParts.join(" | ") || "",
      };
      await axios.post(`${API}/daily-updates`, payload);
      notify("Daily update submitted successfully! ✓");
      setForm({ ...EMPTY_FORM, items:[blankItem(),blankItem()], date:todayISO });
      setFiles([]);
      setErrors({});
      await fetchUpdates();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Submit failed";
      notify(msg, "err");
      console.error("Submit error:", err?.response?.data || err);
    } finally { setLoading(false); }
  };

  /* ── reset ── */
  const handleReset = () => {
    setForm({ ...EMPTY_FORM, items:[blankItem(),blankItem()], date:todayISO });
    setFiles([]); setErrors({});
  };

  /* ── group updates by date ── */
  const byDate = {};
  updates.forEach(u => {
    const key = isoDate(u.date || u.created_at);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(u);
  });

  /* ── stats ── */
  const stats = {
    total:    updates.length,
    onTrack:  updates.filter(u=>normS(u.status)==="on-track").length,
    delayed:  updates.filter(u=>normS(u.status)==="delayed").length,
    critical: updates.filter(u=>normS(u.status)==="critical").length,
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="qsd">

      {/* TOAST */}
      {toast && (
        <div className={`qsd-toast qsd-toast--${toast.type}`}>
          {toast.type==="ok" ? <Ic.Check/> : <Ic.Alert/>}{toast.msg}
        </div>
      )}

      {/* ══════════ TOP BAR ══════════ */}
      <div className="qsd-topbar">
        <div className="qsd-topbar-left">
          <div className="qsd-topbar-ico"><Ic.Report/></div>
          <div>
            <div className="qsd-topbar-title">Daily Updates</div>
            <div className="qsd-topbar-sub">Quantity Surveyor · Site Progress Reporting</div>
          </div>
        </div>
        <div className="qsd-topbar-right">
          {[{val:stats.total,lbl:"Total"},{val:stats.onTrack,lbl:"On Track"},{val:stats.delayed,lbl:"Delayed"},{val:stats.critical,lbl:"Critical"}].map(s=>(
            <div key={s.lbl} className="qsd-topbar-stat">
              <span className="qsd-ts-val">{s.val}</span>
              <span className="qsd-ts-lbl">{s.lbl}</span>
            </div>
          ))}
          <button
            className={`qsd-view-btn${showReport?" active":""}`}
            onClick={() => { setShowReport(v=>!v); if(!selDay) setSelDay(todayISO); }}
          >
            <Ic.Cal/>{showReport ? "Hide Reports" : "View Reports"}
          </button>
        </div>
      </div>

      {/* ══════════ MAIN LAYOUT ══════════ */}
      <div className="qsd-layout">

        {/* ════════ LEFT: FORM ════════ */}
        <div className="qsd-form-area">

          {/* ─ 1: Basic Details ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">1</span>
              <div>
                <div className="qsd-sec-label">Basic Details</div>
                <div className="qsd-sec-desc">Project, date and location information</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-grid">
                {/* Date */}
                <div className="qsd-field">
                  <label className="qsd-lbl">Date <span className="req">*</span></label>
                  <input className={`qsd-inp${errors.date?" err":""}`} type="date"
                    value={form.date} onChange={e=>sf("date",e.target.value)}/>
                </div>
                {/* Project */}
                <div className="qsd-field">
                  <label className="qsd-lbl">Project <span className="req">*</span></label>
                  <select className={`qsd-sel${errors.project_id?" err":""}`}
                    value={form.project_id} onChange={e=>onProjectChange(e.target.value)}>
                    <option value="">— Select project —</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {/* Project name auto-fill */}
                <div className="qsd-field">
                  <label className="qsd-lbl">Project Name</label>
                  <input className="qsd-inp qsd-auto" value={form.project_name} readOnly placeholder="Auto-filled from selection"/>
                </div>
                {/* Milestone / WBS */}
                <div className="qsd-field">
                  <label className="qsd-lbl">Milestone / WBS Phase</label>
                  <select className="qsd-sel" value={form.milestone}
                    onChange={e=>sf("milestone",e.target.value)} disabled={!form.project_id}>
                    <option value="">— Select milestone —</option>
                    {phases.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                {/* Location */}
                <div className="qsd-field qsd-span2">
                  <label className="qsd-lbl">Location / Block</label>
                  <input className="qsd-inp" placeholder="e.g. Block A, Grid B-C, Level 3, North Wing…"
                    value={form.location} onChange={e=>sf("location",e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {/* ─ 2: Work Description ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">2</span>
              <div>
                <div className="qsd-sec-label">Work Description</div>
                <div className="qsd-sec-desc">Today's work title and detailed description</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-grid">
                <div className="qsd-field qsd-span2">
                  <label className="qsd-lbl">Work Title <span className="req">*</span></label>
                  <input className={`qsd-inp${errors.work_title?" err":""}`}
                    placeholder="e.g. Concrete Pouring, Column Casting, Brick Laying, Tile Fixing…"
                    value={form.work_title} onChange={e=>sf("work_title",e.target.value)}/>
                </div>
                <div className="qsd-field qsd-span2">
                  <label className="qsd-lbl">Detailed Description</label>
                  <textarea className="qsd-ta" rows={3}
                    placeholder="Describe the work carried out today — methodology, area covered, specific notes…"
                    value={form.description} onChange={e=>sf("description",e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {/* ─ 3: Quantity Details ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">3</span>
              <div>
                <div className="qsd-sec-label">Quantity Details</div>
                <div className="qsd-sec-desc">Materials, planned vs executed quantities</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-qty-table-wrap">
                <table className="qsd-qty-table">
                  <thead>
                    <tr>
                      <th style={{width:28}}>#</th>
                      <th className="tl" style={{width:"30%"}}>Material / Work Item</th>
                      <th style={{width:80}}>Unit</th>
                      <th>Planned Qty</th>
                      <th>Executed Today</th>
                      <th>Total Completed</th>
                      <th style={{width:36}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it,i)=>(
                      <tr key={it.id}>
                        <td style={{textAlign:"center",fontSize:11,color:"#94a3b8",fontWeight:600}}>{i+1}</td>
                        <td>
                          <input className="qsd-ti left" value={it.material}
                            placeholder="e.g. M25 Concrete, TMT Steel, Bricks…"
                            onChange={e=>setItem(it.id,"material",e.target.value)}/>
                        </td>
                        <td>
                          <select className="qsd-ti-sel" value={it.unit}
                            onChange={e=>setItem(it.id,"unit",e.target.value)}>
                            {UNITS.map(u=><option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="qsd-ti" type="number" min="0" placeholder="0"
                            value={it.planned} onChange={e=>setItem(it.id,"planned",e.target.value)}/>
                        </td>
                        <td>
                          <input className="qsd-ti" type="number" min="0" placeholder="0"
                            value={it.executed} onChange={e=>setItem(it.id,"executed",e.target.value)}/>
                        </td>
                        <td style={{textAlign:"right",paddingRight:10,fontFamily:"var(--mono)",fontSize:12,color:"var(--teal)",fontWeight:600}}>
                          {totalCompleted(it).toFixed(2)} {it.unit}
                        </td>
                        <td style={{textAlign:"center"}}>
                          <button
                            type="button"
                            className="qsd-del-btn"
                            title="Remove row"
                            onClick={()=>{ if(form.items.length>1) delItem(it.id); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="qsd-add-row-btn" onClick={addItem}>
                <Ic.Plus/>Add Material Row
              </button>
            </div>
          </div>

          {/* ─ 4: Labour & Resource ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">4</span>
              <div>
                <div className="qsd-sec-label">Labour & Resources</div>
                <div className="qsd-sec-desc">Workers, equipment and contractor details</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-grid-3">
                <div className="qsd-field">
                  <label className="qsd-lbl">Number of Workers</label>
                  <input className="qsd-inp" type="number" min="0" placeholder="14"
                    value={form.workers} onChange={e=>sf("workers",e.target.value)}/>
                </div>
                <div className="qsd-field">
                  <label className="qsd-lbl">Equipment Used</label>
                  <input className="qsd-inp" placeholder="Concrete pump, JCB, Crane…"
                    value={form.equipment} onChange={e=>sf("equipment",e.target.value)}/>
                </div>
                <div className="qsd-field">
                  <label className="qsd-lbl">Contractor / Team</label>
                  <input className="qsd-inp" placeholder="Team A, Subcontractor name…"
                    value={form.contractor} onChange={e=>sf("contractor",e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {/* ─ 5: Status ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">5</span>
              <div>
                <div className="qsd-sec-label">Status</div>
                <div className="qsd-sec-desc">Current progress status of today's work</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-status-grid">
                {STATUS_OPTS.map(opt=>(
                  <div key={opt.key}
                    className={`qsd-status-opt${form.status===opt.key?` selected ${opt.selCls}`:""}`}
                    onClick={()=>sf("status",opt.key)}>
                    <div className="qsd-status-emoji">{opt.emoji}</div>
                    <div className="qsd-status-name">{opt.label}</div>
                    <div className="qsd-status-desc">{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─ 6: Issues / Risks ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">6</span>
              <div>
                <div className="qsd-sec-label">Issues / Risks</div>
                <div className="qsd-sec-desc">Any problems, delays or safety concerns today</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-field">
                <label className="qsd-lbl">Issue Description</label>
                <textarea className="qsd-ta" rows={3}
                  placeholder="e.g. Weather delay due to rain, Material shortage — uPVC fittings pending, Concrete pump breakdown — delayed 3 hrs, No issues today…"
                  value={form.issues} onChange={e=>sf("issues",e.target.value)}/>
              </div>
            </div>
          </div>

          {/* ─ 7: Progress ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">7</span>
              <div>
                <div className="qsd-sec-label">Progress Tracking</div>
                <div className="qsd-sec-desc">Daily and overall milestone progress</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-prog-fields">
                <div className="qsd-prog-row">
                  <span className="qsd-prog-label">Daily Progress (%)</span>
                  <input className="qsd-slider" type="range" min="0" max="100"
                    value={form.daily_progress}
                    onChange={e=>sf("daily_progress",Number(e.target.value))}/>
                  <span className="qsd-slider-val">{form.daily_progress}%</span>
                </div>
                <div className="qsd-prog-row">
                  <span className="qsd-prog-label">Milestone Progress (%)</span>
                  <input className="qsd-slider" type="range" min="0" max="100"
                    value={form.milestone_prog}
                    onChange={e=>sf("milestone_prog",Number(e.target.value))}/>
                  <span className="qsd-slider-val">{form.milestone_prog}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─ 8: Upload ─ */}
          <div className="qsd-sec">
            <div className="qsd-sec-head">
              <span className="qsd-sec-num">8</span>
              <div>
                <div className="qsd-sec-label">Attachments</div>
                <div className="qsd-sec-desc">Upload site photos or documents</div>
              </div>
            </div>
            <div className="qsd-sec-body">
              <div className="qsd-upload-zone" onClick={()=>fileRef.current?.click()}>
                <Ic.Upload/>
                <p>Click to upload or drag & drop</p>
                <span>Photos, PDFs, drawings — JPG, PNG, PDF up to 10MB</span>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{display:"none"}} onChange={onFileChange}/>
              {files.length>0 && (
                <div className="qsd-uploaded-files">
                  {files.map(f=>(
                    <span key={f.name} className="qsd-file-chip">
                      <Ic.File/>{f.name.length>20?f.name.slice(0,18)+"…":f.name}
                      <button className="qsd-file-del" onClick={()=>removeFile(f.name)}>
                        <Ic.X/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─ FORM ACTIONS ─ */}
          <div className="qsd-form-actions">
            <div className="qsd-action-left">
              <button className="qsd-btn-reset" onClick={handleReset}>
                <Ic.Refresh/>Reset Form
              </button>
            </div>
            <button className="qsd-btn-submit" onClick={handleSubmit} disabled={loading}>
              <Ic.Send/>{loading ? "Submitting…" : "Submit Daily Update"}
            </button>
          </div>
        </div>

        {/* ════════ RIGHT: WEEKLY REPORT ════════ */}
        {showReport && (
          <div className="qsd-report-area">
            <div className="qsd-report-hdr">
              <h3>📅 Weekly Report — Last 7 Days</h3>
              <p>Click any day to view submitted updates</p>
            </div>

            <div className="qsd-day-tabs">
              {week.map(day=>{
                const dayUpdates = byDate[day.iso] || [];
                const isToday    = day.iso === todayISO;
                const isSel      = day.iso === selDay;
                const hasData    = dayUpdates.length > 0;
                return (
                  <div key={day.iso}
                    className={`qsd-day-tab${isSel?" active":""}`}
                    onClick={()=>setSelDay(isSel ? null : day.iso)}>

                    {/* Day header */}
                    <div className={`qsd-day-tab-hdr${isToday?" today-hdr":""}`}>
                      <div className="qsd-day-info">
                        <div className={`qsd-day-circle${isToday?" today-c":hasData?" has-c":""}`}>
                          {day.num}
                        </div>
                        <div>
                          <div className="qsd-day-name">
                            {day.dayName}{isToday?" · Today":""}
                          </div>
                          <div className="qsd-day-date">{fmtDate(day.iso)}</div>
                        </div>
                      </div>
                      <span className={`qsd-day-cnt${!hasData?" empty":""}`}>
                        {hasData ? `${dayUpdates.length} update${dayUpdates.length>1?"s":""}` : "No updates"}
                      </span>
                    </div>

                    {/* Day updates (when selected) */}
                    {isSel && (
                      <div className="qsd-day-items">
                        {dayUpdates.length === 0 ? (
                          <div className="qsd-no-updates">
                            <Ic.Empty/>No updates submitted on this day
                          </div>
                        ) : (
                          dayUpdates.map(u=>{
                            const sc  = getS(u.status);
                            const pct = Number(u.progress)||0;
                            return (
                              <div key={u.id} className={`qsd-day-upd ${sc.cls}`}
                                onClick={e=>{e.stopPropagation();setViewItem(u);}}>
                                <div className="qsd-dui-top">
                                  <div className="qsd-dui-proj">{u.project_name||"Project"}</div>
                                  <span className={`qsd-sbadge ${sc.cls}`}>
                                    <span style={{width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block",marginRight:3}}/>
                                    {STATUS_OPTS.find(s=>s.key===normS(u.status))?.label||u.status}
                                  </span>
                                </div>
                                <div className="qsd-dui-title">{u.activity}</div>
                                <div className="qsd-mini-prog">
                                  <div className="qsd-mini-bar">
                                    <div className="qsd-mini-fill" style={{width:`${pct}%`,background:progColor(pct)}}/>
                                  </div>
                                  <span className="qsd-mini-pct">{pct}%</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ════════ DETAIL MODAL ════════ */}
      {viewItem && (()=>{
        const u  = viewItem;
        const sc = getS(u.status);
        const pct= Number(u.progress)||0;
        const stOpt = STATUS_OPTS.find(s=>s.key===normS(u.status));
        return (
          <div className="qsd-overlay" onClick={()=>setViewItem(null)}>
            <div className="qsd-modal" onClick={e=>e.stopPropagation()}>

              <div className="qsd-m-head">
                <div className="qsd-m-head-l">
                  <div className="qsd-m-ico"><Ic.Report/></div>
                  <div>
                    <div className="qsd-m-title">{u.project_name||"Project"}</div>
                    <div className="qsd-m-sub">{u.phase||"—"} · {u.date?fmtDate(u.date):""}</div>
                  </div>
                </div>
                <button className="qsd-m-close" onClick={()=>setViewItem(null)}><Ic.X/></button>
              </div>

              <div className="qsd-m-body">
                <div className={`qsd-m-banner ${sc.banner}`}>
                  <span style={{fontSize:18}}>{stOpt?.emoji}</span>
                  <span className={`qsd-sbadge ${sc.cls}`}>{stOpt?.label||u.status}</span>
                </div>

                <div className="qsd-m-grid">
                  <div className="qsd-m-field qsd-m-full">
                    <div className="qsd-m-lbl">Work Activity</div>
                    <div className="qsd-m-val">{u.activity||"—"}</div>
                  </div>
                  {[
                    ["Phase / Milestone", u.phase||"—"],
                    ["Date",              u.date?fmtDate(u.date):"—"],
                    ["Quantity",          u.quantity?`${u.quantity} ${u.unit}`:"—"],
                    ["Location",          u.location||"—"],
                    ["Manpower",          u.manpower?`${u.manpower} workers`:"—"],
                  ].map(([l,v])=>(
                    <div key={l} className="qsd-m-field">
                      <div className="qsd-m-lbl">{l}</div>
                      <div className="qsd-m-val">{v}</div>
                    </div>
                  ))}

                  {/* Progress */}
                  <div className="qsd-m-field qsd-m-full">
                    <div className="qsd-m-lbl">Progress</div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6}}>
                      <div style={{flex:1,height:8,background:"var(--border)",borderRadius:8,overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:progColor(pct),borderRadius:8}}/>
                      </div>
                      <span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--ink)"}}>{pct}%</span>
                    </div>
                  </div>
                </div>

                {u.remarks && (
                  <div className="qsd-m-issue">
                    <Ic.Alert/>{u.remarks}
                  </div>
                )}
              </div>

              <div className="qsd-m-foot">
                <button className="qsd-btn-reset" onClick={()=>setViewItem(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}