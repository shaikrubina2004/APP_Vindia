import { useState, useMemo } from "react";
import "./Qscostreport.css";

/* ─── Icons ─────────────────────────────────────────── */
const Ic = {
  QS:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Report:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 17H5a2 2 0 00-2 2v0a2 2 0 002 2h14a2 2 0 002-2v0a2 2 0 00-2-2h-4"/><rect x="9" y="3" width="6" height="14" rx="1"/></svg>,
  Arch:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>,
  Struct:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="17" width="5" height="5"/><rect x="9.5" y="12" width="5" height="10"/><rect x="17" y="7" width="5" height="15"/></svg>,
  MEP:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>,
  PM:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Chart: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Var:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Send:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Check: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  X:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Alert: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Down:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M3 19h18"/></svg>,
  Eye:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Chev:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  Clock: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Lock:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Plus:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

/* ─── Projects ───────────────────────────────────────── */
const PROJECTS = [
  { id:"p1", no:"QS/2025/RES/042", name:"Residential Apartment — Block B", client:"Sunrise Developers",  pm:"PM Anjali R.",    struct:"Ar. Vikram Nair",  arch:"Ar. Priya Sharma",  mep:"Eng. Rahul Das",  budget:4500000, spent:3820000 },
  { id:"p2", no:"QS/2025/COM/018", name:"IT Office Complex — Tower A",      client:"TechPark Infra",      pm:"PM Suresh D.",    struct:"Ar. Suresh Babu",  arch:"Ar. Meena V.",      mep:"Eng. Sanjay K.", budget:8200000, spent:6100000 },
  { id:"p3", no:"QS/2025/RET/009", name:"Shopping Mall — Phase 2",          client:"Prestige Group",      pm:"PM Ravi N.",      struct:"Ar. Deepa Menon",  arch:"Ar. Arun T.",       mep:"Eng. Pooja L.",  budget:12000000,spent:11800000},
];

/* ─── Helpers ────────────────────────────────────────── */
const INR  = n => "₹" + (+n||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const INR2 = n => "₹" + (+n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct  = (a,b) => b ? Math.min(100,Math.round(+a/+b*100)) : 0;
const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

/* ─── BOQ source data (mirrors Qsboq.jsx fresh()) ───── */
const BOQ_DATA = {
  p1: {
    arch: {
      rooms:[
        {name:"Master Bedroom", floorAmt:5*4*420,  wallAmt:2*(5+4)*3*90},
        {name:"Living Room",    floorAmt:7.2*5.5*420, wallAmt:2*(7.2+5.5)*3*90},
        {name:"Kitchen",        floorAmt:4*3.5*480,   wallAmt:2*(4+3.5)*3*90},
        {name:"Bedroom 2",      floorAmt:4.2*3.8*420, wallAmt:2*(4.2+3.8)*3*90},
        {name:"Bathroom",       floorAmt:2.5*2*580,   wallAmt:2*(2.5+2)*3*90},
      ],
      drawRev:"Rev 02",
    },
    struct: {
      elements:[
        {name:"Columns",    qty:46.8,  unit:"m³", rate:6843, amount:320256},
        {name:"RCC Slab",   qty:59.85, unit:"m³", rate:6843, amount:409503},
        {name:"RCC Beams",  qty:46.2,  unit:"m³", rate:6843, amount:316147},
        {name:"Staircase",  qty:14.4,  unit:"m³", rate:6843, amount:98539},
        {name:"Foundation", qty:30.78, unit:"m³", rate:4800, amount:147744},
        {name:"Lintels",    qty:5.06,  unit:"m³", rate:6843, amount:34625},
      ],
      rev:"SD-Rev02",
    },
    mep: {
      electrical:[
        {name:"Light points",          qty:24,  unit:"Nos", rate:1500,  amount:36000},
        {name:"Switch boards (2-gang)",qty:12,  unit:"Nos", rate:850,   amount:10200},
        {name:"Power sockets (5A)",    qty:18,  unit:"Nos", rate:650,   amount:11700},
        {name:"DB board (12-way)",     qty:2,   unit:"Nos", rate:8500,  amount:17000},
      ],
      plumbing:[
        {name:"CPVC pipe 25mm",        qty:120, unit:"m",   rate:185,   amount:22200},
        {name:"CPVC pipe 40mm",        qty:60,  unit:"m",   rate:260,   amount:15600},
        {name:"WC unit",               qty:4,   unit:"Nos", rate:7200,  amount:28800},
        {name:"Wash basin",            qty:4,   unit:"Nos", rate:4500,  amount:18000},
      ],
      hvac:[
        {name:"Split AC 1.5T",         qty:3,   unit:"Nos", rate:38000, amount:114000},
        {name:"Exhaust fan",           qty:6,   unit:"Nos", rate:1800,  amount:10800},
      ],
    },
    variations:[
      {desc:"Additional staircase handrail (SS)",  cat:"Structural", amount:68000,  status:"approved"},
      {desc:"Granite lobby flooring upgrade",       cat:"Architect",  amount:92000,  status:"pending"},
      {desc:"Extra electrical conduits – B2 floor",cat:"MEP",        amount:45000,  status:"rejected"},
      {desc:"Additional CCTV points (8 nos.)",      cat:"MEP",        amount:32000,  status:"approved"},
    ],
  },
};
/* copy p1 data to p2 and p3 with scaled amounts */
BOQ_DATA.p2 = JSON.parse(JSON.stringify(BOQ_DATA.p1));
BOQ_DATA.p3 = JSON.parse(JSON.stringify(BOQ_DATA.p1));
[BOQ_DATA.p2, BOQ_DATA.p3].forEach((d,i)=>{
  const scale = i===0?1.6:2.8;
  d.struct.elements.forEach(e=>{e.qty=+(e.qty*scale).toFixed(2);e.amount=Math.round(e.amount*scale);});
  d.arch.rooms.forEach(r=>{r.floorAmt=Math.round(r.floorAmt*scale);r.wallAmt=Math.round(r.wallAmt*scale);});
  d.mep.electrical.forEach(e=>e.amount=Math.round(e.amount*scale));
  d.mep.plumbing.forEach(e=>e.amount=Math.round(e.amount*scale));
  d.mep.hvac.forEach(e=>e.amount=Math.round(e.amount*scale));
  d.variations.forEach(v=>v.amount=Math.round(v.amount*scale));
});

/* ─── Donut chart (SVG) ─────────────────────────────── */
function DonutChart({slices}) {
  const total = slices.reduce((s,sl)=>s+sl.val,0);
  let cum = 0;
  const R = 52, cx = 64, cy = 64, stroke = 18;
  const circ = 2*Math.PI*R;
  const paths = slices.map(sl=>{
    const frac = sl.val/total;
    const dash = frac*circ;
    const gap  = circ - dash;
    const rotate = -90 + (cum/total)*360;
    cum += sl.val;
    return {color:sl.color, dash, gap, rotate, label:sl.label, val:sl.val, pct:Math.round(frac*100)};
  });
  return (
    <div className="donut-wrap">
      <svg width="128" height="128" className="donut-svg">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--s2)" strokeWidth={stroke}/>
        {paths.map((p,i)=>(
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={p.color} strokeWidth={stroke}
            strokeDasharray={`${p.dash} ${p.gap}`}
            strokeDashoffset={0}
            transform={`rotate(${p.rotate} ${cx} ${cy})`}
            style={{transition:"stroke-dasharray .5s ease"}}
          />
        ))}
        <text x={cx} y={cy-4} textAnchor="middle" fill="var(--ink)" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans,sans-serif">
          {INR(total).replace("₹","")}
        </text>
        <text x={cx} y={cy+11} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="Plus Jakarta Sans,sans-serif">Total</text>
      </svg>
      <div className="donut-legend">
        {paths.map((p,i)=>(
          <div key={i} className="dl-item">
            <span className="dl-dot" style={{background:p.color}}/>
            <span className="dl-label">{p.label}</span>
            <span className="dl-val">{INR(p.val)}</span>
            <span className="dl-pct">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function QsCostReport() {
  const [projId,   setProjId]   = useState(PROJECTS[0].id);
  const [project,  setProject]  = useState(PROJECTS[0]);
  const [tab,      setTab]      = useState("report");   // report | arch | struct | mep
  const [modal,    setModal]    = useState(false);
  const [flash,    setFlash]    = useState(null);
  const [pmNotes,  setPMNotes]  = useState("");
  const [submitted,setSubmitted]= useState(false);

  const showFlash = msg => { setFlash(msg); setTimeout(()=>setFlash(null),4500); };

  const changeProj = id => {
    setProjId(id); setProject(PROJECTS.find(p=>p.id===id));
    setFlash(null); setSubmitted(false); setPMNotes("");
  };

  /* ─── Derived totals ─────────────────────────────── */
  const boq = BOQ_DATA[projId];

  const archTotal = useMemo(()=>
    boq.arch.rooms.reduce((s,r)=>s+r.floorAmt+r.wallAmt,0),[boq]);
  const structTotal = useMemo(()=>
    boq.struct.elements.reduce((s,e)=>s+e.amount,0),[boq]);
  const elecTotal = useMemo(()=>boq.mep.electrical.reduce((s,e)=>s+e.amount,0),[boq]);
  const plmbTotal = useMemo(()=>boq.mep.plumbing.reduce((s,e)=>s+e.amount,0),[boq]);
  const hvacTotal = useMemo(()=>boq.mep.hvac.reduce((s,e)=>s+e.amount,0),[boq]);
  const mepTotal  = elecTotal + plmbTotal + hvacTotal;
  const boqTotal  = archTotal + structTotal + mepTotal;
  const varApproved = boq.variations.filter(v=>v.status==="approved").reduce((s,v)=>s+v.amount,0);
  const varPending  = boq.variations.filter(v=>v.status==="pending").reduce((s,v)=>s+v.amount,0);
  const grandTotal  = boqTotal + varApproved;
  const budgetLeft  = project.budget - grandTotal;
  const budgetPct   = pct(grandTotal, project.budget);
  const bColor = budgetPct>95?"#ef4444":budgetPct>80?"#f59e0b":"#10b981";

  const TABS = [
    {id:"report", label:"Cost Report",      Icon:Ic.Report},
    {id:"arch",   label:"Architect → QS",  Icon:Ic.Arch},
    {id:"struct", label:"Structural → QS", Icon:Ic.Struct},
    {id:"mep",    label:"MEP → QS",         Icon:Ic.MEP},
  ];

  const handleSubmit = () => { setSubmitted(true); setModal(false); showFlash(`Quantity Cost Report submitted to ${project.pm} for approval.`); };

  return (
    <div className="app">

      {/* ══ TOP NAV ══ */}
      <nav className="topnav">
        <div className="nav-brand">
          <div className="nav-brand-ico"><Ic.QS/></div>
          <div className="nav-brand-txt"><strong>Quantity Surveyor</strong><span>Cost Report</span></div>
        </div>
        <div className="nav-sep"/>
        <span className="nav-proj-lbl">Project</span>
        <div className="nav-proj-wrap">
          <select className="nav-proj-select" value={projId} onChange={e=>changeProj(e.target.value)}>
            {PROJECTS.map(p=><option key={p.id} value={p.id}>{p.no} — {p.name}</option>)}
          </select>
          <span className="nav-chev"><Ic.Chev/></span>
        </div>
        <div className="nav-sep"/>
        <div className="nav-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`nav-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>
              <t.Icon/>{t.label}
              {t.id==="report" && submitted && <span className="nav-tab-ck">✓</span>}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div>
              <span className="nb-lbl">Budget Used</span>
              <span className="nb-pct">{budgetPct}%</span>
            </div>
            <div>
              <div className="nb-bar"><div className="nb-fill" style={{width:budgetPct+"%",background:bColor}}/></div>
              <div className="nb-sub">{INR(budgetLeft)} left</div>
            </div>
          </div>
          <button className="nav-export-btn"><Ic.Down/> Export PDF</button>
        </div>
      </nav>

      {/* ══ SUBNAV ══ */}
      <div className="subnav">
        <div className="subnav-left">
          <div className="subnav-ico" style={{background:"var(--coord-l)",color:"var(--coord)"}}><Ic.Report/></div>
          <div className="subnav-title">
            <h1>Quantity Cost Report</h1>
            <p>{project.no} · {project.name} · PM: {project.pm}</p>
          </div>
        </div>
        <div className="subnav-right">
          <span className="subnav-total">{INR2(grandTotal)}</span>
          {!submitted
            ? <button className="btn btn-coord btn-sm" onClick={()=>setModal(true)}><Ic.Send/>Submit to PM</button>
            : <span className="pill p-ok"><Ic.Check/>Submitted to {project.pm}</span>
          }
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="content">
        {flash && <div className="flash"><Ic.Check/><div><strong>Done!</strong><p>{flash}</p></div></div>}

        {/* ════════════════ COST REPORT TAB ════════════════ */}
        {tab==="report" && (<>

          {/* Report header */}
          <div className="report-hdr-card">
            <div className="rhc-left">
              <div className="rhc-tag">Quantity Cost Report · QS Dashboard</div>
              <h2>{project.name}</h2>
              <p>{project.no} · Client: {project.client} · Date: {today}</p>
            </div>
            <div className="rhc-meta">
              {[["Project No.",project.no],["Client",project.client],["QS Engineer","QS Dept."],["Project Manager",project.pm],["Report Date",today],["Status",submitted?"Submitted":"Draft"]].map(([l,v])=>(
                <div key={l} className="rhc-meta-item">
                  <span className="rmi-lbl">{l}</span>
                  <span className="rmi-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card" style={{"--sc":"var(--arch-100)"}}>
              <div className="sl">Architect BOQ</div><div className="sv" style={{fontSize:16}}>{INR(archTotal)}</div><div className="ss">Finishes</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--teal-100)"}}>
              <div className="sl">Structural BOQ</div><div className="sv" style={{fontSize:16}}>{INR(structTotal)}</div><div className="ss">Concrete & steel</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--mep-100)"}}>
              <div className="sl">MEP BOQ</div><div className="sv" style={{fontSize:16}}>{INR(mepTotal)}</div><div className="ss">Services</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--amber-100)"}}>
              <div className="sl">Variations (Approved)</div><div className="sv" style={{fontSize:16,color:"var(--amber-600)"}}>{INR(varApproved)}</div><div className="ss">+{INR(varPending)} pending</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--ok-l)"}}>
              <div className="sl">Grand Total</div><div className="sv" style={{fontSize:14,color:"var(--teal-700)"}}>{INR(grandTotal)}</div><div className="ss">Budget: {INR(project.budget)}</div>
            </div>
          </div>

          {/* Budget alert */}
          {budgetPct>95
            ? <div className="alert-bar ab-danger"><Ic.Alert/><p><strong>Critical:</strong> Project cost {INR2(grandTotal)} exceeds {budgetPct}% of budget {INR(project.budget)}. Immediate PM review required.</p></div>
            : budgetPct>80
            ? <div className="alert-bar ab-warn"><Ic.Alert/><p><strong>Warning:</strong> {budgetPct}% of budget used. {INR(budgetLeft)} remaining. Monitor variations closely.</p></div>
            : <div className="alert-bar ab-ok"><Ic.Check/><p><strong>On Track:</strong> Project within budget. {INR(budgetLeft)} remaining ({100-budgetPct}% of total budget).</p></div>
          }

          {/* 2-col: donut + budget bars */}
          <div className="two-col">
            {/* Donut chart */}
            <div className="section-card">
              <div className="sc-head h-gray">
                <div className="sc-head-left"><div className="sc-head-ico"><Ic.Chart/></div><h3>Cost Breakdown</h3></div>
              </div>
              <DonutChart slices={[
                {label:"Structural", val:structTotal,   color:"var(--teal-500)"},
                {label:"Architect",  val:archTotal,     color:"var(--arch-600)"},
                {label:"MEP",        val:mepTotal,      color:"var(--mep-400)"},
                {label:"Variations", val:varApproved,   color:"var(--amber-500)"},
              ]}/>
            </div>

            {/* Budget progress */}
            <div className="budget-card">
              <div className="budget-card-head">
                <h3>Budget Utilisation</h3>
                <span className="pill p-teal">{INR2(project.budget)}</span>
              </div>
              <div className="budget-bars">
                {[
                  {label:"Structural BOQ",    val:structTotal,  color:"var(--teal-500)"},
                  {label:"Architect BOQ",     val:archTotal,    color:"var(--arch-600)"},
                  {label:"MEP BOQ",           val:mepTotal,     color:"var(--mep-400)"},
                  {label:"Variations",        val:varApproved,  color:"var(--amber-500)"},
                  {label:"Grand Total",       val:grandTotal,   color:bColor},
                ].map(({label,val,color})=>(
                  <div key={label} className="budget-bar-row">
                    <span className="bbr-label">{label}</span>
                    <div className="bbr-track">
                      <div className="bbr-fill" style={{width:pct(val,project.budget)+"%",background:color}}/>
                    </div>
                    <span className="bbr-val">{INR2(val)}</span>
                    <span className="bbr-pct">{pct(val,project.budget)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOQ Summary Table */}
          <div className="section-card">
            <div className="sc-head h-teal">
              <div className="sc-head-left"><div className="sc-head-ico"><Ic.Report/></div><h3>BOQ Summary — All Disciplines</h3></div>
              <div className="sc-head-right"><span className="pill p-teal">Report Rev: 01</span></div>
            </div>
            <div className="rep-wrap">
              <table className="rep-tbl">
                <thead className="th-teal">
                  <tr>
                    <th className="tl" style={{width:"5%"}}>Sl.</th>
                    <th className="tl" style={{width:"30%"}}>Description</th>
                    <th className="tl" style={{width:"15%"}}>Discipline</th>
                    <th style={{width:"10%"}}>Qty / Area</th>
                    <th style={{width:"8%"}}>Unit</th>
                    <th style={{width:"12%"}}>Rate (₹)</th>
                    <th style={{width:"15%"}}>Amount (₹)</th>
                    <th style={{width:"5%"}}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ARCHITECT */}
                  {boq.arch.rooms.map((r,i)=>(
                    <tr key={"a"+i}>
                      <td className="tc tl" style={{paddingLeft:14,color:"var(--arch-600)",fontWeight:600}}>{i===0?"A."+(i+1):"A."+(i+1)}</td>
                      <td className="tl">{r.name} — Tiles + Paint</td>
                      <td className="tl"><span className="pill p-arch">Architect</span></td>
                      <td className="tc">—</td>
                      <td className="tc">Lumpsum</td>
                      <td className="tr">—</td>
                      <td className="tr mono orange">{INR2(r.floorAmt+r.wallAmt)}</td>
                      <td className="tc" style={{fontSize:10,color:"var(--muted)"}}>{pct(r.floorAmt+r.wallAmt,boqTotal)}%</td>
                    </tr>
                  ))}
                  <tr className="r-arch-sub">
                    <td colSpan={6} className="tl">ARCHITECT TOTAL (Finishes)</td>
                    <td className="tr">{INR2(archTotal)}</td>
                    <td className="tc">{pct(archTotal,boqTotal)}%</td>
                  </tr>

                  {/* STRUCTURAL */}
                  {boq.struct.elements.map((e,i)=>(
                    <tr key={"s"+i}>
                      <td className="tl" style={{paddingLeft:14,color:"var(--teal-600)",fontWeight:600}}>B.{i+1}</td>
                      <td className="tl">{e.name}</td>
                      <td className="tl"><span className="pill p-teal">Structural</span></td>
                      <td className="tr mono">{e.qty.toFixed(3)}</td>
                      <td className="tc">{e.unit}</td>
                      <td className="tr mono">{INR(e.rate)}</td>
                      <td className="tr mono orange">{INR2(e.amount)}</td>
                      <td className="tc" style={{fontSize:10,color:"var(--muted)"}}>{pct(e.amount,boqTotal)}%</td>
                    </tr>
                  ))}
                  <tr className="r-subtotal">
                    <td colSpan={6} className="tl">STRUCTURAL TOTAL (Concrete & Reinforcement)</td>
                    <td className="tr">{INR2(structTotal)}</td>
                    <td className="tc">{pct(structTotal,boqTotal)}%</td>
                  </tr>

                  {/* MEP */}
                  {[...boq.mep.electrical,...boq.mep.plumbing,...boq.mep.hvac].map((e,i)=>(
                    <tr key={"m"+i}>
                      <td className="tl" style={{paddingLeft:14,color:"var(--mep-600)",fontWeight:600}}>C.{i+1}</td>
                      <td className="tl">{e.name}</td>
                      <td className="tl"><span className="pill p-mep">MEP</span></td>
                      <td className="tr mono">{e.qty}</td>
                      <td className="tc">{e.unit}</td>
                      <td className="tr mono">{INR(e.rate)}</td>
                      <td className="tr mono orange">{INR2(e.amount)}</td>
                      <td className="tc" style={{fontSize:10,color:"var(--muted)"}}>{pct(e.amount,boqTotal)}%</td>
                    </tr>
                  ))}
                  <tr className="r-mep-sub">
                    <td colSpan={6} className="tl">MEP TOTAL (Electrical + Plumbing + HVAC)</td>
                    <td className="tr">{INR2(mepTotal)}</td>
                    <td className="tc">{pct(mepTotal,boqTotal)}%</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr><td colSpan={6} className="tl">BOQ GRAND TOTAL (Before Variations)</td><td className="tr">{INR2(boqTotal)}</td><td className="tc">100%</td></tr>
                  <tr><td colSpan={6} className="tl">+ Approved Variations</td><td className="tr">{INR2(varApproved)}</td><td className="tc"/></tr>
                  <tr className="f-grand"><td colSpan={6} className="tl">PROJECT GRAND TOTAL</td><td className="tr">{INR2(grandTotal)}</td><td className="tc"/></tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Variations */}
          <div className="section-card">
            <div className="sc-head h-coord">
              <div className="sc-head-left"><div className="sc-head-ico"><Ic.Var/></div><h3>Variation Orders</h3></div>
              <div className="sc-head-right">
                <span className="pill p-warn">{boq.variations.filter(v=>v.status==="pending").length} Pending</span>
                <span className="pill p-ok">{boq.variations.filter(v=>v.status==="approved").length} Approved</span>
              </div>
            </div>
            {boq.variations.map((v,i)=>(
              <div key={i} className="var-row">
                <div className="var-row-left">
                  <strong>{v.desc}</strong>
                  <p>Raised by: {v.cat} discipline</p>
                </div>
                <div className="var-row-right">
                  <span style={{fontWeight:700,color:"var(--ink)"}}>{INR2(v.amount)}</span>
                  <span className={`pill ${v.status==="approved"?"p-ok":v.status==="pending"?"p-warn":"p-danger"}`}>
                    {v.status==="approved"?"Approved":v.status==="pending"?"Pending":"Rejected"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Approval timeline */}
          <div className="section-card" style={{marginBottom:14}}>
            <div className="sc-head h-gray">
              <div className="sc-head-left"><div className="sc-head-ico"><Ic.Clock/></div><h3>Approval Workflow</h3></div>
            </div>
            <div className="timeline">
              {[
                {role:"Architect",       name:project.arch,   status:"done",    note:"Architect BOQ reviewed and drawings linked.", amt:archTotal,   date:"22 Apr 2025"},
                {role:"Structural Eng.", name:project.struct, status:"done",    note:"Structural quantities verified against drawing "+boq.struct.rev+".", amt:structTotal, date:"23 Apr 2025"},
                {role:"MEP Engineer",   name:project.mep,    status:"done",    note:"MEP services BOQ confirmed. Equipment specs approved.", amt:mepTotal, date:"24 Apr 2025"},
                {role:"QS Engineer",    name:"QS Dept.",      status:"done",    note:"All disciplines consolidated. Cost report prepared.", amt:grandTotal,  date:today},
                {role:"Project Manager",name:project.pm,      status:submitted?"done":"pending", note:submitted?"Report reviewed and approved by PM.":"Awaiting PM review and sign-off.", amt:null, date:submitted?today:"—"},
              ].map((t,i)=>{
                const done = t.status==="done";
                return (
                  <div key={i} className="tl-item">
                    <div className="tl-dot" style={{background:done?"var(--ok-l)":"var(--s2)",color:done?"var(--ok)":"var(--muted)"}}>
                      {done?<Ic.Check/>:<Ic.Clock/>}
                    </div>
                    <div className="tl-body">
                      <strong>{t.role} — {t.name}</strong>
                      <p>{t.note}</p>
                      <div className="tl-meta">{t.date}</div>
                    </div>
                    <div className="tl-right">
                      {t.amt && <div className="tl-amt">{INR2(t.amt)}</div>}
                      <span className={`pill ${done?"p-ok":"p-warn"}`}>{done?"Complete":"Pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signatures */}
          <div className="sig-row">
            {[
              {role:"Prepared By",     name:"QS Engineer",    sub:"Quantity Surveyor Dept."},
              {role:"Reviewed By",     name:project.struct,   sub:"Structural Engineer"},
              {role:"Approved By (PM)",name:project.pm,       sub:"Project Manager"},
            ].map(s=>(
              <div key={s.role} className="sig-card">
                <div className="sig-role">{s.role}</div>
                <div className="sig-name">{s.name}</div>
                <div className="sig-status">{s.sub}</div>
                <div className="sig-line">Signature / Stamp</div>
              </div>
            ))}
          </div>

          {/* Notes to PM */}
          <div className="notes-card">
            <h4>Notes to Project Manager</h4>
            <textarea className="notes-ta" value={pmNotes} onChange={e=>setPMNotes(e.target.value)}
              placeholder={`Dear ${project.pm},\n\nPlease find the attached Quantity Cost Report for ${project.name}. All BOQ items have been verified across Architect, Structural, and MEP disciplines. Kindly review and approve…`}/>
          </div>

          {/* Submit bar */}
          {!submitted
            ? <div className="submit-bar sb-coord">
                <div>
                  <h3>Submit Cost Report to Project Manager</h3>
                  <p>Grand Total: {INR2(grandTotal)} · PM: {project.pm} · Report Date: {today}</p>
                </div>
                <div className="sb-btns">
                  <button className="btn btn-gw btn-sm"><Ic.Eye/>Preview</button>
                  <button className="btn btn-amber btn-sm" onClick={()=>setModal(true)}><Ic.Send/>Submit to PM</button>
                </div>
              </div>
            : <div className="submit-bar sb-ok">
                <div>
                  <h3>Cost Report Submitted to Project Manager</h3>
                  <p>Sent to {project.pm} · {INR2(grandTotal)} · {today}</p>
                </div>
                <span className="pill p-ok" style={{background:"rgba(255,255,255,.2)",color:"#fff"}}><Ic.Check/>Submitted</span>
              </div>
          }
        </>)}

        {/* ════════════════ ARCHITECT DETAIL ════════════════ */}
        {tab==="arch" && (<>
          <div className="stats-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
            <div className="stat-card" style={{"--sc":"var(--arch-100)"}}>
              <div className="sl">Rooms</div><div className="sv">{boq.arch.rooms.length}</div><div className="ss">From floor plan</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--arch-100)"}}>
              <div className="sl">Drawing Rev</div><div className="sv" style={{fontSize:15}}>{boq.arch.drawRev}</div><div className="ss">Linked revision</div>
            </div>
            <div className="stat-card" style={{"--sc":"var(--amber-100)"}}>
              <div className="sl">Finishing Total</div><div className="sv" style={{fontSize:15}}>{INR(archTotal)}</div><div className="ss">Tiles + Paint</div>
            </div>
          </div>
          <div className="section-card">
            <div className="sc-head h-arch">
              <div className="sc-head-left"><div className="sc-head-ico"><Ic.Arch/></div><h3>Architect BOQ Detail — Room Finishes</h3><span className="pill p-w">{boq.arch.drawRev}</span></div>
            </div>
            <div className="rep-wrap">
              <table className="rep-tbl">
                <thead className="th-arch">
                  <tr>
                    <th className="tl">Room / Space</th>
                    <th>Floor Tiles (₹)</th>
                    <th>Wall Paint (₹)</th>
                    <th>Total (₹)</th>
                    <th>% of Arch Total</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.arch.rooms.map((r,i)=>(
                    <tr key={i}>
                      <td className="tl">{r.name}</td>
                      <td className="tr mono orange">{INR2(r.floorAmt)}</td>
                      <td className="tr mono orange">{INR2(r.wallAmt)}</td>
                      <td className="tr mono" style={{fontWeight:700}}>{INR2(r.floorAmt+r.wallAmt)}</td>
                      <td className="tc">{pct(r.floorAmt+r.wallAmt,archTotal)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td className="tl">ARCHITECT GRAND TOTAL</td>
                    <td className="tr">{INR2(boq.arch.rooms.reduce((s,r)=>s+r.floorAmt,0))}</td>
                    <td className="tr">{INR2(boq.arch.rooms.reduce((s,r)=>s+r.wallAmt,0))}</td>
                    <td className="tr">{INR2(archTotal)}</td><td className="tc">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>)}

        {/* ════════════════ STRUCTURAL DETAIL ════════════════ */}
        {tab==="struct" && (<>
          <div className="stats-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            {[["Elements",boq.struct.elements.length,"items"],["Drawing",boq.struct.rev,"revision"],["Total Qty",boq.struct.elements.reduce((s,e)=>s+e.qty,0).toFixed(1),"m³ concrete"],["Struct Total",INR(structTotal),"all elements"]].map(([l,v,s])=>(
              <div key={l} className="stat-card" style={{"--sc":"var(--teal-100)"}}>
                <div className="sl">{l}</div><div className="sv" style={{fontSize:15}}>{v}</div><div className="ss">{s}</div>
              </div>
            ))}
          </div>
          <div className="section-card">
            <div className="sc-head h-teal">
              <div className="sc-head-left"><div className="sc-head-ico"><Ic.Struct/></div><h3>Structural BOQ Detail</h3><span className="pill p-teal">{boq.struct.rev}</span></div>
            </div>
            <div className="rep-wrap">
              <table className="rep-tbl">
                <thead className="th-teal">
                  <tr>
                    <th className="tl">Element</th><th>Qty</th><th>Unit</th>
                    <th>Rate (₹)</th><th>Amount (₹)</th><th>% of Struct</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.struct.elements.map((e,i)=>(
                    <tr key={i}>
                      <td className="tl">{e.name}</td>
                      <td className="tr mono">{e.qty.toFixed(3)}</td>
                      <td className="tc">{e.unit}</td>
                      <td className="tr mono">{INR(e.rate)}</td>
                      <td className="tr mono orange">{INR2(e.amount)}</td>
                      <td className="tc">{pct(e.amount,structTotal)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td className="tl">STRUCTURAL GRAND TOTAL</td>
                    <td className="tr">{boq.struct.elements.reduce((s,e)=>s+e.qty,0).toFixed(3)}</td>
                    <td/><td/><td className="tr">{INR2(structTotal)}</td><td className="tc">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>)}

        {/* ════════════════ MEP DETAIL ════════════════ */}
        {tab==="mep" && (<>
          <div className="stats-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            <div className="stat-card" style={{"--sc":"var(--mep-100)"}}><div className="sl">Electrical</div><div className="sv" style={{fontSize:15}}>{INR(elecTotal)}</div><div className="ss">{boq.mep.electrical.length} items</div></div>
            <div className="stat-card" style={{"--sc":"var(--mep-100)"}}><div className="sl">Plumbing</div><div className="sv" style={{fontSize:15}}>{INR(plmbTotal)}</div><div className="ss">{boq.mep.plumbing.length} items</div></div>
            <div className="stat-card" style={{"--sc":"var(--mep-100)"}}><div className="sl">HVAC</div><div className="sv" style={{fontSize:15}}>{INR(hvacTotal)}</div><div className="ss">{boq.mep.hvac.length} items</div></div>
            <div className="stat-card" style={{"--sc":"var(--amber-100)"}}><div className="sl">MEP Total</div><div className="sv" style={{fontSize:15}}>{INR(mepTotal)}</div><div className="ss">All services</div></div>
          </div>
          {[{label:"Electrical",items:boq.mep.electrical,total:elecTotal,cls:"h-mep"},{label:"Plumbing",items:boq.mep.plumbing,total:plmbTotal,cls:"h-mep"},{label:"HVAC",items:boq.mep.hvac,total:hvacTotal,cls:"h-mep"}].map(({label,items,total,cls})=>(
            <div key={label} className="section-card">
              <div className={`sc-head ${cls}`}>
                <div className="sc-head-left"><div className="sc-head-ico"><Ic.MEP/></div><h3>MEP — {label}</h3></div>
              </div>
              <div className="rep-wrap">
                <table className="rep-tbl">
                  <thead className="th-mep">
                    <tr><th className="tl">Description</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th><th>% of MEP</th></tr>
                  </thead>
                  <tbody>
                    {items.map((e,i)=>(
                      <tr key={i}>
                        <td className="tl">{e.name}</td>
                        <td className="tr mono">{e.qty}</td>
                        <td className="tc">{e.unit}</td>
                        <td className="tr mono">{INR(e.rate)}</td>
                        <td className="tr mono orange">{INR2(e.amount)}</td>
                        <td className="tc">{pct(e.amount,mepTotal)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td className="tl">{label} Total</td><td/><td/><td/><td className="tr">{INR2(total)}</td><td className="tc">{pct(total,mepTotal)}%</td></tr></tfoot>
                </table>
              </div>
            </div>
          ))}
        </>)}
      </div>

      {/* ══ SUBMIT MODAL ══ */}
      {modal && (
        <div className="overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-ico" style={{background:"var(--coord-l)"}}><span style={{color:"var(--coord)"}}><Ic.PM/></span></div>
            <h2 style={{color:"var(--coord)"}}>Submit to Project Manager</h2>
            <p>Send the Quantity Cost Report for <strong>{project.name}</strong> to <strong>{project.pm}</strong> for review and approval.</p>
            <div className="modal-sum">
              {[["Architect BOQ",archTotal],["Structural BOQ",structTotal],["MEP BOQ",mepTotal],["Approved Variations",varApproved],["Pending Variations",varPending]].map(([l,v])=>(
                <div key={l} className="ms-row"><span className="ms-l">{l}</span><span className="ms-r">{INR2(v)}</span></div>
              ))}
              <div className="ms-row"><span className="ms-l">PROJECT GRAND TOTAL</span><span className="ms-r" style={{fontFamily:"var(--mono)"}}>{INR2(grandTotal)}</span></div>
            </div>
            {pmNotes && (
              <div style={{background:"var(--coord-l)",borderRadius:7,padding:"9px 12px",fontSize:12,color:"var(--coord)",marginBottom:14,border:"1px solid var(--arch-100)",lineHeight:1.5}}>
                <strong>Your Notes:</strong> {pmNotes.slice(0,120)}{pmNotes.length>120?"…":""}
              </div>
            )}
            <div style={{fontSize:11.5,color:"var(--muted)",marginBottom:14}}>
              Budget: {INR2(project.budget)} · Used: {INR2(grandTotal)} · Remaining: {INR2(budgetLeft)} ({100-budgetPct}%)
            </div>
            <div className="modal-acts">
              <button className="btn btn-outline" onClick={()=>setModal(false)}><Ic.X/>Cancel</button>
              <button className="btn btn-coord" onClick={handleSubmit}><Ic.Send/>Confirm & Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}