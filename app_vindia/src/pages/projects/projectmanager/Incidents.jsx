import React, { useState, useRef } from "react";

/* ─── SHARED STATE (lifted to parent) ─────────────────────── */
// This file exports TWO components: IncidentManagement and TaskQueue
// Both are driven by the same shared store passed as props.
// Wrap both in <AppShell /> which owns the state.

const PRIORITY_CONFIG = {
  P1: {
    label: "P1 - Urgent",
    color: "p1",
    days: 0,
    icon: "🔴",
    desc: "Same day resolution",
  },
  P2: {
    label: "P2 - Medium",
    color: "p2",
    days: 2,
    icon: "🟡",
    desc: "2–3 days resolution",
  },
  P3: {
    label: "P3 - Low",
    color: "p3",
    days: 7,
    icon: "🟢",
    desc: "Low priority",
  },
};

const STATUS_FLOW = [
  "Created",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

const STATUS_CONFIG = {
  Created: { color: "s-created", icon: "✦" },
  Assigned: { color: "s-assigned", icon: "◎" },
  "In Progress": { color: "s-inprogress", icon: "◐" },
  Resolved: { color: "s-resolved", icon: "✔" },
  Closed: { color: "s-closed", icon: "■" },
};

const TASK_STATUS_FLOW = ["Pending", "In Progress", "Done", "Blocked"];
const TASK_STATUS_CONFIG = {
  Pending: { color: "ts-pending", icon: "○" },
  "In Progress": { color: "ts-inprog", icon: "◐" },
  Done: { color: "ts-done", icon: "✔" },
  Blocked: { color: "ts-blocked", icon: "✕" },
};

const ASSIGNEE_ROLES = [
  "Site Engineer",
  "Architect",
  "Manager",
  "Supervisor",
  "Contractor",
];

const MOCK_INCIDENTS = [
  {
    id: "INC-001",
    title: "Water leakage in Block B basement",
    description:
      "Severe water seepage detected near the eastern wall of Block B basement. Structural damage risk.",
    priority: "P1",
    status: "In Progress",
    assignedTo: "Site Engineer",
    assignedName: "Rajesh Kumar",
    createdAt: new Date(Date.now() - 3 * 3600000),
    updatedAt: new Date(Date.now() - 1 * 3600000),
    photo: null,
    comments: [
      {
        author: "Rajesh Kumar",
        text: "Investigating the source.",
        time: new Date(Date.now() - 2 * 3600000),
      },
    ],
    tasks: [],
  },
  {
    id: "INC-002",
    title: "Electrical wiring exposed on 3rd floor",
    description:
      "Exposed wiring near the corridor on floor 3. Safety hazard for workers.",
    priority: "P1",
    status: "Assigned",
    assignedTo: "Site Engineer",
    assignedName: "Priya Sharma",
    createdAt: new Date(Date.now() - 5 * 3600000),
    updatedAt: new Date(Date.now() - 4 * 3600000),
    photo: null,
    comments: [],
    tasks: [],
  },
  {
    id: "INC-003",
    title: "Design revision required for staircase",
    description:
      "Client requested staircase width increase from 1.2m to 1.5m as per new accessibility norms.",
    priority: "P2",
    status: "Created",
    assignedTo: "Architect",
    assignedName: "Anita Desai",
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    photo: null,
    comments: [],
    tasks: [],
  },
  {
    id: "INC-004",
    title: "Material delivery delay — cement",
    description:
      "Cement delivery delayed by 3 days. May impact Block C foundation work.",
    priority: "P2",
    status: "Resolved",
    assignedTo: "Manager",
    assignedName: "Suresh Nair",
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 6 * 3600000),
    photo: null,
    comments: [
      {
        author: "Suresh Nair",
        text: "Alternative supplier arranged.",
        time: new Date(Date.now() - 6 * 3600000),
      },
    ],
    tasks: [],
  },
  {
    id: "INC-005",
    title: "Painting quality issue — exterior wall",
    description:
      "Uneven paint application on north-facing exterior wall. Touch-up required.",
    priority: "P3",
    status: "Closed",
    assignedTo: "Site Engineer",
    assignedName: "Rajesh Kumar",
    createdAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date(Date.now() - 2 * 86400000),
    photo: null,
    comments: [],
    tasks: [],
  },
];

function timeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function isOverdue(incident) {
  if (["Resolved", "Closed"].includes(incident.status)) return false;
  const cfg = PRIORITY_CONFIG[incident.priority];
  const deadline = new Date(
    incident.createdAt.getTime() +
      cfg.days * 86400000 +
      (cfg.days === 0 ? 8 * 3600000 : 0),
  );
  return Date.now() > deadline.getTime();
}

function getDeadlineText(incident) {
  const cfg = PRIORITY_CONFIG[incident.priority];
  const deadline = new Date(
    incident.createdAt.getTime() +
      cfg.days * 86400000 +
      (cfg.days === 0 ? 8 * 3600000 : 0),
  );
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return `Overdue by ${timeAgo(deadline)}`;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 24) return `Due in ${hrs}h`;
  return `Due in ${days}d`;
}

