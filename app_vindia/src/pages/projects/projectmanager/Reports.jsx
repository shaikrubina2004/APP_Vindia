import { useState, useEffect, useCallback } from "react";
import "../../../styles/Reports.css";
import { useProject } from "../../../context/ProjectContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const token = () => localStorage.getItem("token");

const fmt = (n) => n >= 1e6 ? `₹${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `₹${(n/1e3).toFixed(0)}K` : `₹${n||0}`;
const pct = (a,b) => b ? Math.round((a/b)*100) : 0;

function Bar({ value, max=100, color="#1e5a96", height=6 }) {
  const w = Math.min(100, Math.round((value/(max||1))*100));
  return (
    <div style={{background:"#e6e8ec",borderRadius:99,height,overflow:"hidden",flex:1}}>
      <div style={{width:`${w}%`,background:color,height,borderRadius:99,transition:"width .4s"}}/>
    </div>
  );
}

function Donut({ value, max=100, size=76, stroke=9, color="#1e5a96" }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, p=Math.min((value||0)/(max||1),1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e6e8ec" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ*p} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size*.18} fontWeight="700" fill={color}>{Math.round(p*100)}%</text>
    </svg>
  );
}

function MiniBarChart({ data, valueKey, labelKey }) {
  const max = Math.max(...data.map(d=>Number(d[valueKey])||0), 1);
  return (
    <div className="rpt-chart">
      {data.map((d,i)=>{
        const h=Math.round(((Number(d[valueKey])||0)/max)*100);
        const last=i===data.length-1;
        return (
          <div key={i} className={`rpt-chart-col${last?" rpt-chart-col-active":""}`}>
            <span className="rpt-chart-val">{d[valueKey]}</span>
            <div className="rpt-chart-bar-wrap">
              <div className="rpt-chart-bar" style={{height:`${h}%`,background:last?"#1e5a96":"#c7d9ef"}}/>
            </div>
            <span className="rpt-chart-label">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:260,flexDirection:"column",gap:14}}>
      <div className="tm-spinner"/>
      <p style={{color:"#6b7280",fontSize:13}}>Loading report…</p>
    </div>
  );
}

function ErrBox({ msg, onRetry }) {
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:220,flexDirection:"column",gap:10}}>
      <div style={{fontSize:38}}>⚠️</div>
      <p style={{color:"#ef4444",fontSize:13,textAlign:"center",maxWidth:420}}>{msg}</p>
      <button onClick={onRetry}
        style={{marginTop:4,padding:"7px 20px",background:"#1e5a96",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>
        Retry
      </button>
    </div>
  );
}

const TABS = [
  { id:"project",   label:"Project Report",  icon:"📈" },
  { id:"cost",      label:"Cost Report",      icon:"💰" },
  { id:"timesheet", label:"Timesheet Report", icon:"⏱" },
  { id:"incidents", label:"Incident Report",  icon:"🚨" },
];

export default function Reports() {
  const { activeProject, setActiveProject, PROJECTS, loading: projectsLoading } = useProject();

  const [tab, setTab]         = useState("project");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  const projectList = (PROJECTS||[]).filter(p => p.id !== null);
  const projectId   = activeProject?.id ?? null;

  // useCallback so the function reference is stable and useEffect dep works correctly
  const fetchTab = useCallback(async (t, pid) => {
    if (!pid) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${BASE}/api/pm-reports/${pid}/${t}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);
      setData(json);
    } catch(e) {
      console.error("Report fetch error:", e);
      setError(e.message || "Failed to load report. Check backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever tab OR project changes
  useEffect(() => {
    if (projectsLoading) return;
    if (!projectId) { setData(null); setError(null); setLoading(false); return; }
    fetchTab(tab, projectId);
  }, [tab, projectId, projectsLoading, fetchTab]);

  function handleExport() {
    if (!projectId) return;
    const map = { project:"project", cost:"cost", timesheet:"timesheet", incidents:"incident" };
    window.open(`${BASE}/api/pm-reports/${projectId}/export?type=${map[tab]||tab}`, "_blank");
  }

  function handleProjectChange(e) {
    const p = projectList.find(x => String(x.id) === e.target.value);
    if (p) setActiveProject(p);
  }

  // What to show in the content area
  const showSpinner  = projectId && loading;
  const showError    = projectId && !loading && error;
  const showEmpty    = !projectId && !projectsLoading;
  const showContent  = projectId && !loading && !error && data;

  return (
    <div className="rpt-page">

      {/* ── Project selector banner ── */}
      <div className="rpt-selector-banner">
        <div className="rpt-selector-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e5a96" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="rpt-selector-label">Select Project</span>
        </div>
        <div className="rpt-selector-right">
          {projectsLoading ? (
            <span style={{fontSize:13,color:"#9ca3af"}}>Loading projects…</span>
          ) : projectList.length === 0 ? (
            <span style={{fontSize:13,color:"#ef4444"}}>No projects found</span>
          ) : (
            <div className="rpt-selector-wrap">
              <select className="rpt-selector-select"
                value={String(projectId ?? "")}
                onChange={handleProjectChange}>
                <option value="" disabled>— Choose a project —</option>
                {projectList.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <svg className="rpt-selector-chevron" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="#1e5a96" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          )}
          {projectId && (
            <div className="rpt-selector-active-badge">
              <span className="rpt-selector-active-dot"/>
              {activeProject?.name}
            </div>
          )}
        </div>
      </div>

      {/* ── Header ── */}
      <div className="rpt-header">
        <div className="rpt-header-title">
          <h1>Reports</h1>
          <p>{projectId ? `${activeProject?.name} — Live analytics` : "Select a project to begin"}</p>
        </div>
        <button className="rpt-export-btn rpt-excel" onClick={handleExport}
          disabled={!projectId || loading}
          style={{marginLeft:"auto",opacity:projectId?1:0.45,cursor:projectId?"pointer":"not-allowed"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
          </svg>
          Export Excel
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="rpt-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`rpt-tab${tab===t.id?" rpt-tab-active":""}`}
            onClick={() => setTab(t.id)}
            disabled={!projectId}>
            <span className="rpt-tab-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {showEmpty   && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          height:320,gap:14,background:"#f8fafc",borderRadius:16,margin:"8px 0"}}>
          <div style={{fontSize:52}}>📊</div>
          <p style={{color:"#374151",fontSize:15,fontWeight:600}}>No project selected</p>
          <p style={{color:"#9ca3af",fontSize:13,textAlign:"center",maxWidth:300}}>
            Use the <strong>Select Project</strong> dropdown above to load a report.
          </p>
        </div>
      )}
      {showSpinner && <Spinner/>}
      {showError   && <ErrBox msg={error} onRetry={() => fetchTab(tab, projectId)}/>}

      {/* ══ PROJECT REPORT ══ */}
      {showContent && tab === "project" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={data.overall} color="#1e5a96" size={76}/>
              <div>
                <span className="rpt-kpi-label">Overall Progress</span>
                <span className="rpt-kpi-val">{data.overall}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">✔</div>
              <div>
                <span className="rpt-kpi-label">Phases Complete</span>
                <span className="rpt-kpi-val">{(data.phases||[]).filter(p=>p.progress===100).length} / {(data.phases||[]).length}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">⏱</div>
              <div>
                <span className="rpt-kpi-label">Delayed Phases</span>
                <span className="rpt-kpi-val">{data.delayedMilestones||0}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">📋</div>
              <div>
                <span className="rpt-kpi-label">Reports This Week</span>
                <span className="rpt-kpi-val">{data.weeklyTasks||0}</span>
              </div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Phase Progress</h3></div>
              {!data.phases?.length ? <p className="rpt-empty">No WBS phases found.</p> : (
                <div className="rpt-phase-list">
                  {data.phases.map((p,i)=>(
                    <div key={i} className="rpt-phase-row">
                      <span className="rpt-phase-name">{p.name}</span>
                      <div className="rpt-phase-bar-area">
                        <Bar value={p.progress} color={p.progress===100?"#22c55e":p.progress>0?"#1e5a96":"#e6e8ec"}/>
                        <span className="rpt-phase-pct">{p.progress}%</span>
                      </div>
                      <span className={`rpt-phase-status rpt-ps-${p.progress===100?"done":p.progress>0?"inprogress":"pending"}`}>
                        {p.progress===100?"✔ Done":p.progress>0?"◐ Active":"○ Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Milestones</h3></div>
              {!data.milestones?.length ? <p className="rpt-empty">No milestones found.</p> : (
                <div className="rpt-milestone-list">
                  {data.milestones.map((m,i)=>(
                    <div key={i} className="rpt-milestone-row">
                      <div className={`rpt-ms-dot rpt-ms-${m.status}`}>{m.status==="done"?"✔":m.status==="delayed"?"!":"○"}</div>
                      <div className="rpt-ms-info"><span className="rpt-ms-name">{m.name}</span></div>
                      <span className={`rpt-ms-badge rpt-ms-${m.status}`}>
                        {m.status==="done"?"Complete":m.status==="delayed"?"Delayed":"Upcoming"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ COST REPORT ══ */}
      {showContent && tab === "cost" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={pct(data.spent,data.budget)} color={data.spent>data.budget?"#ef4444":"#1e5a96"} size={76}/>
              <div>
                <span className="rpt-kpi-label">Budget Used</span>
                <span className="rpt-kpi-val">{pct(data.spent,data.budget)}%</span>
                {data.spent>data.budget && <span className="rpt-over-badge">Over Budget</span>}
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">₹</div>
              <div><span className="rpt-kpi-label">Total Budget</span><span className="rpt-kpi-val">{fmt(data.budget)}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${data.spent>data.budget?"kpi-red":"kpi-amber"}`}>₹</div>
              <div><span className="rpt-kpi-label">Total Spent</span><span className="rpt-kpi-val">{fmt(data.spent)}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${(data.budget-data.spent)<0?"kpi-red":"kpi-green"}`}>₹</div>
              <div><span className="rpt-kpi-label">Remaining</span><span className="rpt-kpi-val">{fmt(Math.abs(data.budget-data.spent))}</span></div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Budget vs Spent by Phase</h3></div>
              {!data.categories?.length ? <p className="rpt-empty">No cost data yet.</p> : (
                <div className="rpt-cost-list">
                  {data.categories.map((c,i)=>{
                    const u=pct(c.spent,c.budget||1), over=c.spent>c.budget;
                    return (
                      <div key={i} className="rpt-cost-row">
                        <span className="rpt-cost-name">{c.name}</span>
                        <div className="rpt-cost-bars">
                          <div className="rpt-cost-bar-track">
                            <div className="rpt-cost-bar-budget" style={{width:"100%"}}/>
                            <div className={`rpt-cost-bar-spent${over?" over-budget":""}`} style={{width:`${Math.min(u,100)}%`}}/>
                          </div>
                          <span className={`rpt-cost-pct${over?" text-red":""}`}>{u}%</span>
                        </div>
                        <div className="rpt-cost-amounts">
                          <span className="rpt-cost-spent">{fmt(c.spent)}</span>
                          <span className="rpt-cost-budget">/ {fmt(c.budget)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Weekly Spend Trend</h3></div>
              {data.trend?.length>0 ? <MiniBarChart data={data.trend} valueKey="spent" labelKey="week"/> : <p className="rpt-empty">No spend data yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══ TIMESHEET REPORT ══ */}
      {showContent && tab === "timesheet" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">⏱</div>
              <div><span className="rpt-kpi-label">Total Hours</span><span className="rpt-kpi-val">{data.totalHours||0}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">👥</div>
              <div><span className="rpt-kpi-label">Active Workers</span><span className="rpt-kpi-val">{data.activeWorkers||0}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">✅</div>
              <div><span className="rpt-kpi-label">Total Tasks</span><span className="rpt-kpi-val">{data.totalTasks||0}</span></div>
            </div>
          </div>
          <div className="rpt-ts-grid">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Team Members</h3></div>
              {!data.employees?.length ? <p className="rpt-empty">No active team members found.</p> : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead><tr><th>Employee</th><th>Role</th><th>Type</th><th>Hours</th><th>Tasks</th><th>Days</th></tr></thead>
                    <tbody>
                      {data.employees.map((e,i)=>(
                        <tr key={i}>
                          <td>
                            <div className="rpt-emp-cell">
                              <div className="rpt-emp-avatar">{(e.name||"?").charAt(0).toUpperCase()}</div>
                              {e.name}
                            </div>
                          </td>
                          <td><span className="rpt-role-badge">{e.role}</span></td>
                          <td><span className={`pill pill-${(e.type||"").toLowerCase()}`}>{e.type}</span></td>
                          <td><strong>{e.hours}h</strong></td>
                          <td>{e.tasks}</td>
                          <td>{e.days_worked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Daily Report Submissions</h3></div>
              {data.trend?.length>0 ? <MiniBarChart data={data.trend} valueKey="submissions" labelKey="week"/> : <p className="rpt-empty">No submission data yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══ INCIDENT REPORT ══ */}
      {showContent && tab === "incidents" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={data.total>0?pct(data.closed,data.total):100} color="#22c55e" size={76}/>
              <div>
                <span className="rpt-kpi-label">Resolution Rate</span>
                <span className="rpt-kpi-val">{data.total>0?pct(data.closed,data.total):100}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">📋</div>
              <div><span className="rpt-kpi-label">Total</span><span className="rpt-kpi-val">{data.total||0}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">⚠️</div>
              <div><span className="rpt-kpi-label">Open</span><span className="rpt-kpi-val">{data.open||0}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">✔</div>
              <div><span className="rpt-kpi-label">Closed</span><span className="rpt-kpi-val">{data.closed||0}</span></div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>By Priority</h3></div>
              <div className="rpt-inc-priority-list">
                {(data.byPriority||[]).map((p,i)=>(
                  <div key={i} className="rpt-inc-p-row">
                    <div className="rpt-inc-p-info">
                      <span className="rpt-inc-p-dot" style={{background:p.color}}/>
                      <span className="rpt-inc-p-label">{p.label}</span>
                    </div>
                    <Bar value={p.count} max={data.total||1} color={p.color}/>
                    <span className="rpt-inc-p-count">{p.count}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20}} className="rpt-card-header"><h3>By Status</h3></div>
              <div className="rpt-inc-status-list">
                {(data.byStatus||[]).map((s,i)=>(
                  <div key={i} className="rpt-inc-s-row">
                    <span className="rpt-inc-s-label">{s.label}</span>
                    <div className="rpt-inc-s-bar">
                      <div className="rpt-inc-s-fill" style={{width:`${pct(s.count,data.total||1)}%`}}/>
                    </div>
                    <span className="rpt-inc-s-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Recent Incidents</h3></div>
              {!data.recent?.length ? <p className="rpt-empty">No incidents found.</p> : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Age</th></tr></thead>
                    <tbody>
                      {data.recent.map((inc,i)=>(
                        <tr key={i}>
                          <td><code className="rpt-inc-id">{inc.id}</code></td>
                          <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.title}</td>
                          <td><span className={`rpt-p-badge rpt-p-${(inc.priority||"p3").toLowerCase()}`}>{inc.priority}</span></td>
                          <td><span className={`rpt-s-badge rpt-s-${(inc.status||"").toLowerCase().replace(/ /g,"-")}`}>{inc.status}</span></td>
                          <td className="rpt-age">{inc.age}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="rpt-open-closed">
                <div className="rpt-oc-bar">
                  <div className="rpt-oc-open" style={{width:`${pct(data.open,data.total||1)}%`}}/>
                  <div className="rpt-oc-closed" style={{width:`${pct(data.closed,data.total||1)}%`}}/>
                </div>
                <div className="rpt-oc-legend">
                  <span><span className="rpt-oc-dot open"/> Open ({data.open||0})</span>
                  <span><span className="rpt-oc-dot closed"/> Closed ({data.closed||0})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}