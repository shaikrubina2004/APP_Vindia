import { useState, useEffect } from "react";
import "../../styles/MEPEngineer.css";

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
        <strong>Architect</strong> updated Floor Plan Rev4
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

const PROGRESS = [
  { label: "🔧 Mechanical (HVAC)", pct: 68, cls: "prog-blue" },
  { label: "⚡ Electrical", pct: 52, cls: "prog-purple" },
  { label: "🚿 Plumbing", pct: 74, cls: "prog-green" },
  { label: "🔌 Conduit Routing", pct: 41, cls: "prog-purple" },
  { label: "💧 Drainage", pct: 85, cls: "prog-green" },
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

export default function MEPDashboard() {
  const [dateStr, setDateStr] = useState("");
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

  return (
    <div className="mep-page">
      {/* ── Header ── */}
      <div className="mep-header">
        <div>
          <h1>MEP Dashboard</h1>
          <p>Mechanical · Electrical · Plumbing — Overview</p>
        </div>
        <div className="mep-header-actions">
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "white",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 600,
            }}
          >
            {dateStr}
          </span>
          <a href="/mep/daily-log" className="btn-primary">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Post Daily Log
          </a>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-row">
        {[
          {
            icon: "📐",
            label: "Drawings Uploaded",
            value: "24",
            sub: "Last: Plumbing Rev-3 (today)",
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
            label: "Log Streak",
            value: "6",
            sub: "Days logged in a row",
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

      {/* ── Three columns ── */}
      <div className="grid-3" style={{ alignItems: "start" }}>
        {/* MEP Progress */}
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">📊 Installation Progress</span>
            <span className="badge badge-blue">This Week</span>
          </div>
          <div className="mep-card-body">
            <div className="prog-wrap">
              {PROGRESS.map((p) => (
                <div className="prog-item" key={p.label}>
                  <div className="prog-header">
                    <span className="prog-header-label">{p.label}</span>
                    <span className="prog-header-pct">{p.pct}%</span>
                  </div>
                  <div className="prog-track">
                    <div
                      className={`prog-fill ${p.cls}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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

      {/* ── Incidents Table ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">⚠️ Open Incidents</span>
          <span className="badge badge-red">3 Active</span>
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
                        fontFamily: "Monaco, Courier New, monospace",
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

      {/* ── Activity + Alerts ── */}
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
