// ArchitectProject.jsx — Premium Redesign
// Centered modal detail panel · Playfair Display + DM Sans
// Drop-in replacement for the existing page

import { useState, useMemo, useEffect } from "react";
import "./ArchitectProject.css";

/* ══════════════════════════════════════════════════════════════
   DATA  (unchanged from original)
══════════════════════════════════════════════════════════════ */
const PROJECTS = [
  {
    id: "P-001", code: "SR-2024-A",
    name: "Skyward Residency",
    client: "Kapoor Developments Pvt. Ltd.",
    status: "Active", phase: "Design Development",
    location: "Bengaluru, KA", value: "₹ 42 Cr",
    architect: "Arjun K.", updated: "2 hours ago",
    startDate: "Jan 2024", targetDate: "Dec 2026",
    modules: {
      tasks:       { count: 7,  urgent: 2, label: "2 overdue" },
      dailyLogs:   { count: 34, urgent: 0, label: "Last: Today" },
      designs:     { count: 18, urgent: 1, label: "1 pending review" },
      incidents:   { count: 3,  urgent: 2, label: "2 critical" },
      coordination:{ count: 6,  urgent: 1, label: "1 urgent clash" },
      signOff:     { count: 4,  urgent: 1, label: "1 overdue" },
    },
    flags: [
      { type: "urgent",  label: "2 Critical Incidents" },
      { type: "pending", label: "Sign-Off Overdue" },
      { type: "info",    label: "MEP Clash — L5" },
    ],
    stats: { tasks: 7, openRFI: 4, pending: 3, completion: 38 },
  },
  {
    id: "P-002", code: "GVT-2023-B",
    name: "Green Valley Towers",
    client: "GreenBuild Infra Ltd.",
    status: "Active", phase: "Construction Docs",
    location: "Hyderabad, TS", value: "₹ 67 Cr",
    architect: "Arjun K.", updated: "Yesterday",
    startDate: "Aug 2023", targetDate: "Mar 2026",
    modules: {
      tasks:       { count: 5,  urgent: 1, label: "1 blocked" },
      dailyLogs:   { count: 89, urgent: 0, label: "Last: Yesterday" },
      designs:     { count: 31, urgent: 0, label: "All current" },
      incidents:   { count: 1,  urgent: 1, label: "1 critical" },
      coordination:{ count: 4,  urgent: 0, label: "In progress" },
      signOff:     { count: 6,  urgent: 0, label: "All submitted" },
    },
    flags: [
      { type: "urgent", label: "Facade Panel Non-Compliance" },
      { type: "info",   label: "Phase 3 Starting Soon" },
    ],
    stats: { tasks: 5, openRFI: 7, pending: 2, completion: 61 },
  },
  {
    id: "P-003", code: "MBC-2024-C",
    name: "Marina Bay Complex",
    client: "Coastal Properties Corp.",
    status: "Active", phase: "Schematic Design",
    location: "Chennai, TN", value: "₹ 118 Cr",
    architect: "Arjun K.", updated: "3 hours ago",
    startDate: "Mar 2024", targetDate: "Jun 2027",
    modules: {
      tasks:       { count: 4, urgent: 0, label: "On track" },
      dailyLogs:   { count: 12, urgent: 0, label: "Last: Today" },
      designs:     { count: 9,  urgent: 0, label: "Rev A in progress" },
      incidents:   { count: 2,  urgent: 1, label: "1 survey discrepancy" },
      coordination:{ count: 3,  urgent: 1, label: "1 canopy unresolved" },
      signOff:     { count: 1,  urgent: 1, label: "Authority overdue" },
    },
    flags: [
      { type: "urgent",  label: "Foundation Survey Issue" },
      { type: "pending", label: "BCA Authority Sign-Off" },
    ],
    stats: { tasks: 4, openRFI: 2, pending: 4, completion: 14 },
  },
  {
    id: "P-004", code: "RHP-2022-D",
    name: "Riverside Heritage Plaza",
    client: "Heritage City Developers",
    status: "On Hold", phase: "Design Development",
    location: "Pune, MH", value: "₹ 29 Cr",
    architect: "Arjun K.", updated: "2 weeks ago",
    startDate: "Jun 2022", targetDate: "TBD",
    modules: {
      tasks:       { count: 2,  urgent: 0, label: "Paused" },
      dailyLogs:   { count: 56, urgent: 0, label: "Last: 2 weeks ago" },
      designs:     { count: 14, urgent: 0, label: "Rev D paused" },
      incidents:   { count: 0,  urgent: 0, label: "None" },
      coordination:{ count: 1,  urgent: 0, label: "Pending resumption" },
      signOff:     { count: 2,  urgent: 0, label: "Held" },
    },
    flags: [{ type: "info", label: "Client Hold — Funding Review" }],
    stats: { tasks: 2, openRFI: 1, pending: 0, completion: 47 },
  },
  {
    id: "P-005", code: "NTC-2023-E",
    name: "North Tech Campus",
    client: "TechPark Ventures Pvt. Ltd.",
    status: "Active", phase: "Construction Docs",
    location: "Gurugram, HR", value: "₹ 94 Cr",
    architect: "Arjun K.", updated: "4 hours ago",
    startDate: "Nov 2023", targetDate: "Sep 2026",
    modules: {
      tasks:       { count: 9,  urgent: 3, label: "3 urgent" },
      dailyLogs:   { count: 72, urgent: 0, label: "Last: Today" },
      designs:     { count: 26, urgent: 2, label: "2 awaiting approval" },
      incidents:   { count: 4,  urgent: 2, label: "2 open" },
      coordination:{ count: 8,  urgent: 2, label: "MEP + Structural" },
      signOff:     { count: 5,  urgent: 2, label: "2 overdue" },
    },
    flags: [
      { type: "urgent",  label: "3 Tasks Overdue" },
      { type: "urgent",  label: "2 Sign-Offs Overdue" },
      { type: "pending", label: "MEP Coordination Pending" },
    ],
    stats: { tasks: 9, openRFI: 11, pending: 7, completion: 52 },
  },
  {
    id: "P-006", code: "VRE-2021-F",
    name: "Viceroy Residences",
    client: "Prestige Realty Group",
    status: "Completed", phase: "Project Close",
    location: "Mumbai, MH", value: "₹ 55 Cr",
    architect: "Arjun K.", updated: "3 months ago",
    startDate: "Jan 2021", targetDate: "Dec 2023",
    modules: {
      tasks:       { count: 0,   urgent: 0, label: "All complete" },
      dailyLogs:   { count: 210, urgent: 0, label: "Archived" },
      designs:     { count: 48,  urgent: 0, label: "Final issued" },
      incidents:   { count: 0,   urgent: 0, label: "None open" },
      coordination:{ count: 0,   urgent: 0, label: "All resolved" },
      signOff:     { count: 12,  urgent: 0, label: "All approved" },
    },
    flags: [],
    stats: { tasks: 0, openRFI: 0, pending: 0, completion: 100 },
  },
  {
    id: "P-007", code: "SCI-2024-G",
    name: "Science & Innovation Hub",
    client: "State Govt. — Education Dept.",
    status: "Draft", phase: "Pre-Design",
    location: "Bhopal, MP", value: "₹ 38 Cr",
    architect: "Arjun K.", updated: "5 days ago",
    startDate: "Jul 2024", targetDate: "Jan 2027",
    modules: {
      tasks:       { count: 1, urgent: 0, label: "Brief review" },
      dailyLogs:   { count: 0, urgent: 0, label: "Not started" },
      designs:     { count: 2, urgent: 0, label: "Concept stage" },
      incidents:   { count: 0, urgent: 0, label: "None" },
      coordination:{ count: 0, urgent: 0, label: "Not started" },
      signOff:     { count: 0, urgent: 0, label: "None yet" },
    },
    flags: [{ type: "info", label: "Brief Finalisation Pending" }],
    stats: { tasks: 1, openRFI: 0, pending: 1, completion: 3 },
  },
  {
    id: "P-008", code: "LGC-2023-H",
    name: "Lakeside Golf Club",
    client: "Emerald Leisure Pvt. Ltd.",
    status: "Active", phase: "Design Development",
    location: "Coimbatore, TN", value: "₹ 21 Cr",
    architect: "Arjun K.", updated: "1 day ago",
    startDate: "Apr 2023", targetDate: "Aug 2025",
    modules: {
      tasks:       { count: 3,  urgent: 0, label: "On track" },
      dailyLogs:   { count: 28, urgent: 0, label: "Last: Yesterday" },
      designs:     { count: 11, urgent: 1, label: "1 pending review" },
      incidents:   { count: 1,  urgent: 0, label: "1 medium" },
      coordination:{ count: 2,  urgent: 0, label: "Landscape + Civil" },
      signOff:     { count: 1,  urgent: 0, label: "1 pending" },
    },
    flags: [{ type: "pending", label: "Landscape Coordination" }],
    stats: { tasks: 3, openRFI: 3, pending: 2, completion: 68 },
  },
];

