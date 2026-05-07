// ArchitectProject.jsx — Premium Redesign with Rich Detail Panel
// Centered modal detail panel · Playfair Display + DM Sans

import { useState, useMemo, useEffect } from "react";
import "./ArchitectProject.css";
import { getArchitectProjects } from "../../services/architectprojectService.js";
import { getProjectLogs } from "../../services/architectDailyLogService.js";
import { getDrawings } from "../../services/architectDesignService.js";
import { API } from "../../services/authService";
/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  "Active":    { cls: "st-active", dot: "dot-active", accent: "accent-active" },
  "On Hold":   { cls: "st-hold",   dot: "dot-hold",   accent: "accent-hold"   },
  "Draft":     { cls: "st-draft",  dot: "dot-draft",  accent: "accent-draft"  },
  "Completed": { cls: "st-done",   dot: "dot-done",   accent: "accent-done"   },
};

// Removed "coordination" and "signOff" from MODULE_DEFS
const MODULE_DEFS = [
  { key: "tasks",     label: "Tasks",      icon: "⚡", urgentClass: m => m.urgent > 0 ? "amber" : "" },
  { key: "dailyLogs", label: "Daily Logs", icon: "📋", urgentClass: () => "" },
  { key: "designs",   label: "Designs",    icon: "📐", urgentClass: m => m.urgent > 0 ? "amber" : "" },
  { key: "incidents", label: "Incidents",  icon: "🚨", urgentClass: m => m.urgent > 0 ? "red"   : "" },
];

const STATUS_FILTERS = ["All", "Active", "On Hold", "Draft", "Completed"];
const DOT_CLASS = { All: "", Active: "sp-active", "On Hold": "sp-hold", Draft: "sp-draft", Completed: "sp-done" };

