import { useState, useEffect, useRef } from "react";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   PROJECT SWITCHER
═══════════════════════════════════════ */
const PROJECTS = [
  {
    id: "p1",
    code: "VIN-001",
    name: "VIndia Tower Block A",
    location: "Bengaluru",
  },
  {
    id: "p2",
    code: "VIN-002",
    name: "VIndia Commercial Hub",
    location: "Hyderabad",
  },
  {
    id: "p3",
    code: "VIN-003",
    name: "VIndia Residential Phase 2",
    location: "Chennai",
  },
];

function ProjectSwitcher({ active, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="project-switcher-wrap" ref={ref}>
      <button
        className="project-switcher-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="ps-icon">🏗️</div>
        <div className="ps-info">
          <span className="ps-code">{active.code}</span>
          <span className="ps-name">{active.name}</span>
        </div>
        <svg
          className={`ps-chevron${open ? " open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ps-dropdown">
          <div className="ps-dropdown-label">Switch Project</div>
          {PROJECTS.map((p) => (
            <div
              key={p.id}
              className={`ps-option${p.id === active.id ? " active" : ""}`}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              <div className="ps-option-top">
                <span className="ps-option-code">{p.code}</span>
                {p.id === active.id && <span className="ps-active-dot" />}
              </div>
              <div className="ps-option-name">{p.name}</div>
              <div className="ps-option-meta">{p.location}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MILESTONE DATA  (per project)
   In production these come from your API
   calculated from daily log submissions
═══════════════════════════════════════ */
const MILESTONE_DATA = {
  p1: {
    M: [
      { floor: "Basement", pct: 100, status: "done" },
      { floor: "Ground Floor", pct: 100, status: "done" },
      { floor: "Level 1", pct: 85, status: "inprog" },
      { floor: "Level 2", pct: 68, status: "inprog" },
      { floor: "Level 3", pct: 30, status: "inprog" },
      { floor: "Rooftop", pct: 0, status: "notstart" },
    ],
    E: [
      { floor: "Basement", pct: 100, status: "done" },
      { floor: "Ground Floor", pct: 90, status: "inprog" },
      { floor: "Level 1", pct: 60, status: "inprog" },
      { floor: "Level 2", pct: 40, status: "inprog" },
      { floor: "Level 3", pct: 0, status: "notstart" },
      { floor: "Rooftop", pct: 0, status: "notstart" },
    ],
    P: [
      { floor: "Basement", pct: 100, status: "done" },
      { floor: "Ground Floor", pct: 100, status: "done" },
      { floor: "Level 1", pct: 95, status: "inprog" },
      { floor: "Level 2", pct: 74, status: "inprog" },
      { floor: "Level 3", pct: 20, status: "inprog" },
      { floor: "Rooftop", pct: 0, status: "notstart" },
    ],
  },
  p2: {
    M: [
      { floor: "Ground Floor", pct: 60, status: "inprog" },
      { floor: "Level 1", pct: 20, status: "inprog" },
      { floor: "Level 2", pct: 0, status: "notstart" },
    ],
    E: [
      { floor: "Ground Floor", pct: 45, status: "inprog" },
      { floor: "Level 1", pct: 10, status: "inprog" },
      { floor: "Level 2", pct: 0, status: "notstart" },
    ],
    P: [
      { floor: "Ground Floor", pct: 70, status: "inprog" },
      { floor: "Level 1", pct: 30, status: "inprog" },
      { floor: "Level 2", pct: 0, status: "notstart" },
    ],
  },
  p3: {
    M: [{ floor: "Ground Floor", pct: 10, status: "inprog" }],
    E: [{ floor: "Ground Floor", pct: 5, status: "inprog" }],
    P: [{ floor: "Ground Floor", pct: 15, status: "inprog" }],
  },
};

const DISC_META = {
  M: { label: "🔧 Mechanical", barCls: "mf-bar-m" },
  E: { label: "⚡ Electrical", barCls: "mf-bar-e" },
  P: { label: "🚿 Plumbing", barCls: "mf-bar-p" },
};

const STATUS_LABEL = {
  done: "Complete",
  inprog: "In Progress",
  notstart: "Not Started",
};
const STATUS_CLS = {
  done: "ms-done",
  inprog: "ms-inprog",
  notstart: "ms-notstart",
};

function calcOverall(floors) {
  if (!floors || !floors.length) return 0;
  return Math.round(floors.reduce((s, f) => s + f.pct, 0) / floors.length);
}

/* ═══════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════ */
const ACTIVITY = [
  {
    dot: "ad-blue",
    text: (
      <>
        <strong>Plumbing-Rev3.dwg</strong> uploaded to Version Control
      </>
    ),
    time: "Today · 10:32 AM",
  },
  {
    dot: "ad-red",
    text: (
      <>
        <strong>#INC-041</strong> raised — Structural clash Level 3
      </>
    ),
    time: "Today · 09:15 AM",
  },
  {
    dot: "ad-amber",
    text: (
      <>
        Coordination note sent to <strong>Architect</strong>
      </>
    ),
    time: "Yesterday · 5:40 PM",
  },
  {
    dot: "ad-green",
    text: <>Daily log posted — Drainage Floor 2 completed</>,
    time: "Yesterday · 5:00 PM",
  },
  {
    dot: "ad-blue",
    text: (
      <>
        <strong>HVAC-Layout-Rev2.dwg</strong> uploaded
      </>
    ),
    time: "2 days ago · 3:15 PM",
  },
];

const ALERTS = [
  {
    dot: "ad-amber",
    text: (
      <>
        <strong>Structural</strong> uploaded new Beam Layout — check MEP clash
      </>
    ),
    time: "Today · 11:00 AM",
  },
  {
    dot: "ad-blue",
    text: (
      <>
        <strong>Architect</strong> updated Floor Plan Rev4 — re-routing may be
        needed
      </>
    ),
    time: "Today · 08:45 AM",
  },
  {
    dot: "ad-green",
    text: <>Project Coordinator approved MEP schedule for Level 2</>,
    time: "Yesterday · 4:00 PM",
  },
  {
    dot: "ad-red",
    text: (
      <>
        <strong>Reminder:</strong> Daily Log not yet submitted today
      </>
    ),
    time: "Today · now",
  },
];

const INCIDENTS = [
  {
    id: "#INC-041",
    title: "Plumbing clash with Structural beam — Level 3",
    team: "Structural",
    tb: "badge-purple",
    pri: "High",
    pb: "badge-red",
    status: "Open",
    sb: "pill-open",
    date: "Today · 09:15",
  },
  {
    id: "#INC-038",
    title: "Electrical conduit routing through MEP shaft conflict",
    team: "Architect",
    tb: "badge-blue",
    pri: "Medium",
    pb: "badge-amber",
    status: "In Progress",
    sb: "pill-inprog",
    date: "Yesterday",
  },
  {
    id: "#INC-035",
    title: "HVAC duct sizing mismatch — revised drawing needed",
    team: "MEP",
    tb: "badge-mep-m",
    pri: "Low",
    pb: "badge-grey",
    status: "In Progress",
    sb: "pill-inprog",
    date: "3 days ago",
  },
];

const TODAY_STATUS = [
  { icon: "📋", label: "Daily Log", pill: "pill-open", pillLabel: "Pending" },
  {
    icon: "📐",
    label: "Drawing Upload",
    pill: "pill-submitted",
    pillLabel: "Done",
  },
  {
    icon: "⚠️",
    label: "Incidents Checked",
    pill: "pill-submitted",
    pillLabel: "Done",
  },
  { icon: "🔗", label: "Coord. Update", pill: "pill-inprog", pillLabel: "Due" },
  {
    icon: "🗂️",
    label: "Version Review",
    pill: "pill-submitted",
    pillLabel: "Done",
  },
];

const QUICK = [
  { icon: "⬆️", label: "Upload Drawing", href: "/mep/upload" },
  { icon: "🚨", label: "Raise Incident", href: "/mep/incidents" },
  { icon: "📋", label: "Post Log", href: "/mep/daily-log" },
  { icon: "📬", label: "Coordination", href: "/mep/coordination" },
  { icon: "🗂️", label: "Versions", href: "/mep/version-control" },
  { icon: "📐", label: "Drawings", href: "/mep/drawings" },
];

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function MEPDashboard() {
  const [dateStr, setDateStr] = useState("");
  const [activeProject, setProject] = useState(PROJECTS[0]);
  const [openDisc, setOpenDisc] = useState("M");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }, []);

  const milestones = MILESTONE_DATA[activeProject.id] || MILESTONE_DATA.p1;
  const overallM = calcOverall(milestones.M);
  const overallE = calcOverall(milestones.E);
  const overallP = calcOverall(milestones.P);
  const overallAll = Math.round((overallM + overallE + overallP) / 3);

  return (
    <div className="mep-page">
      {/* ── HERO BANNER ── */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-hero-greeting">MEP Engineer · Person 5</div>
          <div className="dash-hero-title">
            Good morning 👋
            <br />
            {activeProject.name}
          </div>
          <div className="dash-hero-sub">
            {activeProject.code} · {activeProject.location} · {dateStr}
          </div>
          <a href="/mep/daily-log" className="dash-hero-btn">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Post Today's Log
          </a>
        </div>
        <div className="dash-hero-right">
          <div className="dash-hero-stat">
            <span className="dhs-val">24</span>
            <span className="dhs-lbl">Drawings</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val" style={{ color: "#fbbf24" }}>
              3
            </span>
            <span className="dhs-lbl">Incidents</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val">{overallAll}%</span>
            <span className="dhs-lbl">Overall</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val" style={{ color: "#86efac" }}>
              6
            </span>
            <span className="dhs-lbl">Log Streak</span>
          </div>
        </div>
      </div>

      {/* ── PROJECT SWITCHER + STAT CARDS ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <ProjectSwitcher active={activeProject} onChange={setProject} />
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            {
              icon: "📐",
              label: "Drawings Uploaded",
              value: "24",
              sub: "Last: Plumbing Rev-3",
              ic: "ic-blue",
            },
            {
              icon: "⚠️",
              label: "Open Incidents",
              value: "3",
              sub: "1 high priority",
              ic: "ic-red",
            },
            {
              icon: "🔗",
              label: "Coord. Tasks",
              value: "5",
              sub: "Arch: 2 · Struct: 3",
              ic: "ic-amber",
            },
            {
              icon: "✅",
              label: "Overall MEP",
              value: `${overallAll}%`,
              sub: "Across all disciplines",
              ic: "ic-green",
            },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon-wrap ${s.ic}`}>{s.icon}</div>
              <div className="stat-info">
                <span className="stat-label">{s.label}</span>
                <span className="stat-value">{s.value}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MILESTONE TRACKER + RIGHT COLUMN ── */}
      <div className="grid-3" style={{ alignItems: "start" }}>
        {/* Milestone Tracker spans 2 columns */}
        <div className="mep-card" style={{ gridColumn: "1 / 3" }}>
          <div className="mep-card-head">
            <span className="card-title">
              🏗️ Installation Milestone Tracker
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(DISC_META).map((k) => (
                <button
                  key={k}
                  className={`filter-chip${openDisc === k ? " active" : ""}`}
                  style={{ padding: "3px 12px", fontSize: 11 }}
                  onClick={() => setOpenDisc(k)}
                >
                  {DISC_META[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mep-card-body">
            {/* Overall summary row — 3 mini bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { key: "M", val: overallM, barCls: "prog-blue" },
                { key: "E", val: overallE, barCls: "prog-purple" },
                { key: "P", val: overallP, barCls: "prog-green" },
              ].map((d) => (
                <div
                  key={d.key}
                  style={{
                    background: "var(--bg-light)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>
                      {DISC_META[d.key].label}
                    </span>
                    <span
                      style={{
                        fontFamily: "Monaco,monospace",
                        color: "var(--primary-blue)",
                      }}
                    >
                      {d.val}%
                    </span>
                  </div>
                  <div className="prog-track">
                    <div
                      className={`prog-fill ${d.barCls}`}
                      style={{ width: `${d.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Per-floor detail for selected discipline */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: 8,
              }}
            >
              {DISC_META[openDisc].label} — Floor by Floor
            </div>

            <div className="milestone-floors">
              {milestones[openDisc].map((row) => (
                <div className="milestone-floor-row" key={row.floor}>
                  <span className="mf-floor">{row.floor}</span>
                  <div className="mf-bar-wrap">
                    <div
                      className={`mf-bar ${DISC_META[openDisc].barCls}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span
                    className="mf-pct"
                    style={{
                      color:
                        row.pct === 100
                          ? "var(--success)"
                          : "var(--primary-blue)",
                    }}
                  >
                    {row.pct}%
                  </span>
                  <span
                    className={STATUS_CLS[row.status]}
                    style={{
                      width: 88,
                      textAlign: "right",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {row.pct === 100 ? "✓ " : ""}
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
              ))}
            </div>

            <div className="alert alert-blue" style={{ marginTop: 14 }}>
              <span className="alert-icon">💡</span>
              <span>
                Progress is calculated from daily log submissions. Each
                completed zone logged by the MEP team updates these figures
                automatically.
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Quick Actions */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">⚡ Quick Actions</span>
            </div>
            <div className="mep-card-body">
              <div className="quick-grid">
                {QUICK.map((q) => (
                  <a href={q.href} className="quick-btn" key={q.label}>
                    <span className="quick-btn-icon">{q.icon}</span>
                    {q.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">📅 Today's Status</span>
            </div>
            <div
              className="mep-card-body"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            >
              {TODAY_STATUS.map((s) => (
                <div className="status-row" key={s.label}>
                  <span className="status-icon">{s.icon}</span>
                  <span className="status-label">{s.label}</span>
                  <span className={`status-pill ${s.pill}`}>{s.pillLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── OPEN INCIDENTS TABLE ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">⚠️ Open Incidents</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-red">3 Active</span>
            <a
              href="/mep/incidents"
              className="btn-outline"
              style={{ padding: "5px 12px", fontSize: 11 }}
            >
              View All
            </a>
          </div>
        </div>
        <div className="mep-table-wrap">
          <table className="mep-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Team</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {INCIDENTS.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: "Monaco,Courier New,monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {inc.id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{inc.title}</td>
                  <td>
                    <span className={`badge ${inc.tb}`}>{inc.team}</span>
                  </td>
                  <td>
                    <span className={`badge ${inc.pb}`}>{inc.pri}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${inc.sb}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {inc.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIVITY + ALERTS ── */}
      <div className="grid-2">
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">🕐 Recent Activity</span>
          </div>
          <div className="mep-card-body">
            <div className="activity-list">
              {ACTIVITY.map((a, i) => (
                <div className="act-item" key={i}>
                  <div className={`act-dot ${a.dot}`} />
                  <div>
                    <div className="act-text">{a.text}</div>
                    <div className="act-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">📢 Coordination Alerts</span>
          </div>
          <div className="mep-card-body">
            <div className="activity-list">
              {ALERTS.map((a, i) => (
                <div className="act-item" key={i}>
                  <div className={`act-dot ${a.dot}`} />
                  <div>
                    <div className="act-text">{a.text}</div>
                    <div className="act-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
