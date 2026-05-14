// FILE PATH: src/pages/StructuralEngineer/CreateRFI.jsx

import { useState, useRef, useEffect } from "react";
import { createRFI } from "../../api/rfiApi";
import { fetchRoles, fetchUsersByRole, fetchProjects } from "../../api/userApi";
import "./RFI.css";

export default function CreateRFIModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
    project_id: "",       // store project ID
    project_name: "",     // store project name (for display + backend)
    drawing_ref: "",
    grid_ref: "",
    zone: "",
    response_required_by: "",
  });

  // ── Roles ──────────────────────────────────────────────────
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  // selectedRole = { id, name, code } from DB

  // ── Users ──────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [assignedUser, setAssignedUser] = useState("");

  // ── Projects ───────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // ── Other ──────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  // ── 1. Fetch roles on mount ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setRolesLoading(true);
      try {
        const data = await fetchRoles();
        // Filter active roles
        setRoles(data.filter((r) => r.is_active !== false));
      } catch (err) {
        console.error("Error fetching roles:", err);
        setError("Failed to load roles. Please refresh the page.");
      } finally {
        setRolesLoading(false);
      }
    };
    load();
  }, []);

  // ── 2. Fetch projects on mount ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      setProjectsLoading(true);
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setProjectsLoading(false);
      }
    };
    load();
  }, []);

  // ── 3. Fetch users when role changes ──────────────────────
  useEffect(() => {
    if (!selectedRole) {
      setUsers([]);
      setAssignedUser("");
      return;
    }
    const load = async () => {
      setUsersLoading(true);
      setAssignedUser("");
      try {
        // Pass role NAME — backend: WHERE LOWER(r.name) = LOWER($1)
        const data = await fetchUsersByRole(selectedRole.name);
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users for role:", err);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    load();
  }, [selectedRole]);

  // ── Event Handlers ─────────────────────────────────────────
  const handle = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Role dropdown handler ──────────────────────────────────
  const handleRoleChange = (e) => {
    const roleId = e.target.value;
    if (!roleId) {
      setSelectedRole(null);
      return;
    }
    const role = roles.find((r) => String(r.id) === roleId);
    setSelectedRole(role ?? null);
  };

  // ── Project dropdown handler ───────────────────────────────
  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    if (!projectId) {
      setForm((p) => ({ ...p, project_id: "", project_name: "" }));
      return;
    }
    const project = projects.find((p) => String(p.id) === projectId);
    setForm((prev) => ({
      ...prev,
      project_id: projectId,
      project_name: project?.name || "",
    }));
  };

  // ── Submit ─────────────────────────────────────────────────
  const submit = async () => {
    if (!form.subject.trim() || !selectedRole) {
      setError("Subject and Assigned Role are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();

      // Append all form fields except project_id (backend uses project_name)
      // eslint-disable-next-line no-unused-vars
      const { project_id, ...formFields } = form;
      Object.entries(formFields).forEach(([k, v]) => fd.append(k, v));

      // Role code (e.g. "structural_engineer") — stored in rfis.assigned_to_role
      fd.append("assigned_to_role", selectedRole.code || selectedRole.name);

      // Specific user within that role (optional)
      if (assignedUser) fd.append("assigned_to_user_id", assignedUser);

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
          <button className="rfi-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rfi-modal-body">
          {error && <p className="rfi-modal-error">{error}</p>}

          {/* Subject */}
          <label>Subject <span className="req">*</span></label>
          <input
            name="subject"
            value={form.subject}
            onChange={handle}
            placeholder="Brief description of the query"
          />

          {/* Assign To */}
          <label>Assign To <span className="req">*</span></label>
          <div className="rfi-modal-row">

            {/* Role dropdown — from DB */}
            <select
              value={selectedRole ? String(selectedRole.id) : ""}
              onChange={handleRoleChange}
              disabled={rolesLoading}
            >
              <option value="">
                {rolesLoading ? "Loading roles…" : "— Select role —"}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* User dropdown — appears after role selected */}
            {selectedRole && (
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                disabled={usersLoading}
              >
                <option value="">
                  {usersLoading
                    ? "Loading users…"
                    : users.length === 0
                    ? "No users for this role"
                    : "— Select user (optional) —"}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Priority + Project */}
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
              <select
                value={form.project_id}
                onChange={handleProjectChange}
                disabled={projectsLoading}
              >
                <option value="">
                  {projectsLoading ? "Loading projects…" : "— Select project —"}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.client ? ` — ${p.client}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handle}
            rows={4}
            placeholder="Provide full context, drawing refs, location, etc."
          />

          {/* Technical Fields */}
          <label>Drawing Reference</label>
          <input
            name="drawing_ref"
            value={form.drawing_ref}
            onChange={handle}
            placeholder="e.g. STR-FDN-001"
          />

          <label>Grid / Zone Reference</label>
          <input
            name="grid_ref"
            value={form.grid_ref}
            onChange={handle}
            placeholder="e.g. Grid C3"
          />

          <label>Zone / Location</label>
          <input
            name="zone"
            value={form.zone}
            onChange={handle}
            placeholder="e.g. Level 2"
          />

          <label>Response Required By</label>
          <input
            type="date"
            name="response_required_by"
            value={form.response_required_by}
            onChange={handle}
          />

          {/* Attachment */}
          <label>
            Attachment <span className="rfi-optional">(optional)</span>
          </label>
          <div className="rfi-file-area" onClick={() => fileRef.current.click()}>
            {file
              ? <span>📎 {file.name}</span>
              : <span>Click to attach a file (PDF, image, DWG) — max 10 MB</span>
            }
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
          <button className="rfi-btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="rfi-btn-primary"
            onClick={submit}
            disabled={loading || !form.subject.trim() || !selectedRole}
          >
            {loading ? "Submitting…" : "Submit RFI"}
          </button>
        </div>
      </div>
    </div>
  );
}