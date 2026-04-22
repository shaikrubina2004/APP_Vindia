import { useState } from "react";
import "./Qssubmissions.css";

const SEED = [
  { id:1,  date:"2026-04-14", project:"Tower A",       phase:"Foundation", activity:"Footing casting Grid C1-C4",          qty:15,  unit:"m³", location:"Grid C, Lvl 0",  manpower:14, status:"on-track", progress:72, issues:"",                                          submittedTo:"CEO & Project Manager", submittedAt:"18:00" },
  { id:2,  date:"2026-04-14", project:"Mall Project",   phase:"Structure",  activity:"Column casting Lvl 3",                qty:6,   unit:"m³", location:"Block B, Lvl 3", manpower:18, status:"delayed",  progress:45, issues:"Concrete pump breakdown – delayed 3 hrs",   submittedTo:"CEO & Project Manager", submittedAt:"17:30" },
  { id:3,  date:"2026-04-13", project:"Hospital Block", phase:"MEP",        activity:"Plumbing rough-in Wing C",             qty:40,  unit:"m",  location:"Wing C, Lvl 2",  manpower:6,  status:"critical", progress:29, issues:"Material shortage – uPVC fittings pending", submittedTo:"CEO & Project Manager", submittedAt:"16:45" },
  { id:4,  date:"2026-04-13", project:"Villa Complex",  phase:"Finishing",  activity:"Internal plastering Unit 3A",          qty:180, unit:"m²", location:"Unit 3A",        manpower:12, status:"ahead",    progress:88, issues:"",                                          submittedTo:"CEO & Project Manager", submittedAt:"15:20" },
  { id:5,  date:"2026-04-12", project:"Tower A",        phase:"Foundation", activity:"Steel reinforcement fixing",            qty:2.4, unit:"MT", location:"Grid D, Lvl 0",  manpower:10, status:"on-track", progress:70, issues:"",                                          submittedTo:"CEO & Project Manager", submittedAt:"17:00" },
  { id:6,  date:"2026-04-12", project:"Mall Project",   phase:"MEP",        activity:"Electrical conduit laying Basement B1", qty:120, unit:"m",  location:"Basement B1",    manpower:8,  status:"on-track", progress:33, issues:"",                                          submittedTo:"CEO & Project Manager", submittedAt:"16:30" },
];

const SM = {
  "on-track":{ label:"On Track", cls:"qs-badge--green"  },
  "delayed": { label:"Delayed",  cls:"qs-badge--yellow" },
  "critical":{ label:"Critical", cls:"qs-badge--red"    },
  "ahead":   { label:"Ahead",    cls:"qs-badge--blue"   },
};
const pc = (p) => p>=80?"#16a34a":p>=40?"#2563eb":"#d97706";

