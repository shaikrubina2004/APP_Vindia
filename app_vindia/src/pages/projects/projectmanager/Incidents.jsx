import React, { useState, useEffect, useRef } from "react";
import "../../../styles/Incidents.css";

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

const ASSIGNEE_ROLES = ["Site Engineer", "Architect", "Manager"];

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
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    photo: null,
    comments: [
      {
        author: "Rajesh Kumar",
        text: "Investigating the source of leakage.",
        time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
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
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    photo: null,
    comments: [],
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
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    photo: null,
    comments: [],
  },
  {
    id: "INC-004",
    title: "Material delivery delay — cement",
    description:
      "Cement delivery delayed by 3 days. May impact schedule for Block C foundation work.",
    priority: "P2",
    status: "Resolved",
    assignedTo: "Manager",
    assignedName: "Suresh Nair",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    photo: null,
    comments: [
      {
        author: "Suresh Nair",
        text: "Alternative supplier arranged. Delivery confirmed tomorrow.",
        time: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    ],
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
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    photo: null,
    comments: [],
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
      cfg.days * 24 * 60 * 60 * 1000 +
      (cfg.days === 0 ? 8 * 60 * 60 * 1000 : 0),
  );
  return Date.now() > deadline.getTime();
}

function getDeadlineText(incident) {
  const cfg = PRIORITY_CONFIG[incident.priority];
  const deadline = new Date(
    incident.createdAt.getTime() +
      cfg.days * 24 * 60 * 60 * 1000 +
      (cfg.days === 0 ? 8 * 60 * 60 * 1000 : 0),
  );
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return `Overdue by ${timeAgo(deadline)}`;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 24) return `Due in ${hrs}h`;
  return `Due in ${days}d`;
}

export default function Incidents() {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
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

  const filtered = incidents.filter((inc) => {
    const matchStatus = filterStatus === "All" || inc.status === filterStatus;
    const matchPriority =
      filterPriority === "All" || inc.priority === filterPriority;
    const matchSearch =
      inc.title.toLowerCase().includes(searchText.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  // Stats
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

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="inc-page">
      {/* ── Header ── */}
      <div className="inc-header">
        {/* LEFT SIDE */}
        <div className="inc-header-left">
          {/* TITLE */}
          <div>
            <h1>Incident Management</h1>
            <p>Track, assign and resolve project issues</p>
          </div>
        </div>

        {/* RIGHT SIDE BUTTON */}
        <button className="inc-create-btn" onClick={() => setShowCreate(true)}>
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

      {/* ── Stats ── */}
      <div className="inc-stats">
        <div className="inc-stat-card">
          <div className="inc-stat-icon ic-blue">
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
          </div>
          <div>
            <span className="inc-stat-label">Total</span>
            <span className="inc-stat-val">{stats.total}</span>
          </div>
        </div>
        <div className="inc-stat-card">
          <div className="inc-stat-icon ic-amber">
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
          </div>
          <div>
            <span className="inc-stat-label">Open</span>
            <span className="inc-stat-val">{stats.open}</span>
          </div>
        </div>
        <div className="inc-stat-card">
          <div className="inc-stat-icon ic-red">
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
          </div>
          <div>
            <span className="inc-stat-label">Overdue</span>
            <span className="inc-stat-val">{stats.overdue}</span>
          </div>
        </div>
        <div className="inc-stat-card">
          <div className="inc-stat-icon ic-green">
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
          </div>
          <div>
            <span className="inc-stat-label">Resolved</span>
            <span className="inc-stat-val">{stats.resolved}</span>
          </div>
        </div>
        <div className="inc-stat-card">
          <div className="inc-stat-icon ic-crimson">
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
          </div>
          <div>
            <span className="inc-stat-label">P1 Urgent</span>
            <span className="inc-stat-val">{stats.p1}</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
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

      {/* ── Main layout: list + detail ── */}
      <div className="inc-main">
        {/* List */}
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

            {/* Status flow */}
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
              <div className="inc-detail-field">
                <span className="inc-field-label">Status</span>
                <span
                  className={`inc-status-chip ${STATUS_CONFIG[selectedIncident.status].color}`}
                >
                  {STATUS_CONFIG[selectedIncident.status].icon}{" "}
                  {selectedIncident.status}
                </span>
              </div>
              <div className="inc-detail-field">
                <span className="inc-field-label">Assigned Role</span>
                <span className="inc-field-val">
                  {selectedIncident.assignedTo}
                </span>
              </div>
              <div className="inc-detail-field">
                <span className="inc-field-label">Assigned To</span>
                <span className="inc-field-val">
                  {selectedIncident.assignedName}
                </span>
              </div>
              <div className="inc-detail-field">
                <span className="inc-field-label">Deadline</span>
                <span
                  className={`inc-field-val ${isOverdue(selectedIncident) ? "text-red" : ""}`}
                >
                  {["Resolved", "Closed"].includes(selectedIncident.status)
                    ? "—"
                    : getDeadlineText(selectedIncident)}
                </span>
              </div>
              <div className="inc-detail-field">
                <span className="inc-field-label">Created</span>
                <span className="inc-field-val">
                  {timeAgo(selectedIncident.createdAt)}
                </span>
              </div>
              <div className="inc-detail-field">
                <span className="inc-field-label">Last Updated</span>
                <span className="inc-field-val">
                  {timeAgo(selectedIncident.updatedAt)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="inc-detail-section">
              <span className="inc-section-title">Description</span>
              <p className="inc-detail-desc">{selectedIncident.description}</p>
            </div>

            {/* Photo */}
            {selectedIncident.photo && (
              <div className="inc-detail-section">
                <span className="inc-section-title">Attached Photo</span>
                <img
                  src={selectedIncident.photo}
                  alt="Incident"
                  className="inc-photo"
                />
              </div>
            )}

            {/* Advance status */}
            {!["Closed"].includes(selectedIncident.status) && (
              <div className="inc-detail-section">
                <span className="inc-section-title">Actions</span>
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
              </div>
            )}

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

      {/* ── Create Modal ── */}
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
    </div>
  );
}
