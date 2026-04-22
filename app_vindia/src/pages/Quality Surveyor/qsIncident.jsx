// Incidents.jsx  — Quantity Surveyor Incident Module
// ─────────────────────────────────────────────────────────────
// WORKFLOW
//   QS raises incident → assigns to resolver role
//   Resolver role sees it in "Assigned to Me" tab, updates status
//   QS can close/resolve any incident they raised
//   Incidents raised by OTHER roles → QS resolves from "For QS to Resolve"
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useMemo } from "react";
import "./Incident.css";

// ─── constants ────────────────────────────────────────────────
const CURRENT_ROLE = "Quantity Surveyor"; // simulate logged-in QS

const RESOLVER_ROLES = [
  { role: "Site Engineer",        avatar: "SE", color: "#2563eb", department: "Site Works"       },
  { role: "Structural Engineer",  avatar: "ST", color: "#7c3aed", department: "Structural"       },
  { role: "MEP Engineer",         avatar: "ME", color: "#0d9488", department: "MEP Systems"      },
  { role: "Architect",            avatar: "AR", color: "#d97706", department: "Design"           },
  { role: "Safety Officer",       avatar: "SO", color: "#dc2626", department: "Safety & HSE"     },
  { role: "Planning Engineer",    avatar: "PE", color: "#4f46e5", department: "Planning"         },
  { role: "Quality Checker",      avatar: "QC", color: "#16a34a", department: "Quality Control"  },
  { role: "Project Coordinator",  avatar: "PC", color: "#9333ea", department: "Coordination"     },
  { role: "Quantity Surveyor",    avatar: "QS", color: "#b45309", department: "Cost & Contracts" },
];

const INCIDENT_TYPES = [
  "Structural Defect", "Material Variance", "Cost Overrun", "Safety Hazard",
  "Design Issue", "MEP Fault", "Quality Issue", "Schedule Delay",
  "Measurement Dispute", "Other",
];