const fmtDate = (v) =>   
  v
    ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtCurrency = (n) => {
  const num = Number(n);
  if (!num) return "—";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString("en-IN")}`;
};

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
      <div className={`ap-card-accent ${sm.accent}`} />
      <div className="ap-card-body">
        <div className="ap-card-top">
          <span className="ap-card-code">{project.code}</span>
          <span className={`ap-status ${sm.cls}`}>
            <span className={`ap-status-dot ${sm.dot}`} />
            {project.status}
          </span>
        </div>
        <div className="ap-card-name">{project.name}</div>
        <div className="ap-card-client">{project.client}</div>
        {totalUrgent > 0 && (
          <div className="ap-card-alert">
            <span className="ap-card-alert-dot" />
            {totalUrgent} action{totalUrgent > 1 ? "s" : ""} required
          </div>
        )}
      </div>
      <div className="ap-card-divider" />
      <div className="ap-card-footer">
        <div>
          <div className="ap-card-phase">{project.phase}</div>
          <div className="ap-card-updated">{project.updated}</div>
        </div>
        <div className="ap-card-location">{project.location}</div>
      </div>
      <div style={{ height: 12 }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROJECT DETAIL MODAL — Rich panel with all project info
   + Project Modules (tasks, dailyLogs, designs, incidents)
══════════════════════════════════════════════════════════════ */
function ProjectDetail({ project, onClose, onToast, onModuleClick }) {
  const sm = STATUS_MAP[project.status] || STATUS_MAP.Draft;

  const budget    = Number(project.budget || 0);
  const spent     = Number(project.spent || 0);
  const paid      = Number(project.clientPaid || 0);
  const remaining = Math.max(0, budget - spent);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="ap-overlay open" onClick={onClose}>
      <div
        className="ap-detail"
        style={{ maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`ap-detail-strip ${sm.accent}`} />

        {/* ── HEADER ── */}
        <div className="ap-detail-head">
          <div className="ap-detail-head-row1">
            <div className="ap-detail-code">{project.code}</div>
            <button className="ap-detail-close" onClick={onClose}>✕</button>
          </div>

          {/* Client above name */}
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            {project.client}
          </div>

          <div className="ap-detail-name">{project.name}</div>

          <div className="ap-detail-meta-row">
            <span className={`ap-status ${sm.cls}`}>
              <span className={`ap-status-dot ${sm.dot}`} />
              {project.status}
            </span>
            <span className="ap-detail-chip">📍 {project.location}</span>
            <span className="ap-detail-chip">🏗 {project.phase}</span>
          </div>

          {/* ── Stats row ── */}
          <div className="ap-detail-stats">
            {[
              { val: project?.stats?.tasks ?? 0,   label: "Tasks",           color: "" },
              { val: project?.stats?.openRFI ?? 0, label: "Open RFIs",       color: "" },
              {
                val: project?.stats?.pending ?? 0,
                label: "Pending Actions",
                color: (project?.stats?.pending ?? 0) > 3 ? "red"
                     : (project?.stats?.pending ?? 0) > 0 ? "amber" : "green",
              },
              {
                val: `${project?.stats?.completion ?? 0}%`,
                label: "Completion",
                color: (project?.stats?.completion ?? 0) === 100 ? "green" : "",
              },
            ].map((s) => (
              <div className="ap-stat" key={s.label}>
                <div className={`ap-stat-val ${s.color}`}>{s.val}</div>
                <div className="ap-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ap-detail-body">

          {/* ── Budget section (only if budget exists) ── */}
          {budget > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="ap-section-title" style={{ marginBottom: 12 }}>Financials</div>

              {/* Budget bar */}
              <div style={{
                position: "relative", height: 8, background: "#f1f5f9",
                borderRadius: 999, overflow: "hidden", marginBottom: 8,
              }}>
                {/* Spent bar */}
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  width: `${Math.min(100, (spent / budget) * 100)}%`,
                  background: "#ef4444", borderRadius: 999,
                }} />
                {/* Paid bar */}
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  width: `${Math.min(100, (paid / budget) * 100)}%`,
                  background: "#22c55e", borderRadius: 999, opacity: 0.7,
                }} />
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { dot: "#0f172a", label: "Budget",    val: fmtCurrency(budget) },
                  { dot: "#ef4444", label: "Spent",     val: fmtCurrency(spent) },
                  { dot: "#22c55e", label: "Received",  val: fmtCurrency(paid) },
                  { dot: "#93c5fd", label: "Remaining", val: fmtCurrency(remaining) },
                ].map(({ dot, label, val }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Project Info Grid ── */}
          <div style={{ marginBottom: 24 }}>
            <div className="ap-section-title" style={{ marginBottom: 12 }}>Project Details</div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "10px 24px",
            }}>
              {[
                { label: "Location",      val: project.location },
                { label: "Building Type", val: project.buildingType },
                { label: "Plot Size",     val: project.plotSize ? `${project.plotSize} sqft` : null },
                { label: "Floors",        val: project.floors },
                { label: "Start Date",    val: fmtDate(project.startDate) },
                { label: "End Date",      val: fmtDate(project.targetDate) },
                { label: "Client",        val: project.client },
                { label: "Phone",         val: project.phone },
              ].filter(({ val }) => val && val !== "—").map(({ label, val }) => (
                <div key={label} style={{
                  padding: "10px 12px", background: "#f8fafc",
                  borderRadius: 8, border: "1px solid #f1f5f9",
                }}>
                  <div style={{
                    fontSize: 10, color: "#94a3b8", textTransform: "uppercase",
                    letterSpacing: 0.8, fontWeight: 700, marginBottom: 3,
                  }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Project Modules ── */}
          <div className="ap-section-title">Project Modules</div>
          <div className="ap-module-grid">
            {MODULE_DEFS.map((def) => {
              const mod = project.modules?.[def.key] || { count: 0, urgent: 0, label: "" };
              const cc = def.urgentClass(mod);
              const isClickable = def.key === "dailyLogs" || def.key === "designs" || def.key === "tasks" || def.key === "incidents";
              return (
                <div
                  key={def.key}
                  className="ap-module"
                  style={isClickable ? { cursor: "pointer" } : {}}
                  onClick={() => {
                    if (isClickable) {
                      onModuleClick(def.key, project);
                    } else {
                      onToast(`Opening ${def.label} — ${project.name}`);
                    }
                  }}
                >
                  <div className="ap-module-top">
                    <span className="ap-module-icon">{def.icon}</span>
                    <span className="ap-module-label">{def.label}</span>
                    <span className={`ap-module-count ${cc}`}>{mod.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
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
   SHARED MODAL SHELL  (z-index 1100)
══════════════════════════════════════════════════════════════ */
function SubModal({ title, subtitle, icon, footerLeft, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720,
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: "#f0f9ff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>{icon}</div>
            <div>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                {subtitle}
              </p>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 14,
            color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 24px 24px", flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{footerLeft}</span>
          <button onClick={onClose} style={{
            background: "#0f172a", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DAILY LOGS MODAL
══════════════════════════════════════════════════════════════ */
function ProjectLogsModal({ project, userId, onClose }) {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProjectLogs(userId, project.id);
        setLogs(res.data || []);
      } catch (err) {
        console.error("Failed to load logs:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [project.id, userId]);

  const approvalColor = (s) =>
    ({ Approved: { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
       Rejected:  { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
       Pending:   { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    }[s] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" });

  return (
    <SubModal
      title={project.name}
      subtitle="Daily Logs"
      icon="📋"
      footerLeft={`${logs.length} log${logs.length !== 1 ? "s" : ""} total`}
      onClose={onClose}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading logs…</div>
      )}
      {!loading && logs.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          No daily logs submitted for this project yet.
        </div>
      )}
      {!loading && logs.map((log) => {
        const isOpen = expandedId === log.id;
        const ac = approvalColor(log.approval_status || "Pending");
        return (
          <div key={log.id} style={{
            border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10, overflow: "hidden",
          }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", cursor: "pointer",
                background: isOpen ? "#f8fafc" : "#fff",
              }}
              onClick={() => setExpandedId(isOpen ? null : log.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: "#eff6ff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>📅</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", margin: 0 }}>
                    {fmtDate(log.date)}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                    {(log.tasks || []).length} task{(log.tasks || []).length !== 1 ? "s" : ""}
                    {(log.issues || []).length > 0 &&
                      ` · ${log.issues.length} issue${log.issues.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  border: `1px solid ${ac.border}`, background: ac.bg, color: ac.color,
                }}>{log.approval_status || "Pending"}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                {log.work_done && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Work Summary</p>
                    <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6,
                      background: "#fff", padding: "10px 12px", borderRadius: 8,
                      border: "1px solid #e2e8f0", margin: 0 }}>{log.work_done}</p>
                  </div>
                )}
                {(log.tasks || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Tasks</p>
                    {log.tasks.map((t, i) => (
                      <div key={t.id || i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", background: "#fff", borderRadius: 6,
                        border: "1px solid #e2e8f0", marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 12, color: "#334155" }}>{i + 1}. {t.task_name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                          background: t.status === "Done" ? "#f0fdf4"
                            : t.status === "In Progress" ? "#eff6ff"
                            : t.status === "Under Review" ? "#fefce8" : "#f8fafc",
                          color: t.status === "Done" ? "#16a34a"
                            : t.status === "In Progress" ? "#2563eb"
                            : t.status === "Under Review" ? "#ca8a04" : "#64748b",
                        }}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(log.issues || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Issues</p>
                    {log.issues.map((issue, i) => (
                      <div key={issue.id || i} style={{
                        padding: "8px 12px", background: "#fff", borderRadius: 6,
                        border: `1px solid ${issue.severity === "P1" ? "#fca5a5"
                          : issue.severity === "P2" ? "#fde047" : "#e2e8f0"}`,
                        marginBottom: 4,
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: issue.severity === "P1" ? "#fef2f2"
                              : issue.severity === "P2" ? "#fefce8" : "#f8fafc",
                            color: issue.severity === "P1" ? "#dc2626"
                              : issue.severity === "P2" ? "#ca8a04" : "#64748b",
                          }}>{issue.severity}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{issue.type}</span>
                          {issue.title && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                              {issue.title}
                            </span>
                          )}
                        </div>
                        {issue.description && (
                          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{issue.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </SubModal>
  );
}/* ══════════════════════════════════════════════════════════════
   TASKS MODAL
══════════════════════════════════════════════════════════════ */
function ProjectTasksModal({ project, userId, onClose }) {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // fetch all tasks for this project (direct + via incidents)
        const res = await API.get(`/architect/projects/${project.id}/tasks`);
setTasks(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [project.id]);

  const statusStyle = (s) => ({
    Done:        { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    "In Progress":{ bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    Pending:     { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    Blocked:     { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  }[s] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" });

  const priorityColor = (p) => ({
    P1: "#dc2626", P2: "#f59e0b", P3: "#64748b",
  }[p] || "#64748b");

  return (
    <SubModal
      title={project.name}
      subtitle="Tasks"
      icon="⚡"
      footerLeft={`${tasks.length} task${tasks.length !== 1 ? "s" : ""} total`}
      onClose={onClose}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading tasks…</div>
      )}
      {!loading && tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          No tasks for this project yet.
        </div>
      )}
      {!loading && tasks.map((task) => {
        const isOpen = expandedId === task.id;
        const sc = statusStyle(task.status);
        return (
          <div key={task.id} style={{
            border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10, overflow: "hidden",
          }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", cursor: "pointer",
                background: isOpen ? "#f8fafc" : "#fff",
              }}
              onClick={() => setExpandedId(isOpen ? null : task.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: "#fefce8",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>⚡</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", margin: 0 }}>
                    {task.task_no} — {task.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                    {task.incident_title ? `Incident: ${task.incident_title}` : "Direct task"}
                    {task.assigned_name ? ` · Assigned: ${task.assigned_name}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  color: priorityColor(task.priority),
                  background: task.priority === "P1" ? "#fef2f2"
                    : task.priority === "P2" ? "#fefce8" : "#f8fafc",
                }}>{task.priority}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  border: `1px solid ${sc.border}`, background: sc.bg, color: sc.color,
                }}>{task.status}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                {task.note && (
                  <p style={{
                    fontSize: 13, color: "#334155", lineHeight: 1.6,
                    background: "#fff", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid #e2e8f0", margin: "0 0 8px",
                  }}>{task.note}</p>
                )}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Created", val: fmtDate(task.created_at) },
                    { label: "Done At", val: task.done_at ? fmtDate(task.done_at) : "—" },
                    { label: "Deadline", val: task.deadline_at ? fmtDate(task.deadline_at) : "—" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{
                      padding: "8px 12px", background: "#fff", borderRadius: 8,
                      border: "1px solid #f1f5f9",
                    }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase",
                        letterSpacing: 0.8, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </SubModal>
  );
}

/* ══════════════════════════════════════════════════════════════
   INCIDENTS MODAL
══════════════════════════════════════════════════════════════ */
function ProjectIncidentsModal({ project, onClose }) {
  const [incidents, setIncidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/incidents?project_id=${project.id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const json = await res.json();
        setIncidents(json.data || json || []);
      } catch (err) {
        console.error("Failed to load incidents:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [project.id]);

  const statusStyle = (s) => ({
    Created:     { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    Assigned:    { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    "In Progress":{ bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" },
    Resolved:    { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    Closed:      { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  }[s] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" });

  const priorityColor = (p) => ({
    P1: { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
    P2: { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    P3: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  }[p] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" });

  return (
    <SubModal
      title={project.name}
      subtitle="Incidents"
      icon="🚨"
      footerLeft={`${incidents.length} incident${incidents.length !== 1 ? "s" : ""} total`}
      onClose={onClose}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading incidents…</div>
      )}
      {!loading && incidents.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚨</div>
          No incidents linked to this project.
        </div>
      )}
      {!loading && incidents.map((inc) => {
        const isOpen = expandedId === inc.id;
        const sc = statusStyle(inc.status);
        const pc = priorityColor(inc.priority);
        return (
          <div key={inc.id} style={{
            border: `1px solid ${pc.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden",
          }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", cursor: "pointer",
                background: isOpen ? "#f8fafc" : "#fff",
              }}
              onClick={() => setExpandedId(isOpen ? null : inc.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: pc.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>🚨</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", margin: 0 }}>
                    {inc.incident_no} — {inc.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                    {fmtDate(inc.created_at)}
                    {inc.deadline_at ? ` · Due: ${fmtDate(inc.deadline_at)}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                }}>{inc.priority}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  border: `1px solid ${sc.border}`, background: sc.bg, color: sc.color,
                }}>{inc.status}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {isOpen && inc.description && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                <p style={{
                  fontSize: 13, color: "#334155", lineHeight: 1.6,
                  background: "#fff", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #e2e8f0", margin: 0,
                }}>{inc.description}</p>
              </div>
            )}
          </div>
        );
      })}
    </SubModal>
  );
}

/* ══════════════════════════════════════════════════════════════
   DESIGNS MODAL
══════════════════════════════════════════════════════════════ */
function ProjectDesignsModal({ project, userId, onClose }) {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDrawings(userId, "architect");
        const all = res?.data || res || [];
        setDrawings(all.filter((d) => String(d.project_id) === String(project.id)));
      } catch (err) {
        console.error("Failed to load drawings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [project.id, userId]);

  const typeStyle = (type) =>
    type === "Working Drawing"
      ? { bg: "#fefce8", color: "#ca8a04", border: "#fde047" }
      : { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };

  const isImage = (name = "") => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
  const isPDF   = (name = "") => /\.pdf$/i.test(name);

  const recipientList = (d) => {
    const arr = d.recipients || d.sentTo || [];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((r) => r.role || r).join(", ");
  };

  return (
    <SubModal
      title={project.name}
      subtitle="Designs & Drawings"
      icon="📐"
      footerLeft={`${drawings.length} drawing${drawings.length !== 1 ? "s" : ""} total`}
      onClose={onClose}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          Loading drawings…
        </div>
      )}

      {!loading && drawings.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📐</div>
          No drawings uploaded for this project yet.
        </div>
      )}

      {!loading && drawings.map((d) => {
        const isOpen = expandedId === d.id;
        const tc = typeStyle(d.drawing_type || d.drawingType);
        const fileName = d.file_name || d.fileName || "";
        const fileUrl  = d.file_url  || d.fileUrl  || null;
        const drawingName = d.name || d.drawingName || "Untitled Drawing";
        const revision = d.current_revision || d.revision || "—";
        const uploadedAt = d.created_at || d.uploadedAt;
        const sentTo = recipientList(d);

        return (
          <div key={d.id} style={{
            border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 12, overflow: "hidden",
          }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", cursor: "pointer",
                background: isOpen ? "#f8fafc" : "#fff",
              }}
              onClick={() => setExpandedId(isOpen ? null : d.id)}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: "#f0f9ff", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>📐</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: "#0f172a",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {drawingName}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                    border: `1px solid ${tc.border}`, background: tc.bg, color: tc.color,
                  }}>
                    {d.drawing_type || d.drawingType || "Drawing"}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                    background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                  }}>
                    Rev {revision}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(uploadedAt)}</span>
                </div>
                {sentTo && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Sent to: <strong>{sentTo}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {fileName && (
                  <span style={{
                    fontSize: 11, color: "#94a3b8", maxWidth: 130,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {fileName}
                  </span>
                )}
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{
                borderTop: "1px solid #f1f5f9", background: "#fafafa", padding: "16px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              }}>
                {fileUrl && isImage(fileName) && (
                  <>
                    <img
                      src={fileUrl} alt={drawingName}
                      style={{
                        maxWidth: "100%", maxHeight: 360, objectFit: "contain",
                        borderRadius: 8, display: "block",
                      }}
                    />
                    <a
                      href={fileUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#0f172a", color: "#fff", padding: "8px 20px",
                        borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
                      }}
                    >
                      ↗ View File
                    </a>
                  </>
                )}
                {fileUrl && isPDF(fileName) && (
                  <>
                    <iframe
                      src={fileUrl} title={drawingName}
                      style={{ width: "100%", height: 400, border: "none", borderRadius: 8 }}
                    />
                    <a
                      href={fileUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#0f172a", color: "#fff", padding: "8px 20px",
                        borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
                      }}
                    >
                      ↗ Open PDF
                    </a>
                  </>
                )}
                {fileUrl && !isImage(fileName) && !isPDF(fileName) && (
                  <a
                    href={fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#0f172a", color: "#fff", padding: "8px 20px",
                      borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    ↓ Download {fileName}
                  </a>
                )}
                {!fileUrl && (
                  <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>
                    No file attached to this drawing.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </SubModal>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ArchitectProjects() {
  const [projects, setProjects]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast]               = useState({ msg: "", show: false });

  const [subModal, setSubModal] = useState(null);

  /* ── Map raw API row → UI shape ── */
  const mapProject = (p) => ({
    id:           p.id,
    name:         p.name,
    code:         "PRJ-" + p.id,
    client:       p.client,
    status:       p.status === "IN PROGRESS" ? "Active" : p.status || "Draft",
    phase:        "Execution",
    location:     p.location,
    // financials — mapped for the detail panel
    budget:       p.budget        ?? 0,
    spent:        p.spent         ?? 0,
    clientPaid:   p.client_paid   ?? 0,
    // project metadata
    buildingType: p.building_type ?? null,
    floors:       p.floors        ?? null,
    plotSize:     p.plot_size     ?? null,
    phone:        p.phone         ?? null,
    startDate:    p.start_date,
    targetDate:   p.end_date,
    updated:      p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Recently",
    architect:    "You",
   modules: {
  tasks:     { count: p.task_count     ?? 0, urgent: 0, label: "" },
  dailyLogs: { count: p.daily_log_count ?? 0, urgent: 0, label: "" },
  designs:   { count: p.drawing_count  ?? 0, urgent: 0, label: "" },
  incidents: { count: p.incident_count ?? 0, urgent: 0, label: "" },
},
    flags: [],
    stats: {
      tasks:      p?.stats?.tasks   ?? 0,
      openRFI:    p?.stats?.openRFI ?? 0,
      pending:    p?.stats?.pending ?? 0,
      completion: p?.progress       ?? 0,
    },
  });

  /* ── Fetch ── */
  const fetchProjects = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return;
      const res = await getArchitectProjects(user.id);
      setProjects(res.data.map(mapProject));
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  /* ── Toast ── */
  const showToast = (msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  };

  /* ── Filter ── */
  const filtered = useMemo(() =>
    projects.filter((p) => {
      const q = search.toLowerCase();
      return (
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)) &&
        (statusFilter === "All" || p.status === statusFilter)
      );
    }),
  [projects, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { All: projects.length };
    STATUS_FILTERS.slice(1).forEach((s) => {
      c[s] = projects.filter((p) => p.status === s).length;
    });
    return c;
  }, [projects]);

  const selectedProject = selected
    ? projects.find((p) => String(p.id) === String(selected))
    : null;

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")?.id; }
    catch { return null; }
  })();

  return (
    <div className="ap-root">
      <div className="ap-page">

        {/* Page Header — Export and New Project removed */}
        <div className="ap-page-header">
          <div>
            <div className="ap-page-eyebrow">Architect Workspace</div>
            <div className="ap-page-title">My Projects</div>
            <div className="ap-page-sub">
              {projects.length} projects · {projects.filter((p) => p.status === "Active").length} active
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="ap-controls">
          <div className="ap-search">
            <span className="ap-search-icon">⌕</span>
            <input
              placeholder="Search projects, codes, clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Status pills */}
        <div className="ap-summary-strip">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`ap-summary-pill${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              <span className={`ap-summary-pill-dot ${DOT_CLASS[s]}`} />
              {s}
              <span className="ap-summary-pill-count">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
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

      {/* ── Project Detail Modal ── */}
      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelected(null)}
          onToast={showToast}
          onModuleClick={(key, proj) => {
            if (key === "dailyLogs") setSubModal({ type: "logs",    project: proj });
            if (key === "designs")   setSubModal({ type: "designs", project: proj });
            if (key === "tasks")      setSubModal({ type: "tasks",     project: proj }); // ✅ add
  if (key === "incidents")  setSubModal({ type: "incidents", project: proj }); 
          }}
        />
      )}

      {/* ── Daily Logs sub-modal ── */}
      {subModal?.type === "logs" && (
        <ProjectLogsModal
          project={subModal.project}
          userId={currentUserId}
          onClose={() => setSubModal(null)}
        />
      )}

      {/* ── Designs sub-modal ── */}
      {subModal?.type === "designs" && (
        <ProjectDesignsModal
          project={subModal.project}
          userId={currentUserId}
          onClose={() => setSubModal(null)}
        />
      )}
{/* ── Tasks sub-modal ── */}
{subModal?.type === "tasks" && (
  <ProjectTasksModal
    project={subModal.project}
    userId={currentUserId}
    onClose={() => setSubModal(null)}
  />
)}

{/* ── Incidents sub-modal ── */}
{subModal?.type === "incidents" && (
  <ProjectIncidentsModal
    project={subModal.project}
    onClose={() => setSubModal(null)}
  />
)}
      {/* Toast */}
      <div className={`ap-toast${toast.show ? " show" : ""}`}>
        {toast.msg}
      </div>
    </div>
  );
}