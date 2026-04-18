import { useState } from "react";
import "./QuantitySurveyorDashboard.css";

const SEED_BOQ = [
  { id:1, item:"Excavation",        unit:"m³", qty:450, rate:280,   milestone:"Foundation", actual:320 },
  { id:2, item:"PCC M10 Concrete",  unit:"m³", qty:80,  rate:4200,  milestone:"Foundation", actual:80  },
  { id:3, item:"RCC M25 Footings",  unit:"m³", qty:120, rate:6800,  milestone:"Foundation", actual:95  },
  { id:4, item:"TMT Steel Fe500",   unit:"MT",  qty:28,  rate:68000, milestone:"Structure",  actual:18  },
  { id:5, item:"Brick Masonry",     unit:"m³", qty:340, rate:3200,  milestone:"Structure",  actual:120 },
  { id:6, item:"RCC Slab M25",      unit:"m³", qty:95,  rate:7200,  milestone:"Structure",  actual:45  },
  { id:7, item:"Internal Plaster",  unit:"m²", qty:1800,rate:180,   milestone:"Finishing",  actual:0   },
  { id:8, item:"External Plaster",  unit:"m²", qty:620, rate:220,   milestone:"Finishing",  actual:0   },
  { id:9, item:"Flooring (Vitrif)", unit:"m²", qty:950, rate:850,   milestone:"Finishing",  actual:0   },
  { id:10,item:"Electrical Conduit",unit:"m",  qty:2400,rate:95,    milestone:"MEP",        actual:800 },
  { id:11,item:"Plumbing (uPVC)",   unit:"m",  qty:680, rate:320,   milestone:"MEP",        actual:200 },
  { id:12,item:"Drainage Lines",    unit:"m",  qty:240, rate:480,   milestone:"MEP",        actual:60  },
];
const EMPTY_FORM = { item:"", unit:"", qty:"", rate:"", milestone:"Foundation", actual:"" };
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
const pct = (a,b) => b ? Math.round((a/b)*100) : 0;