const PRIORITY_META = {
  P1: { label: "P1 — Critical", color: "#dc2626", bg: "#fef2f2", bd: "#fecaca", sla: "Same day" },
  P2: { label: "P2 — High",     color: "#d97706", bg: "#fffbeb", bd: "#fde68a", sla: "2–3 days" },
  P3: { label: "P3 — Medium",   color: "#2563eb", bg: "#eff6ff", bd: "#bfdbfe", sla: "1 week"   },
  P4: { label: "P4 — Low",      color: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0", sla: "2 weeks"  },
};

const STATUS_META = {
  "Open":        { cls: "s-open",     label: "Open",        step: 0 },
  "Assigned":    { cls: "s-assigned", label: "Assigned",    step: 1 },
  "In Progress": { cls: "s-progress", label: "In Progress", step: 2 },
  "Resolved":    { cls: "s-resolved", label: "Resolved",    step: 3 },
  "Closed":      { cls: "s-closed",   label: "Closed",      step: 4 },
};

const STATUS_FLOW = ["Open", "Assigned", "In Progress", "Resolved", "Closed"];

const COST_IMPACTS = [
  "< Rs.10,000", "Rs.10K – Rs.50K", "Rs.50K – Rs.2L",
  "Rs.2L – Rs.10L", "> Rs.10L", "Not assessed yet",
];

const SEED = [
  {
    id: "INC-001",
    title: "Water seepage Block B basement",
    description: "Severe water seepage near eastern wall of Block B basement. Structural risk — waterproofing failure suspected. Immediate inspection required.",
    type: "Structural Defect",
    priority: "P1",
    status: "In Progress",
    raisedBy: CURRENT_ROLE,
    assignedTo: "Site Engineer",
    assignedName: "Rajesh Kumar",
    project: "Greenfield Tower",
    location: "Block B, Basement",
    costImpact: "Rs.50K – Rs.2L",
    dueDate: "",
    raisedAt: new Date(Date.now() - 3 * 3600000),
    updatedAt: new Date(Date.now() - 1 * 3600000),
    photo: null,
    comments: [
      { author: "Rajesh Kumar", role: "Site Engineer", text: "Inspected. Seepage from construction joint at north-east corner. Need waterproofing specialist.", time: new Date(Date.now() - 2 * 3600000) },
      { author: "Arjun Mehta",  role: "Quantity Surveyor", text: "Acknowledged. Please proceed with waterproofing. I will raise a variation order.", time: new Date(Date.now() - 1 * 3600000) },
    ],
    resolution: "",
  },
  {
    id: "INC-002",
    title: "Steel delivery short by 2 MT",
    description: "Received 40 MT TMT Steel Fe500D against ordered 42 MT. Supplier invoice claims full delivery. QS verification needed and BOQ adjustment required.",
    type: "Material Variance",
    priority: "P2",
    status: "Assigned",
    raisedBy: "Site Engineer",
    assignedTo: CURRENT_ROLE,
    assignedName: "Arjun Mehta",
    project: "Greenfield Tower",
    location: "Site Store",
    costImpact: "Rs.50K – Rs.2L",
    dueDate: "",
    raisedAt: new Date(Date.now() - 5 * 3600000),
    updatedAt: new Date(Date.now() - 4 * 3600000),
    photo: null,
    comments: [
      { author: "Ravi Kumar", role: "Site Engineer", text: "Weigh bridge receipt shows 40 MT. Supplier saying 42 MT delivered. Need QS to verify.", time: new Date(Date.now() - 4 * 3600000) },
    ],
    resolution: "",
  },
  {
    id: "INC-003",
    title: "Concrete over-pour Level 1 slab",
    description: "Actual concrete poured was 24 m³ against BOQ of 22 m³. Over-pour due to incorrect formwork dimensions. Variation order must be raised by QS.",
    type: "Measurement Dispute",
    priority: "P3",
    status: "Resolved",
    raisedBy: "Site Engineer",
    assignedTo: CURRENT_ROLE,
    assignedName: "Arjun Mehta",
    project: "Greenfield Tower",
    location: "Level 1 Slab",
    costImpact: "Rs.10K – Rs.50K",
    dueDate: "",
    raisedAt: new Date(Date.now() - 2 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
    photo: null,
    comments: [
      { author: "Ravi Kumar",  role: "Site Engineer",     text: "Pour done. Excess 2 m³ documented.", time: new Date(Date.now() - 2 * 86400000) },
      { author: "Arjun Mehta", role: "Quantity Surveyor", text: "Variation order VO-001 raised for Rs.16,400. Approved by PM.", time: new Date(Date.now() - 86400000) },
    ],
    resolution: "Variation order VO-001 raised and approved. BOQ updated. Extra Rs.16,400 added to contract sum.",
  },
  {
    id: "INC-004",
    title: "Safety scaffolding inspection overdue",
    description: "Monthly scaffolding inspection was due 3 days ago. Safety Officer has not submitted report. Works must pause until inspection clearance received.",
    type: "Safety Hazard",
    priority: "P1",
    status: "Open",
    raisedBy: CURRENT_ROLE,
    assignedTo: "Safety Officer",
    assignedName: "Kiran B.",
    project: "Greenfield Tower",
    location: "Level 3 North face",
    costImpact: "Not assessed yet",
    dueDate: "",
    raisedAt: new Date(Date.now() - 6 * 3600000),
    updatedAt: new Date(Date.now() - 6 * 3600000),
    photo: null,
    comments: [],
    resolution: "",
  },
  {
    id: "INC-005",
    title: "Cost overrun — Brick masonry Structure phase",
    description: "Actual brick masonry cost is tracking 18% above BOQ rate. Site engineer reports contractor claiming price escalation. QS needs to review contract clause.",
    type: "Cost Overrun",
    priority: "P2",
    status: "Closed",
    raisedBy: CURRENT_ROLE,
    assignedTo: "Project Coordinator",
    assignedName: "Priya S.",
    project: "Greenfield Tower",
    location: "Structure phase",
    costImpact: "> Rs.10L",
    dueDate: "",
    raisedAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date(Date.now() - 3 * 86400000),
    photo: null,
    comments: [
      { author: "Priya S.",    role: "Project Coordinator", text: "Escalation clause applies as per contract section 18.2. Rate revision submitted to client.", time: new Date(Date.now() - 5 * 86400000) },
      { author: "Arjun Mehta", role: "Quantity Surveyor",   text: "Reviewed contract. Rate revision of 12% approved. BOQ updated accordingly.", time: new Date(Date.now() - 3 * 86400000) },
    ],
    resolution: "Contract escalation clause applied. 12% rate revision approved by client. BOQ revised.",
  },
];

const today = () => new Date().toISOString().slice(0, 10);
const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ═══════════════════════════════════════════════════════════════
export default function Incidents() {
  const [incidents,   setIncidents]  = useState(SEED);
  const [tab,         setTab]        = useState("all");       // all | raised | for-qs | closed
  const [showRaise,   setShowRaise]  = useState(false);
  const [selected,    setSelected]   = useState(null);
  const [toast,       setToast]      = useState(null);
  const [filterStatus,setStatus]     = useState("All");
  const [filterPri,   setFilterPri]  = useState("All");
  const [search,      setSearch]     = useState("");

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── categorised views ──
  const raisedByQS = useMemo(()=> incidents.filter(i => i.raisedBy === CURRENT_ROLE && i.status !== "Closed"), [incidents]);
  const forQS      = useMemo(()=> incidents.filter(i => i.assignedTo === CURRENT_ROLE && i.status !== "Closed"), [incidents]);
  const closed     = useMemo(()=> incidents.filter(i => i.status === "Closed"), [incidents]);

  const visibleList = useMemo(() => {
    let base = tab === "raised" ? raisedByQS
             : tab === "for-qs" ? forQS
             : tab === "closed" ? closed
             : incidents;
    if (filterStatus !== "All") base = base.filter(i => i.status === filterStatus);
    if (filterPri !== "All")    base = base.filter(i => i.priority === filterPri);
    if (search)                 base = base.filter(i =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.assignedTo.toLowerCase().includes(search.toLowerCase())
    );
    return base.sort((a, b) => {
      const po = { P1:0, P2:1, P3:2, P4:3 };
      return (po[a.priority]||0) - (po[b.priority]||0);
    });
  }, [incidents, tab, filterStatus, filterPri, search, raisedByQS, forQS, closed]);

  const stats = {
    total:    incidents.length,
    open:     incidents.filter(i => !["Closed","Resolved"].includes(i.status)).length,
    forMe:    forQS.length,
    p1:       incidents.filter(i => i.priority==="P1" && !["Closed","Resolved"].includes(i.status)).length,
    resolved: incidents.filter(i => ["Resolved","Closed"].includes(i.status)).length,
  };

  // ── actions ──
  const handleRaise   = (newInc)  => { setIncidents(p => [newInc, ...p]); showToast(`${newInc.id} raised and assigned to ${newInc.assignedTo}`); };
  const handleResolve = (id, resolution) => {
    setIncidents(p => p.map(i => i.id===id ? {...i, status:"Resolved", resolution, updatedAt: new Date()} : i));
    if (selected?.id === id) setSelected(s => ({...s, status:"Resolved", resolution}));
    showToast("Incident resolved");
  };
  const handleClose = (id) => {
    setIncidents(p => p.map(i => i.id===id ? {...i, status:"Closed", updatedAt: new Date()} : i));
    if (selected?.id === id) setSelected(s => ({...s, status:"Closed"}));
    showToast("Incident closed");
  };
  const handleAdvance = (id) => {
    setIncidents(p => p.map(i => {
      if (i.id !== id) return i;
      const idx = STATUS_FLOW.indexOf(i.status);
      if (idx >= STATUS_FLOW.length - 1) return i;
      return {...i, status: STATUS_FLOW[idx+1], updatedAt: new Date()};
    }));
    showToast("Status updated");
  };
  const handleAddComment = (id, text) => {
    setIncidents(p => p.map(i => {
      if (i.id !== id) return i;
      return {...i, comments:[...i.comments, {author:"Arjun Mehta", role:CURRENT_ROLE, text, time:new Date()}], updatedAt:new Date()};
    }));
    if (selected?.id === id) setSelected(prev => ({
      ...prev,
      comments:[...prev.comments, {author:"Arjun Mehta", role:CURRENT_ROLE, text, time:new Date()}]
    }));
  };
  const handleStatusChange = (id, newStatus) => {
    setIncidents(p => p.map(i => i.id===id ? {...i, status:newStatus, updatedAt:new Date()} : i));
    if (selected?.id === id) setSelected(s => ({...s, status:newStatus}));
    showToast("Status changed to " + newStatus);
  };

  return (
    <div className="inc-page">
      {toast && <div className={`inc-toast inc-toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── HEADER ── */}
      <div className="inc-header">
        <div>
          <h1>Incident Management</h1>
          <p>Greenfield Tower — Quantity Surveyor view · Raise, assign and resolve project incidents</p>
        </div>
        <button className="inc-raise-btn" onClick={() => setShowRaise(true)}>
          <span>+</span> Raise Incident
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="inc-stats-row">
        <div className="inc-stat-card inc-stat--total" onClick={() => setTab("all")}>
          <div className="inc-stat-val">{stats.total}</div>
          <div className="inc-stat-lbl">Total</div>
        </div>
        <div className="inc-stat-card inc-stat--open" onClick={() => { setTab("all"); setStatus("Open"); }}>
          <div className="inc-stat-val">{stats.open}</div>
          <div className="inc-stat-lbl">Open</div>
        </div>
        <div className="inc-stat-card inc-stat--forme" onClick={() => setTab("for-qs")}>
          <div className="inc-stat-val">{stats.forMe}</div>
          <div className="inc-stat-lbl">For Me to Resolve</div>
          {stats.forMe > 0 && <span className="inc-stat-badge">{stats.forMe}</span>}
        </div>
        <div className="inc-stat-card inc-stat--p1">
          <div className="inc-stat-val">{stats.p1}</div>
          <div className="inc-stat-lbl">P1 Critical</div>
        </div>
        <div className="inc-stat-card inc-stat--resolved">
          <div className="inc-stat-val">{stats.resolved}</div>
          <div className="inc-stat-lbl">Resolved / Closed</div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="inc-tabs">
        {[
          { id:"all",     label:`All Incidents (${incidents.length})`         },
          { id:"raised",  label:`Raised by Me (${raisedByQS.length})`         },
          { id:"for-qs",  label:`For QS to Resolve (${forQS.length})`, dot: forQS.length > 0 },
          { id:"closed",  label:`Closed (${closed.length})`                   },
        ].map(t => (
          <button key={t.id} className={`inc-tab${tab===t.id?" active":""}`} onClick={() => { setTab(t.id); setStatus("All"); setFilterPri("All"); setSearch(""); }}>
            {t.label}
            {t.dot && <span className="inc-tab-dot" />}
          </button>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="inc-toolbar">
        <input className="inc-search" placeholder="Search incidents, ID, assignee..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="inc-filter-group">
          <select className="inc-select" value={filterStatus} onChange={e => setStatus(e.target.value)}>
            <option value="All">All Status</option>
            {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="inc-select" value={filterPri} onChange={e => setFilterPri(e.target.value)}>
            <option value="All">All Priority</option>
            {Object.keys(PRIORITY_META).map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className={`inc-layout${selected ? " inc-layout--split" : ""}`}>

        {/* LIST */}
        <div className="inc-list">
          {visibleList.length === 0 && (
            <div className="inc-empty">
              <div className="inc-empty-icon">✓</div>
              <div className="inc-empty-msg">No incidents here</div>
              <div className="inc-empty-sub">
                {tab === "for-qs" ? "No incidents assigned to you" : "Try adjusting filters"}
              </div>
            </div>
          )}

          {visibleList.map(inc => {
            const pm = PRIORITY_META[inc.priority];
            const sm = STATUS_META[inc.status] || STATUS_META["Open"];
            const isMyRaise   = inc.raisedBy === CURRENT_ROLE;
            const isForMe     = inc.assignedTo === CURRENT_ROLE;
            const isSel       = selected?.id === inc.id;
            const resolver    = RESOLVER_ROLES.find(r => r.role === inc.assignedTo);

            return (
              <div
                key={inc.id}
                className={`inc-card${isSel ? " inc-card--selected" : ""}${isForMe ? " inc-card--forme" : ""}`}
                onClick={() => setSelected(isSel ? null : inc)}
              >
                <div className="inc-card-top">
                  <div className="inc-card-left">
                    <span className="inc-pri-dot" style={{ background: pm.color }} />
                    <span className="inc-id">{inc.id}</span>
                    <span className="inc-pri-tag" style={{ color: pm.color, background: pm.bg, borderColor: pm.bd }}>
                      {inc.priority}
                    </span>
                    {isForMe && <span className="inc-forme-tag">For QS</span>}
                    {isMyRaise && !isForMe && <span className="inc-myraise-tag">Raised by me</span>}
                  </div>
                  <div className="inc-card-right">
                    <span className={`inc-status-chip ${sm.cls}`}>{sm.label}</span>
                    <span className="inc-chevron">{isSel ? "▲" : "▼"}</span>
                  </div>
                </div>

                <div className="inc-card-title">{inc.title}</div>

                <div className="inc-card-meta">
                  <span className="inc-meta-item">
                    <span className="inc-meta-icon">◻</span>
                    {inc.type}
                  </span>
                  <span className="inc-meta-item">
                    <span className="inc-meta-icon">◎</span>
                    <span className="inc-assignee-wrap">
                      {resolver && (
                        <span className="inc-avatar-sm" style={{ background: resolver.color }}>
                          {resolver.avatar}
                        </span>
                      )}
                      {inc.assignedName}
                    </span>
                  </span>
                  <span className="inc-meta-item">
                    <span className="inc-meta-icon">◐</span>
                    {timeAgo(inc.raisedAt)}
                  </span>
                  {inc.location && (
                    <span className="inc-meta-item">
                      <span className="inc-meta-icon">◉</span>
                      {inc.location}
                    </span>
                  )}
                </div>

                {inc.comments.length > 0 && (
                  <div className="inc-card-latest">
                    <span className="inc-latest-author">{inc.comments[inc.comments.length-1].author}:</span>
                    {" "}{inc.comments[inc.comments.length-1].text.slice(0,80)}{inc.comments[inc.comments.length-1].text.length>80?"...":""}
                  </div>
                )}

                {/* Quick actions on card */}
                <div className="inc-card-actions" onClick={e => e.stopPropagation()}>
                  {isForMe && !["Resolved","Closed"].includes(inc.status) && (
                    <button className="inc-btn inc-btn--resolve" onClick={() => setSelected(inc)}>
                      Resolve This
                    </button>
                  )}
                  {isMyRaise && inc.status === "Resolved" && (
                    <button className="inc-btn inc-btn--close" onClick={() => handleClose(inc.id)}>
                      Close Incident
                    </button>
                  )}
                  {!["Resolved","Closed"].includes(inc.status) && (
                    <button className="inc-btn inc-btn--next" onClick={() => handleAdvance(inc.id)}>
                      Advance Status
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* DETAIL PANEL */}
        {selected && (
          <IncidentDetailPanel
            incident={selected}
            onClose={() => setSelected(null)}
            onResolve={handleResolve}
            onCloseInc={handleClose}
            onAddComment={handleAddComment}
            onStatusChange={handleStatusChange}
            onAdvance={handleAdvance}
            showToast={showToast}
          />
        )}
      </div>

      {/* RAISE MODAL */}
      {showRaise && (
        <RaiseIncidentModal
          incidents={incidents}
          onRaise={handleRaise}
          onClose={() => setShowRaise(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DETAIL PANEL
// ═══════════════════════════════════════════════════════════════
function IncidentDetailPanel({ incident, onClose, onResolve, onCloseInc, onAddComment, onStatusChange, onAdvance, showToast }) {
  const [commentText, setCommentText]     = useState("");
  const [resolutionText, setResolution]   = useState(incident.resolution || "");
  const [showResolveForm, setShowResolve] = useState(false);
  const [activeTab, setActiveTab]         = useState("details"); // details | comments | timeline

  const pm         = PRIORITY_META[incident.priority];
  const sm         = STATUS_META[incident.status] || STATUS_META["Open"];
  const isForMe    = incident.assignedTo === CURRENT_ROLE;
  const isMyRaise  = incident.raisedBy   === CURRENT_ROLE;
  const resolver   = RESOLVER_ROLES.find(r => r.role === incident.assignedTo);
  const raiser     = RESOLVER_ROLES.find(r => r.role === incident.raisedBy) || { avatar:"?", color:"#64748b" };
  const canResolve = isForMe && !["Resolved","Closed"].includes(incident.status);
  const canClose   = isMyRaise && incident.status === "Resolved";

  const progressSteps = ["Open","Assigned","In Progress","Resolved","Closed"];
  const stepIdx = progressSteps.indexOf(incident.status);

  const submitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(incident.id, commentText);
    setCommentText("");
  };

  const submitResolution = () => {
    if (!resolutionText.trim()) { showToast("Enter resolution notes","err"); return; }
    onResolve(incident.id, resolutionText);
    setShowResolve(false);
  };

  return (
    <div className="inc-detail">
      {/* Panel header */}
      <div className="inc-detail-hdr">
        <div className="inc-detail-hdr-top">
          <div className="inc-detail-id-row">
            <span className="inc-id" style={{ fontSize:12 }}>{incident.id}</span>
            <span className={`inc-status-chip ${sm.cls}`}>{sm.label}</span>
            <span className="inc-pri-tag" style={{ color:pm.color, background:pm.bg, borderColor:pm.bd }}>{incident.priority}</span>
          </div>
          <button className="inc-detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="inc-detail-title">{incident.title}</div>
        <div className="inc-detail-type">{incident.type}</div>
      </div>

      {/* Progress bar */}
      <div className="inc-progress-wrap">
        {progressSteps.map((step, i) => (
          <div key={step} className={`inc-step${i <= stepIdx ? " inc-step--done" : ""}`}>
            <div className="inc-step-dot">{i < stepIdx ? "✓" : i === stepIdx ? "●" : ""}</div>
            <div className="inc-step-label">{step}</div>
            {i < progressSteps.length - 1 && <div className={`inc-step-line${i < stepIdx ? " inc-step-line--done" : ""}`} />}
          </div>
        ))}
      </div>

      {/* Role banners */}
      {isForMe && !["Resolved","Closed"].includes(incident.status) && (
        <div className="inc-role-banner inc-role-banner--forme">
          <span className="inc-role-banner-icon">◈</span>
          <div>
            <div className="inc-role-banner-title">This incident is assigned to you</div>
            <div className="inc-role-banner-sub">As Quantity Surveyor, you are responsible for resolving this</div>
          </div>
          {!showResolveForm && (
            <button className="inc-btn inc-btn--resolve" onClick={() => setShowResolve(true)}>
              Mark Resolved
            </button>
          )}
        </div>
      )}
      {isMyRaise && !isForMe && (
        <div className="inc-role-banner inc-role-banner--raised">
          <span className="inc-role-banner-icon">↗</span>
          <div>
            <div className="inc-role-banner-title">You raised this incident</div>
            <div className="inc-role-banner-sub">Assigned to {incident.assignedName} ({incident.assignedTo}) for resolution</div>
          </div>
          {incident.status === "Resolved" && (
            <button className="inc-btn inc-btn--close" onClick={() => onCloseInc(incident.id)}>Close Incident</button>
          )}
        </div>
      )}

      {/* Tab nav */}
      <div className="inc-detail-tabs">
        {["details","comments","timeline"].map(t => (
          <button key={t} className={`inc-detail-tab${activeTab===t?" active":""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==="comments" && incident.comments.length > 0 && (
              <span className="inc-tab-count">{incident.comments.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="inc-detail-body">

        {/* ── DETAILS TAB ── */}
        {activeTab === "details" && (
          <div className="inc-details-tab">
            {incident.description && (
              <div className="inc-desc-block">
                <div className="inc-block-label">Description</div>
                <div className="inc-desc-text">{incident.description}</div>
              </div>
            )}

            <div className="inc-meta-grid">
              <MetaField label="Raised By">
                <div className="inc-person-row">
                  <span className="inc-avatar-sm" style={{ background: raiser.color }}>{raiser.avatar}</span>
                  {incident.raisedBy}
                </div>
              </MetaField>
              <MetaField label="Assigned To">
                {resolver ? (
                  <div className="inc-person-row">
                    <span className="inc-avatar-sm" style={{ background: resolver.color }}>{resolver.avatar}</span>
                    <div>
                      <div>{incident.assignedName}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{resolver.department}</div>
                    </div>
                  </div>
                ) : incident.assignedTo}
              </MetaField>
              <MetaField label="Priority">
                <span className="inc-pri-tag" style={{ color:pm.color, background:pm.bg, borderColor:pm.bd }}>
                  {pm.label}
                </span>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>SLA: {pm.sla}</div>
              </MetaField>
              <MetaField label="Status">
                <span className={`inc-status-chip ${sm.cls}`}>{sm.label}</span>
              </MetaField>
              <MetaField label="Project">{incident.project || "—"}</MetaField>
              <MetaField label="Location">{incident.location || "—"}</MetaField>
              <MetaField label="Cost Impact">
                <span className="inc-cost-tag">{incident.costImpact || "Not assessed"}</span>
              </MetaField>
              <MetaField label="Raised At">{timeAgo(incident.raisedAt)}</MetaField>
              <MetaField label="Last Updated">{timeAgo(incident.updatedAt)}</MetaField>
            </div>

            {/* Resolution notes (if resolved) */}
            {incident.resolution && (
              <div className="inc-resolution-block">
                <div className="inc-block-label inc-block-label--green">Resolution</div>
                <div className="inc-resolution-text">{incident.resolution}</div>
              </div>
            )}

            {/* Resolve form */}
            {showResolveForm && (
              <div className="inc-resolve-form">
                <div className="inc-block-label">Resolution Notes *</div>
                <textarea
                  className="inc-textarea"
                  rows={4}
                  placeholder="Describe how this was resolved — actions taken, outcome, any follow-up..."
                  value={resolutionText}
                  onChange={e => setResolution(e.target.value)}
                />
                <div className="inc-resolve-form-actions">
                  <button className="inc-btn inc-btn--outline" onClick={() => setShowResolve(false)}>Cancel</button>
                  <button className="inc-btn inc-btn--resolve" onClick={submitResolution}>Submit Resolution</button>
                </div>
              </div>
            )}

            {/* Status actions */}
            {!["Resolved","Closed"].includes(incident.status) && (
              <div className="inc-status-actions">
                <div className="inc-block-label">Change Status</div>
                <div className="inc-status-btns">
                  {STATUS_FLOW.filter(s => s !== incident.status && s !== "Closed").map(s => (
                    <button key={s} className="inc-btn inc-btn--status" onClick={() => onStatusChange(incident.id, s)}>
                      {STATUS_META[s]?.label || s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMMENTS TAB ── */}
        {activeTab === "comments" && (
          <div className="inc-comments-tab">
            <div className="inc-comments-list">
              {incident.comments.length === 0 && (
                <div className="inc-no-comments">No comments yet. Be the first to add one.</div>
              )}
              {incident.comments.map((c, i) => {
                const cr = RESOLVER_ROLES.find(r => r.role === c.role);
                return (
                  <div key={i} className={`inc-comment${c.role === CURRENT_ROLE ? " inc-comment--mine" : ""}`}>
                    <div className="inc-comment-avatar" style={{ background: cr?.color || "#64748b" }}>
                      {cr?.avatar || c.author.slice(0,2).toUpperCase()}
                    </div>
                    <div className="inc-comment-body">
                      <div className="inc-comment-meta">
                        <span className="inc-comment-author">{c.author}</span>
                        <span className="inc-comment-role">{c.role}</span>
                        <span className="inc-comment-time">{timeAgo(c.time)}</span>
                      </div>
                      <div className="inc-comment-text">{c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add comment */}
            {!["Closed"].includes(incident.status) && (
              <div className="inc-add-comment">
                <div className="inc-comment-avatar" style={{ background:"#b45309" }}>QS</div>
                <div className="inc-comment-input-wrap">
                  <textarea
                    className="inc-textarea inc-textarea--sm"
                    rows={2}
                    placeholder="Add a comment or update..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter" && e.ctrlKey) submitComment(); }}
                  />
                  <div className="inc-comment-input-footer">
                    <span className="inc-dim">Ctrl+Enter to send</span>
                    <button className="inc-btn inc-btn--primary" onClick={submitComment} disabled={!commentText.trim()}>
                      Send Comment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === "timeline" && (
          <div className="inc-timeline-tab">
            <div className="inc-timeline">
              <TimelineItem icon="✦" color="#2563eb" label="Incident Raised" sub={`by ${incident.raisedBy}`} time={timeAgo(incident.raisedAt)} />
              {incident.status !== "Open" && <TimelineItem icon="◎" color="#7c3aed" label="Assigned" sub={`to ${incident.assignedName} (${incident.assignedTo})`} time="" />}
              {["In Progress","Resolved","Closed"].includes(incident.status) && <TimelineItem icon="◐" color="#f59e0b" label="In Progress" sub="Work started on resolution" time="" />}
              {["Resolved","Closed"].includes(incident.status) && <TimelineItem icon="✔" color="#16a34a" label="Resolved" sub={incident.resolution ? incident.resolution.slice(0,60)+"..." : ""} time={timeAgo(incident.updatedAt)} />}
              {incident.status === "Closed" && <TimelineItem icon="■" color="#64748b" label="Closed" sub="Incident closed by QS" time={timeAgo(incident.updatedAt)} />}
              {incident.comments.map((c,i) => (
                <TimelineItem key={i} icon="✉" color="#64748b" label={c.author} sub={c.text.slice(0,70)} time={timeAgo(c.time)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RAISE INCIDENT MODAL
// ═══════════════════════════════════════════════════════════════
function RaiseIncidentModal({ incidents, onRaise, onClose }) {
  const EMPTY = {
    title: "", description: "", type: INCIDENT_TYPES[0],
    priority: "P2", assignedTo: "Site Engineer", assignedName: "",
    project: "Greenfield Tower", location: "", costImpact: "Not assessed yet",
    dueDate: "",
  };
  const [form,    setForm]    = useState(EMPTY);
  const [step,    setStep]    = useState(1); // 1=details, 2=assign
  const [errors,  setErrors]  = useState({});
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedResolver = RESOLVER_ROLES.find(r => r.role === form.assignedTo);

  const validate1 = () => {
    const e = {};
    if (!form.title.trim())       e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { setErrors({title:"Required"}); return; }
    const newInc = {
      id:          `INC-${String(incidents.length + 1).padStart(3, "0")}`,
      ...form,
      raisedBy:    CURRENT_ROLE,
      assignedName:form.assignedName.trim() || form.assignedTo,
      status:      "Open",
      raisedAt:    new Date(),
      updatedAt:   new Date(),
      photo:       null,
      comments:    [],
      resolution:  "",
    };
    onRaise(newInc);
    onClose();
  };

  return (
    <div className="inc-overlay" onClick={onClose}>
      <div className="inc-modal" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="inc-modal-hdr">
          <div>
            <div className="inc-modal-title">Raise New Incident</div>
            <div className="inc-modal-sub">Step {step} of 2 — {step===1?"Incident Details":"Assign & Prioritise"}</div>
          </div>
          <button className="inc-detail-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="inc-step-indicator">
          <div className={`inc-step-ind${step>=1?" active":""}`}>
            <span>1</span> Details
          </div>
          <div className="inc-step-ind-line" />
          <div className={`inc-step-ind${step>=2?" active":""}`}>
            <span>2</span> Assign
          </div>
        </div>

        <div className="inc-modal-body">

          {step === 1 && (
            <div className="inc-form-step">
              <div className="inc-form-field">
                <label className="inc-label">Incident Title *</label>
                <input
                  className={`inc-input${errors.title?" inc-input--err":""}`}
                  placeholder="Brief title describing the incident..."
                  value={form.title}
                  onChange={e => sf("title", e.target.value)}
                />
                {errors.title && <span className="inc-err-msg">{errors.title}</span>}
              </div>

              <div className="inc-form-field">
                <label className="inc-label">Description *</label>
                <textarea
                  className={`inc-textarea${errors.description?" inc-input--err":""}`}
                  rows={4}
                  placeholder="Describe the incident in detail — what happened, where, what impact..."
                  value={form.description}
                  onChange={e => sf("description", e.target.value)}
                />
                {errors.description && <span className="inc-err-msg">{errors.description}</span>}
              </div>

              <div className="inc-form-row">
                <div className="inc-form-field">
                  <label className="inc-label">Incident Type</label>
                  <select className="inc-input" value={form.type} onChange={e => sf("type", e.target.value)}>
                    {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="inc-form-field">
                  <label className="inc-label">Project</label>
                  <select className="inc-input" value={form.project} onChange={e => sf("project", e.target.value)}>
                    {["Greenfield Tower","Mall Project","Hospital Block","Villa Complex"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="inc-form-row">
                <div className="inc-form-field">
                  <label className="inc-label">Location on Site</label>
                  <input className="inc-input" placeholder="e.g. Block B, Level 3..." value={form.location} onChange={e => sf("location", e.target.value)} />
                </div>
                <div className="inc-form-field">
                  <label className="inc-label">Estimated Cost Impact</label>
                  <select className="inc-input" value={form.costImpact} onChange={e => sf("costImpact", e.target.value)}>
                    {COST_IMPACTS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="inc-form-step">
              {/* Priority selector */}
              <div className="inc-form-field">
                <label className="inc-label">Priority Level *</label>
                <div className="inc-priority-cards">
                  {Object.entries(PRIORITY_META).map(([key, pm]) => (
                    <div
                      key={key}
                      className={`inc-pri-card${form.priority===key?" selected":""}`}
                      style={form.priority===key ? { borderColor:pm.color, background:pm.bg } : {}}
                      onClick={() => sf("priority", key)}
                    >
                      <div className="inc-pri-card-key" style={{ color:pm.color }}>{key}</div>
                      <div className="inc-pri-card-label">{pm.label.replace(key+" — ","")}</div>
                      <div className="inc-pri-card-sla">SLA: {pm.sla}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assign to role */}
              <div className="inc-form-field">
                <label className="inc-label">Assign to Role *</label>
                <div className="inc-role-grid">
                  {RESOLVER_ROLES.filter(r => r.role !== CURRENT_ROLE).map(r => (
                    <div
                      key={r.role}
                      className={`inc-role-card${form.assignedTo===r.role?" selected":""}`}
                      onClick={() => sf("assignedTo", r.role)}
                    >
                      <div className="inc-role-card-avatar" style={{ background: r.color }}>{r.avatar}</div>
                      <div className="inc-role-card-body">
                        <div className="inc-role-card-name">{r.role}</div>
                        <div className="inc-role-card-dept">{r.department}</div>
                      </div>
                      {form.assignedTo === r.role && <span className="inc-role-card-tick">✓</span>}
                    </div>
                  ))}
                  {/* Self assign option */}
                  <div
                    className={`inc-role-card${form.assignedTo===CURRENT_ROLE?" selected":""}`}
                    onClick={() => sf("assignedTo", CURRENT_ROLE)}
                  >
                    <div className="inc-role-card-avatar" style={{ background:"#b45309" }}>QS</div>
                    <div className="inc-role-card-body">
                      <div className="inc-role-card-name">Quantity Surveyor</div>
                      <div className="inc-role-card-dept">Self-assign</div>
                    </div>
                    {form.assignedTo === CURRENT_ROLE && <span className="inc-role-card-tick">✓</span>}
                  </div>
                </div>
              </div>

              {/* Assignee name */}
              <div className="inc-form-row">
                <div className="inc-form-field">
                  <label className="inc-label">Assignee Name (optional)</label>
                  <input className="inc-input" placeholder={`Name of the ${form.assignedTo}`} value={form.assignedName} onChange={e => sf("assignedName", e.target.value)} />
                </div>
                <div className="inc-form-field">
                  <label className="inc-label">Due Date (optional)</label>
                  <input className="inc-input" type="date" value={form.dueDate} onChange={e => sf("dueDate", e.target.value)} />
                </div>
              </div>

              {/* Preview */}
              {selectedResolver && (
                <div className="inc-assign-preview">
                  <div className="inc-assign-preview-avatar" style={{ background: selectedResolver.color }}>
                    {selectedResolver.avatar}
                  </div>
                  <div>
                    <div className="inc-assign-preview-name">
                      Sending to: <strong>{form.assignedName || form.assignedTo}</strong>
                    </div>
                    <div className="inc-assign-preview-dept">
                      {selectedResolver.department} · SLA: {PRIORITY_META[form.priority]?.sla}
                    </div>
                  </div>
                  <span className="inc-pri-tag" style={{ color:PRIORITY_META[form.priority]?.color, background:PRIORITY_META[form.priority]?.bg, borderColor:PRIORITY_META[form.priority]?.bd }}>
                    {form.priority}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="inc-modal-footer">
          {step === 1 ? (
            <>
              <button className="inc-btn inc-btn--outline" onClick={onClose}>Cancel</button>
              <button className="inc-btn inc-btn--primary" onClick={() => { if(validate1()) setStep(2); }}>
                Next: Assign →
              </button>
            </>
          ) : (
            <>
              <button className="inc-btn inc-btn--outline" onClick={() => setStep(1)}>← Back</button>
              <button className="inc-btn inc-btn--raise" onClick={handleSubmit}>
                Raise & Send Incident
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── small shared components ──────────────────────────────────
function MetaField({ label, children }) {
  return (
    <div className="inc-meta-field">
      <div className="inc-meta-lbl">{label}</div>
      <div className="inc-meta-val">{children}</div>
    </div>
  );
}
function TimelineItem({ icon, color, label, sub, time }) {
  return (
    <div className="inc-tl-item">
      <div className="inc-tl-icon" style={{ background: color }}>{icon}</div>
      <div className="inc-tl-body">
        <div className="inc-tl-label">{label}{time && <span className="inc-tl-time">{time}</span>}</div>
        {sub && <div className="inc-tl-sub">{sub}</div>}
      </div>
    </div>
  );
}