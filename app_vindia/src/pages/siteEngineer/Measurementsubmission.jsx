// src/pages/siteEngineer/MeasurementSubmission.jsx
// STEP 2 of the flow: SE measures actual work on site and submits.
// POST → /api/measurements
// SE does NOT see pricing, does NOT approve here.
// Approval only happens in QuantityReport.jsx (Step 4-5).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/MeasurementSubmission.css";

const PAGE_SIZE  = 8;
const UNITS      = ["sqm","sqft","cu m","RMT","m","nos","kg","tonnes","bags","litre","LS"];

const STATUS_CFG = {
  pending:  { label:"Pending QS Verification", bg:"#FAEEDA", color:"#633806", border:"#EF9F27" },
  verified: { label:"QS Verified",             bg:"#E6F1FB", color:"#185FA5", border:"#90C1EF" },
  approved: { label:"Billing Approved",        bg:"#E1F5EE", color:"#085041", border:"#5DCAA5" },
  rejected: { label:"Rejected by QS",          bg:"#FCEBEB", color:"#791F1F", border:"#E8A0A0" },
};

const BLANK_ITEM = { description:"", unit:"sqm", quantity:"" };
const BLANK_FORM = {
  title:"", zone:"", activity:"", date:"", notes:"",
  linked_rfi:"", linked_diary:"",
  project_id:"", milestone_id:"",
};

function nowISO() { return new Date().toISOString().slice(0,10); }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"; }
function stableKey(it) { return it?.id!=null?String(it.id):`${it?.title||""}|${it?.createdAt||""}`; }