export default function QSBOQ() {
  const [boq, setBoq] = useState(SEED_BOQ);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);
  const sf = (k,v)=>setForm(f=>({...f,[k]:v}));
  const show=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const filtered = filter==="All" ? boq : boq.filter(b=>b.milestone===filter);
  const totals = filtered.reduce((s,b)=>({planned:s.planned+b.qty*b.rate,actual:s.actual+b.actual*b.rate}),{planned:0,actual:0});

  const openAdd  = ()=>{ setForm(EMPTY_FORM); setEditId(null); setModal(true); };
  const openEdit = (b)=>{ setForm({item:b.item,unit:b.unit,qty:b.qty,rate:b.rate,milestone:b.milestone,actual:b.actual}); setEditId(b.id); setModal(true); };

  const handleSave = ()=>{
    if(!form.item||!form.qty||!form.rate){ show("Item, quantity and rate required","err"); return; }
    const e={item:form.item,unit:form.unit,qty:+form.qty,rate:+form.rate,milestone:form.milestone,actual:+form.actual||0};
    if(editId){ setBoq(p=>p.map(b=>b.id===editId?{...b,...e}:b)); show("BOQ item updated!"); }
    else       { setBoq(p=>[...p,{id:Date.now(),...e}]); show("BOQ item added!"); }
    setModal(false); setEditId(null);
  };
  const handleDelete = (id)=>{ setBoq(p=>p.filter(b=>b.id!==id)); show("BOQ item deleted"); };

  return (
    <div className="qsd-page">
      {toast&&<div className={`qs-toast qs-toast--${toast.type}`}>{toast.msg}</div>}
      <div className="qs-page-hdr">
        <div>
          <div className="qs-page-title">BOQ Module</div>
          <div className="qs-page-sub">Bill of Quantities — manage items, rates and milestones</div>
        </div>
        <button className="qs-btn-primary" onClick={openAdd}>+ Add Item</button>
      </div>

      <div className="qs-filter-bar">
        {["All","Foundation","Structure","Finishing","MEP"].map(m=>(
          <button key={m} className={`qs-filter-pill${filter===m?" active":""}`} onClick={()=>setFilter(m)}>{m}</button>
        ))}
      </div>

      <div className="qsboq-summary">
        {[
          {label:"Items",         val:filtered.length},
          {label:"Planned Cost",  val:fmt(totals.planned)},
          {label:"Actual Cost",   val:fmt(totals.actual)},
          {label:"Remaining",     val:fmt(totals.planned-totals.actual)},
        ].map(s=>(
          <div key={s.label} className="qsboq-sum-item">
            <span>{s.label}</span><strong>{s.val}</strong>
          </div>
        ))}
      </div>

      <div className="qs-table-wrap">
        <table className="qs-table">
          <thead>
            <tr>
              <th>#</th><th>Item</th><th>Unit</th><th>BOQ Qty</th>
              <th>Actual Qty</th><th>Rate</th><th>Planned</th><th>Actual</th>
              <th>Milestone</th><th>%</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b,i)=>{
              const planned=b.qty*b.rate, actual=b.actual*b.rate;
              const over=actual>planned, comp=pct(b.actual,b.qty);
              const chipCls=b.actual===0?"chip-grey":over?"chip-red":"chip-green";
              return (
                <tr key={b.id}>
                  <td className="qs-td-muted">{i+1}</td>
                  <td className="qs-td-bold">{b.item}</td>
                  <td>{b.unit}</td>
                  <td className="qs-td-mono">{b.qty.toLocaleString()}</td>
                  <td><span className={`qs-qty-chip ${chipCls}`}>{b.actual}</span></td>
                  <td className="qs-td-mono">{fmt(b.rate)}</td>
                  <td className="qs-td-mono">{fmt(planned)}</td>
                  <td className={`qs-td-mono${over?" qs-text-red":""}`}>{fmt(actual)}</td>
                  <td><span className="qs-badge qs-badge--outline">{b.milestone}</span></td>
                  <td>
                    <div className="qs-prog" style={{minWidth:80}}>
                      <div className="qs-prog-track">
                        <div className="qs-prog-fill" style={{width:`${Math.min(100,comp)}%`,background:comp>=100?"#16a34a":comp>=50?"#2563eb":"#d97706"}} />
                      </div>
                      <span className="qs-prog-lbl">{comp}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openEdit(b)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:12}}>✏</button>
                      <button onClick={()=>handleDelete(b.id)} style={{background:"none",border:"1px solid #fecaca",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#94a3b8"}}>TOTAL</td>
              <td className="qs-td-mono">{fmt(totals.planned)}</td>
              <td className="qs-td-mono">{fmt(totals.actual)}</td>
              <td colSpan={3}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {modal&&(
        <div className="qs-overlay" onClick={()=>setModal(false)}>
          <div className="qs-modal" onClick={e=>e.stopPropagation()}>
            <div className="qs-modal-hdr">
              <span className="qs-modal-title">{editId?"Edit BOQ Item":"Add BOQ Item"}</span>
              <button className="qs-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="qs-modal-body">
              <div className="qs-form-grid">
                <div className="qs-field qs-form-full">
                  <label className="qs-label">Item Description *</label>
                  <input className="qs-input" placeholder="RCC M25 Column" value={form.item} onChange={e=>sf("item",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Unit</label>
                  <input className="qs-input" placeholder="m³" value={form.unit} onChange={e=>sf("unit",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Milestone</label>
                  <select className="qs-select" value={form.milestone} onChange={e=>sf("milestone",e.target.value)}>
                    {["Foundation","Structure","Finishing","MEP"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="qs-field">
                  <label className="qs-label">BOQ Quantity *</label>
                  <input className="qs-input" type="number" placeholder="100" value={form.qty} onChange={e=>sf("qty",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Rate (₹) *</label>
                  <input className="qs-input" type="number" placeholder="6800" value={form.rate} onChange={e=>sf("rate",e.target.value)} />
                </div>
                <div className="qs-field">
                  <label className="qs-label">Actual Qty</label>
                  <input className="qs-input" type="number" placeholder="0" value={form.actual} onChange={e=>sf("actual",e.target.value)} />
                </div>
              </div>
              {form.qty&&form.rate&&(
                <div className="qs-calc-preview" style={{marginTop:12}}>
                  Planned Total: <strong>{fmt(+form.qty * +form.rate)}</strong>
                </div>
              )}
            </div>
            <div className="qs-modal-footer">
              <button className="qs-btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="qs-btn-primary" onClick={handleSave}>{editId?"Update":"Save"} Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}