export default function QSSubmissions() {
  const [filter, setFilter]     = useState("All");
  const [search, setSearch]     = useState("");
  const [view, setView]         = useState(null);
  const [phaseFilter, setPhase] = useState("All");

  const filtered = SEED.filter(u => {
    const matchStatus = filter === "All"    || u.status === filter;
    const matchPhase  = phaseFilter === "All" || u.phase === phaseFilter;
    const matchSearch = !search || u.project.toLowerCase().includes(search.toLowerCase()) || u.activity.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPhase && matchSearch;
  });

  const stats = {
    total:    SEED.length,
    onTrack:  SEED.filter(u => u.status === "on-track").length,
    issues:   SEED.filter(u => u.issues).length,
    avgProg:  Math.round(SEED.reduce((s,u) => s+u.progress, 0) / SEED.length),
  };

  return (
    <div className="qsd-page">
      <div className="qs-page-hdr">
        <div>
          <div className="qs-page-title">Submissions</div>
          <div className="qs-page-sub">All submitted daily updates — history and tracking</div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="qssub-stats-strip">
        {[
          { label:"Total Submitted", val:stats.total,   color:"blue"   },
          { label:"On Track",        val:stats.onTrack,  color:"green"  },
          { label:"With Issues",     val:stats.issues,   color:"red"    },
          { label:"Avg Progress",    val:stats.avgProg+"%", color:"purple" },
        ].map(s => (
          <div key={s.label} className={`qssub-stat qssub-stat--${s.color}`}>
            <div className="qssub-stat-val">{s.val}</div>
            <div className="qssub-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="qssub-toolbar">
        <input
          className="qs-input qssub-search"
          placeholder="Search project or activity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="qs-filter-bar" style={{ margin:0 }}>
          {["All","on-track","delayed","critical","ahead"].map(s => (
            <button key={s} className={`qs-filter-pill${filter===s?" active":""}`} onClick={()=>setFilter(s)}>
              {s==="All"?"All Status":SM[s]?.label}
            </button>
          ))}
        </div>
        <div className="qs-filter-bar" style={{ margin:0 }}>
          {["All","Foundation","Structure","Finishing","MEP"].map(p => (
            <button key={p} className={`qs-filter-pill${phaseFilter===p?" active":""}`} onClick={()=>setPhase(p)}>{p}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="qs-empty">
          <div className="qs-empty-icon">🔍</div>
          <div className="qs-empty-msg">No submissions found</div>
          <div>Try adjusting your filters or search</div>
        </div>
      ) : (
        <div>
          {filtered.map(u => (
            <div key={u.id} className="qssub-card">
              <div className="qssub-left">
                <div className="qssub-project">{u.project}</div>
                <div className="qssub-meta">{u.phase} · {u.date} · {u.submittedAt} · 👷 {u.manpower}</div>
                <div className="qssub-activity">{u.activity}</div>
                {u.issues && <div className="qsdu-issue" style={{ marginTop:6 }}>⚠ {u.issues}</div>}
              </div>
              <div className="qssub-right">
                <span className={`qs-badge ${SM[u.status].cls}`}>{SM[u.status].label}</span>
                <div className="qs-prog" style={{ minWidth:110 }}>
                  <div className="qs-prog-track">
                    <div className="qs-prog-fill" style={{ width:`${u.progress}%`, background:pc(u.progress) }} />
                  </div>
                  <span className="qs-prog-lbl">{u.progress}%</span>
                </div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>→ {u.submittedTo}</div>
                <button className="qsdu-view-btn" onClick={() => setView(u)}>View →</button>
              </div>
            </div>
          ))}
          <div style={{ fontSize:12, color:"#94a3b8", padding:"10px 0" }}>
            Showing {filtered.length} of {SEED.length} submissions
          </div>
        </div>
      )}

      {/* View Modal */}
      {view && (
        <div className="qs-overlay" onClick={() => setView(null)}>
          <div className="qs-modal" onClick={e => e.stopPropagation()}>
            <div className="qs-modal-hdr" style={{ borderBottom:`3px solid ${pc(view.progress)}` }}>
              <div>
                <div className="qs-modal-title">{view.project}</div>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{view.date} · {view.submittedAt}</div>
              </div>
              <button className="qs-modal-close" onClick={() => setView(null)}>✕</button>
            </div>
            <div className="qs-modal-body">
              <div className="qsdu-view-grid">
                {[
                  { label:"Phase",       val: view.phase },
                  { label:"Status",      val: <span className={`qs-badge ${SM[view.status].cls}`}>{SM[view.status].label}</span> },
                  { label:"Activity",    val: view.activity,                   full: true },
                  { label:"Quantity",    val: `${view.qty} ${view.unit}` },
                  { label:"Location",    val: view.location },
                  { label:"Manpower",    val: `${view.manpower} workers` },
                  { label:"Submitted To",val: view.submittedTo },
                  { label:"Time",        val: view.submittedAt },
                ].map((f,i) => (
                  <div key={i} className={`qsdu-view-field${f.full?" qsdu-view-full":""}`}>
                    <div className="qsdu-view-label">{f.label}</div>
                    <div className="qsdu-view-val">{f.val}</div>
                  </div>
                ))}
                <div className="qsdu-view-field qsdu-view-full">
                  <div className="qsdu-view-label">Progress</div>
                  <div className="qs-prog" style={{ marginTop:6 }}>
                    <div className="qs-prog-track" style={{ height:10 }}>
                      <div className="qs-prog-fill" style={{ width:`${view.progress}%`, background:pc(view.progress) }} />
                    </div>
                    <span className="qs-prog-lbl">{view.progress}%</span>
                  </div>
                </div>
                {view.issues && (
                  <div className="qsdu-view-field qsdu-view-full">
                    <div className="qsdu-view-label">Issues Reported</div>
                    <div className="qsdu-issue" style={{ marginTop:4 }}>⚠ {view.issues}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="qs-modal-footer">
              <button className="qs-btn-secondary" onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}