/* ── Helpers ─────────────────────────────────────────────── */
const STATUS_MAP = {
  "Active":    { cls: "st-active", dot: "dot-active", accent: "accent-active" },
  "On Hold":   { cls: "st-hold",   dot: "dot-hold",   accent: "accent-hold"   },
  "Draft":     { cls: "st-draft",  dot: "dot-draft",  accent: "accent-draft"  },
  "Completed": { cls: "st-done",   dot: "dot-done",   accent: "accent-done"   },
};

const MODULE_DEFS = [
  { key: "tasks",        label: "Tasks",        icon: "⚡", urgentClass: m => m.urgent > 0 ? "amber" : "" },
  { key: "dailyLogs",    label: "Daily Logs",   icon: "📋", urgentClass: () => "" },
  { key: "designs",      label: "Designs",      icon: "📐", urgentClass: m => m.urgent > 0 ? "amber" : "" },
  { key: "incidents",    label: "Incidents",    icon: "🚨", urgentClass: m => m.urgent > 0 ? "red"   : "" },
  { key: "coordination", label: "Coordination", icon: "🔗", urgentClass: m => m.urgent > 0 ? "amber" : "" },
  { key: "signOff",      label: "Sign-Off",     icon: "✍️", urgentClass: m => m.urgent > 0 ? "red"   : "" },
];

