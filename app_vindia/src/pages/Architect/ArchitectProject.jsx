// ArchitectProject.jsx — Premium Redesign
// Centered modal detail panel · Playfair Display + DM Sans
// Drop-in replacement for the existing page

import { useState, useMemo, useEffect } from "react";
import "./ArchitectProject.css";
import { getArchitectProjects } from "../../services/architectprojectService.js";
/* ══════════════════════════════════════════════════════════════
   DATA  (unchanged from original)
══════════════════════════════════════════════════════════════ */


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
  const totalUrgent = Object.values(project.modules || {})
  .reduce((a, m) => a + (m?.urgent || 0), 0);

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

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="ap-overlay open" onClick={onClose}>
      <div className="ap-detail" onClick={(e) => e.stopPropagation()}>

        <div className={`ap-detail-strip ${sm.accent}`} />

        {/* HEADER */}
        <div className="ap-detail-head">
          <div className="ap-detail-head-row1">
            <div className="ap-detail-code">{project.code}</div>
            <button className="ap-detail-close" onClick={onClose}>✕</button>
          </div>

          <div className="ap-detail-name">{project.name}</div>

          <div className="ap-detail-meta-row">
            <span className={`ap-status ${sm.cls}`}>
              <span className={`ap-status-dot ${sm.dot}`} />
              {project.status}
            </span>
            <span className="ap-detail-chip">📍 {project.location}</span>
            <span className="ap-detail-chip">🏗 {project.phase}</span>
            <span className="ap-detail-chip">👤 {project.client}</span>
          </div>

          {/* STATS */}
          <div className="ap-detail-stats">
            {[
              { val: project?.stats?.tasks ?? 0, label: "Tasks", color: "" },
              { val: project?.stats?.openRFI ?? 0, label: "Open RFIs", color: "" },
              {
                val: project?.stats?.pending ?? 0,
                label: "Pending Actions",
                color:
                  (project?.stats?.pending ?? 0) > 3
                    ? "red"
                    : (project?.stats?.pending ?? 0) > 0
                    ? "amber"
                    : "green",
              },
              {
                val: `${project?.stats?.completion ?? 0}%`,
                label: "Completion",
                color:
                  (project?.stats?.completion ?? 0) === 100 ? "green" : "",
              },
            ].map((s) => (
              <div className="ap-stat" key={s.label}>
                <div className={`ap-stat-val ${s.color}`}>{s.val}</div>
                <div className="ap-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="ap-detail-body">
          <div className="ap-section-title">Project Modules</div>

          <div className="ap-module-grid">
            {MODULE_DEFS.map((def) => {
              const mod = project.modules?.[def.key] || {
                count: 0,
                urgent: 0,
                label: "",
              };

              const cc = def.urgentClass(mod);

              return (
                <div
                  key={def.key}
                  className="ap-module"
                  onClick={() =>
                    onToast(`Opening ${def.label} — ${project.name}`)
                  }
                >
                  <div className="ap-module-top">
                    <span className="ap-module-icon">{def.icon}</span>
                    <span className="ap-module-label">{def.label}</span>
                    <span className={`ap-module-count ${cc}`}>
                      {mod.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="ap-detail-footer">
          <button
            className="ap-detail-btn ap-detail-btn-primary"
            onClick={() => onToast(`Opening full project — ${project.name}`)}
          >
            Open Full Project →
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
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState({ msg: "", show: false });
// ── Fetch Projects ──
const fetchProjects = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;
     console.log("USER ID SENT:", userId); // 👈 ADD HERE
    if (!userId) return;

    const res = await getArchitectProjects(userId);

    setProjects(res.data.map(mapProject));
  } catch (err) {
    console.error("Failed to fetch projects:", err);
  }
};
  // ✅ ALWAYS keep useEffect near top
  useEffect(() => {
    fetchProjects();
  }, []);
  const mapProject = (p) => ({
  id: p.id,

  name: p.name,
  code: "PRJ-" + p.id, // ✅ generate
  client: p.client,

  status:
    p.status === "IN PROGRESS"
      ? "Active"
      : p.status || "Draft",

  phase: "Execution", // or derive later
  location: p.location,

  value: p.budget ? `₹${p.budget}` : "N/A",

  startDate: p.start_date,
  targetDate: p.end_date,

  updated: p.updated_at
    ? new Date(p.updated_at).toLocaleDateString()
    : "Recently",

  architect: "You",

  modules: {
    tasks: { count: 0, urgent: 0, label: "" },
    dailyLogs: { count: p.daily_log_count ?? 0, urgent: 0, label: "" },
    designs: { count: 0, urgent: 0, label: "" },
    incidents: { count: 0, urgent: 0, label: "" },
    coordination: { count: 0, urgent: 0, label: "" },
    signOff: { count: 0, urgent: 0, label: "" },
  },

  flags: [],

  stats: {
  tasks: p?.stats?.tasks ?? 0,
  openRFI: p?.stats?.openRFI ?? 0,
  pending: p?.stats?.pending ?? 0,
  completion: p?.progress ?? 0,
},
});



// ── Toast ──
const showToast = (msg) => {
  setToast({ msg, show: true });
  setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
};

 const filtered = useMemo(() =>
  projects.filter(p => {
    const q = search.toLowerCase();
    return (
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q)) &&
      (statusFilter === "All" || p.status === statusFilter)
    );
  }),
[projects, search, statusFilter]); // ✅ ADD projects

  const counts = useMemo(() => {
    const c = { All: projects.length };
    STATUS_FILTERS.slice(1).forEach(s => { c[s] = projects.filter(p => {
  if (s === "Active") return p.status === "Active";
  if (s === "On Hold") return p.status === "On Hold";
  if (s === "Draft") return p.status === "Draft";
  if (s === "Completed") return p.status === "Completed";
  return true;
}).length;});
    return c;
  }, [projects]);

  const selectedProject = selected
  ? projects.find(p => String(p.id) === String(selected))
  : null;

  return (
    <div className="ap-root">
      <div className="ap-page">

        {/* ── Page Header ── */}
        <div className="ap-page-header">
          <div>
            <div className="ap-page-eyebrow">Architect Workspace</div>
            <div className="ap-page-title">My Projects</div>
            <div className="ap-page-sub">
              {projects.length} projects · {projects.filter(p => p.status === "Active").length} active
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