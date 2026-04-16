import React, { useState } from "react";
import {
  PRIORITY_CONFIG,
  TASK_STATUS_FLOW,
  TASK_STATUS_CONFIG,
} from "./incidentConfig";
import { timeAgo } from "./incidentHelpers";

/* ─── BLOCKED REASON MODAL ───────────────────────────────── */
function BlockedReasonModal({ task, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(task.id, reason.trim());
  };

  return (
    <div className="inc-modal-overlay" onClick={onCancel}>
      <div className="inc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inc-modal-header">
          <div>
            <h3>Mark as Blocked</h3>
            <p className="modal-sub">
              Provide a reason — this will be sent to{" "}
              <strong>{task.assignedName}</strong>'s assigner as a comment
            </p>
          </div>
          <button className="inc-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="inc-modal-body">
          {/* Task ref */}
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
              placeholder="e.g. Waiting for material delivery, design approval pending, access not granted..."
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
            This reason will be saved as a comment on the task so the assigner
            knows what action is needed.
          </div>
        </div>

        <div className="inc-modal-footer">
          <div />
          <button className="inc-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="blocked-confirm-btn"
            onClick={handleConfirm}
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

/* ─── TASK QUEUE ─────────────────────────────────────────── */
export default function TaskQueue({ incidents, setIncidents, onNavigateBack }) {
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [blockingTask, setBlockingTask] = useState(null);
  const [commentText, setCommentText] = useState("");

  // Flatten all tasks with incident context
  const allTasks = incidents.flatMap((inc) =>
    (inc.tasks || []).map((t) => ({
      ...t,
      incidentTitle: inc.title,
      incidentPriority: inc.priority,
      incidentStatus: inc.status,
    })),
  );

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

  // Always read fresh from allTasks so comments update reactively
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId);

  /* ── Status click — intercept Blocked ── */
  const handleStatusClick = (task, newStatus) => {
    if (newStatus === "Blocked") {
      setBlockingTask(task);
      return;
    }
    updateTaskStatus(task.id, newStatus);
  };

  /* ── Core update — optionally attaches a blocked comment ── */
  const updateTaskStatus = (taskId, newStatus, blockedReason = null) => {
    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        tasks: (inc.tasks || []).map((t) => {
          if (t.id !== taskId) return t;
          const updatedComments = blockedReason
            ? [
                ...(t.comments || []),
                {
                  author: t.assignedName,
                  text: `🚫 Blocked: ${blockedReason}`,
                  time: new Date(),
                  type: "blocked",
                },
              ]
            : t.comments || [];
          return {
            ...t,
            status: newStatus,
            updatedAt: new Date(),
            comments: updatedComments,
          };
        }),
      })),
    );
  };

  /* ── Confirmed blocked with reason ── */
  const handleBlockedConfirm = (taskId, reason) => {
    updateTaskStatus(taskId, "Blocked", reason);
    setBlockingTask(null);
  };

  /* ── Add free-form comment ── */
  const addComment = (taskId) => {
    if (!commentText.trim()) return;
    setIncidents((prev) =>
      prev.map((inc) => ({
        ...inc,
        tasks: (inc.tasks || []).map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            comments: [
              ...(t.comments || []),
              { author: "You", text: commentText, time: new Date() },
            ],
            updatedAt: new Date(),
          };
        }),
      })),
    );
    setCommentText("");
  };

  const stats = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === "Pending").length,
    inProgress: allTasks.filter((t) => t.status === "In Progress").length,
    done: allTasks.filter((t) => t.status === "Done").length,
    p1Urgent: p1AutoTasks.length,
  };

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
                const lastBlockComment = [...(task.comments || [])]
                  .reverse()
                  .find((c) => c.type === "blocked");

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
                    {/* Blocked reason preview on card */}
                    {isBlocked && lastBlockComment && (
                      <div className="tq-blocked-reason-chip">
                        🚫 {lastBlockComment.text.replace("🚫 Blocked: ", "")}
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

        {/* Detail panel */}
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

            {/* ── Update Status ── */}
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

            {/* ── Comments ── */}
            <div className="inc-detail-section">
              <span className="inc-section-title">
                Comments ({(selectedTask.comments || []).length})
              </span>
              <div className="inc-comments">
                {(selectedTask.comments || []).length === 0 && (
                  <p className="inc-no-comments">No comments yet.</p>
                )}
                {(selectedTask.comments || []).map((c, i) => (
                  <div
                    key={i}
                    className={`inc-comment ${c.type === "blocked" ? "inc-comment-blocked" : ""}`}
                  >
                    <div
                      className={`inc-comment-avatar ${c.type === "blocked" ? "inc-comment-avatar-blocked" : ""}`}
                    >
                      {c.author.charAt(0)}
                    </div>
                    <div className="inc-comment-body">
                      <div className="inc-comment-top">
                        <span className="inc-comment-author">{c.author}</span>
                        {c.type === "blocked" && (
                          <span className="inc-comment-blocked-tag"></span>
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

      {/* Blocked Reason Modal */}
      {blockingTask && (
        <BlockedReasonModal
          task={blockingTask}
          onConfirm={handleBlockedConfirm}
          onCancel={() => setBlockingTask(null)}
        />
      )}
    </div>
  );
}
