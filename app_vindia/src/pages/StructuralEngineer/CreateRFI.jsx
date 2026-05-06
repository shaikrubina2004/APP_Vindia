// FILE PATH: src/pages/StructuralEngineer/CreateRFI.jsx

import { useState, useRef, useEffect } from "react";
import { createRFI, ROLE_OPTIONS } from "../../api/rfiApi";
import { fetchUsersByRole } from "../../api/userApi";
import "./RFI.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CreateRFIModal({ myRole, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
    assigned_to_role: "",
    project_name: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignedUser, setAssignedUser] = useState("");
  const fileRef = useRef();

  // Fetch projects from project manager
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${BASE}/api/projects`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          // handle both { projects: [] } and []
          const list = Array.isArray(data)
            ? data
            : data.projects || data.data || [];
          setProjects(list);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!form.assigned_to_role) {
        setUsers([]);
        return;
      }

      try {
        const data = await fetchUsersByRole(form.assigned_to_role);

        setUsers(data);
      } catch (err) {
        console.error("FETCH USERS ERROR:", err);
        setUsers([]);
      }
    };

    loadUsers();
  }, [form.assigned_to_role]);
  const assignableRoles = ROLE_OPTIONS.filter((r) => r.value !== myRole);
  const handle = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.subject.trim() || !form.assigned_to_role) {
      setError("Subject and Assigned To are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("assigned_to_user_id", assignedUser);
      if (file) fd.append("file", file);
      await createRFI(fd);
      onCreated();
    } catch (err) {
      setError("Failed to create RFI. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rfi-modal-overlay" onClick={onClose}>
      <div className="rfi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rfi-modal-header">
          <h2>Raise New RFI</h2>
          <button className="rfi-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="rfi-modal-body">
          {error && <p className="rfi-modal-error">{error}</p>}

          <label>
            Subject <span className="req">*</span>
          </label>
          <input
            name="subject"
            value={form.subject}
            onChange={handle}
            placeholder="Brief description of the query"
          />

          <label>
            Assign To <span className="req">*</span>
          </label>

          <div className="rfi-modal-row">
            {/* ROLE DROPDOWN */}
            <select
              name="assigned_to_role"
              value={form.assigned_to_role}
              onChange={handle}
            >
              <option value="">— Select role —</option>

              {assignableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* USER DROPDOWN */}
            {form.assigned_to_role && (
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
              >
                <option value="">— Select user —</option>

                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <select
            name="assigned_to_role"
            value={form.assigned_to_role}
            onChange={handle}
          >
            <option value="">— Select role —</option>
            {assignableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <div className="rfi-modal-row">
            <div>
              <label>Priority</label>
              <select name="priority" value={form.priority} onChange={handle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label>Project</label>
              {projects.length > 0 ? (
                <select
                  name="project_name"
                  value={form.project_name}
                  onChange={handle}
                >
                  <option value="">— Select project —</option>
                  {projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.name || p.project_name || p.title}
                    >
                      {p.name || p.project_name || p.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="project_name"
                  value={form.project_name}
                  onChange={handle}
                  placeholder="Type project name"
                />
              )}
            </div>
          </div>

          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handle}
            rows={4}
            placeholder="Provide full context, drawing refs, location, etc."
          />

          <label>
            Attachment <span className="rfi-optional">(optional)</span>
          </label>
          <div
            className="rfi-file-area"
            onClick={() => fileRef.current.click()}
          >
            {file ? (
              <span>📎 {file.name}</span>
            ) : (
              <span>Click to attach a file (PDF, image, DWG) — max 10 MB</span>
            )}
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          {file && (
            <button className="rfi-remove-file" onClick={() => setFile(null)}>
              ✕ Remove file
            </button>
          )}
        </div>

        <div className="rfi-modal-footer">
          <button
            className="rfi-btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="rfi-btn-primary"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit RFI"}
          </button>
        </div>
      </div>
    </div>
  );
}
