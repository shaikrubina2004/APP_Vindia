import React, { useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./Milestone.css";

/* ─────────────────────────────────────────
   TEMPLATE DATA  (single source of truth)
───────────────────────────────────────── */
const DEFAULT_TEMPLATE = {
  id: "T001",
  code: "STD-CONST",
  name: "Standard Construction Template",
  tasks: [
    {
      id: "1", code: "1", title: "Site Preparation", isMilestone: true,
      subtasks: [
        { id: "1.1", code: "1.1", title: "Site Clearance" },
        { id: "1.2", code: "1.2", title: "Site Layout & Setting Out" },
        { id: "1.3", code: "1.3", title: "Mobilization" },
      ],
    },
    {
      id: "2", code: "2", title: "Earthwork & Foundation", isMilestone: true,
      subtasks: [
        { id: "2.1", code: "2.1", title: "Excavation" },
        { id: "2.2", code: "2.2", title: "Foundation Construction" },
        { id: "2.3", code: "2.3", title: "Plinth Beam Construction" },
        { id: "2.4", code: "2.4", title: "Backfilling & Compaction" },
      ],
    },
    {
      id: "3", code: "3", title: "Superstructure Construction", isMilestone: true,
      subtasks: [
        { id: "3.1", code: "3.1", title: "Structural Frame" },
        { id: "3.2", code: "3.2", title: "Masonry Work" },
        { id: "3.3", code: "3.3", title: "Roofing & Enclosure" },
      ],
    },
    {
      id: "4", code: "4", title: "MEP Works", isMilestone: true,
      subtasks: [
        { id: "4.1", code: "4.1", title: "First Fix (Rough-in)" },
        { id: "4.2", code: "4.2", title: "Second Fix (Finishing)" },
      ],
    },
    {
      id: "5", code: "5", title: "Finishing Works", isMilestone: true,
      subtasks: [
        { id: "5.1", code: "5.1", title: "Interior Finishes" },
        { id: "5.2", code: "5.2", title: "Exterior Finishes" },
        { id: "5.3", code: "5.3", title: "External Works" },
      ],
    },
    {
      id: "6", code: "6", title: "Project Completion", isMilestone: true,
      subtasks: [
        { id: "6.1", code: "6.1", title: "Final Inspection (Punch List)" },
        { id: "6.2", code: "6.2", title: "Rectification Works" },
        { id: "6.3", code: "6.3", title: "Handover & Certification" },
      ],
    },
  ],
};

/* ─────────────────────────────────────────
   MOCK DATA — each milestone = one template task
   nextPlan.subtasks = subtasks of next milestone
───────────────────────────────────────── */
const MOCK_MILESTONES = [
  /* ── Eiffel Tower: Task 1 – Site Preparation (completed) ── */
  {
    id: 1,
    templateTaskId: "1",
    title: "Site Preparation",
    project: "Eiffel Tower – Paris",
    phase: "Pre-Construction",
    description: "Complete full site clearance, layout, and mobilisation for the Eiffel Tower construction zone.",
    startDate: "2025-04-01",
    dueDate: "2025-04-25",
    progress: 100,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "None",
    dependencies: "None",
    budget: 1500000,
    subtasks: [
      { id: "s1", code: "1.1", title: "Site Clearance",            status: "completed" },
      { id: "s2", code: "1.2", title: "Site Layout & Setting Out", status: "completed" },
      { id: "s3", code: "1.3", title: "Mobilization",              status: "completed" },
    ],
    payment: { amount: 1500000, status: "paid", paidOn: "2025-04-28", method: "Bank Transfer", invoiceNo: "INV-2025-001" },
    nextPlan: {
      title: "Earthwork & Foundation",
      startDate: "2025-05-01",
      notes: "Begin excavation immediately after site clearance sign-off. Ensure soil test reports are ready.",
      subtasks: [
        { id: "ns1", code: "2.1", title: "Excavation",               status: "not-started" },
        { id: "ns2", code: "2.2", title: "Foundation Construction",  status: "not-started" },
        { id: "ns3", code: "2.3", title: "Plinth Beam Construction", status: "not-started" },
        { id: "ns4", code: "2.4", title: "Backfilling & Compaction", status: "not-started" },
      ],
    },
    visibleToClient: true,
  },

  /* ── Eiffel Tower: Task 2 – Earthwork & Foundation (completed) ── */
  {
    id: 2,
    templateTaskId: "2",
    title: "Earthwork & Foundation",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete all earthwork and foundation including excavation, concrete pouring, plinth beam and backfilling for Block A and B.",
    startDate: "2025-05-01",
    dueDate: "2025-06-10",
    progress: 100,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "None",
    dependencies: "Site Preparation",
    budget: 4200000,
    subtasks: [
      { id: "s4", code: "2.1", title: "Excavation",               status: "completed" },
      { id: "s5", code: "2.2", title: "Foundation Construction",  status: "completed" },
      { id: "s6", code: "2.3", title: "Plinth Beam Construction", status: "completed" },
      { id: "s7", code: "2.4", title: "Backfilling & Compaction", status: "completed" },
    ],
    payment: { amount: 4200000, status: "paid", paidOn: "2025-06-12", method: "Bank Transfer", invoiceNo: "INV-2025-002" },
    nextPlan: {
      title: "Superstructure Construction",
      startDate: "2025-06-15",
      notes: "Begin column casting for Block A immediately after foundation curing. Ensure steel procurement is complete.",
      subtasks: [
        { id: "ns5", code: "3.1", title: "Structural Frame",    status: "not-started" },
        { id: "ns6", code: "3.2", title: "Masonry Work",        status: "not-started" },
        { id: "ns7", code: "3.3", title: "Roofing & Enclosure", status: "not-started" },
      ],
    },
    visibleToClient: true,
  },

  /* ── Eiffel Tower: Task 3 – Superstructure (delayed) ── */
  {
    id: 3,
    templateTaskId: "3",
    title: "Superstructure Construction",
    project: "Eiffel Tower – Paris",
    phase: "Structural",
    description: "Complete full structural work — columns, beams, slab, masonry walls, and roofing for Block A.",
    startDate: "2025-06-15",
    dueDate: "2025-07-15",
    progress: 45,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Material delay risk — steel procurement pending",
    dependencies: "Earthwork & Foundation",
    budget: 8700000,
    subtasks: [
      { id: "s8",  code: "3.1", title: "Structural Frame",    status: "completed"   },
      { id: "s9",  code: "3.2", title: "Masonry Work",        status: "in-progress" },
      { id: "s10", code: "3.3", title: "Roofing & Enclosure", status: "not-started" },
    ],
    payment: { amount: 3915000, status: "partial", paidOn: "2025-07-01", method: "Cheque", invoiceNo: "INV-2025-003" },
    nextPlan: {
      title: "MEP Works",
      startDate: "2025-07-25",
      notes: "MEP rough-in to begin once structural frame is fully complete and inspected.",
      subtasks: [
        { id: "ns8", code: "4.1", title: "First Fix (Rough-in)",   status: "not-started" },
        { id: "ns9", code: "4.2", title: "Second Fix (Finishing)", status: "not-started" },
      ],
    },
    visibleToClient: true,
  },

  /* ── NH-66: Task 1 – Site Preparation (delayed) ── */
  {
    id: 4,
    templateTaskId: "1",
    title: "Site Preparation",
    project: "NH-66",
    phase: "Pre-Construction",
    description: "Site clearance, layout and mobilisation for the 5km NH-66 highway stretch.",
    startDate: "2025-05-01",
    dueDate: "2025-05-20",
    progress: 60,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Weather dependency — monsoon risk",
    dependencies: "Survey and alignment approval",
    budget: 2000000,
    subtasks: [
      { id: "s11", code: "1.1", title: "Site Clearance",            status: "completed"   },
      { id: "s12", code: "1.2", title: "Site Layout & Setting Out", status: "completed"   },
      { id: "s13", code: "1.3", title: "Mobilization",              status: "in-progress" },
    ],
    payment: { amount: 0, status: "overdue", paidOn: null, method: "Bank Transfer", invoiceNo: "INV-2025-004" },
    nextPlan: {
      title: "Earthwork & Foundation",
      startDate: "2025-06-01",
      notes: "Excavation and base course laying to begin after mobilisation and government inspector sign-off.",
      subtasks: [
        { id: "ns10", code: "2.1", title: "Excavation",               status: "not-started" },
        { id: "ns11", code: "2.2", title: "Foundation Construction",  status: "not-started" },
        { id: "ns12", code: "2.3", title: "Plinth Beam Construction", status: "not-started" },
        { id: "ns13", code: "2.4", title: "Backfilling & Compaction", status: "not-started" },
      ],
    },
    visibleToClient: true,
  },

  /* ── Tajmahal: Task 1 – Site Preparation (not started) ── */
  {
    id: 5,
    templateTaskId: "1",
    title: "Site Preparation",
    project: "Tajmahal",
    phase: "Pre-Construction",
    description: "Complete full site clearance, leveling, boundary marking and mobilisation.",
    startDate: "2025-06-20",
    dueDate: "2025-07-05",
    progress: 0,
    assignedTo: "Nikhil (Site Engineer)",
    risks: "Permit approval delay",
    dependencies: "None",
    budget: 500000,
    subtasks: [
      { id: "s14", code: "1.1", title: "Site Clearance",            status: "not-started" },
      { id: "s15", code: "1.2", title: "Site Layout & Setting Out", status: "not-started" },
      { id: "s16", code: "1.3", title: "Mobilization",              status: "not-started" },
    ],
    payment: { amount: 0, status: "pending", paidOn: null, method: "Cheque", invoiceNo: "INV-2025-005" },
    nextPlan: {
      title: "Earthwork & Foundation",
      startDate: "2025-07-10",
      notes: "Soil testing and foundation survey to begin after site clearance and permit approval.",
      subtasks: [
        { id: "ns14", code: "2.1", title: "Excavation",               status: "not-started" },
        { id: "ns15", code: "2.2", title: "Foundation Construction",  status: "not-started" },
        { id: "ns16", code: "2.3", title: "Plinth Beam Construction", status: "not-started" },
        { id: "ns17", code: "2.4", title: "Backfilling & Compaction", status: "not-started" },
      ],
    },
    visibleToClient: false,
  },
];

/* ─── helpers ─── */
const today = new Date();

const getStatus = (m) => {
  if (m.progress === 100) return "completed";
  if (new Date(m.dueDate) < today && m.progress < 100) return "delayed";
  if (m.progress > 0) return "in-progress";
  return "not-started";
};

const STATUS_CFG = {
  "completed":   { label: "Completed",   bg: "#d1fae5", color: "#065f46", border: "#10b981", bar: "#10b981" },
  "in-progress": { label: "In Progress", bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb", bar: "#2563eb" },
  "delayed":     { label: "Delayed",     bg: "#fee2e2", color: "#991b1b", border: "#ef4444", bar: "#ef4444" },
  "not-started": { label: "Not Started", bg: "#f1f5f9", color: "#475569", border: "#94a3b8", bar: "#cbd5e1" },
};

const PAY_CFG = {
  paid:    { label: "Paid",            bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  partial: { label: "Partial",         bg: "#dbeafe", color: "#1e3a8a", border: "#2563eb" },
  pending: { label: "Pending",         bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  overdue: { label: "Payment Overdue", bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

const SUBTASK_STATUS_CFG = {
  "completed":   { color: "#10b981", bg: "#d1fae5", border: "#10b981" },
  "in-progress": { color: "#2563eb", bg: "#dbeafe", border: "#2563eb" },
  "not-started": { color: "#cbd5e1", bg: "#f8fafc", border: "#cbd5e1" },
};

const TABS = ["All", "In Progress", "Completed", "Delayed", "Not Started"];

const fmt     = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtCr   = (n) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;
const daysLeft = (due) => Math.ceil((new Date(due) - today) / (1000 * 60 * 60 * 24));

/* ══════════════════════════════════════════
   SMALL COMPONENTS
══════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status];
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      <span className="ms-badge__dot" style={{ background: c.color }} />
      {c.label}
    </span>
  );
};

const PayBadge = ({ status }) => {
  const c = PAY_CFG[status] || PAY_CFG.pending;
  return (
    <span className="ms-badge" style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>
      {c.label}
    </span>
  );
};

const DetailBlock = ({ label, val, wide, highlight }) => (
  <div
    className={`ms-detail-block ${wide ? "ms-detail-block--wide" : ""}`}
    style={highlight ? { borderColor: highlight, background: `${highlight}08` } : {}}
  >
    <p className="ms-detail-label">{label}</p>
    <p className="ms-detail-val">{val || "—"}</p>
  </div>
);

/* ── Subtask vertical timeline tracker ── */
const SubtaskTracker = ({ subtasks, title = "Subtasks" }) => {
  if (!subtasks || subtasks.length === 0) {
    return (
      <div className="ms-subtask-tracker">
        <p className="ms-subtask-tracker__title">{title}</p>
        <p className="ms-subtask-empty">No subtasks defined.</p>
      </div>
    );
  }
  return (
    <div className="ms-subtask-tracker">
      <p className="ms-subtask-tracker__title">{title}</p>
      <div className="ms-subtask-timeline">
        {subtasks.map((st, idx) => {
          const cfg    = SUBTASK_STATUS_CFG[st.status] || SUBTASK_STATUS_CFG["not-started"];
          const isLast = idx === subtasks.length - 1;
          const nextCfg = !isLast
            ? (SUBTASK_STATUS_CFG[subtasks[idx + 1]?.status] || SUBTASK_STATUS_CFG["not-started"])
            : null;
          return (
            <div key={st.id} className="ms-subtask-item">
              <div className="ms-subtask-item__line-col">
                <div
                  className="ms-subtask-dot"
                  style={{
                    background: st.status === "not-started" ? "#fff" : cfg.color,
                    borderColor: cfg.color,
                  }}
                >
                  {st.status === "completed" && <span className="ms-subtask-dot__check">✓</span>}
                  {st.status === "in-progress" && (
                    <span className="ms-subtask-dot__pulse" style={{ background: cfg.color }} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="ms-subtask-connector"
                    style={{
                      background: subtasks[idx + 1]?.status === "not-started" ? "#e2eaf4" : nextCfg?.color,
                    }}
                  />
                )}
              </div>
              <div className="ms-subtask-item__content">
                <span className="ms-subtask-code">{st.code}</span>
                <span className="ms-subtask-name">{st.title}</span>
                <span
                  className="ms-subtask-status-badge"
                  style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                >
                  {st.status === "completed" ? "Done" : st.status === "in-progress" ? "Active" : "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MILESTONE PLANNING POPUP
══════════════════════════════════════════ */
const MilestonePlanningPopup = ({ projects, onClose }) => {
  const [step,            setStep]            = useState(1);
  const [selectedProject, setSelectedProject] = useState("");
  const [wbsTasks,        setWbsTasks]        = useState(null);
  const [editMode,        setEditMode]        = useState(false);
  const [expandedTasks,   setExpandedTasks]   = useState({});

  const handleAddTemplate = () => {
    setWbsTasks(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE.tasks)));
    setStep(2);
  };

  const toggleExpand      = (id)         => setExpandedTasks(p => ({ ...p, [id]: !p[id] }));
  const handleDeleteTask  = (taskId)     => setWbsTasks(prev => prev.filter(t => t.id !== taskId));
  const handleDeleteSub   = (tid, sid)   => setWbsTasks(prev =>
    prev.map(t => t.id === tid ? { ...t, subtasks: t.subtasks.filter(s => s.id !== sid) } : t));
  const handleAddMilestone = () => {
    const code = `${wbsTasks.length + 1}`;
    setWbsTasks(prev => [
      ...prev,
      { id: `${Date.now()}`, code, title: "New Milestone", isMilestone: true, subtasks: [] },
    ]);
  };
  const handleAddSubtask  = (taskId)          => setWbsTasks(prev => prev.map(t => {
    if (t.id !== taskId) return t;
    const sub = { id: `${Date.now()}`, code: `${t.code}.${t.subtasks.length + 1}`, title: "New Subtask" };
    return { ...t, subtasks: [...t.subtasks, sub] };
  }));
  const handleRenameTask  = (tid, title)       => setWbsTasks(prev => prev.map(t => t.id === tid ? { ...t, title } : t));
  const handleRenameSub   = (tid, sid, title)  => setWbsTasks(prev =>
    prev.map(t => t.id === tid ? { ...t, subtasks: t.subtasks.map(s => s.id === sid ? { ...s, title } : s) } : t));

  const realProjects = projects.filter(p => p !== "All");

  return (
    <div className="ms-popup-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ms-popup">

        {/* Header */}
        <div className="ms-popup__header">
          <div>
            <h2 className="ms-popup__title">Milestone Planning</h2>
            <p className="ms-popup__sub">
              {step === 1 ? "Select a project and apply a template to auto-plan milestones" : `Planning for: ${selectedProject}`}
            </p>
          </div>
          <button className="ms-popup__close" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div className="ms-popup__steps">
          <div className={`ms-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
            <span className="ms-step__num">{step > 1 ? "✓" : "1"}</span>
            <span className="ms-step__label">Choose Project</span>
          </div>
          <div className="ms-step__line" />
          <div className={`ms-step ${step >= 2 ? "active" : ""}`}>
            <span className="ms-step__num">2</span>
            <span className="ms-step__label">Review & Plan</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="ms-popup__body">
            <div className="ms-popup__field">
              <label className="ms-popup__label">Select Project</label>
              <select className="ms-popup__select" value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}>
                <option value="">— Choose a project —</option>
                {realProjects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="ms-popup__field" style={{ marginTop: 20 }}>
              <label className="ms-popup__label">Template</label>
              <div className="ms-template-card">
                <div className="ms-template-card__icon">📋</div>
                <div className="ms-template-card__info">
                  <p className="ms-template-card__name">{DEFAULT_TEMPLATE.name}</p>
                  <p className="ms-template-card__meta">
                    {DEFAULT_TEMPLATE.tasks.length} milestones ·{" "}
                    {DEFAULT_TEMPLATE.tasks.reduce((s, t) => s + t.subtasks.length, 0)} subtasks
                  </p>
                  <p className="ms-template-card__desc">
                    Standard construction workflow: Site Prep → Foundation → Superstructure → MEP → Finishing → Handover.
                  </p>
                </div>
                <div className="ms-template-card__badge">Default</div>
              </div>
            </div>

            <div className="ms-popup__footer">
              <button className="ms-btn ms-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="ms-btn ms-btn--primary" disabled={!selectedProject} onClick={handleAddTemplate}>
                Next — Review Tasks →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="ms-popup__body ms-popup__body--scroll">
            <div className="ms-wbs-toolbar">
              <p className="ms-wbs-toolbar__info">
                {wbsTasks?.length} milestones will be created for <strong>{selectedProject}</strong>
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`ms-btn ms-btn--sm ${editMode ? "ms-btn--active" : "ms-btn--ghost"}`}
                  onClick={() => setEditMode(v => !v)}
                >
                  {editMode ? "✓ Done Editing" : "✏ Edit Template"}
                </button>
                {editMode && (
                  <button className="ms-btn ms-btn--sm ms-btn--outline-green" onClick={handleAddMilestone}>
                    + Add Milestone
                  </button>
                )}
              </div>
            </div>

            <div className="ms-wbs-list">
              {wbsTasks?.map(task => (
                <div key={task.id} className="ms-wbs-task">
                  <div className="ms-wbs-task__header" onClick={() => !editMode && toggleExpand(task.id)}>
                    <div className="ms-wbs-task__left">
                      <span className="ms-wbs-task__code">{task.code}</span>
                      {editMode ? (
                        <input className="ms-wbs-input" value={task.title}
                          onChange={e => handleRenameTask(task.id, e.target.value)}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="ms-wbs-task__title">{task.title}</span>
                      )}
                      <span className="ms-milestone-chip">Milestone</span>
                    </div>
                    <div className="ms-wbs-task__right">
                      <span className="ms-wbs-task__sub-count">{task.subtasks.length} subtasks</span>
                      {editMode
                        ? <button className="ms-wbs-del" onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>🗑</button>
                        : <span className="ms-wbs-chevron">{expandedTasks[task.id] ? "▲" : "▼"}</span>
                      }
                    </div>
                  </div>

                  {(editMode || expandedTasks[task.id]) && (
                    <div className="ms-wbs-subtasks">
                      {task.subtasks.map(sub => (
                        <div key={sub.id} className="ms-wbs-sub">
                          <span className="ms-wbs-sub__code">{sub.code}</span>
                          {editMode ? (
                            <input className="ms-wbs-input ms-wbs-input--sub" value={sub.title}
                              onChange={e => handleRenameSub(task.id, sub.id, e.target.value)} />
                          ) : (
                            <span className="ms-wbs-sub__title">{sub.title}</span>
                          )}
                          {editMode && (
                            <button className="ms-wbs-del ms-wbs-del--sm"
                              onClick={() => handleDeleteSub(task.id, sub.id)}>✕</button>
                          )}
                        </div>
                      ))}
                      {editMode && (
                        <button className="ms-wbs-add-sub" onClick={() => handleAddSubtask(task.id)}>
                          + Add Subtask
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ms-popup__footer">
              <button className="ms-btn ms-btn--ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="ms-btn ms-btn--primary" onClick={onClose}>
                ✓ Save & Auto-Plan Milestones
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Milestone() {
  const milestones = MOCK_MILESTONES.map(m => ({ ...m, status: getStatus(m) }));

  const [activeTab,     setActiveTab]     = useState("All");
  const [expandedId,    setExpanded]      = useState(null);
  const [filterProj,    setFilterProj]    = useState("All");
  const [clientView,    setClientView]    = useState(false);
  const [activeSection, setActiveSection] = useState({});
  const [showPlanning,  setShowPlanning]  = useState(false);

  const projects = ["All", ...new Set(milestones.map(m => m.project))];

  const visibleMilestones = clientView ? milestones.filter(m => m.visibleToClient) : milestones;

  /* project filter drives stats + list */
  const projFiltered = filterProj === "All"
    ? visibleMilestones
    : visibleMilestones.filter(m => m.project === filterProj);

  const filtered = projFiltered.filter(m =>
    activeTab === "All" ||
    (activeTab === "In Progress" && m.status === "in-progress") ||
    (activeTab === "Completed"   && m.status === "completed")   ||
    (activeTab === "Delayed"     && m.status === "delayed")     ||
    (activeTab === "Not Started" && m.status === "not-started")
  );

  const counts = {
    total:      projFiltered.length,
    completed:  projFiltered.filter(m => m.status === "completed").length,
    inProgress: projFiltered.filter(m => m.status === "in-progress").length,
    delayed:    projFiltered.filter(m => m.status === "delayed").length,
    notStarted: projFiltered.filter(m => m.status === "not-started").length,
  };

  const totalBudget = projFiltered.reduce((s, m) => s + (m.budget || 0), 0);
  const totalPaid   = projFiltered.reduce((s, m) => s + (m.payment?.amount || 0), 0);
  const payPct      = totalBudget ? Math.round((totalPaid / totalBudget) * 100) : 0;
  const overallPct  = projFiltered.length
    ? Math.round(projFiltered.reduce((s, m) => s + m.progress, 0) / projFiltered.length)
    : 0;

  const radialData = [
    { name: "Completed",   value: counts.completed,  fill: "#10b981" },
    { name: "In Progress", value: counts.inProgress, fill: "#2563eb" },
    { name: "Delayed",     value: counts.delayed,    fill: "#ef4444" },
    { name: "Not Started", value: counts.notStarted, fill: "#cbd5e1" },
  ];

  const getSec = (id) => activeSection[id] || "details";
  const setSec = (id, sec) => setActiveSection(p => ({ ...p, [id]: sec }));

  return (
    <div className="ms-page">

      {showPlanning && (
        <MilestonePlanningPopup projects={projects} onClose={() => setShowPlanning(false)} />
      )}

      {/* ════════════════════════════════
          HEADER — all controls one line
          ════════════════════════════════ */}
      <div className="ms-header">
        <h1 className="ms-title">Milestones</h1>

        <div className="ms-header-controls">
          <button className="ms-plan-btn" onClick={() => setShowPlanning(true)}>
            <span>📋</span> Milestone Planning
          </button>

          <div className="ms-toggle-wrap">
            <span className="ms-toggle-label">Client View</span>
            <button className={`ms-toggle ${clientView ? "on" : ""}`}
              onClick={() => setClientView(v => !v)}>
              <span className="ms-toggle__knob" />
            </button>
          </div>

          <select className="ms-select" value={filterProj}
            onChange={e => setFilterProj(e.target.value)}>
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {clientView && (
        <div className="ms-client-banner">
          <span className="ms-client-banner__dot" />
          <span>Client View — showing only milestones marked visible to client ({counts.total} milestones)</span>
        </div>
      )}

      {/* ════════════════════════════════
          SUMMARY
          ════════════════════════════════ */}
      <div className="ms-summary">
        <div className="ms-stat-grid">
          {[
            { label: "Total",       val: counts.total,      color: "#0a2540" },
            { label: "Completed",   val: counts.completed,  color: "#10b981" },
            { label: "In Progress", val: counts.inProgress, color: "#2563eb" },
            { label: "Delayed",     val: counts.delayed,    color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="ms-stat-card">
              <p className="ms-stat-card__label">{s.label}</p>
              <p className="ms-stat-card__val" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="ms-summary-row2">
          {/* Radial chart */}
          <div className="ms-chart-card">
            <div className="ms-chart-card__left">
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%"
                  data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#f0f6ff" }} />
                  <Tooltip content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="ms-tooltip">
                        <p style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].payload.name}</p>
                        <p>{payload[0].value} milestones</p>
                      </div>
                    ) : null} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="ms-chart-card__right">
              <p className="ms-chart-card__pct">{overallPct}%</p>
              <p className="ms-chart-card__sublabel">Overall Progress</p>
              <div className="ms-chart-legend">
                {radialData.map(d => (
                  <div key={d.name} className="ms-legend-row">
                    <span className="ms-legend-dot" style={{ background: d.fill }} />
                    <span className="ms-legend-label">{d.name}</span>
                    <span className="ms-legend-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="ms-pay-summary">
            <p className="ms-pay-summary__title">Payment Overview</p>
            <div className="ms-pay-summary__row">
              <div>
                <p className="ms-pay-summary__label">Total Budget</p>
                <p className="ms-pay-summary__val">{fmtCr(totalBudget)}</p>
              </div>
              <div>
                <p className="ms-pay-summary__label">Received</p>
                <p className="ms-pay-summary__val" style={{ color: "#10b981" }}>{fmtCr(totalPaid)}</p>
              </div>
            </div>
            <div className="ms-pay-bar-track">
              <div className="ms-pay-bar-fill" style={{ width: `${payPct}%` }} />
            </div>
            <p className="ms-pay-pct">{payPct}% received · {fmtCr(totalBudget - totalPaid)} outstanding</p>
            <p className="ms-pay-note">Full payment details available in the Payments section.</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          TABS
          ════════════════════════════════ */}
      <div className="ms-tabs">
        {TABS.map(t => {
          const cnt =
            t === "All"         ? counts.total :
            t === "In Progress" ? counts.inProgress :
            t === "Completed"   ? counts.completed :
            t === "Delayed"     ? counts.delayed : counts.notStarted;
          return (
            <button key={t} className={`ms-tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}>
              {t}<span className="ms-tab__count">{cnt}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="ms-empty">No milestones found for this filter.</div>
      )}

      {/* ════════════════════════════════
          MILESTONE CARDS
          ════════════════════════════════ */}
      <div className="ms-list">
        {filtered.map(m => {
          const sc        = STATUS_CFG[m.status];
          const isOpen    = expandedId === m.id;
          const days      = daysLeft(m.dueDate);
          const isOverdue = m.status === "delayed";
          const sec       = getSec(m.id);

          return (
            <div key={m.id} className={`ms-card ${isOpen ? "open" : ""} ${isOverdue ? "overdue" : ""}`}>
              <div className="ms-card__accent" style={{ background: sc.bar }} />

              {/* ── COLLAPSED HEADER — no subtasks shown ── */}
              <div className="ms-card__header" onClick={() => setExpanded(isOpen ? null : m.id)}>
                <div className="ms-card__main">
                  {/* title + badges */}
                  <div className="ms-card__top">
                    <h3 className="ms-card__title">{m.title}</h3>
                    <StatusBadge status={m.status} />
                    {m.visibleToClient && <span className="ms-client-chip">Client</span>}
                  </div>

                  {/* project · phase */}
                  <p className="ms-card__project">{m.project} &nbsp;·&nbsp; {m.phase}</p>

                  {/* compact info row */}
                  <div className="ms-card__info-row">
                    <span className="ms-card__info-item">
                      <span className="ms-card__info-label">Budget</span>
                      <span className="ms-card__info-val">{fmtCr(m.budget)}</span>
                    </span>
                    <span className="ms-card__info-sep">·</span>
                    <span className="ms-card__info-item">
                      <span className="ms-card__info-label">Due</span>
                      <span className="ms-card__info-val">{fmt(m.dueDate)}</span>
                    </span>
                    <span className="ms-card__info-sep">·</span>
                    <span className="ms-card__info-item">
                      <span className="ms-card__info-label">{isOverdue ? "Overdue by" : "Left"}</span>
                      <span className="ms-card__info-val"
                        style={{ color: isOverdue ? "#ef4444" : days <= 7 ? "#f59e0b" : "#0a2540" }}>
                        {isOverdue ? `${Math.abs(days)}d` : days > 0 ? `${days}d` : "Today"}
                      </span>
                    </span>
                  </div>

                  {/* progress bar */}
                  <div className="ms-card__progress-row">
                    <div className="ms-bar-track">
                      <div className="ms-bar-fill" style={{ width: `${m.progress}%`, background: sc.bar }} />
                    </div>
                    <span className="ms-card__pct" style={{ color: sc.bar }}>{m.progress}%</span>
                  </div>
                  {/* subtasks NOT shown here — only on expand */}
                </div>

                <span className="ms-chevron">{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* ── EXPANDED BODY ── */}
              {isOpen && (
                <div className="ms-card__body">

                  {/* inner tabs: Milestone Details | Next Planning */}
                  <div className="ms-inner-tabs">
                    {["details", "next"].map(s => (
                      <button key={s}
                        className={`ms-inner-tab ${sec === s ? "active" : ""}`}
                        onClick={() => setSec(m.id, s)}>
                        {s === "details" ? "Milestone Details" : "Next Planning"}
                      </button>
                    ))}
                  </div>

                  {/* ── MILESTONE DETAILS: left = subtask tracker, right = fields ── */}
                  {sec === "details" && (
                    <div className="ms-expanded-two-col">

                      {/* LEFT: subtask vertical timeline */}
                      <div className="ms-expanded-col-left">
                        <SubtaskTracker subtasks={m.subtasks} title="Subtasks" />
                      </div>

                      {/* RIGHT: detail fields */}
                      <div className="ms-expanded-col-right">
                        <div className="ms-detail-grid">
                          <DetailBlock label="Description"    val={m.description} wide />
                          <DetailBlock label="Start Date"     val={fmt(m.startDate)} />
                          <DetailBlock label="Due Date"       val={fmt(m.dueDate)} />
                          <DetailBlock label="Assigned To"    val={m.assignedTo} />
                          <DetailBlock label="Phase"          val={m.phase} />
                          <DetailBlock label="Dependencies"   val={m.dependencies} />
                          <DetailBlock label="Risks / Issues" val={m.risks}
                            highlight={m.risks !== "None" ? "#ef4444" : null} />
                          <div className="ms-detail-block">
                            <p className="ms-detail-label">Visible to Client</p>
                            <p className="ms-detail-val"
                              style={{ color: m.visibleToClient ? "#10b981" : "#94a3b8", fontWeight: 700 }}>
                              {m.visibleToClient ? "Yes — visible" : "No — internal only"}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ── NEXT PLANNING: left = next subtasks, right = milestone info ── */}
                  {sec === "next" && (
                    <div className="ms-expanded-two-col">

                      {/* LEFT: next milestone's subtask tracker */}
                      <div className="ms-expanded-col-left">
                        <SubtaskTracker
                          subtasks={m.nextPlan?.subtasks || []}
                          title="Planned Subtasks"
                        />
                      </div>

                      {/* RIGHT: next milestone details + timeline */}
                      <div className="ms-expanded-col-right">
                        <div className="ms-next-card">
                          <div className="ms-next-card__header">
                            <div>
                              <p className="ms-next-card__label">Next Milestone</p>
                              <h3 className="ms-next-card__title">{m.nextPlan?.title || "—"}</h3>
                            </div>
                            <div className="ms-next-card__date">
                              <p className="ms-next-card__label">Planned Start</p>
                              <p className="ms-next-card__dateval">{fmt(m.nextPlan?.startDate)}</p>
                            </div>
                          </div>

                          <div className="ms-next-card__notes">
                            <p className="ms-detail-label">Planning Notes</p>
                            <p className="ms-next-card__notetext">{m.nextPlan?.notes || "—"}</p>
                          </div>

                          {/* timeline */}
                          <div className="ms-timeline">
                            <div className="ms-timeline__item">
                              <div className="ms-timeline__dot" style={{ background: sc.bar }} />
                              <div className="ms-timeline__content">
                                <p className="ms-timeline__title">{m.title}</p>
                                <p className="ms-timeline__sub">Due: {fmt(m.dueDate)} · {m.progress}% complete</p>
                              </div>
                            </div>
                            <div className="ms-timeline__line" />
                            <div className="ms-timeline__item">
                              <div className="ms-timeline__dot ms-timeline__dot--next" />
                              <div className="ms-timeline__content">
                                <p className="ms-timeline__title">{m.nextPlan?.title}</p>
                                <p className="ms-timeline__sub">Planned Start: {fmt(m.nextPlan?.startDate)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}