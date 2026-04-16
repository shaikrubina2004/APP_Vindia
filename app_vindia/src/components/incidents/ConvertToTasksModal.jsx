import React, { useState } from "react";
import { PRIORITY_CONFIG, ASSIGNEE_ROLES } from "./incidentConfig";

export default function ConvertToTasksModal({ incident, onClose, onConvert }) {
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
