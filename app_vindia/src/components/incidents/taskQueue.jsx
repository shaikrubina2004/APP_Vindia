import React, { useState } from "react";
import { API } from "../../services/authService";
import { useAuth } from "../../context/useAuth";
import StandaloneTaskModal from "./StandaloneTaskModal";
import { useRef } from "react";
import ProjectSwitcher from "../project/ProjectSwitcher";

import {
  PRIORITY_CONFIG,
  TASK_STATUS_FLOW,
  TASK_STATUS_CONFIG,
} from "./incidentConfig";
import { timeAgo } from "./incidentHelpers";

function BlockedReasonModal({ task, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  return (
    <div className="inc-modal-overlay" onClick={onCancel}>
      <div className="inc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inc-modal-header">
          <div>
            <h3>Mark as Blocked</h3>
            <p className="modal-sub">
              Provide a reason —{" "}
              <strong>{task.assignedName || "the assignee"}</strong>'s assigner
              will be notified as a comment
            </p>
          </div>
          <button className="inc-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="inc-modal-body">
          <div className="ctm-incident-ref">
            <span
              className={`inc-priority-badge ${PRIORITY_CONFIG[task.priority].color}`}
            >
              {PRIORITY_CONFIG[task.priority].icon} {task.priority}
            </span>
            <span className="ctm-inc-title">{task.title}</span>
          </div>
          <div className="inc-form-group">
            <label>
              Reason for blocking <span className="req">*</span>
            </label>
            <textarea
              className="inc-form-input inc-form-textarea"
              placeholder="e.g. Waiting for material delivery, design approval pending..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <div className="blocked-reason-hint">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This reason will be saved as a comment on the task.
          </div>
        </div>
        <div className="inc-modal-footer">
          <div />
          <button className="inc-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="blocked-confirm-btn"
            onClick={() => reason.trim() && onConfirm(task.id, reason.trim())}
            disabled={!reason.trim()}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Confirm Blocked
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskQueue({
  incidents,
  setIncidents,
  standaloneTasks = [],
  users,
  onNavigateBack,
  refreshAllTasks,
  activeProject,
}) {
  const { user: currentUser } = useAuth();

  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [blockingTask, setBlockingTask] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const taskFileRef = useRef(null);

  const allTasks = [
    ...incidents.flatMap((inc) =>
      (inc.tasks ?? []).map((t) => ({
        ...t,
        incidentTitle: t.incidentTitle ?? inc.title,
        incidentPriority: t.incidentPriority ?? inc.priority,
        incidentStatus: inc.status,
      })),
    ),
    ...standaloneTasks.map((t) => ({
      ...t,
      incidentTitle: "Standalone Task",
      incidentPriority: t.incidentPriority || t.priority,
      incidentStatus: "—",
    })),
  ];

  const p1AutoTasks = allTasks.filter(
    (t) => t.incidentPriority === "P1" && t.status === "Pending",
  );

  const roles = [
    "All",
    ...Array.from(new Set(allTasks.map((t) => t.assignedTo).filter(Boolean))),
  ];

  const filtered = allTasks.filter((t) => {
    const matchRole = filterRole === "All" || t.assignedTo === filterRole;
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority =
      filterPriority === "All" || t.priority === filterPriority;
    const matchSearch =
      (t.title ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.assignedName ?? "").toLowerCase().includes(searchText.toLowerCase());
    return matchRole && matchStatus && matchPriority && matchSearch;
  });

  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null;

  const handleStatusClick = (task, newStatus) => {
    if (newStatus === "Blocked") {
      setBlockingTask(task);
      return;
    }
    updateTaskStatus(task.id, newStatus);
  };

  const updateTaskStatus = async (taskId, newStatus, blockedReason = null) => {
    const prevIncidents = incidents;

    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        tasks: (inc.tasks ?? []).map((t) => {
          if (t.id !== taskId) return t;
          const updatedComments = blockedReason
            ? [
                ...(t.comments ?? []),
                {
                  author: t.assignedName,
                  text: `🚫 Blocked: ${blockedReason}`,
                  time: new Date(),
                  type: "blocked",
                },
              ]
            : (t.comments ?? []);
          return {
            ...t,
            status: newStatus,
            updatedAt: new Date(),
            comments: updatedComments,
          };
        }),
      })),
    );

    try {
      await API.patch(`/incidents/tasks/${taskId}/status`, {
        status: newStatus,
        ...(blockedReason ? { blocked_reason: blockedReason } : {}),
      });
    } catch (err) {
      console.error("updateTaskStatus:", err);
      setIncidents(prevIncidents);
      alert(
        "Failed to update task status: " +
          (err.response?.data?.message ?? err.message),
      );
    }
  };

  const handleBlockedConfirm = (taskId, reason) => {
    updateTaskStatus(taskId, "Blocked", reason);
    setBlockingTask(null);
  };

  const addComment = async (taskId) => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");

    const tempComment = {
      author: "You",
      text,
      time: new Date(),
      type: "comment",
    };

    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        tasks: (inc.tasks ?? []).map((t) =>
          t.id !== taskId
            ? t
            : {
                ...t,
                comments: [...(t.comments ?? []), tempComment],
                updatedAt: new Date(),
              },
        ),
      })),
    );

    try {
      await API.post(`/incidents/tasks/${taskId}/comments`, { body: text });
    } catch (err) {
      console.error("addComment:", err);
      setIncidents((prev) =>
        prev.map((inc) => ({
          ...inc,
          tasks: (inc.tasks ?? []).map((t) =>
            t.id !== taskId
              ? t
              : {
                  ...t,
                  comments: (t.comments ?? []).filter((c) => c !== tempComment),
                },
          ),
        })),
      );
      alert(
        "Failed to add comment: " +
          (err.response?.data?.message ?? err.message),
      );
    }
  };

  const handleCreateStandaloneTask = async (task) => {
    try {
      const res = await API.post("/incidents/tasks/standalone", {
        title: task.title,
        note: task.note,
        priority: task.priority,
        assigned_to_user_id: task.assignedId,
        project_id: task.projectId ?? null,
      });

      // Upload photo if attached
      if (task.photoPreview && res.data.data?.id) {
        await API.post(`/incidents/tasks/${res.data.data.id}/photos`, {
          url: task.photoPreview,
        });
      }

      await refreshAllTasks();
    } catch (err) {
      console.error("createStandaloneTask:", err);
      alert(
        "Failed to create task: " +
          (err.response?.data?.message ?? err.message),
      );
    }
  };

  const handleTaskPhoto = async (e, taskId) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        await API.post(`/incidents/tasks/${taskId}/photos`, { url: base64 });
        // Refresh all tasks to get updated photos from server
        await refreshAllTasks();
      } catch (err) {
        console.error("handleTaskPhoto:", err);
        alert(
          "Failed to upload photo: " +
            (err.response?.data?.message ?? err.message),
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const stats = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === "Pending").length,
    inProgress: allTasks.filter((t) => t.status === "In Progress").length,
    done: allTasks.filter((t) => t.status === "Done").length,
    p1Urgent: p1AutoTasks.length,
  };

  const byAssignee = filtered.reduce((acc, t) => {
    const key = t.assignedName || t.assignedTo || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="inc-page">
      {/* Header */}
      <div className="inc-header">
        <div className="inc-header-left">
          <div>
            <h1>Task Queue</h1>
            <p>Tasks generated from incidents — assigned to team members</p>
          </div>
        </div>
        <div className="inc-header-actions">
          <ProjectSwitcher />
          <button
            className="inc-create-btn"
            onClick={() => setShowNewTask(true)}
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
            New Task
          </button>
        </div>
      </div>

      {/* P1 banner */}
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
                const isActive = selectedTaskId === task.id;
                const isBlocked = task.status === "Blocked";
                const lastBlock = [...(task.comments ?? [])]
                  .reverse()
                  .find((c) => c.type === "blocked");

                // Ownership tags
                const isAssignedToMe = task.assignedId === currentUser?.id;

                return (
                  <div
                    key={task.id}
                    className={`inc-card tq-task-card ${pcfg.color} ${isActive ? "inc-card-active" : ""} ${isP1Auto ? "tq-p1-auto" : ""} ${isBlocked ? "tq-blocked-card" : ""}`}
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
                      <div className="inc-card-right">
                        {/* Ownership tag */}
                        {isAssignedToMe && (
                          <span className="inc-tag inc-tag-assignedto">
                            📥 Assigned to me
                          </span>
                        )}
                        <span className={`inc-status-chip ${scfg.color}`}>
                          {scfg.icon} {task.status}
                        </span>
                      </div>
                    </div>
                    <h3 className="inc-card-title">{task.title}</h3>
                    <p className="inc-card-desc tq-incident-ref">
                      From: {(task.incidentTitle ?? "").substring(0, 70)}
                      {(task.incidentTitle?.length ?? 0) > 70 ? "…" : ""}
                    </p>
                    {task.note && (
                      <p className="tq-task-note">📝 {task.note}</p>
                    )}
                    {isBlocked && lastBlock && (
                      <div className="tq-blocked-reason-chip">
                        🚫 {lastBlock.text.replace("🚫 Blocked: ", "")}
                      </div>
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
                      <span className="inc-assignee">
                        📤 {task.createdByName || "—"}
                      </span>
                      <span
                        className={`inc-deadline ${task.deadlineAt && Date.now() > new Date(task.deadlineAt).getTime() ? "overdue" : ""}`}
                      >
                        {task.deadlineAt
                          ? Date.now() > new Date(task.deadlineAt).getTime()
                            ? `Overdue by ${Math.floor((Date.now() - new Date(task.deadlineAt).getTime()) / 3600000)}h`
                            : `Due in ${Math.floor((new Date(task.deadlineAt).getTime() - Date.now()) / 3600000)}h`
                          : ""}
                      </span>
                      <span className="inc-time">
                        {timeAgo(task.createdAt)}
                      </span>
                    </div>
                    {task.deadlineAt &&
                      Date.now() > new Date(task.deadlineAt).getTime() && (
                        <div className="inc-overdue-bar">
                          ⏰ Reminder: This task is overdue!
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selectedTask ? (
          <div className="inc-detail">
            <div className="inc-detail-header">
              <div>
                <div className="inc-detail-id-row">
                  <span className="inc-detail-id">
                    {selectedTask.incidentTitle || selectedTask.incidentId}
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
                  {selectedTask.assignedId === currentUser?.id && (
                    <span className="inc-tag inc-tag-assignedto">
                      📥 Assigned to me
                    </span>
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

            {/* Stepper */}
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
                { label: "Assigned Role", val: selectedTask.assignedTo || "—" },
                { label: "Assignee", val: selectedTask.assignedName || "—" },
                {
                  label: "Assigned By",
                  val: selectedTask.createdByName || "—",
                },

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
                {
                  label: "From Incident",
                  val: selectedTask.incidentTitle || selectedTask.incidentId,
                },
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

            {/* Photos */}
            <div className="inc-detail-section">
              <span className="inc-section-title">
                Photos ({(selectedTask.photos ?? []).length})
              </span>
              {(selectedTask.photos ?? []).length > 0 && (
                <div className="inc-photos-grid">
                  {(selectedTask.photos ?? []).map((p) => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt="task"
                      className="inc-photo-thumb"
                      onClick={() => setLightboxUrl(p.url)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </div>
              )}
              <div
                className="inc-photo-upload"
                onClick={() => taskFileRef.current.click()}
              >
                <svg
                  width="20"
                  height="20"
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
              </div>
              <input
                ref={taskFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleTaskPhoto(e, selectedTask.id)}
              />
            </div>

            {/* Update Status */}
            <div className="inc-detail-section">
              <span className="inc-section-title">Update Status</span>
              <div className="tq-status-actions">
                {TASK_STATUS_FLOW.map((s) => {
                  const isActive = selectedTask.status === s;
                  const isBlockedBtn = s === "Blocked";
                  return (
                    <button
                      key={s}
                      className={[
                        "tq-status-btn",
                        isActive ? "tq-status-btn-active" : "",
                        isBlockedBtn ? "tq-status-btn-blocked" : "",
                      ]
                        .join(" ")
                        .trim()}
                      data-active={isActive}
                      data-status={s.toLowerCase().replace(" ", "-")}
                      onClick={() => handleStatusClick(selectedTask, s)}
                    >
                      {TASK_STATUS_CONFIG[s].icon} {s}
                      {isBlockedBtn && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{ marginLeft: 4 }}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="inc-detail-section">
              <span className="inc-section-title">
                Comments ({(selectedTask.comments ?? []).length})
              </span>
              <div className="inc-comments">
                {!selectedTask.comments?.length && (
                  <p className="inc-no-comments">No comments yet.</p>
                )}
                {(selectedTask.comments ?? []).map((c, i) => (
                  <div
                    key={i}
                    className={`inc-comment ${c.type === "blocked" ? "inc-comment-blocked" : ""}`}
                  >
                    <div
                      className={`inc-comment-avatar ${c.type === "blocked" ? "inc-comment-avatar-blocked" : ""}`}
                    >
                      {(c.author ?? "?").charAt(0)}
                    </div>
                    <div className="inc-comment-body">
                      <div className="inc-comment-top">
                        <span className="inc-comment-author">{c.author}</span>
                        {c.type === "blocked" && (
                          <span className="inc-comment-blocked-tag" />
                        )}
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
                    e.key === "Enter" && addComment(selectedTask.id)
                  }
                />
                <button
                  className="inc-comment-send"
                  onClick={() => addComment(selectedTask.id)}
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

      {blockingTask && (
        <BlockedReasonModal
          task={blockingTask}
          onConfirm={handleBlockedConfirm}
          onCancel={() => setBlockingTask(null)}
        />
      )}
      {showNewTask && (
        <StandaloneTaskModal
          users={users}
          onClose={() => setShowNewTask(false)}
          onSubmit={handleCreateStandaloneTask}
          activeProject={activeProject}
        />
      )}
      {lightboxUrl && (
        <div
          className="inc-modal-overlay"
          onClick={() => setLightboxUrl(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
          >
            <button
              className="inc-modal-close"
              onClick={() => setLightboxUrl(null)}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                zIndex: 1001,
              }}
            >
              ×
            </button>
            <img
              src={lightboxUrl}
              alt="preview"
              style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