/* ─── CONVERT TO TASKS MODAL ──────────────────────────────── */
function ConvertToTasksModal({ incident, onClose, onConvert }) {
  const [tasks, setTasks] = useState([
    {
      id: Date.now(),
      title: "",
      assignedTo: "Site Engineer",
      assignedName: "",
      priority: incident.priority,
      note: "",
    },
  ]);

  const addTask = () =>
    setTasks((t) => [
      ...t,
      {
        id: Date.now() + Math.random(),
        title: "",
        assignedTo: "Site Engineer",
        assignedName: "",
        priority: incident.priority,
        note: "",
      },
    ]);
  const removeTask = (id) => setTasks((t) => t.filter((tk) => tk.id !== id));
  const updateTask = (id, field, val) =>
    setTasks((t) =>
      t.map((tk) => (tk.id === id ? { ...tk, [field]: val } : tk)),
    );

  const handleSubmit = () => {
    const valid = tasks.filter((t) => t.title.trim());
    if (!valid.length) return;
    onConvert(incident.id, valid);
    onClose();
  };

  return (
    <div className="inc-modal-overlay" onClick={onClose}>
      <div
        className="inc-modal modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inc-modal-header">
          <div>
            <h3>Convert to Tasks</h3>
            <p className="modal-sub">
              Break <strong>{incident.id}</strong> into actionable tasks and
              assign them
            </p>
          </div>
          <button className="inc-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="inc-modal-body">
          <div className="ctm-incident-ref">
            <span
              className={`inc-priority-badge ${PRIORITY_CONFIG[incident.priority].color}`}
            >
              {PRIORITY_CONFIG[incident.priority].icon} {incident.priority}
            </span>
            <span className="ctm-inc-title">{incident.title}</span>
          </div>

          <div className="ctm-tasks-list">
            {tasks.map((task, idx) => (
              <div key={task.id} className="ctm-task-row">
                <div className="ctm-task-num">{idx + 1}</div>
                <div className="ctm-task-fields">
                  <div className="ctm-row">
                    <div className="inc-form-group" style={{ flex: 2 }}>
                      <label>
                        Task Title <span className="req">*</span>
                      </label>
                      <input
                        className="inc-form-input"
                        placeholder="What needs to be done..."
                        value={task.title}
                        onChange={(e) =>
                          updateTask(task.id, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="inc-form-group">
                      <label>Priority</label>
                      <select
                        className="inc-form-input"
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(task.id, "priority", e.target.value)
                        }
                      >
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.icon} {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ctm-row">
                    <div className="inc-form-group">
                      <label>Assign Role</label>
                      <select
                        className="inc-form-input"
                        value={task.assignedTo}
                        onChange={(e) =>
                          updateTask(task.id, "assignedTo", e.target.value)
                        }
                      >
                        {ASSIGNEE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="inc-form-group" style={{ flex: 2 }}>
                      <label>Assignee Name</label>
                      <input
                        className="inc-form-input"
                        placeholder="Person's name..."
                        value={task.assignedName}
                        onChange={(e) =>
                          updateTask(task.id, "assignedName", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="inc-form-group">
                    <label>Note (optional)</label>
                    <input
                      className="inc-form-input"
                      placeholder="Any specific instructions..."
                      value={task.note}
                      onChange={(e) =>
                        updateTask(task.id, "note", e.target.value)
                      }
                    />
                  </div>
                </div>
                {tasks.length > 1 && (
                  <button
                    className="ctm-remove-btn"
                    onClick={() => removeTask(task.id)}
                    title="Remove task"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="ctm-add-task-btn" onClick={addTask}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add another task
          </button>
        </div>

        <div className="inc-modal-footer">
          <div className="ctm-footer-hint">
            {incident.priority === "P1" && (
              <span className="ctm-p1-hint">
                ⚡ P1 tasks will appear immediately in assignee queues
              </span>
            )}
          </div>
          <button className="inc-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="inc-modal-submit" onClick={handleSubmit}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Create Tasks
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── INCIDENTS PAGE ──────────────────────────────────────── */
export function Incidents({ incidents, setIncidents, onNavigateToQueue }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "P2",
    assignedTo: "Site Engineer",
    assignedName: "",
  });

  const selectedIncident = incidents.find((i) => i.id === selectedId);
  const convertingIncident = incidents.find((i) => i.id === convertingId);

  const filtered = incidents.filter((inc) => {
    const matchStatus = filterStatus === "All" || inc.status === filterStatus;
    const matchPriority =
      filterPriority === "All" || inc.priority === filterPriority;
    const matchSearch =
      inc.title.toLowerCase().includes(searchText.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter((i) => !["Resolved", "Closed"].includes(i.status))
      .length,
    overdue: incidents.filter(isOverdue).length,
    resolved: incidents.filter((i) => ["Resolved", "Closed"].includes(i.status))
      .length,
    p1: incidents.filter((i) => i.priority === "P1").length,
  };

  const handleCreate = () => {
    if (!form.title.trim()) return;
    const newInc = {
      id: `INC-${String(incidents.length + 1).padStart(3, "0")}`,
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: "Created",
      assignedTo: form.assignedTo,
      assignedName: form.assignedName || form.assignedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
      photo: photoPreview,
      comments: [],
      tasks: [],
    };
    setIncidents((prev) => [newInc, ...prev]);
    setForm({
      title: "",
      description: "",
      priority: "P2",
      assignedTo: "Site Engineer",
      assignedName: "",
    });
    setPhotoPreview(null);
    setShowCreate(false);
  };

  const advanceStatus = (id) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        const idx = STATUS_FLOW.indexOf(inc.status);
        if (idx >= STATUS_FLOW.length - 1) return inc;
        return { ...inc, status: STATUS_FLOW[idx + 1], updatedAt: new Date() };
      }),
    );
  };

  const addComment = (id) => {
    if (!commentText.trim()) return;
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        return {
          ...inc,
          comments: [
            ...inc.comments,
            { author: "You", text: commentText, time: new Date() },
          ],
          updatedAt: new Date(),
        };
      }),
    );
    setCommentText("");
  };

  const handleConvertToTasks = (incidentId, newTasks) => {
    const taskObjects = newTasks.map((t, i) => ({
      id: `TASK-${Date.now()}-${i}`,
      incidentId,
      title: t.title,
      assignedTo: t.assignedTo,
      assignedName: t.assignedName || t.assignedTo,
      priority: t.priority,
      note: t.note,
      status: "Pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          tasks: [...(inc.tasks || []), ...taskObjects],
          updatedAt: new Date(),
        };
      }),
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const allTaskCount = incidents.reduce(
    (s, i) => s + (i.tasks?.length || 0),
    0,
  );
  const pendingTaskCount = incidents.reduce(
    (s, i) => s + (i.tasks?.filter((t) => t.status === "Pending").length || 0),
    0,
  );

  return (
    <div className="inc-page">
      {/* Header */}
      <div className="inc-header">
        <div className="inc-header-left">
          <div>
            <h1>Incident Management</h1>
            <p>Track, assign and resolve project issues</p>
          </div>
        </div>
        <div className="inc-header-actions">
          {allTaskCount > 0 && (
            <button className="task-queue-nav-btn" onClick={onNavigateToQueue}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Task Queue
              {pendingTaskCount > 0 && (
                <span className="tq-badge">{pendingTaskCount}</span>
              )}
            </button>
          )}
          <button
            className="inc-create-btn"
            onClick={() => setShowCreate(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Incident
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="inc-stats">
        {[
          {
            icon: (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
            cls: "ic-blue",
            label: "Total",
            val: stats.total,
          },
          {
            icon: (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
            cls: "ic-amber",
            label: "Open",
            val: stats.open,
          },
          {
            icon: (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
            cls: "ic-red",
            label: "Overdue",
            val: stats.overdue,
          },
          {
            icon: (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ),
            cls: "ic-green",
            label: "Resolved",
            val: stats.resolved,
          },
          {
            icon: (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ),
            cls: "ic-crimson",
            label: "P1 Urgent",
            val: stats.p1,
          },
        ].map((s) => (
          <div key={s.label} className="inc-stat-card">
            <div className={`inc-stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <span className="inc-stat-label">{s.label}</span>
              <span className="inc-stat-val">{s.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="inc-filters">
        <div className="inc-search-wrap">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="inc-search"
            placeholder="Search incidents..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="inc-filter-group">
          <span className="inc-filter-label">Status:</span>
          {["All", ...STATUS_FLOW].map((s) => (
            <button
              key={s}
              className={`inc-filter-btn ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="inc-filter-group">
          <span className="inc-filter-label">Priority:</span>
          {["All", "P1", "P2", "P3"].map((p) => (
            <button
              key={p}
              className={`inc-filter-btn priority-filter ${filterPriority === p ? "active" : ""} ${p !== "All" ? `pf-${p.toLowerCase()}` : ""}`}
              onClick={() => setFilterPriority(p)}
            >
              {p === "All" ? "All" : PRIORITY_CONFIG[p].icon + " " + p}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="inc-main">
        <div className="inc-list">
          {filtered.length === 0 && (
            <div className="inc-empty">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>No incidents found</p>
            </div>
          )}
          {filtered.map((inc) => {
            const overdue = isOverdue(inc);
            const pcfg = PRIORITY_CONFIG[inc.priority];
            const scfg = STATUS_CONFIG[inc.status];
            const active = selectedId === inc.id;
            const taskCount = inc.tasks?.length || 0;
            return (
              <div
                key={inc.id}
                className={`inc-card ${pcfg.color} ${active ? "inc-card-active" : ""} ${overdue ? "inc-card-overdue" : ""}`}
                onClick={() => setSelectedId(inc.id)}
              >
                <div className="inc-card-top">
                  <div className="inc-card-left">
                    <span className={`inc-priority-badge ${pcfg.color}`}>
                      {pcfg.icon} {inc.priority}
                    </span>
                    <span className="inc-id">{inc.id}</span>
                    {taskCount > 0 && (
                      <span className="inc-task-count-badge">
                        {taskCount} task{taskCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className={`inc-status-chip ${scfg.color}`}>
                    {scfg.icon} {inc.status}
                  </span>
                </div>
                <h3 className="inc-card-title">{inc.title}</h3>
                <p className="inc-card-desc">
                  {inc.description.substring(0, 80)}...
                </p>
                <div className="inc-card-meta">
                  <span className="inc-assignee">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {inc.assignedName}
                  </span>
                  <span className={`inc-deadline ${overdue ? "overdue" : ""}`}>
                    {["Resolved", "Closed"].includes(inc.status)
                      ? `✔ ${inc.status}`
                      : getDeadlineText(inc)}
                  </span>
                  <span className="inc-time">{timeAgo(inc.createdAt)}</span>
                </div>
                {overdue && (
                  <div className="inc-overdue-bar">
                    ⏰ Reminder: This incident is overdue!
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedIncident ? (
          <div className="inc-detail">
            <div className="inc-detail-header">
              <div>
                <div className="inc-detail-id-row">
                  <span className="inc-detail-id">{selectedIncident.id}</span>
                  <span
                    className={`inc-priority-badge ${PRIORITY_CONFIG[selectedIncident.priority].color}`}
                  >
                    {PRIORITY_CONFIG[selectedIncident.priority].icon}{" "}
                    {selectedIncident.priority} —{" "}
                    {PRIORITY_CONFIG[selectedIncident.priority].desc}
                  </span>
                  {isOverdue(selectedIncident) && (
                    <span className="inc-overdue-tag">⏰ Overdue</span>
                  )}
                </div>
                <h2 className="inc-detail-title">{selectedIncident.title}</h2>
              </div>
              <button
                className="inc-close-btn"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
            </div>

            {/* Workflow stepper */}
            <div className="inc-workflow">
              {STATUS_FLOW.map((s, i) => {
                const currentIdx = STATUS_FLOW.indexOf(selectedIncident.status);
                const done = i < currentIdx;
                const current = i === currentIdx;
                return (
                  <React.Fragment key={s}>
                    <div
                      className={`inc-wf-step ${done ? "wf-done" : ""} ${current ? "wf-current" : ""}`}
                    >
                      <div className="inc-wf-dot">
                        {done ? "✔" : STATUS_CONFIG[s].icon}
                      </div>
                      <span className="inc-wf-label">{s}</span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`inc-wf-line ${done ? "wf-done" : ""}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Info grid */}
            <div className="inc-detail-grid">
              {[
                {
                  label: "Status",
                  val: (
                    <span
                      className={`inc-status-chip ${STATUS_CONFIG[selectedIncident.status].color}`}
                    >
                      {STATUS_CONFIG[selectedIncident.status].icon}{" "}
                      {selectedIncident.status}
                    </span>
                  ),
                },
                { label: "Assigned Role", val: selectedIncident.assignedTo },
                { label: "Assigned To", val: selectedIncident.assignedName },
                {
                  label: "Deadline",
                  val: (
                    <span
                      className={isOverdue(selectedIncident) ? "text-red" : ""}
                    >
                      {["Resolved", "Closed"].includes(selectedIncident.status)
                        ? "—"
                        : getDeadlineText(selectedIncident)}
                    </span>
                  ),
                },
                { label: "Created", val: timeAgo(selectedIncident.createdAt) },
                {
                  label: "Last Updated",
                  val: timeAgo(selectedIncident.updatedAt),
                },
              ].map((f) => (
                <div key={f.label} className="inc-detail-field">
                  <span className="inc-field-label">{f.label}</span>
                  <span className="inc-field-val">{f.val}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="inc-detail-section">
              <span className="inc-section-title">Description</span>
              <p className="inc-detail-desc">{selectedIncident.description}</p>
            </div>

            {/* Tasks spawned */}
            {selectedIncident.tasks?.length > 0 && (
              <div className="inc-detail-section">
                <span className="inc-section-title">
                  Tasks ({selectedIncident.tasks.length})
                </span>
                <div className="detail-tasks-list">
                  {selectedIncident.tasks.map((t) => (
                    <div key={t.id} className="detail-task-item">
                      <span
                        className={`inc-priority-badge ${PRIORITY_CONFIG[t.priority].color}`}
                        style={{ fontSize: 9 }}
                      >
                        {PRIORITY_CONFIG[t.priority].icon} {t.priority}
                      </span>
                      <div className="detail-task-info">
                        <span className="detail-task-title">{t.title}</span>
                        <span className="detail-task-meta">
                          {t.assignedName} · {t.assignedTo}
                        </span>
                      </div>
                      <span
                        className={`inc-status-chip ${TASK_STATUS_CONFIG[t.status].color}`}
                        style={{ fontSize: 9 }}
                      >
                        {TASK_STATUS_CONFIG[t.status].icon} {t.status}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="ctm-view-queue-btn"
                  onClick={onNavigateToQueue}
                >
                  View in Task Queue →
                </button>
              </div>
            )}

            {/* Convert to Tasks action */}
            <div className="inc-detail-section">
              <span className="inc-section-title">Actions</span>
              <div className="detail-actions-row">
                {!["Closed"].includes(selectedIncident.status) && (
                  <button
                    className="inc-advance-btn"
                    onClick={() => advanceStatus(selectedIncident.id)}
                  >
                    Move to:{" "}
                    {
                      STATUS_FLOW[
                        STATUS_FLOW.indexOf(selectedIncident.status) + 1
                      ]
                    }
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
                <button
                  className="inc-convert-btn"
                  onClick={() => setConvertingId(selectedIncident.id)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  Convert to Tasks
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="inc-detail-section">
              <span className="inc-section-title">
                Comments ({selectedIncident.comments.length})
              </span>
              <div className="inc-comments">
                {selectedIncident.comments.length === 0 && (
                  <p className="inc-no-comments">No comments yet.</p>
                )}
                {selectedIncident.comments.map((c, i) => (
                  <div key={i} className="inc-comment">
                    <div className="inc-comment-avatar">
                      {c.author.charAt(0)}
                    </div>
                    <div className="inc-comment-body">
                      <div className="inc-comment-top">
                        <span className="inc-comment-author">{c.author}</span>
                        <span className="inc-comment-time">
                          {timeAgo(c.time)}
                        </span>
                      </div>
                      <p className="inc-comment-text">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="inc-comment-input-wrap">
                <input
                  className="inc-comment-input"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && addComment(selectedIncident.id)
                  }
                />
                <button
                  className="inc-comment-send"
                  onClick={() => addComment(selectedIncident.id)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="inc-detail inc-detail-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p>Select an incident to view details</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="inc-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="inc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inc-modal-header">
              <h3>Create New Incident</h3>
              <button
                className="inc-modal-close"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>
            <div className="inc-modal-body">
              <div className="inc-form-group">
                <label>
                  Title <span className="req">*</span>
                </label>
                <input
                  className="inc-form-input"
                  placeholder="Brief incident title..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="inc-form-group">
                <label>Description</label>
                <textarea
                  className="inc-form-input inc-form-textarea"
                  placeholder="Describe the incident in detail..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="inc-form-row">
                <div className="inc-form-group">
                  <label>Priority</label>
                  <div className="inc-priority-options">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        className={`inc-priority-opt ${form.priority === key ? "selected" : ""} ${cfg.color}`}
                        onClick={() => setForm({ ...form, priority: key })}
                      >
                        {cfg.icon} {key}
                        <span className="inc-priority-opt-desc">
                          {cfg.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="inc-form-row">
                <div className="inc-form-group">
                  <label>Assign Role</label>
                  <select
                    className="inc-form-input"
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                  >
                    {ASSIGNEE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inc-form-group">
                  <label>Assignee Name</label>
                  <input
                    className="inc-form-input"
                    placeholder="Name of person..."
                    value={form.assignedName}
                    onChange={(e) =>
                      setForm({ ...form, assignedName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="inc-form-group">
                <label>Attach Photo</label>
                <div
                  className="inc-photo-upload"
                  onClick={() => fileRef.current.click()}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="inc-photo-preview"
                    />
                  ) : (
                    <>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Click to upload photo</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhoto}
                />
              </div>
            </div>
            <div className="inc-modal-footer">
              <div></div>
              <button
                className="inc-modal-cancel"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button className="inc-modal-submit" onClick={handleCreate}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Tasks Modal */}
      {convertingIncident && (
        <ConvertToTasksModal
          incident={convertingIncident}
          onClose={() => setConvertingId(null)}
          onConvert={handleConvertToTasks}
        />
      )}
    </div>
  );
}

/* ─── TASK QUEUE PAGE ─────────────────────────────────────── */
export function TaskQueue({ incidents, setIncidents, onNavigateBack }) {
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Flatten all tasks with incident context
  const allTasks = incidents.flatMap((inc) =>
    (inc.tasks || []).map((t) => ({
      ...t,
      incidentTitle: inc.title,
      incidentPriority: inc.priority,
      incidentStatus: inc.status,
    })),
  );

  // P1 auto-highlighted tasks
  const p1AutoTasks = allTasks.filter(
    (t) => t.incidentPriority === "P1" && t.status === "Pending",
  );

  const roles = [
    "All",
    ...Array.from(new Set(allTasks.map((t) => t.assignedTo))),
  ];

  const filtered = allTasks.filter((t) => {
    const matchRole = filterRole === "All" || t.assignedTo === filterRole;
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority =
      filterPriority === "All" || t.priority === filterPriority;
    const matchSearch =
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      t.assignedName.toLowerCase().includes(searchText.toLowerCase()) ||
      t.incidentId.toLowerCase().includes(searchText.toLowerCase());
    return matchRole && matchStatus && matchPriority && matchSearch;
  });

  const selectedTask = allTasks.find((t) => t.id === selectedTaskId);

  const updateTaskStatus = (taskId, newStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        tasks: (inc.tasks || []).map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updatedAt: new Date() }
            : t,
        ),
      })),
    );
  };

  const stats = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === "Pending").length,
    inProgress: allTasks.filter((t) => t.status === "In Progress").length,
    done: allTasks.filter((t) => t.status === "Done").length,
    p1Urgent: p1AutoTasks.length,
  };

  // Group by assignee for "My Queue" view
  const byAssignee = filtered.reduce((acc, t) => {
    const key = t.assignedName || t.assignedTo;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="inc-page">
      {/* Header */}
      <div className="inc-header">
        <div className="inc-header-left">
          <button className="tq-back-btn" onClick={onNavigateBack}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Incidents
          </button>
          <div>
            <h1>Task Queue</h1>
            <p>Tasks generated from incidents — assigned to team members</p>
          </div>
        </div>
      </div>

      {/* P1 Auto-alert banner */}
      {p1AutoTasks.length > 0 && (
        <div className="tq-p1-banner">
          <span className="tq-p1-banner-icon">⚡</span>
          <div>
            <strong>
              {p1AutoTasks.length} urgent P1 task
              {p1AutoTasks.length > 1 ? "s" : ""} pending
            </strong>
            <span>
              {" "}
              — auto-assigned from critical incidents. Immediate attention
              required.
            </span>
          </div>
          <div className="tq-p1-names">
            {p1AutoTasks.slice(0, 3).map((t) => (
              <span key={t.id} className="tq-p1-chip">
                {t.assignedName} · {t.title.substring(0, 30)}
                {t.title.length > 30 ? "…" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="inc-stats">
        {[
          {
            icon: "📋",
            cls: "ic-blue",
            label: "Total Tasks",
            val: stats.total,
          },
          { icon: "⏳", cls: "ic-amber", label: "Pending", val: stats.pending },
          {
            icon: "⚡",
            cls: "ic-crimson",
            label: "P1 Urgent",
            val: stats.p1Urgent,
          },
          {
            icon: "◐",
            cls: "ic-blue",
            label: "In Progress",
            val: stats.inProgress,
          },
          { icon: "✔", cls: "ic-green", label: "Done", val: stats.done },
        ].map((s) => (
          <div key={s.label} className="inc-stat-card">
            <div className={`inc-stat-icon ${s.cls}`} style={{ fontSize: 18 }}>
              {s.icon}
            </div>
            <div>
              <span className="inc-stat-label">{s.label}</span>
              <span className="inc-stat-val">{s.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="inc-filters">
        <div className="inc-search-wrap">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="inc-search"
            placeholder="Search tasks, assignees..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="inc-filter-group">
          <span className="inc-filter-label">Role:</span>
          {roles.map((r) => (
            <button
              key={r}
              className={`inc-filter-btn ${filterRole === r ? "active" : ""}`}
              onClick={() => setFilterRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="inc-filter-group">
          <span className="inc-filter-label">Status:</span>
          {["All", ...TASK_STATUS_FLOW].map((s) => (
            <button
              key={s}
              className={`inc-filter-btn ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="inc-filter-group">
          <span className="inc-filter-label">Priority:</span>
          {["All", "P1", "P2", "P3"].map((p) => (
            <button
              key={p}
              className={`inc-filter-btn priority-filter ${filterPriority === p ? "active" : ""} ${p !== "All" ? `pf-${p.toLowerCase()}` : ""}`}
              onClick={() => setFilterPriority(p)}
            >
              {p === "All" ? "All" : PRIORITY_CONFIG[p].icon + " " + p}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="inc-main">
        <div className="inc-list">
          {filtered.length === 0 && (
            <div className="inc-empty">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <p>No tasks found. Convert an incident to create tasks.</p>
            </div>
          )}

          {/* Group by assignee */}
          {Object.entries(byAssignee).map(([assignee, tasks]) => (
            <div key={assignee} className="tq-assignee-group">
              <div className="tq-assignee-header">
                <div className="tq-assignee-avatar">{assignee.charAt(0)}</div>
                <div>
                  <span className="tq-assignee-name">{assignee}</span>
                  <span className="tq-assignee-role">
                    {" "}
                    · {tasks[0].assignedTo}
                  </span>
                </div>
                <span className="tq-assignee-count">
                  {tasks.length} task{tasks.length > 1 ? "s" : ""}
                </span>
                <span className="tq-assignee-pending">
                  {tasks.filter((t) => t.status === "Pending").length > 0 && (
                    <span className="tq-pending-badge">
                      {tasks.filter((t) => t.status === "Pending").length}{" "}
                      pending
                    </span>
                  )}
                </span>
              </div>

              {tasks.map((task) => {
                const pcfg = PRIORITY_CONFIG[task.priority];
                const scfg = TASK_STATUS_CONFIG[task.status];
                const isP1Auto =
                  task.incidentPriority === "P1" && task.status === "Pending";
                const active = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`inc-card tq-task-card ${pcfg.color} ${active ? "inc-card-active" : ""} ${isP1Auto ? "tq-p1-auto" : ""}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="inc-card-top">
                      <div className="inc-card-left">
                        <span className={`inc-priority-badge ${pcfg.color}`}>
                          {pcfg.icon} {task.priority}
                        </span>
                        <span className="inc-id">{task.incidentId}</span>
                        {isP1Auto && (
                          <span className="tq-auto-badge">
                            ⚡ Auto-assigned
                          </span>
                        )}
                      </div>
                      <span className={`inc-status-chip ${scfg.color}`}>
                        {scfg.icon} {task.status}
                      </span>
                    </div>
                    <h3 className="inc-card-title">{task.title}</h3>
                    <p className="inc-card-desc tq-incident-ref">
                      From: {task.incidentTitle.substring(0, 70)}
                      {task.incidentTitle.length > 70 ? "…" : ""}
                    </p>
                    {task.note && (
                      <p className="tq-task-note">📝 {task.note}</p>
                    )}
                    <div className="inc-card-meta">
                      <span className="inc-assignee">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {task.assignedName}
                      </span>
                      <span className="inc-time">
                        {timeAgo(task.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Task detail panel */}
        {selectedTask ? (
          <div className="inc-detail">
            <div className="inc-detail-header">
              <div>
                <div className="inc-detail-id-row">
                  <span className="inc-detail-id">
                    {selectedTask.incidentId}
                  </span>
                  <span
                    className={`inc-priority-badge ${PRIORITY_CONFIG[selectedTask.priority].color}`}
                  >
                    {PRIORITY_CONFIG[selectedTask.priority].icon}{" "}
                    {selectedTask.priority}
                  </span>
                  {selectedTask.incidentPriority === "P1" &&
                    selectedTask.status === "Pending" && (
                      <span className="tq-auto-badge">⚡ Auto-assigned</span>
                    )}
                </div>
                <h2 className="inc-detail-title">{selectedTask.title}</h2>
              </div>
              <button
                className="inc-close-btn"
                onClick={() => setSelectedTaskId(null)}
              >
                ×
              </button>
            </div>

            {/* Task status stepper */}
            <div className="inc-workflow">
              {TASK_STATUS_FLOW.map((s, i) => {
                const currentIdx = TASK_STATUS_FLOW.indexOf(
                  selectedTask.status,
                );
                const done = i < currentIdx;
                const current = i === currentIdx;
                return (
                  <React.Fragment key={s}>
                    <div
                      className={`inc-wf-step ${done ? "wf-done" : ""} ${current ? "wf-current" : ""}`}
                    >
                      <div className="inc-wf-dot">
                        {done ? "✔" : TASK_STATUS_CONFIG[s].icon}
                      </div>
                      <span className="inc-wf-label">{s}</span>
                    </div>
                    {i < TASK_STATUS_FLOW.length - 1 && (
                      <div className={`inc-wf-line ${done ? "wf-done" : ""}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="inc-detail-grid">
              {[
                {
                  label: "Current Status",
                  val: (
                    <span
                      className={`inc-status-chip ${TASK_STATUS_CONFIG[selectedTask.status].color}`}
                    >
                      {TASK_STATUS_CONFIG[selectedTask.status].icon}{" "}
                      {selectedTask.status}
                    </span>
                  ),
                },
                { label: "Assigned Role", val: selectedTask.assignedTo },
                { label: "Assignee", val: selectedTask.assignedName },
                {
                  label: "Task Priority",
                  val: (
                    <span
                      className={`inc-priority-badge ${PRIORITY_CONFIG[selectedTask.priority].color}`}
                    >
                      {PRIORITY_CONFIG[selectedTask.priority].icon}{" "}
                      {selectedTask.priority}
                    </span>
                  ),
                },
                { label: "From Incident", val: selectedTask.incidentId },
                { label: "Created", val: timeAgo(selectedTask.createdAt) },
              ].map((f) => (
                <div key={f.label} className="inc-detail-field">
                  <span className="inc-field-label">{f.label}</span>
                  <span className="inc-field-val">{f.val}</span>
                </div>
              ))}
            </div>

            <div className="inc-detail-section">
              <span className="inc-section-title">Linked Incident</span>
              <div className="tq-linked-incident">
                <span
                  className={`inc-priority-badge ${PRIORITY_CONFIG[selectedTask.incidentPriority].color}`}
                >
                  {PRIORITY_CONFIG[selectedTask.incidentPriority].icon}{" "}
                  {selectedTask.incidentPriority}
                </span>
                <span className="tq-linked-title">
                  {selectedTask.incidentTitle}
                </span>
              </div>
            </div>

            {selectedTask.note && (
              <div className="inc-detail-section">
                <span className="inc-section-title">Task Note</span>
                <p className="inc-detail-desc">{selectedTask.note}</p>
              </div>
            )}

            <div className="inc-detail-section">
              <span className="inc-section-title">Update Status</span>
              <div className="tq-status-actions">
                {TASK_STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    className={`tq-status-btn ${selectedTask.status === s ? "tq-status-active" : ""} ${TASK_STATUS_CONFIG[s].color}`}
                    onClick={() => updateTaskStatus(selectedTask.id, s)}
                  >
                    {TASK_STATUS_CONFIG[s].icon} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="inc-detail inc-detail-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <p>Select a task to view details and update status</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── APP SHELL (shared state) ────────────────────────────── */
export default function AppShell() {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [page, setPage] = useState("incidents"); // "incidents" | "taskqueue"

  return (
    <>
      <style>{`
        /* ── BASE ── */
        :root {
          --primary-blue: #1e5a96;
          --secondary-blue: #2b7abc;
          --text-primary: #1a1a2e;
          --text-secondary: #7a7a8a;
          --bg-light: #f7f9fc;
          --bg-white: #ffffff;
          --border-color: #e6e8ec;
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
          --p1-color: #ef4444;
          --p2-color: #f59e0b;
          --p3-color: #22c55e;
        }
        .inc-page { padding: 20px; background: var(--bg-light); min-height: 100vh; display: flex; flex-direction: column; gap: 16px; }
        .inc-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .inc-header-left { display: flex; align-items: center; gap: 12px; }
        .inc-header h1 { font-size: 22px; font-weight: 700; color: var(--primary-blue); margin: 0 0 3px 0; }
        .inc-header p { font-size: 12px; color: var(--text-secondary); margin: 0; }
        .inc-header-actions { display: flex; align-items: center; gap: 10px; }

        /* ── BUTTONS ── */
        .inc-create-btn { display: flex; align-items: center; gap: 7px; background: linear-gradient(135deg,var(--primary-blue),var(--secondary-blue)); color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; box-shadow: 0 2px 8px rgba(30,90,150,0.25); white-space: nowrap; }
        .inc-create-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(30,90,150,0.35); }
        .task-queue-nav-btn { display: flex; align-items: center; gap: 7px; background: white; color: var(--primary-blue); border: 1.5px solid var(--primary-blue); padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; white-space: nowrap; position: relative; }
        .task-queue-nav-btn:hover { background: #f0f6ff; }
        .tq-badge { background: var(--p1-color); color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; margin-left: 2px; }
        .tq-back-btn { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .tq-back-btn:hover { border-color: var(--primary-blue); color: var(--primary-blue); }

        /* ── STATS ── */
        .inc-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
        .inc-stat-card { background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(30,90,150,0.05); transition: all 0.2s; }
        .inc-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(30,90,150,0.1); }
        .inc-stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ic-blue { background: #e6f1fb; color: #185fa5; } .ic-amber { background: #faeeda; color: #854f0b; }
        .ic-red { background: #fcebeb; color: #a32d2d; } .ic-green { background: #eaf3de; color: #3b6d11; }
        .ic-crimson { background: #fde8e8; color: #c0392b; }
        .inc-stat-label { display: block; font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
        .inc-stat-val { display: block; font-size: 24px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }

        /* ── FILTERS ── */
        .inc-filters { background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .inc-search-wrap { display: flex; align-items: center; gap: 7px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 12px; color: var(--text-secondary); min-width: 200px; }
        .inc-search { border: none; background: transparent; font-size: 12px; color: var(--text-primary); font-family: inherit; outline: none; width: 100%; }
        .inc-filter-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .inc-filter-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
        .inc-filter-btn { padding: 5px 12px; border: 1px solid var(--border-color); border-radius: 20px; background: white; color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .inc-filter-btn:hover { border-color: var(--primary-blue); color: var(--primary-blue); }
        .inc-filter-btn.active { background: var(--primary-blue); color: white; border-color: var(--primary-blue); }
        .pf-p1.active { background: var(--p1-color); border-color: var(--p1-color); }
        .pf-p2.active { background: var(--p2-color); border-color: var(--p2-color); color: #fff; }
        .pf-p3.active { background: var(--p3-color); border-color: var(--p3-color); }

        /* ── MAIN LAYOUT ── */
        .inc-main { display: grid; grid-template-columns: 1fr 420px; gap: 16px; align-items: start; }
        .inc-list { display: flex; flex-direction: column; gap: 10px; }
        .inc-empty { background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 48px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-secondary); font-size: 13px; }

        /* ── CARDS ── */
        .inc-card { background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px 16px; cursor: pointer; border-left: 4px solid transparent; transition: all 0.2s; position: relative; overflow: hidden; }
        .inc-card:hover { box-shadow: 0 4px 16px rgba(30,90,150,0.1); transform: translateY(-1px); }
        .inc-card-active { box-shadow: 0 4px 18px rgba(30,90,150,0.15); transform: translateY(-1px); }
        .inc-card.p1 { border-left-color: var(--p1-color); } .inc-card.p2 { border-left-color: var(--p2-color); } .inc-card.p3 { border-left-color: var(--p3-color); }
        .inc-card-active.p1 { background: #fff8f8; } .inc-card-active.p2 { background: #fffdf5; } .inc-card-active.p3 { background: #f6fff0; }
        .inc-card-overdue { outline: 1px dashed var(--p1-color); outline-offset: -2px; }
        .inc-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .inc-card-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .inc-priority-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
        .inc-priority-badge.p1 { background: #fde8e8; color: var(--p1-color); }
        .inc-priority-badge.p2 { background: #fef3d0; color: #a16207; }
        .inc-priority-badge.p3 { background: #dcfce7; color: #166534; }
        .inc-id { font-size: 10px; color: var(--text-secondary); font-weight: 600; font-family: monospace; }
        .inc-task-count-badge { background: #e6f1fb; color: #185fa5; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
        .inc-status-chip { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
        .s-created { background: #f0f4ff; color: #3b5bdb; } .s-assigned { background: #fff0e6; color: #c2410c; }
        .s-inprogress { background: #fef9c3; color: #a16207; } .s-resolved { background: #dcfce7; color: #166534; }
        .s-closed { background: #f1f5f9; color: #64748b; }
        .ts-pending { background: #f0f4ff; color: #3b5bdb; } .ts-inprog { background: #fef9c3; color: #a16207; }
        .ts-done { background: #dcfce7; color: #166534; } .ts-blocked { background: #fde8e8; color: #a32d2d; }
        .inc-card-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0 0 5px 0; line-height: 1.4; }
        .inc-card-desc { font-size: 11px; color: var(--text-secondary); margin: 0 0 10px 0; line-height: 1.5; }
        .inc-card-meta { display: flex; align-items: center; gap: 12px; font-size: 10px; }
        .inc-assignee { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-weight: 600; }
        .inc-deadline { color: var(--primary-blue); font-weight: 600; } .inc-deadline.overdue { color: var(--p1-color); font-weight: 700; }
        .inc-time { color: var(--text-secondary); margin-left: auto; }
        .inc-overdue-bar { margin-top: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 600; color: var(--p1-color); }

        /* ── DETAIL PANEL ── */
        .inc-detail { background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(30,90,150,0.07); position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto; }
        .inc-detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 300px; color: var(--text-secondary); font-size: 13px; }
        .inc-detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
        .inc-detail-id-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .inc-detail-id { font-size: 11px; font-weight: 700; color: var(--text-secondary); font-family: monospace; }
        .inc-overdue-tag { background: #fef2f2; color: var(--p1-color); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; border: 1px solid #fecaca; }
        .inc-detail-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.4; }
        .inc-close-btn { background: none; border: 1px solid var(--border-color); border-radius: 6px; font-size: 18px; color: var(--text-secondary); cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; transition: all 0.15s; }
        .inc-close-btn:hover { background: var(--bg-light); color: var(--text-primary); }
        .inc-workflow { display: flex; align-items: center; margin-bottom: 20px; background: var(--bg-light); border-radius: 10px; padding: 14px 16px; overflow-x: auto; gap: 0; }
        .inc-wf-step { display: flex; flex-direction: column; align-items: center; gap: 5px; flex-shrink: 0; }
        .inc-wf-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-color); background: white; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-secondary); font-weight: 700; transition: all 0.2s; }
        .wf-done .inc-wf-dot { background: var(--p3-color); border-color: var(--p3-color); color: white; }
        .wf-current .inc-wf-dot { background: var(--primary-blue); border-color: var(--primary-blue); color: white; box-shadow: 0 0 0 4px rgba(30,90,150,0.15); }
        .inc-wf-label { font-size: 9px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
        .wf-current .inc-wf-label { color: var(--primary-blue); } .wf-done .inc-wf-label { color: #166534; }
        .inc-wf-line { flex: 1; height: 2px; background: var(--border-color); margin: 0 4px; margin-bottom: 14px; min-width: 20px; transition: background 0.2s; }
        .inc-wf-line.wf-done { background: var(--p3-color); }
        .inc-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .inc-detail-field { display: flex; flex-direction: column; gap: 4px; }
        .inc-field-label { font-size: 9px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
        .inc-field-val { font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .text-red { color: var(--p1-color) !important; }
        .inc-detail-section { margin-bottom: 16px; padding-top: 14px; border-top: 1px solid var(--border-color); }
        .inc-section-title { display: block; font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; }
        .inc-detail-desc { font-size: 12px; color: var(--text-primary); line-height: 1.6; margin: 0; }
        .inc-photo { width: 100%; border-radius: 8px; border: 1px solid var(--border-color); object-fit: cover; max-height: 200px; }
        .detail-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .inc-advance-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg,var(--primary-blue),var(--secondary-blue)); color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.2s; box-shadow: 0 2px 8px rgba(30,90,150,0.2); }
        .inc-advance-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30,90,150,0.3); }
        .inc-convert-btn { display: flex; align-items: center; gap: 7px; background: white; color: #7c3aed; border: 1.5px solid #7c3aed; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
        .inc-convert-btn:hover { background: #faf5ff; transform: translateY(-1px); }

        /* Tasks in detail */
        .detail-tasks-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
        .detail-task-item { display: flex; align-items: center; gap: 8px; background: var(--bg-light); border-radius: 8px; padding: 8px 10px; }
        .detail-task-info { flex: 1; min-width: 0; }
        .detail-task-title { font-size: 11px; font-weight: 700; color: var(--text-primary); display: block; }
        .detail-task-meta { font-size: 10px; color: var(--text-secondary); }
        .ctm-view-queue-btn { background: none; border: none; color: var(--primary-blue); font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; font-family: inherit; text-decoration: underline; }

        /* ── COMMENTS ── */
        .inc-comments { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
        .inc-no-comments { font-size: 11px; color: var(--text-secondary); font-style: italic; margin: 0; }
        .inc-comment { display: flex; gap: 10px; align-items: flex-start; }
        .inc-comment-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,var(--primary-blue),var(--secondary-blue)); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .inc-comment-body { flex: 1; background: var(--bg-light); border-radius: 8px; padding: 8px 10px; }
        .inc-comment-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .inc-comment-author { font-size: 11px; font-weight: 700; color: var(--text-primary); }
        .inc-comment-time { font-size: 10px; color: var(--text-secondary); }
        .inc-comment-text { font-size: 11px; color: var(--text-primary); margin: 0; line-height: 1.5; }
        .inc-comment-input-wrap { display: flex; gap: 8px; align-items: center; }
        .inc-comment-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 12px; font-family: inherit; background: var(--bg-light); color: var(--text-primary); outline: none; transition: border-color 0.15s; }
        .inc-comment-input:focus { border-color: var(--primary-blue); background: white; box-shadow: 0 0 0 2px rgba(30,90,150,0.1); }
        .inc-comment-send { width: 34px; height: 34px; border-radius: 8px; background: var(--primary-blue); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .inc-comment-send:hover { background: var(--secondary-blue); transform: scale(1.05); }

        /* ── MODALS ── */
        .inc-modal-overlay { position: fixed; inset: 0; background: rgba(10,20,40,0.5); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .inc-modal { background: white; border-radius: 14px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUp 0.2s ease; max-height: 90vh; overflow-y: auto; }
        .modal-wide { max-width: 680px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .inc-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border-bottom: 1px solid var(--border-color); }
        .inc-modal-header h3 { font-size: 16px; font-weight: 700; color: var(--primary-blue); margin: 0 0 3px 0; }
        .modal-sub { font-size: 11px; color: var(--text-secondary); margin: 0; }
        .inc-modal-close { background: none; border: 1px solid var(--border-color); border-radius: 6px; font-size: 18px; color: var(--text-secondary); cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all 0.15s; flex-shrink: 0; }
        .inc-modal-close:hover { background: var(--bg-light); color: var(--text-primary); }
        .inc-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .inc-modal-footer { padding: 16px 24px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; align-items: center; }
        .inc-modal-cancel { padding: 9px 20px; background: white; border: 1px solid var(--border-color); border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .inc-modal-cancel:hover { background: var(--bg-light); }
        .inc-modal-submit { display: flex; align-items: center; gap: 7px; padding: 9px 20px; background: linear-gradient(135deg,var(--primary-blue),var(--secondary-blue)); border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: white; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 2px 8px rgba(30,90,150,0.2); }
        .inc-modal-submit:hover { transform: translateY(-1px); }
        .inc-form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .inc-form-group label { font-size: 11px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.3px; }
        .req { color: var(--p1-color); }
        .inc-form-input { padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 12px; font-family: inherit; color: var(--text-primary); background: white; outline: none; transition: all 0.15s; width: 100%; box-sizing: border-box; }
        .inc-form-input:focus { border-color: var(--primary-blue); box-shadow: 0 0 0 3px rgba(30,90,150,0.1); }
        .inc-form-textarea { resize: vertical; min-height: 80px; }
        .inc-form-row { display: flex; gap: 12px; }
        .inc-priority-options { display: flex; gap: 8px; }
        .inc-priority-opt { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; border: 2px solid var(--border-color); border-radius: 10px; background: white; cursor: pointer; font-size: 13px; font-weight: 700; font-family: inherit; transition: all 0.15s; color: var(--text-secondary); }
        .inc-priority-opt-desc { font-size: 9px; font-weight: 500; text-align: center; line-height: 1.3; }
        .inc-priority-opt.selected.p1 { border-color: var(--p1-color); background: #fef2f2; color: var(--p1-color); }
        .inc-priority-opt.selected.p2 { border-color: var(--p2-color); background: #fffbeb; color: #a16207; }
        .inc-priority-opt.selected.p3 { border-color: var(--p3-color); background: #f0fdf4; color: #166534; }
        .inc-photo-upload { border: 2px dashed var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 12px; transition: all 0.15s; background: var(--bg-light); min-height: 90px; justify-content: center; }
        .inc-photo-upload:hover { border-color: var(--primary-blue); color: var(--primary-blue); }
        .inc-photo-preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; }

        /* ── CONVERT TO TASKS MODAL ── */
        .ctm-incident-ref { display: flex; align-items: center; gap: 10px; background: var(--bg-light); border-radius: 8px; padding: 10px 14px; }
        .ctm-inc-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
        .ctm-tasks-list { display: flex; flex-direction: column; gap: 14px; }
        .ctm-task-row { display: flex; gap: 12px; align-items: flex-start; background: var(--bg-light); border-radius: 10px; padding: 14px; border: 1px solid var(--border-color); }
        .ctm-task-num { width: 22px; height: 22px; border-radius: 50%; background: var(--primary-blue); color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .ctm-task-fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .ctm-row { display: flex; gap: 10px; }
        .ctm-remove-btn { background: none; border: 1px solid #fecaca; border-radius: 6px; color: var(--p1-color); cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; margin-top: 2px; transition: all 0.15s; }
        .ctm-remove-btn:hover { background: #fef2f2; }
        .ctm-add-task-btn { display: flex; align-items: center; gap: 7px; background: none; border: 1.5px dashed var(--primary-blue); color: var(--primary-blue); padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.15s; align-self: flex-start; }
        .ctm-add-task-btn:hover { background: #f0f6ff; }
        .ctm-footer-hint { flex: 1; }
        .ctm-p1-hint { font-size: 11px; color: var(--p1-color); font-weight: 600; }

        /* ── TASK QUEUE ── */
        .tq-p1-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; }
        .tq-p1-banner-icon { font-size: 20px; flex-shrink: 0; }
        .tq-p1-banner strong { font-size: 13px; font-weight: 700; color: var(--p1-color); }
        .tq-p1-banner span { font-size: 12px; color: var(--text-primary); }
        .tq-p1-names { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .tq-p1-chip { background: white; border: 1px solid #fecaca; border-radius: 20px; font-size: 10px; font-weight: 600; color: var(--p1-color); padding: 3px 10px; }
        .tq-assignee-group { display: flex; flex-direction: column; gap: 8px; }
        .tq-assignee-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: white; border: 1px solid var(--border-color); border-radius: 10px; }
        .tq-assignee-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,var(--primary-blue),var(--secondary-blue)); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .tq-assignee-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .tq-assignee-role { font-size: 11px; color: var(--text-secondary); }
        .tq-assignee-count { font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-left: auto; }
        .tq-assignee-pending { }
        .tq-pending-badge { background: #fef3d0; color: #a16207; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
        .tq-task-card { margin-left: 16px; }
        .tq-p1-auto { border-left-color: var(--p1-color); background: #fffafa; }
        .tq-auto-badge { background: #fde8e8; color: var(--p1-color); font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; border: 1px solid #fecaca; }
        .tq-incident-ref { color: #9ca3af; font-style: italic; }
        .tq-task-note { font-size: 10px; color: var(--primary-blue); margin: 0 0 8px 0; }
        .tq-status-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .tq-status-btn { padding: 7px 14px; border: 1.5px solid var(--border-color); border-radius: 8px; background: white; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; color: var(--text-secondary); }
        .tq-status-btn:hover { border-color: var(--primary-blue); color: var(--primary-blue); }
        .ts-pending.tq-status-active { background: #f0f4ff; border-color: #3b5bdb; color: #3b5bdb; }
        .ts-inprog.tq-status-active { background: #fef9c3; border-color: #a16207; color: #a16207; }
        .ts-done.tq-status-active { background: #dcfce7; border-color: #166534; color: #166534; }
        .ts-blocked.tq-status-active { background: #fde8e8; border-color: #a32d2d; color: #a32d2d; }
        .tq-linked-incident { display: flex; align-items: center; gap: 8px; background: var(--bg-light); border-radius: 8px; padding: 10px 12px; }
        .tq-linked-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }

        /* ── SCROLLBAR ── */
        .inc-detail::-webkit-scrollbar { width: 4px; }
        .inc-detail::-webkit-scrollbar-track { background: transparent; }
        .inc-detail::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .inc-main { grid-template-columns: 1fr; }
          .inc-detail { position: static; max-height: none; }
          .inc-stats { grid-template-columns: repeat(3,1fr); }
        }
        @media (max-width: 768px) {
          .inc-header { flex-direction: column; align-items: flex-start; }
          .inc-stats { grid-template-columns: repeat(2,1fr); }
          .inc-filters { flex-direction: column; align-items: flex-start; }
          .inc-form-row { flex-direction: column; }
          .inc-priority-options { flex-direction: column; }
          .ctm-row { flex-direction: column; }
        }
        @media (max-width: 480px) {
          .inc-page { padding: 12px; }
          .inc-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
      `}</style>

      {page === "incidents" ? (
        <Incidents
          incidents={incidents}
          setIncidents={setIncidents}
          onNavigateToQueue={() => setPage("taskqueue")}
        />
      ) : (
        <TaskQueue
          incidents={incidents}
          setIncidents={setIncidents}
          onNavigateBack={() => setPage("incidents")}
        />
      )}
    </>
  );
}