function StatusBadge({s}) {
  const c = STATUS_CFG[s]||STATUS_CFG.pending;
  return <span className="ms-badge" style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`}}>{c.label}</span>;
}

export default function MeasurementSubmission() {
  const [form,       setForm]       = useState({...BLANK_FORM, date:nowISO()});
  const [items,      setItems]      = useState([{...BLANK_ITEM}]);
  const [errors,     setErrors]     = useState({});
  const [status,     setStatus]     = useState("");
  const [submitting, setSub]        = useState(false);
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterStat, setFS]         = useState("all");
  const [page,       setPage]       = useState(1);
  const [expandedId, setExp]        = useState(null);
  const [projects,   setProjects]   = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [showForm,   setShowForm]   = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadRecords();
    loadProjects();
    return () => { alive.current = false; };
  }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await api.get("/measurements");
      if (!alive.current) return;
      setRecords(Array.isArray(res?.data) ? res.data.slice().reverse() : []);
    } catch { /* offline */ }
    finally { if (alive.current) setLoading(false); }
  }

  async function loadProjects() {
    try { const r = await api.get("/projects"); setProjects(Array.isArray(r?.data)?r.data:[]); } catch {}
  }

  async function loadMilestones(pid) {
    try { const r = await api.get(`/diary/milestones?project_id=${pid}`); setMilestones(r?.data||[]); } catch {}
  }

  const setF = useCallback((k,v) => {
    setForm(f=>({...f,[k]:v}));
    setErrors(e=>{const c={...e};delete c[k];return c;});
    setStatus("");
  },[]);

  const addItem    = () => setItems(prev=>[...prev,{...BLANK_ITEM}]);
  const removeItem = i  => setItems(prev=>prev.filter((_,j)=>j!==i));
  const updateItem = (i,k,v) => setItems(prev=>{
    const copy=[...prev]; copy[i]={...copy[i],[k]:v}; return copy;
  });

  function validate() {
    const e = {};
    if (!form.title || form.title.trim().length < 3) e.title = "Title required";
    if (!form.date)                                   e.date  = "Date required";
    if (!form.zone)                                   e.zone  = "Zone required";
    const validItems = items.filter(it=>it.description.trim()&&Number(it.quantity)>0);
    if (!validItems.length) e.items = "At least one item with description and quantity";
    return e;
  }

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Submitting…");
    try {
      const payload = {
  ...form,
  source: "se",   // ⭐ important
  items: items.map(it => ({
    description: it.description,
    unit: it.unit,
    qty_actual: Number(it.quantity) || 0,
  })),
  submitted_at: new Date().toISOString(),
  status: "pending"
};
      await api.post("/measurements", payload);
      await loadRecords();
      setForm({...BLANK_FORM, date:nowISO()});
      setItems([{...BLANK_ITEM}]);
      setStatus("Sent to QS → will appear in Quantity Report page ✓");
      setShowForm(false);
    } catch(err) {
      setStatus(err?.response?.data?.error||"Submission failed — check connection");
    } finally { if(alive.current) setSub(false); }
  },[form, items]);

  const filtered = useMemo(()=>{
    let list = records.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r=>(r.title||"").toLowerCase().includes(q)||(r.zone||"").toLowerCase().includes(q));
    }
    if (filterStat!=="all") list=list.filter(r=>(r.status||"pending")===filterStat);
    return list;
  },[records,search,filterStat]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageItems  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(()=>{ if(page>totalPages) setPage(totalPages); },[totalPages]);

  const stats = useMemo(()=>({
    total:    records.length,
    pending:  records.filter(r=>!r.status||r.status==="pending").length,
    verified: records.filter(r=>r.status==="verified").length,
    approved: records.filter(r=>r.status==="approved").length,
    rejected: records.filter(r=>r.status==="rejected").length,
  }),[records]);

  const itemTotal = items.reduce((s,it)=>s+(Number(it.quantity)||0),0);

  return (
    <div className="ms-page">

      {/* HEADER */}
      <div className="ms-page-header">
        <div>
          <div className="ms-eyebrow">Step 2 of 6 — SE → QS</div>
          <h1 className="ms-title">Measurement Submission</h1>
          <div className="ms-sub">Record actual quantities from site — QS will verify before billing</div>
        </div>
        <button className="ms-btn ms-btn--primary" onClick={()=>setShowForm(v=>!v)}>
          {showForm ? "▲ Hide Form" : "+ New Measurement"}
        </button>
      </div>

      {/* FLOW BANNER */}
      <div className="ms-flow-banner">
        {[
          {step:"1",label:"BOQ (QS)",       done:true},
          {step:"2",label:"Measurement (SE)",active:true},
          {step:"3",label:"Verify (QS)",     done:false},
          {step:"4",label:"Qty Report (QS)", done:false},
          {step:"5",label:"Approve (SE)",    done:false},
          {step:"6",label:"BOQ Finalised",   done:false},
        ].map((s,i,arr)=>(
          <React.Fragment key={s.step}>
            <div className={`ms-flow-step${s.active?" ms-flow-step--active":s.done?" ms-flow-step--done":""}`}>
              <div className="ms-flow-dot">{s.done?"✓":s.step}</div>
              <div className="ms-flow-label">{s.label}</div>
            </div>
            {i<arr.length-1&&<div className="ms-flow-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>

      {/* STAT CARDS */}
      <div className="ms-stats-bar">
        {[
          {icon:"📐",num:stats.total,   label:"Submitted",       cls:""},
          {icon:"⏳",num:stats.pending, label:"Pending QS",      cls:stats.pending>0?"ms-stat--warn":""},
          {icon:"🔍",num:stats.verified,label:"QS Verified",     cls:""},
          {icon:"✅",num:stats.approved,label:"Billing Approved",cls:"ms-stat--success"},
          {icon:"❌",num:stats.rejected,label:"Rejected",        cls:stats.rejected>0?"ms-stat--danger":""},
        ].map((s,i)=>(
          <div key={i} className={`ms-stat-card ${s.cls}`}>
            <div className="ms-stat-icon">{s.icon}</div>
            <div className="ms-stat-info">
              <div className="ms-stat-num">{s.num}</div>
              <div className="ms-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SUBMISSION FORM */}
      {showForm && (
        <div className="ms-panel ms-panel--form">
          <div className="ms-panel-head">
            <div className="ms-panel-title">Submit Site Measurements</div>
            <div className="ms-panel-sub">Enter actual quantities measured on site</div>
          </div>
          <div className="ms-panel-body">
            <form onSubmit={submit} noValidate>

              {/* Header fields */}
              <div className="ms-section">
                <div className="ms-section-title">Measurement Header</div>
                <div className="ms-grid-3">
                  <div className="ms-field ms-full">
                    <label className="ms-label">Title *</label>
                    <input className="ms-input" value={form.title} onChange={e=>setF("title",e.target.value)} placeholder="e.g. Level 3 Column Concrete Pour — Grid A–D"/>
                    {errors.title&&<div className="ms-error">{errors.title}</div>}
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Date *</label>
                    <input type="date" className="ms-input" value={form.date} onChange={e=>setF("date",e.target.value)}/>
                    {errors.date&&<div className="ms-error">{errors.date}</div>}
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Zone / Location *</label>
                    <input className="ms-input" value={form.zone} onChange={e=>setF("zone",e.target.value)} placeholder="e.g. Level 3 / Grid A–D"/>
                    {errors.zone&&<div className="ms-error">{errors.zone}</div>}
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Activity</label>
                    <input className="ms-input" value={form.activity} onChange={e=>setF("activity",e.target.value)} placeholder="e.g. Column Casting"/>
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Project</label>
                    <select className="ms-select" value={form.project_id||""} onChange={e=>{
                      setF("project_id",e.target.value);
                      setF("milestone_id","");
                      setMilestones([]);
                      if(e.target.value) loadMilestones(e.target.value);
                    }}>
                      <option value="">Select project</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Milestone</label>
                    <select className="ms-select" value={form.milestone_id||""} disabled={!form.project_id} onChange={e=>setF("milestone_id",e.target.value)}>
                      <option value="">Select milestone</option>
                      {milestones.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Linked RFI</label>
                    <input className="ms-input" value={form.linked_rfi} onChange={e=>setF("linked_rfi",e.target.value)} placeholder="RFI-007"/>
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Linked Diary</label>
                    <input className="ms-input" value={form.linked_diary} onChange={e=>setF("linked_diary",e.target.value)} placeholder="YYYY-MM-DD"/>
                  </div>
                </div>
              </div>

              {/* Measurement Items */}
              <div className="ms-section">
                <div className="ms-section-title">Measurement Items *</div>
                <div className="ms-notice">
                  ℹ Enter actual site quantities. QS will verify against the BOQ.
                  Do NOT include rates or pricing — that is QS territory.
                </div>

                {/* Column headers */}
                <div className="ms-items-head">
                  <div>#</div>
                  <div>Description / Item</div>
                  <div>Unit</div>
                  <div>Actual Quantity</div>
                  <div></div>
                </div>

                {items.map((item,i)=>(
                  <div key={i} className="ms-item-row">
                    <div className="ms-item-num">{i+1}</div>
                    <div>
                      <input className="ms-input" value={item.description} onChange={e=>updateItem(i,"description",e.target.value)} placeholder="e.g. Concrete C30, TMT Rebar 12mm…"/>
                    </div>
                    <div>
                      <select className="ms-select" value={item.unit} onChange={e=>updateItem(i,"unit",e.target.value)}>
                        {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="number" min="0" step="0.01" className="ms-input ms-input--qty"
                        value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} placeholder="0"/>
                    </div>
                    <div>
                      <button type="button" className="ms-remove-btn" onClick={()=>removeItem(i)} disabled={items.length===1}>×</button>
                    </div>
                  </div>
                ))}

                {errors.items&&<div className="ms-error" style={{marginTop:6}}>{errors.items}</div>}

                <div className="ms-items-footer">
                  <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={addItem}>+ Add Item</button>
                  {itemTotal>0&&(
                    <div className="ms-total-hint">
                      {items.filter(it=>it.description).length} items · Total qty: <strong>{itemTotal.toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="ms-section">
                <div className="ms-section-title">Notes for QS</div>
                <textarea className="ms-textarea" value={form.notes} onChange={e=>setF("notes",e.target.value)}
                  placeholder="Any deductions, adjustments, site conditions, or other info the QS should know when verifying…"
                  style={{minHeight:80}}/>
              </div>

              {/* Submit */}
              <div className="ms-submit-row">
                <button type="submit" className="ms-btn ms-btn--primary" disabled={submitting}>
                  {submitting?"Submitting…":"📐 Submit to QS for Verification"}
                </button>
                <button type="button" className="ms-btn ms-btn--ghost" onClick={()=>{setForm({...BLANK_FORM,date:nowISO()});setItems([{...BLANK_ITEM}]);setErrors({});setStatus("");}}>
                  Clear
                </button>
                {status&&(
                  <span className={`ms-status ${status.includes("✓")?"ms-status--ok":status.includes("Fix")||status.includes("failed")?"ms-status--err":"ms-status--saving"}`}>
                    {status}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORDS LIST */}
      <div className="ms-panel">
        <div className="ms-panel-head">
          <div className="ms-panel-title">My Measurement Submissions</div>
          <span className="ms-pill">{filtered.length} records</span>
        </div>

        <div className="ms-filter-bar">
          <div className="ms-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search title, zone…"/>
          </div>
          <select className="ms-select ms-select--sm" value={filterStat} onChange={e=>{setFS(e.target.value);setPage(1);}}>
            <option value="all">All status</option>
            {Object.entries(STATUS_CFG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="ms-loading"><div className="ms-spinner"/>Loading…</div>
        ) : pageItems.length===0 ? (
          <div className="ms-empty">
            <div style={{fontSize:36,opacity:.3,marginBottom:10}}>📐</div>
            <div>{records.length===0?"No measurements submitted yet":"No records match this filter"}</div>
          </div>
        ) : pageItems.map(r=>{
          const recItems = Array.isArray(r.items)?r.items:[];
          const isOpen   = expandedId===r.id;
          return (
            <div key={stableKey(r)} className="ms-record">
              <div className="ms-record-summary" onClick={()=>setExp(isOpen?null:r.id)}>
                <div className="ms-record-left">
                  <div className="ms-record-tags">
                    <span className="ms-ref">{r.refNo||`MSR-${String(r.id??"").padStart(3,"0")}`}</span>
                    <StatusBadge s={r.status||"pending"}/>
                    {r.linked_rfi&&<span className="ms-link-tag ms-link-tag--rfi">{r.linked_rfi}</span>}
                  </div>
                  <div className="ms-record-title">{r.title}</div>
                  <div className="ms-record-meta">
                    {r.zone&&<span>Zone: {r.zone}</span>}
                    {r.activity&&<span>{r.activity}</span>}
                    {r.date&&<span>{fmtDate(r.date)}</span>}
                    {recItems.length>0&&<span>{recItems.length} items</span>}
                  </div>
                </div>
                <span className="ms-expand-btn">{isOpen?"▲":"▼"}</span>
              </div>

              {isOpen&&(
                <div className="ms-record-detail">
                  {/* Items table */}
                  {recItems.length>0&&(
                    <div className="ms-detail-section">
                      <div className="ms-detail-title">Measurement Items</div>
                      <table className="ms-items-table">
                        <thead>
                          <tr><th>#</th><th>Description</th><th>Unit</th><th>Actual Qty</th>{r.status!=="pending"&&<th>QS Verified Qty</th>}</tr>
                        </thead>
                        <tbody>
                          {recItems.map((it,i)=>(
                            <tr key={i}>
                              <td>{i+1}</td>
                              <td style={{fontWeight:600}}>{it.description}</td>
                              <td style={{fontFamily:"monospace",color:"#7D9AB5"}}>{it.unit}</td>
                              <td style={{fontFamily:"monospace",fontWeight:700}}>{(it.qty_actual||0).toLocaleString()}</td>
                              {r.status!=="pending"&&<td style={{fontFamily:"monospace",color:"#185FA5",fontWeight:700}}>{it.qty_verified!=null?(it.qty_verified).toLocaleString():"—"}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes&&(
                    <div className="ms-detail-section">
                      <div className="ms-detail-title">Your Notes</div>
                      <div className="ms-detail-text">{r.notes}</div>
                    </div>
                  )}

                  {/* QS Notes */}
                  {r.qs_notes&&(
                    <div className="ms-detail-section">
                      <div className="ms-detail-title">QS Verification Notes</div>
                      <div className="ms-detail-text ms-detail-text--qs">{r.qs_notes}</div>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {r.status==="rejected"&&r.rejection_reason&&(
                    <div className="ms-detail-section">
                      <div className="ms-detail-title">Rejection Reason</div>
                      <div className="ms-detail-text ms-detail-text--reject">{r.rejection_reason}</div>
                    </div>
                  )}

                  {/* Info about next step */}
                  {(r.status==="pending")&&(
                    <div className="ms-next-step ms-next-step--pending">
                      ⏳ Waiting for QS to verify your quantities on site
                    </div>
                  )}
                  {r.status==="verified"&&(
                    <div className="ms-next-step ms-next-step--verified">
                      🔍 QS verified → Quantity Report generated → Go to Quantity Report page for approval
                    </div>
                  )}
                  {r.status==="approved"&&(
                    <div className="ms-next-step ms-next-step--approved">
                      ✅ Billing authorised — verified quantities submitted to PM for payment processing
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length>PAGE_SIZE&&(
          <div className="ms-pagination">
            <span className="ms-page-info">Page {page} of {totalPages} · {filtered.length} records</span>
            <div className="ms-page-btns">
              <button className="ms-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>← Prev</button>
              <button className="ms-page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}