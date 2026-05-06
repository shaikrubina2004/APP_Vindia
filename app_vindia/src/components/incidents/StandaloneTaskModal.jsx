import React, { useState, useMemo, useRef } from "react";
import { PRIORITY_CONFIG } from "./incidentConfig";
export default function StandaloneTaskModal({
  users = [],
  onClose,
  onSubmit,
  activeProject,
}) {
  const roles = useMemo(
    () => [...new Set(users.map((u) => u.roleName).filter(Boolean))].sort(),
    [users],
  );

  const [task, setTask] = useState({
    title: "",
    roleName: "",
    assignedId: "",
    assignedName: "",
    priority: "P2",
    note: "",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };
  const usersForRole = (roleName) =>
    users.filter((u) => u.roleName === roleName);

  const handleRoleChange = (roleName) => {
    setTask((t) => ({ ...t, roleName, assignedId: "", assignedName: "" }));
  };

  const handleAssigneeChange = (userId) => {
    const user = users.find((u) => String(u.id) === String(userId));
    setTask((t) => ({
      ...t,
      assignedId: user?.id ?? "",
      assignedName: user?.name ?? "",
    }));
  };

  const handleSubmit = () => {
    if (!task.title.trim() || !task.assignedId) return;
    onSubmit({ ...task, photoPreview, projectId: activeProject?.id ?? null });
    onClose();
  };

  const isValid = task.title.trim() && task.assignedId;

  return (
    <div className="inc-modal-overlay" onClick={onClose}>
      <div
        className="inc-modal modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inc-modal-header">
          <div>
            <h3>Create New Task</h3>
            <p className="modal-sub">
              {activeProject?.id
                ? `${activeProject.name} — project task`
                : "Open task — not linked to any project"}
            </p>
          </div>
          <button className="inc-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="inc-modal-body">
          {activeProject?.id && (
            <div className="inc-form-group">
              <label>Project</label>
              <input
                className="inc-form-input"
                value={`${activeProject.code} — ${activeProject.name}`}
                readOnly
                style={{
                  background: "#f7f9fc",
                  color: "#7a7a8a",
                  cursor: "not-allowed",
                }}
              />
            </div>
          )}
          {/* Title + Priority */}
          <div className="ctm-row"></div>
          {/* Title + Priority */}
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
                  setTask((t) => ({ ...t, title: e.target.value }))
                }
              />
            </div>
            <div className="inc-form-group">
              <label>Priority</label>
              <select
                className="inc-form-input"
                value={task.priority}
                onChange={(e) =>
                  setTask((t) => ({ ...t, priority: e.target.value }))
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

          {/* Role + Assignee */}
          <div className="ctm-row">
            <div className="inc-form-group">
              <label>
                Assign Role <span className="req">*</span>
              </label>
              <select
                className="inc-form-input"
                value={task.roleName}
                onChange={(e) => handleRoleChange(e.target.value)}
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
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={!task.roleName}
              >
                <option value="">
                  {task.roleName ? "— Select person —" : "Select a role first"}
                </option>
                {usersForRole(task.roleName).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="inc-form-group">
            <label>Note (optional)</label>
            <input
              className="inc-form-input"
              placeholder="Any specific instructions..."
              value={task.note}
              onChange={(e) => setTask((t) => ({ ...t, note: e.target.value }))}
            />
          </div>

          {/* Photo */}
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
          <button className="inc-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="inc-modal-submit"
            onClick={handleSubmit}
            disabled={!isValid}
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
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