const STATUS_FILTERS = ["All", "Active", "On Hold", "Draft", "Completed"];
const DOT_CLASS = { All: "", Active: "sp-active", "On Hold": "sp-hold", Draft: "sp-draft", Completed: "sp-done" };

/* ══════════════════════════════════════════════════════════════
   PROJECT CARD
══════════════════════════════════════════════════════════════ */
function ProjectCard({ project, selected, onClick, index }) {
  const sm = STATUS_MAP[project.status] || STATUS_MAP.Draft;
  const totalUrgent = Object.values(project.modules).reduce((a, m) => a + m.urgent, 0);

  return (
    <div
      className={`ap-card${selected ? " selected" : ""}`}
      style={{ animationDelay: `${index * 0.045}s` }}
      onClick={onClick}
    >
      {/* Colored accent bar */}
      <div className={`ap-card-accent ${sm.accent}`}/>

      <div className="ap-card-body">
        <div className="ap-card-top">
          <span className="ap-card-code">{project.code}</span>
          <span className={`ap-status ${sm.cls}`}>
            <span className={`ap-status-dot ${sm.dot}`}/>
            {project.status}
          </span>
        </div>

        <div className="ap-card-name">{project.name}</div>
        <div className="ap-card-client">{project.client}</div>

        {totalUrgent > 0 && (
          <div className="ap-card-alert">
            <span className="ap-card-alert-dot"/>
            {totalUrgent} action{totalUrgent > 1 ? "s" : ""} required
          </div>
        )}
      </div>

      <div className="ap-card-divider"/>
      <div className="ap-card-footer">
        <div>
          <div className="ap-card-phase">{project.phase}</div>
          <div className="ap-card-updated">{project.updated}</div>
        </div>
        <div className="ap-card-location">{project.location}</div>
      </div>
      <div style={{ height: 12 }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROJECT DETAIL MODAL (centered)
══════════════════════════════════════════════════════════════ */
function ProjectDetail({ project, onClose, onToast }) {
  const sm = STATUS_MAP[project.status] || STATUS_MAP.Draft;

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="ap-overlay open" onClick={onClose}>
      {/* Stop click-through to overlay */}
      <div className="ap-detail" onClick={e => e.stopPropagation()}>

        {/* Top accent strip */}
        <div className={`ap-detail-strip ${sm.accent}`}/>

        {/* ── Header ── */}
        <div className="ap-detail-head">
          <div className="ap-detail-head-row1">
            <div className="ap-detail-head-left">
              <div className="ap-detail-code">{project.code}</div>
            </div>
            <button
              className="ap-detail-close"
              onClick={onClose}
              title="Close (Esc)"
            >✕</button>
          </div>

          <div className="ap-detail-name">{project.name}</div>

          <div className="ap-detail-meta-row">
            <span className={`ap-status ${sm.cls}`}>
              <span className={`ap-status-dot ${sm.dot}`}/>
              {project.status}
            </span>
            <span className="ap-detail-chip">📍 {project.location}</span>
            <span className="ap-detail-chip">🏗 {project.phase}</span>
            <span className="ap-detail-chip">👤 {project.client}</span>
          </div>

          {/* Stats */}
          <div className="ap-detail-stats">
            {[
              { val: project.stats.tasks,      label: "Open Tasks",      color: project.stats.tasks > 5 ? "amber" : "" },
              { val: project.stats.openRFI,    label: "Open RFIs",       color: project.stats.openRFI > 5 ? "amber" : "" },
              { val: project.stats.pending,    label: "Pending Actions",  color: project.stats.pending > 3 ? "red" : project.stats.pending > 0 ? "amber" : "green" },
              { val: `${project.stats.completion}%`, label: "Completion", color: project.stats.completion === 100 ? "green" : "" },
            ].map(s => (
              <div className="ap-stat" key={s.label}>
                <div className={`ap-stat-val ${s.color}`}>{s.val}</div>
                <div className="ap-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ap-detail-body">

          {/* Flags */}
          {project.flags.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div className="ap-section-title">Attention Required</div>
              <div className="ap-flags">
                {project.flags.map((f, i) => (
                  <span
                    key={i}
                    className={`ap-flag ap-flag-${f.type}`}
                    onClick={() => onToast(`Opening: ${f.label}`)}
                  >
                    {f.type === "urgent" ? "🚨" : f.type === "pending" ? "⏳" : "ℹ️"} {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Modules */}
          <div className="ap-section-title">Project Modules</div>
          <div className="ap-module-grid">
            {MODULE_DEFS.map(def => {
              const mod = project.modules[def.key];
              const cc  = def.urgentClass(mod);
              return (
                <div
                  key={def.key}
                  className="ap-module"
                  onClick={() => onToast(`Opening ${def.label} — ${project.name}`)}
                >
                  <div className="ap-module-top">
                    <div className="ap-module-icon-label">
                      <span className="ap-module-icon">{def.icon}</span>
                      <span className="ap-module-label">{def.label}</span>
                    </div>
                    <span className={`ap-module-count ${cc}`}>{mod.count}</span>
                  </div>
                  <div className="ap-module-footer">
                    <span className="ap-module-sub">{mod.label}</span>
                    <span className="ap-module-arrow">→</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Info */}
          <div className="ap-section-title">Project Info</div>
          <div className="ap-info-grid">
            {[
              { label: "Project Value", val: project.value },
              { label: "Last Updated",  val: project.updated },
              { label: "Start Date",    val: project.startDate },
              { label: "Target Date",   val: project.targetDate },
            ].map(f => (
              <div key={f.label}>
                <div className="ap-info-field-label">{f.label}</div>
                <div className="ap-info-field-val">{f.val}</div>
              </div>
            ))}
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="ap-detail-footer">
          <button
            className="ap-detail-btn ap-detail-btn-primary"
            onClick={() => onToast(`Opening full project — ${project.name}`)}
          >
            Open Full Project →
          </button>
          <button
            className="ap-detail-btn ap-detail-btn-ghost"
            onClick={() => onToast(`Task Board — ${project.name}`)}
          >
            ⚡ Tasks
          </button>
          <button
            className="ap-detail-btn ap-detail-btn-ghost"
            onClick={() => onToast(`Daily Logs — ${project.name}`)}
          >
            📋 Logs
          </button>
          <button
            className="ap-detail-btn ap-detail-btn-ghost"
            style={{ marginLeft: "auto" }}
            onClick={() => onToast("Downloading report…")}
          >
            ↓ Report
          </button>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ArchitectProjects() {
  const [selected,     setSelected]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast,        setToast]        = useState({ msg: "", show: false });

  const showToast = msg => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  };

  const filtered = useMemo(() =>
    PROJECTS.filter(p => {
      const q = search.toLowerCase();
      return (
        (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)) &&
        (statusFilter === "All" || p.status === statusFilter)
      );
    }),
  [search, statusFilter]);

  const counts = useMemo(() => {
    const c = { All: PROJECTS.length };
    STATUS_FILTERS.slice(1).forEach(s => { c[s] = PROJECTS.filter(p => p.status === s).length; });
    return c;
  }, []);

  const selectedProject = selected ? PROJECTS.find(p => p.id === selected) : null;

  return (
    <div className="ap-root">
      <div className="ap-page">

        {/* ── Page Header ── */}
        <div className="ap-page-header">
          <div>
            <div className="ap-page-eyebrow">Architect Workspace</div>
            <div className="ap-page-title">My Projects</div>
            <div className="ap-page-sub">
              {PROJECTS.length} projects · {PROJECTS.filter(p => p.status === "Active").length} active
            </div>
          </div>
          <div className="ap-page-actions">
            <button className="ap-btn ap-btn-ghost" onClick={() => showToast("Exporting report…")}>
              ↓ Export
            </button>
            <button className="ap-btn ap-btn-primary" onClick={() => showToast("New project wizard…")}>
              + New Project
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="ap-controls">
          <div className="ap-search">
            <span className="ap-search-icon">⌕</span>
            <input
              placeholder="Search projects, codes, clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Status filter pills ── */}
        <div className="ap-summary-strip">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              className={`ap-summary-pill${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              <span className={`ap-summary-pill-dot ${DOT_CLASS[s]}`}/>
              {s}
              <span className="ap-summary-pill-count">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* ── Project grid ── */}
        {filtered.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">🔍</div>
            <p>No projects match your search.</p>
          </div>
        ) : (
          <div className="ap-grid">
            {filtered.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                selected={selected === p.id}
                onClick={() => setSelected(selected === p.id ? null : p.id)}
                index={i}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Centered Detail Modal ── */}
      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelected(null)}
          onToast={showToast}
        />
      )}

      {/* ── Toast ── */}
      <div className={`ap-toast${toast.show ? " show" : ""}`}>
        {toast.msg}
      </div>
    </div>
  );
}