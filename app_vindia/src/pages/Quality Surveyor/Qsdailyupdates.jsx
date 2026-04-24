import { useState } from "react";
import "./Qsdailyupdates.css";

const EMPTY = {
  date:"",project:"",phase:"Foundation",activity:"",qty:"",unit:"",
  location:"",manpower:"",status:"on-track",progress:"",issues:"",submittedTo:"CEO & Project Manager"
};
const SM = {
  "on-track":{ label:"On Track", cls:"qs-badge--green" },
  "delayed": { label:"Delayed",  cls:"qs-badge--yellow" },
  "critical":{ label:"Critical", cls:"qs-badge--red" },
  "ahead":   { label:"Ahead",    cls:"qs-badge--blue" },
};
const pc = (p)=>p>=80?"#16a34a":p>=40?"#2563eb":"#d97706";

const SEED = [
  { id:1, date:"2026-04-14", project:"Tower A", phase:"Foundation", activity:"Footing casting Grid C1-C4", qty:15, unit:"m³", location:"Grid C, Lvl 0", manpower:14, status:"on-track", progress:72, issues:"", submittedTo:"CEO & Project Manager" },
  { id:2, date:"2026-04-14", project:"Mall Project", phase:"Structure", activity:"Column casting Lvl 3", qty:6, unit:"m³", location:"Block B, Lvl 3", manpower:18, status:"delayed", progress:45, issues:"Concrete pump breakdown – delayed 3 hrs", submittedTo:"CEO & Project Manager" },
  { id:3, date:"2026-04-13", project:"Hospital Block", phase:"MEP", activity:"Plumbing rough-in", qty:40, unit:"m", location:"Wing C, Lvl 2", manpower:6, status:"critical", progress:29, issues:"Material shortage – uPVC fittings pending", submittedTo:"CEO & Project Manager" },
];

