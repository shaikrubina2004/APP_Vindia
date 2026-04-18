import { useNavigate } from "react-router-dom";
import "./QuantitySurveyorDashboard.css";

const STATS = [
  { label: "BOQ Items",    val: "12",        sub: "across 4 milestones",   icon: "📋", color: "blue" },
  { label: "Planned Cost", val: "₹1.84 Cr",  sub: "total project value",   icon: "💰", color: "green" },
  { label: "Actual Spent", val: "₹62.4 L",   sub: "34% of planned",        icon: "📊", color: "purple" },
  { label: "Avg Progress", val: "38%",        sub: "across all work items",  icon: "📈", color: "orange" },
];
const RECENT = [
  { id:1, date:"2026-04-14", project:"Tower A",      activity:"Footing casting Grid C1-C4",    status:"on-track", progress:72 },
  { id:2, date:"2026-04-14", project:"Mall Project",  activity:"Column casting Lvl 3",          status:"delayed",  progress:45 },
  { id:3, date:"2026-04-13", project:"Hospital Block",activity:"Plumbing rough-in Wing C",      status:"critical", progress:29 },
  { id:4, date:"2026-04-13", project:"Villa Complex", activity:"Internal plastering Unit 3A",   status:"ahead",    progress:88 },
];
const MILESTONES = [
  { name:"Foundation", planned:2716000, actual:2352800, pct:87 },
  { name:"Structure",  planned:4444000, actual:1897200, pct:43 },
  { name:"Finishing",  planned:1160400, actual:0,       pct:0  },
  { name:"MEP",        planned:580000,  actual:168800,  pct:29 },
];
const SM = {
  "on-track":{ label:"On Track", cls:"qs-badge--green"  },
  "delayed": { label:"Delayed",  cls:"qs-badge--yellow" },
  "critical":{ label:"Critical", cls:"qs-badge--red"    },
  "ahead":   { label:"Ahead",    cls:"qs-badge--blue"   },
};
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
const progColor = (p) => p>=80?"#16a34a":p>=40?"#2563eb":"#d97706";

export default function QuantitySurveyorDashboard() {
  const nav = useNavigate();
  return (
    <div className="qsd-page">
      <div className="qsd-header">
        <div>
          <div className="qsd-eyebrow">Construction Management</div>
          <h1 className="qsd-title">QS Dashboard</h1>
          <p className="qsd-sub">Quantity Surveyor — Cost, Quantity & Reporting Overview</p>
        </div>
        <button className="qsd-btn-primary" onClick={()=>nav("/quantity-surveyor/daily-updates")}>+ New Daily Update</button>
      </div>

      <div className="qsd-stats-grid">
        {STATS.map(s=>(
          <div key={s.label} className={`qsd-stat-card qsd-stat--${s.color}`}>
            <div className="qsd-stat-icon">{s.icon}</div>
            <div>
              <div className="qsd-stat-val">{s.val}</div>
              <div className="qsd-stat-label">{s.label}</div>
              <div className="qsd-stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="qsd-main-grid">
        <div className="qsd-card">
          <div className="qsd-card-header">
            <div className="qsd-card-title">Recent Daily Updates</div>
            <button className="qsd-link-btn" onClick={()=>nav("/quantity-surveyor/submissions")}>View all →</button>
          </div>
          <div className="qsd-update-list">
            {RECENT.map(u=>(
              <div key={u.id} className="qsd-update-row">
                <div className="qsd-update-left">
                  <div className="qsd-update-project">{u.project}</div>
                  <div className="qsd-update-activity">{u.activity}</div>
                  <div className="qsd-update-date">{u.date}</div>
                </div>
                <div className="qsd-update-right">
                  <span className={`qs-badge ${SM[u.status].cls}`}>{SM[u.status].label}</span>
                  <div className="qsd-mini-prog">
                    <div className="qsd-mini-prog-bar">
                      <div className="qsd-mini-prog-fill" style={{width:`${u.progress}%`,background:progColor(u.progress)}} />
                    </div>
                    <span>{u.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="qsd-card">
          <div className="qsd-card-header">
            <div className="qsd-card-title">Milestone Cost Summary</div>
            <button className="qsd-link-btn" onClick={()=>nav("/quantity-surveyor/cost-report")}>Full report →</button>
          </div>
          <div className="qsd-ms-list">
            {MILESTONES.map(m=>(
              <div key={m.name} className="qsd-ms-row">
                <div className="qsd-ms-name">{m.name}</div>
                <div className="qsd-ms-bar-wrap">
                  <div className="qsd-ms-bar"><div className="qsd-ms-fill" style={{width:`${m.pct}%`}} /></div>
                  <span className="qsd-ms-pct">{m.pct}%</span>
                </div>
                <div className="qsd-ms-nums">
                  <span className="qsd-ms-planned">{fmt(m.planned)}</span>
                  <span className="qsd-ms-actual">{fmt(m.actual)} actual</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="qsd-card qsd-actions-card">
        <div className="qsd-card-title" style={{marginBottom:16}}>Quick Actions</div>
        <div className="qsd-actions-grid">
          {[
            {label:"New Daily Update",   icon:"✏️", path:"/quantity-surveyor/daily-updates",  color:"blue"},
            {label:"Manage BOQ",         icon:"📊", path:"/quantity-surveyor/boq",              color:"green"},
            {label:"Quantity Report",    icon:"📐", path:"/quantity-surveyor/quantity-report",  color:"purple"},
            {label:"Cost Report",        icon:"💰", path:"/quantity-surveyor/cost-report",      color:"orange"},
            {label:"View Submissions",   icon:"📁", path:"/quantity-surveyor/submissions",      color:"teal"},
          ].map(a=>(
            <button key={a.label} className={`qsd-action-btn qsd-action--${a.color}`} onClick={()=>nav(a.path)}>
              <span className="qsd-action-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="qsd-card">
        <div className="qsd-card-header">
          <div className="qsd-card-title">Input Sources</div>
          <div className="qsd-card-sub">Data received from site roles</div>
        </div>
        <div className="qsd-roles-grid">
          {[
            {role:"Architect",           icon:"🏛",tag:"Design Data",  count:14,color:"blue"},
            {role:"Structural Engineer", icon:"🏗",tag:"Qty Data",     count:22,color:"green"},
            {role:"MEP Engineer",        icon:"⚡",tag:"Systems Data", count:18,color:"purple"},
            {role:"Site Engineer",       icon:"🦺",tag:"Progress",     count:45,color:"orange"},
            {role:"Planning Engineer",   icon:"📅",tag:"Schedule",     count:11,color:"teal"},
            {role:"Safety Officer",      icon:"⛑️",tag:"Safety Data",  count:8, color:"red"},
            {role:"Quality Checker",     icon:"✅",tag:"QC Reports",   count:7, color:"indigo"},
            {role:"Project Coordinator", icon:"📋",tag:"Status",       count:9, color:"teal"},
          ].map(r=>(
            <div key={r.role} className={`qsd-role-chip qsd-role--${r.color}`}>
              <span className="qsd-role-icon">{r.icon}</span>
              <div>
                <div className="qsd-role-name">{r.role}</div>
                <div className="qsd-role-tag">{r.tag} · {r.count} inputs</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}