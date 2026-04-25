import React, { useState, useMemo } from "react";
import ConvertToTasksModal from "./ConvertToTasksModal";
import "../../styles/IncidentManagement.css";
import { API } from "../../services/authService";
import { useAuth } from "../../context/useAuth";

import {
  PRIORITY_CONFIG,
  STATUS_FLOW,
  STATUS_CONFIG,
  TASK_STATUS_CONFIG,
} from "./incidentConfig";
import { timeAgo, isOverdue, getDeadlineText } from "./incidentHelpers";

export default function IncidentManagement({
  incidents,
  setIncidents,
  users = [],
  refreshIncident,
  onNavigateToQueue,
}) {
  const { user: currentUser } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIncidentData, setSelectedIncidentData] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = React.useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "P2",
    assignedId: "",
    roleName: "",
  });

  const roles = useMemo(
    () => [...new Set(users.map((u) => u.roleName).filter(Boolean))].sort(),
    [users],
  );
  const usersForRole = (roleName) =>
    users.filter((u) => u.roleName === roleName);

  const selectedIncident =
    selectedIncidentData ?? incidents.find((i) => i.id === selectedId) ?? null;

  const convertingIncident = incidents.find((i) => i.id === convertingId);

  const filtered = incidents.filter((inc) => {
    const matchStatus = filterStatus === "All" || inc.status === filterStatus;
    const matchPriority =
      filterPriority === "All" || inc.priority === filterPriority;
    const matchSearch =
      (inc.title ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      (inc.incidentNo ?? "").toLowerCase().includes(searchText.toLowerCase());
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

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assignedId) return;
    setSaving(true);
    try {
      const res = await API.post("/incidents", {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assigned_to_user_id: form.assignedId,
      });
      await refreshIncident(res.data.data.id);
      setForm({
        title: "",
        description: "",
        priority: "P2",
        assignedId: "",
        roleName: "",
      });
      setPhotoPreview(null);
      setShowCreate(false);
    } catch (err) {
      console.error("createIncident:", err);
      alert(
        "Failed to create incident: " +
          (err.response?.data?.detail ??
            err.response?.data?.message ??
            err.message),
      );
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (inc) => {
    const idx = STATUS_FLOW.indexOf(inc.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const newStatus = STATUS_FLOW[idx + 1];

    const patch = (list) =>
      list.map((i) =>
        i.id === inc.id
          ? { ...i, status: newStatus, updatedAt: new Date() }
          : i,
      );
    setIncidents((prev) => patch(prev));
    if (selectedIncidentData?.id === inc.id)
      setSelectedIncidentData((prev) => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date(),
      }));

    try {
      await API.patch(`/incidents/${inc.id}/status`, { status: newStatus });
    } catch (err) {
      console.error("advanceStatus:", err);
      setIncidents((prev) =>
        prev.map((i) => (i.id === inc.id ? { ...i, status: inc.status } : i)),
      );
      if (selectedIncidentData?.id === inc.id)
        setSelectedIncidentData((prev) => ({ ...prev, status: inc.status }));
    }
  };

  const addComment = async (incidentId) => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");

    const tempComment = { author: "You", text, time: new Date() };

    const addToComments = (inc) =>
      inc.id !== incidentId
        ? inc
        : { ...inc, comments: [...(inc.comments ?? []), tempComment] };
    setIncidents((prev) => prev.map(addToComments));
    setSelectedIncidentData((prev) => (prev ? addToComments(prev) : prev));

    try {
      await API.post(`/incidents/${incidentId}/comments`, { body: text });
      const fresh = await refreshIncident(incidentId);
      if (fresh) setSelectedIncidentData(fresh);
    } catch (err) {
      console.error("addComment:", err);
      const remove = (inc) =>
        inc.id !== incidentId
          ? inc
          : {
              ...inc,
              comments: (inc.comments ?? []).filter((c) => c !== tempComment),
            };
      setIncidents((prev) => prev.map(remove));
      setSelectedIncidentData((prev) => (prev ? remove(prev) : prev));
    }
  };

  const handleConvertToTasks = async (incidentId, newTasks) => {
    try {
      await API.post(`/incidents/${incidentId}/tasks`, {
        tasks: newTasks.map((t) => ({
          title: t.title,
          note: t.note,
          priority: t.priority,
          assigned_to_user_id: t.assignedId,
        })),
      });
      const fresh = await refreshIncident(incidentId);
      if (fresh && selectedId === incidentId) setSelectedIncidentData(fresh);
    } catch (err) {
      console.error("convertToTasks:", err);
      alert(
        "Failed to create tasks: " +
          (err.response?.data?.detail ??
            err.response?.data?.message ??
            err.message),
      );
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const allTaskCount = incidents.reduce(
    (s, i) => s + (i.taskCount ?? i.tasks?.length ?? 0),
    0,
  );
  const pendingTaskCount = incidents.reduce(
    (s, i) => s + (i.tasks?.filter((t) => t.status === "Pending").length ?? 0),
    0,
  );

  const handleCardClick = async (inc) => {
    setSelectedId(inc.id);
    setSelectedIncidentData(null);
    const fresh = await refreshIncident(inc.id);
    if (fresh) setSelectedIncidentData(fresh);
  };

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
            const taskCount = inc.taskCount ?? inc.tasks?.length ?? 0;

            // Ownership tags
            const isCreatedByMe = inc.createdById === currentUser?.id;
            const isAssignedToMe = inc.assignedId === currentUser?.id;

            return (
              <div
                key={inc.id}
                className={`inc-card ${pcfg.color} ${active ? "inc-card-active" : ""} ${overdue ? "inc-card-overdue" : ""}`}
                onClick={() => handleCardClick(inc)}
              >
                <div className="inc-card-top">
                  <div className="inc-card-left">
                    <span className={`inc-priority-badge ${pcfg.color}`}>
                      {pcfg.icon} {inc.priority}
                    </span>
                    <span className="inc-id">{inc.incidentNo}</span>
                    {taskCount > 0 && (
                      <span className="inc-task-count-badge">
                        {taskCount} task{taskCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="inc-card-right">
                    {/* Ownership tags */}
                    {isCreatedByMe && (
                      <span className="inc-tag inc-tag-createdby">
                        ✏️ Created by me
                      </span>
                    )}
                    {isAssignedToMe && (
                      <span className="inc-tag inc-tag-assignedto">
                        📥 Assigned to me
                      </span>
                    )}
                    <span className={`inc-status-chip ${scfg.color}`}>
                      {scfg.icon} {inc.status}
                    </span>
                  </div>
                </div>
                <h3 className="inc-card-title">{inc.title}</h3>
                <p className="inc-card-desc">
                  {(inc.description ?? "").substring(0, 80)}
                  {(inc.description?.length ?? 0) > 80 ? "..." : ""}
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
                    {inc.assignedName || "—"}
                  </span>
                  <span className="inc-assignee">
                    📤 {inc.createdByName || "—"}
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
                  <span className="inc-detail-id">
                    {selectedIncident.incidentNo}
                  </span>
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
                onClick={() => {
                  setSelectedId(null);
                  setSelectedIncidentData(null);
                }}
              >
                ×
              </button>
            </div>

            {/* Stepper */}
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
                {
                  label: "Assigned Role",
                  val: selectedIncident.assignedTo || "—",
                },
                {
                  label: "Assigned To",
                  val: selectedIncident.assignedName || "—",
                },
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
                  label: "Raised By",
                  val: selectedIncident.createdByName || "—",
                },
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

            <div className="inc-detail-section">
              <span className="inc-section-title">Description</span>
              <p className="inc-detail-desc">{selectedIncident.description}</p>
            </div>

            {/* Tasks */}
            {(selectedIncident.tasks?.length ?? 0) > 0 && (
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

            {/* Actions */}
            <div className="inc-detail-section">
              <span className="inc-section-title">Actions</span>
              <div className="detail-actions-row">
                {!["Closed"].includes(selectedIncident.status) && (
                  <button
                    className="inc-advance-btn"
                    onClick={() => advanceStatus(selectedIncident)}
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
                Comments ({selectedIncident.comments?.length ?? 0})
              </span>
              <div className="inc-comments">
                {!selectedIncident.comments?.length && (
                  <p className="inc-no-comments">No comments yet.</p>
                )}
                {(selectedIncident.comments ?? []).map((c, i) => (
                  <div key={i} className="inc-comment">
                    <div className="inc-comment-avatar">
                      {(c.author ?? "?").charAt(0)}
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
                  rows={3}
                  placeholder="Describe the incident in detail..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
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
                  <label>
                    Assign Role <span className="req">*</span>
                  </label>
                  <select
                    className="inc-form-input"
                    value={form.roleName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roleName: e.target.value,
                        assignedId: "",
                      })
                    }
                  >
                    <option value="">— Select role —</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inc-form-group">
                  <label>
                    Assignee <span className="req">*</span>
                  </label>
                  <select
                    className="inc-form-input"
                    value={form.assignedId}
                    onChange={(e) =>
                      setForm({ ...form, assignedId: e.target.value })
                    }
                    disabled={!form.roleName}
                  >
                    <option value="">
                      {form.roleName
                        ? "— Select person —"
                        : "Select a role first"}
                    </option>
                    {usersForRole(form.roleName).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
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
              <div />
              <button
                className="inc-modal-cancel"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                className="inc-modal-submit"
                onClick={handleCreate}
                disabled={saving || !form.title.trim() || !form.assignedId}
              >
                {saving ? (
                  "Creating…"
                ) : (
                  <>
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
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Tasks Modal */}
      {convertingIncident && (
        <ConvertToTasksModal
          incident={convertingIncident}
          users={users}
          onClose={() => setConvertingId(null)}
          onConvert={handleConvertToTasks}
        />
      )}
    </div>
  );
}
