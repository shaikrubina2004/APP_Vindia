import React, { useState, useMemo } from "react";
import { PRIORITY_CONFIG } from "./incidentConfig";

export default function ConvertToTasksModal({
  incident,
  users = [], // [{ id, name, roleId, roleName }]
  onClose,
  onConvert,
}) {
  // Unique roles from the users list
  const roles = useMemo(
    () => [...new Set(users.map((u) => u.roleName).filter(Boolean))].sort(),
    [users],
  );

  const emptyTask = () => ({
    id: Date.now() + Math.random(),
    title: "",
    roleId: "",
    roleName: "",
    assignedId: "",
    assignedName: "",
    priority: incident.priority,
    note: "",
  });

  const [tasks, setTasks] = useState([emptyTask()]);

  const addTask = () => setTasks((t) => [...t, emptyTask()]);
  const removeTask = (id) => setTasks((t) => t.filter((tk) => tk.id !== id));

  const updateTask = (id, field, val) =>
    setTasks((t) =>
      t.map((tk) => (tk.id === id ? { ...tk, [field]: val } : tk)),
    );

  // When role changes, reset the assignee and store roleName
  const handleRoleChange = (id, roleName) => {
    setTasks((t) =>
      t.map((tk) =>
        tk.id === id
          ? { ...tk, roleName, roleId: "", assignedId: "", assignedName: "" }
          : tk,
      ),
    );
  };

  // Filter users by the chosen role for this task row
  const usersForRole = (roleName) =>
    users.filter((u) => u.roleName === roleName);

  const handleAssigneeChange = (id, userId) => {
    const user = users.find((u) => String(u.id) === String(userId));
    setTasks((t) =>
      t.map((tk) =>
        tk.id === id
          ? {
              ...tk,
              assignedId: user?.id ?? "",
              assignedName: user?.name ?? "",
            }
          : tk,
      ),
    );
  };

  const handleSubmit = () => {
    const valid = tasks.filter((t) => t.title.trim() && t.assignedId);
    if (!valid.length) return;
    onConvert(incident.id, valid);
    onClose();
  };

  const allValid = tasks.every((t) => t.title.trim() && t.assignedId);

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
              Break <strong>{incident.incidentNo}</strong> into actionable tasks
              and assign them
            </p>
          </div>
          <button className="inc-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="inc-modal-body">
          {/* Incident ref */}
          <div className="ctm-incident-ref">
            <span
              className={`inc-priority-badge ${PRIORITY_CONFIG[incident.priority].color}`}
            >
              {PRIORITY_CONFIG[incident.priority].icon} {incident.priority}
            </span>
            <span className="ctm-inc-title">{incident.title}</span>
          </div>

          <div className="ctm-tasks-list">
            {tasks.map((task, idx) => {
              const roleUsers = usersForRole(task.roleName);
              return (
                <div key={task.id} className="ctm-task-row">
                  <div className="ctm-task-num">{idx + 1}</div>
                  <div className="ctm-task-fields">
                    {/* Row 1: title + priority */}
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

                    {/* Row 2: role → name (cascading) */}
                    <div className="ctm-row">
                      <div className="inc-form-group">
                        <label>
                          Assign Role <span className="req">*</span>
                        </label>
                        <select
                          className="inc-form-input"
                          value={task.roleName}
                          onChange={(e) =>
                            handleRoleChange(task.id, e.target.value)
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

                      <div className="inc-form-group" style={{ flex: 2 }}>
                        <label>
                          Assignee <span className="req">*</span>
                        </label>
                        <select
                          className="inc-form-input"
                          value={task.assignedId}
                          onChange={(e) =>
                            handleAssigneeChange(task.id, e.target.value)
                          }
                          disabled={!task.roleName}
                        >
                          <option value="">
                            {task.roleName
                              ? "— Select person —"
                              : "Select a role first"}
                          </option>
                          {roleUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: note */}
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
              );
            })}
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
          <button
            className="inc-modal-submit"
            onClick={handleSubmit}
            disabled={!allValid}
            title={!allValid ? "Fill in all task titles and assignees" : ""}
          >
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