export default function QSDailyUpdates() {
  const PROJECTS = [
  "Tower A",
  "Mall Project",
  "Hospital Block",
  "Residential Villa",
];
  const [updates, setUpdates] = useState(SEED);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [view, setView] = useState(null);

  const show = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const sf = (k,v)=>setForm(f=>({...f,[k]:v}));

  const handleSave = ()=>{
    if(!form.date||!form.project||!form.activity){ show("Date, project & activity required","err"); return; }
    setUpdates(p=>[{id:Date.now(),...form,qty:+form.qty,manpower:+form.manpower,progress:+form.progress},...p]);
    setForm(EMPTY); setShowModal(false); show("Daily update submitted successfully!");
  };

  const filtered = filter==="All" ? updates : updates.filter(u=>u.status===filter);

  return (
    <div className="qsd-page">
      {toast&&<div className={`qs-toast qs-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="qs-page-hdr">
        <div>
          <div className="qs-page-title">Daily Updates</div>
          <div className="qs-page-sub">Create and submit daily site reports to management</div>
        </div>
        <button className="qs-btn-primary" onClick={()=>setShowModal(true)}>+ New Update</button>
      </div>

      <div className="qs-filter-bar">
        {["All","on-track","delayed","critical","ahead"].map(s=>(
          <button key={s} className={`qs-filter-pill${filter===s?" active":""}`} onClick={()=>setFilter(s)}>
            {s==="All"?"All":SM[s].label}
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div className="qs-empty">
          <div className="qs-empty-icon">📋</div>
          <div className="qs-empty-msg">No updates yet</div>
          <div>Create your first daily update above</div>
        </div>
      ) : (
        <div className="qsdu-list">
          {filtered.map(u=>(
            <div key={u.id} className={`qsdu-card qsdu-card--${u.status}`}>
              <div className="qsdu-top">
                <div>
                  <div className="qsdu-project">{u.project}</div>
                  <div className="qsdu-meta">{u.phase} · {u.date} · 👷 {u.manpower} workers</div>
                </div>
                <div className="qsdu-top-right">
                  <span className={`qs-badge ${SM[u.status].cls}`}>{SM[u.status].label}</span>
                  <span className="qsdu-submitted-to">→ {u.submittedTo}</span>
                </div>
              </div>
              <div className="qsdu-activity">{u.activity}</div>
              <div className="qsdu-nums">
                <span>📐 {u.qty} {u.unit}</span>
                {u.location&&<span>📍 {u.location}</span>}
              </div>
              {u.issues&&<div className="qsdu-issue">⚠ {u.issues}</div>}
              <div className="qsdu-prog-row">
                <span className="qsdu-prog-label">Progress</span>
                <div className="qs-prog" style={{flex:1}}>
                  <div className="qs-prog-track">
                    <div className="qs-prog-fill" style={{width:`${u.progress}%`,background:pc(u.progress)}} />
                  </div>
                  <span className="qs-prog-lbl">{u.progress}%</span>
                </div>
                <button className="qsdu-view-btn" onClick={()=>setView(u)}>View →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Update Modal */}
      {showModal&&(
        <div className="qs-overlay" onClick={()=>setShowModal(false)}>
          <div className="qs-modal" onClick={e=>e.stopPropagation()}>
            <div className="qs-modal-hdr">
              <span className="qs-modal-title">New Daily Update</span>
              <button className="qs-modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="qs-modal-body">
              <div className="qs-form-grid">
                <div className="qs-field">
                  <label className="qs-label">Date *</label>
                  <input className="qs-input" type="date" value={form.date} onChange={e=>sf("date",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Project Name *</label>
                 <select
  className="qs-select"
  value={form.project}
  onChange={(e) => sf("project", e.target.value)}
>
  <option value="">Select Project</option>

  {PROJECTS.map((p, index) => (
    <option key={index} value={p}>
      {p}
    </option>
  ))}
</select>
                </div>
                <div className="qs-field">
                  <label className="qs-label">Phase / Milestone</label>
                  <select className="qs-select" value={form.phase} onChange={e=>sf("phase",e.target.value)}>
                    {["Foundation","Structure","Finishing","MEP"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="qs-field">
                  <label className="qs-label">Status</label>
                  <select className="qs-select" value={form.status} onChange={e=>sf("status",e.target.value)}>
                    <option value="on-track">On Track</option>
                    <option value="delayed">Delayed</option>
                    <option value="critical">Critical</option>
                    <option value="ahead">Ahead</option>
                  </select>
                </div>
                <div className="qs-field qs-form-full">
                  <label className="qs-label">Activity Description *</label>
                  <input className="qs-input" placeholder="Column casting Grid B2..." value={form.activity} onChange={e=>sf("activity",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Quantity</label>
                  <input className="qs-input" type="number" placeholder="15" value={form.qty} onChange={e=>sf("qty",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Unit</label>
                  <input className="qs-input" placeholder="m³ / MT / m²" value={form.unit} onChange={e=>sf("unit",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Location</label>
                  <input className="qs-input" placeholder="Grid B, Level 3" value={form.location} onChange={e=>sf("location",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Manpower</label>
                  <input className="qs-input" type="number" placeholder="14" value={form.manpower} onChange={e=>sf("manpower",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Progress (%)</label>
                  <input className="qs-input" type="number" min="0" max="100" placeholder="65" value={form.progress} onChange={e=>sf("progress",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Submit To</label>
                  <input className="qs-input" value={form.submittedTo} onChange={e=>sf("submittedTo",e.target.value)} />
                </div>
                <div className="qs-field qs-form-full">
                  <label className="qs-label">Issues / Remarks</label>
                  <textarea className="qs-textarea" placeholder="Any issues today..." value={form.issues} onChange={e=>sf("issues",e.target.value)} />
                </div>
              </div>
            </div>
            <div className="qs-modal-footer">
              <button className="qs-btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="qs-btn-primary" onClick={handleSave}>Submit Update</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {view&&(
        <div className="qs-overlay" onClick={()=>setView(null)}>
          <div className="qs-modal" onClick={e=>e.stopPropagation()}>
            <div className="qs-modal-hdr" style={{borderBottom:`3px solid ${pc(view.progress)}`}}>
              <span className="qs-modal-title">{view.project} — {view.date}</span>
              <button className="qs-modal-close" onClick={()=>setView(null)}>✕</button>
            </div>
            <div className="qs-modal-body">
              <div className="qsdu-view-grid">
                {[
                  {label:"Phase",    val:view.phase},
                  {label:"Status",   val:<span className={`qs-badge ${SM[view.status].cls}`}>{SM[view.status].label}</span>},
                  {label:"Activity", val:view.activity,full:true},
                  {label:"Quantity", val:`${view.qty} ${view.unit}`},
                  {label:"Location", val:view.location},
                  {label:"Manpower", val:`${view.manpower} workers`},
                  {label:"Submit To",val:view.submittedTo},
                ].map((f,i)=>(
                  <div key={i} className={`qsdu-view-field${f.full?" qsdu-view-full":""}`}>
                    <div className="qsdu-view-label">{f.label}</div>
                    <div className="qsdu-view-val">{f.val}</div>
                  </div>
                ))}
                <div className="qsdu-view-field qsdu-view-full">
                  <div className="qsdu-view-label">Progress</div>
                  <div className="qs-prog" style={{marginTop:6}}>
                    <div className="qs-prog-track" style={{height:10}}>
                      <div className="qs-prog-fill" style={{width:`${view.progress}%`,background:pc(view.progress)}} />
                    </div>
                    <span className="qs-prog-lbl">{view.progress}%</span>
                  </div>
                </div>
                {view.issues&&(
                  <div className="qsdu-view-field qsdu-view-full">
                    <div className="qsdu-view-label">Issues</div>
                    <div className="qsdu-issue" style={{marginTop:4}}>{view.issues}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="qs-modal-footer">
              <button className="qs-btn-secondary" onClick={()=>setView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}