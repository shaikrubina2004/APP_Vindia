// src/pages/siteEngineer/SiteInstruction.jsx
// Architect issues Site Instructions → Site Engineer receives, acknowledges, implements
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { useNotifications } from "../../context/NotificationContext";
import "../../styles/shared-pages.css";


const PAGE_SIZE = 8;
const STATUS_CFG = {
  issued:         { label: "Issued",         bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
  acknowledged:   { label: "Acknowledged",   bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  implementing:   { label: "Implementing",   bg: "#F3EDF8", color: "#4A1A6E", border: "#C49FDC" },
  implemented:    { label: "Implemented",    bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  disputed:       { label: "Disputed",       bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
};

function stableKey(it) { return it?.id!=null?String(it.id):`${it?.si_number||""}|${it?.createdAt||""}`; }
function fmtDate(s) { return s?new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"; }

function StatusBadge({s}) {
  const c=STATUS_CFG[s]||STATUS_CFG.issued;
  return <span style={{fontSize:11,padding:"2px 9px",borderRadius:20,background:c.bg,color:c.color,border:`0.5px solid ${c.border}`,fontWeight:500}}>{c.label}</span>;
}

export default function SiteInstruction() {
  const { push } = useNotifications();
  const [sis, setSIs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStat, setFS]     = useState("all");
  const [page, setPage]         = useState(1);
  const [updating, setUpdating] = useState(null); // SI id being updated
  const [expandedId, setExp]    = useState(null);
  const alive = useRef(true);

  useEffect(()=>{ alive.current=true; loadSIs(); return()=>{ alive.current=false; }; },[]);

  async function loadSIs() {
    setLoading(true);
    try {
      const res = await api.get("/site-instructions");
      if(!alive.current) return;
      const raw = Array.isArray(res?.data)?res.data.slice().reverse():[];
      const seen = new Set();
      setSIs(raw.filter(it=>{ const k=stableKey(it); if(seen.has(k)) return false; seen.add(k); return true; }));
    } catch { /* offline */ }
    finally { if(alive.current) setLoading(false); }
  }

  const acknowledge = useCallback(async (si) => {
    if(updating) return;
    setUpdating(si.id);
    try {
      await api.patch(`/site-instructions/${si.id}`, { status: "acknowledged" });
      setSIs(s=>s.map(it=>it.id===si.id?{...it,status:"acknowledged"}:it));
      push(`SI acknowledged: "${si.title||si.si_number}"`, "approval", { linked_ref: si.si_number });
    } catch { alert("Could not update — check connection"); }
    finally { setUpdating(null); }
  }, [updating, push]);

  const markImplemented = useCallback(async (si) => {
    if(updating) return;
    setUpdating(si.id);
    try {
      await api.patch(`/site-instructions/${si.id}`, { status: "implemented", implemented_at: new Date().toISOString() });
      setSIs(s=>s.map(it=>it.id===si.id?{...it,status:"implemented"}:it));
      push(`SI implemented: "${si.title||si.si_number}"`, "approval", { linked_ref: si.si_number });
    } catch { alert("Could not update — check connection"); }
    finally { setUpdating(null); }
  }, [updating, push]);

  const filtered = useMemo(()=>{
    let l = sis.slice();
    if(search.trim()){ const q=search.toLowerCase(); l=l.filter(it=>(it.title||"").toLowerCase().includes(q)||(it.description||"").toLowerCase().includes(q)||(it.si_number||"").toLowerCase().includes(q)); }
    if(filterStat!=="all") l=l.filter(it=>(it.status||"issued")===filterStat);
    return l;
  },[sis,search,filterStat]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageItems=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  useEffect(()=>{ if(page>totalPages) setPage(totalPages); },[totalPages]);

  const stats=useMemo(()=>({
    issued:       sis.filter(s=>s.status==="issued").length,
    acknowledged: sis.filter(s=>s.status==="acknowledged").length,
    implementing: sis.filter(s=>s.status==="implementing").length,
    implemented:  sis.filter(s=>s.status==="implemented").length,
  }),[sis]);

  const inp={width:"100%",padding:"8px 10px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",fontSize:13,background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none",boxSizing:"border-box"};
  const secTitle={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--color-text-tertiary)",marginBottom:12,paddingBottom:6,borderBottom:"0.5px solid var(--color-border-tertiary)"};

  return (
    <div style={{padding:"0 0 40px"}}>
      {/* HEADER */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--color-text-tertiary)",marginBottom:4}}>Architect → Site Engineer</div>
        <h1 style={{fontSize:22,fontWeight:500,margin:0,color:"var(--color-text-primary)"}}>Site Instructions</h1>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:4}}>Issued by Architect — acknowledge and implement on site</div>
      </div>

      {/* FLOW */}
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:24,padding:"12px 18px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflowX:"auto",flexWrap:"wrap",gap:8}}>
        {[["Architect","Issues SI","#185FA5"],["→"],["Site Engineer","Acknowledges","#BA7517"],["→"],["Site Engineer","Implements","#085041"],["→"],["Daily Diary","Records implementation","#3B3A37"]].map((s,i)=>(
          s.length===1
            ? <div key={i} style={{fontSize:16,color:"var(--color-text-tertiary)",padding:"0 4px"}}>→</div>
            : <div key={i} style={{textAlign:"center",padding:"8px 14px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:600,color:s[2]}}>{s[0]}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{s[1]}</div>
              </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:20,alignItems:"start"}}>
        <div>
          {/* CONTROLS */}
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200,display:"flex",alignItems:"center",gap:8,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"7px 10px"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search SIs…" style={{background:"none",border:"none",outline:"none",fontSize:13,color:"var(--color-text-primary)",flex:1}}/>
            </div>
            <select value={filterStat} onChange={e=>{setFS(e.target.value);setPage(1);}} style={{...inp,width:160}}>
              <option value="all">All status</option>
              {Object.entries(STATUS_CFG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>

          {/* LIST */}
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
            {loading ? (
              <div style={{padding:32,textAlign:"center",color:"var(--color-text-secondary)",fontSize:13}}>Loading…</div>
            ) : pageItems.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--color-text-secondary)",fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                No site instructions found
              </div>
            ) : pageItems.map(si=>(
              <div key={stableKey(si)} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{padding:"14px 18px",cursor:"pointer"}} onClick={()=>setExp(expandedId===si.id?null:si.id)}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,alignItems:"center"}}>
                    <span style={{fontFamily:"var(--font-mono,monospace)",fontSize:11,fontWeight:700,color:"#185FA5"}}>{si.si_number||`SI-${String(si.id||"").padStart(3,"0")}`}</span>
                    <StatusBadge s={si.status||"issued"}/>
                    {si.priority==="urgent" && <span style={{fontSize:11,padding:"2px 8px",background:"#FCEBEB",color:"#791F1F",borderRadius:20,border:"0.5px solid #E8A0A0"}}>Urgent</span>}
                    <span style={{marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)"}}>{expandedId===si.id?"▲":"▼"}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{si.title||"Untitled SI"}</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",display:"flex",gap:12,flexWrap:"wrap"}}>
                    {si.issued_date && <span>Issued: {fmtDate(si.issued_date)}</span>}
                    {si.zone && <span>Zone: {si.zone}</span>}
                    {si.linked_rfi && <span style={{color:"#BA7517"}}>Ref: {si.linked_rfi}</span>}
                    {si.response_required_by && <span>Respond by: {fmtDate(si.response_required_by)}</span>}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId===si.id && (
                  <div style={{padding:"0 18px 18px",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                    {si.description && (
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--color-text-tertiary)",marginBottom:6}}>Instruction</div>
                        <div style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.65,whiteSpace:"pre-wrap",background:"var(--color-background-secondary)",padding:"12px 14px",borderRadius:"var(--border-radius-md)"}}>{si.description}</div>
                      </div>
                    )}
                    {si.drawing_ref && (
                      <div style={{marginTop:10,fontSize:12,color:"var(--color-text-secondary)"}}>Drawing ref: <strong style={{color:"#185FA5"}}>{si.drawing_ref}</strong></div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
                      {(si.status==="issued") && (
                        <button onClick={()=>acknowledge(si)} disabled={updating===si.id} style={{padding:"8px 18px",background:"#185FA5",color:"#fff",border:"none",borderRadius:"var(--border-radius-md)",fontSize:13,fontWeight:500,cursor:"pointer",opacity:updating===si.id?0.6:1}}>
                          {updating===si.id?"Updating…":"✓ Acknowledge"}
                        </button>
                      )}
                      {(si.status==="acknowledged"||si.status==="implementing") && (
                        <button onClick={()=>markImplemented(si)} disabled={updating===si.id} style={{padding:"8px 18px",background:"#085041",color:"#fff",border:"none",borderRadius:"var(--border-radius-md)",fontSize:13,fontWeight:500,cursor:"pointer",opacity:updating===si.id?0.6:1}}>
                          {updating===si.id?"Updating…":"✓ Mark Implemented"}
                        </button>
                      )}
                      {si.status==="implemented" && (
                        <span style={{fontSize:13,color:"#085041",fontWeight:600}}>✓ Implementation complete — record in Daily Diary</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filtered.length>PAGE_SIZE && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px"}}>
                <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Page {page} of {totalPages} · {filtered.length} records</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} style={{...inp,width:"auto",padding:"5px 12px",fontSize:12,cursor:"pointer"}}>← Prev</button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} style={{...inp,width:"auto",padding:"5px 12px",fontSize:12,cursor:"pointer"}}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ASIDE */}
        <aside style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:16}}>
            <div style={secTitle}>Stats</div>
            {[["Issued (action needed)",stats.issued,"#b83232"],["Acknowledged",stats.acknowledged,"#BA7517"],["Implementing",stats.implementing,"#4A1A6E"],["Implemented",stats.implemented,"#085041"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                <span style={{color:"var(--color-text-secondary)",fontSize:12}}>{l}</span>
                <strong style={{color:c}}>{v}</strong>
              </div>
            ))}
          </div>
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:16}}>
            <div style={secTitle}>Rules</div>
            <ul style={{margin:0,padding:"0 0 0 16px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:2}}>
              <li>Acknowledge within 24h of receipt</li>
              <li>Record implementation in Daily Diary</li>
              <li>Dispute via RFI — not verbally</li>
              <li>Never ignore an SI — it's a contract document</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}