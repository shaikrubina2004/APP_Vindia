// CEO → Users: assign a department + role to new sign-ups, edit or remove users.

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import API from "../../services/authService";
import { initials, Card, Empty } from "./ceoShared";
import "./ceoHub.css";
import "../../styles/users.css";

function needsAssignment(user) {
  return (
    (user.status || "").toLowerCase() === "pending" ||
    !user.role ||
    user.role === "Not Assigned"
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs role" },
  { id: "active", label: "Active" },
];

/* The popup and the toast are drawn on <body>, not inside the page.
   Inside the page, a parent element (transform / animation) turns
   "position: fixed" into "fixed to the page", so on a long list the popup
   opened far below the visible screen. On <body> it is always centred in the
   window. The wrapper keeps the .ceo-page class (display: contents = no box)
   so the CEO styles and colour variables still apply to the popup. */
function OnBody({ children }) {
  return createPortal(
    <div className="ceo-page" style={{ display: "contents" }}>{children}</div>,
    document.body
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedDept, setSelectedDept] = useState("");
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  /* ================= LOAD ================= */
  const loadUsers = useCallback(async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't load users. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    API.get("/users/departments")
      .then((res) => setDepartments(res.data || []))
      .catch((err) => console.error(err));
  }, [loadUsers]);

  /* While the popup is open: Esc closes it and the page behind stops scrolling */
  useEffect(() => {
    if (!selectedUser) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !saving) setSelectedUser(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selectedUser, saving]);

  async function handleDeptChange(deptId) {
    setSelectedDept(deptId);
    setSelectedRole("");
    if (!deptId) { setRoles([]); return; }
    try {
      const res = await API.get(`/users/roles/${deptId}`);
      setRoles(res.data || []);
    } catch (err) {
      console.error(err);
      setRoles([]);
    }
  }

  /* ================= POPUP ================= */
  function openAssign(user) {
    setSelectedUser(user);
    setEditMode(false);
    setConfirmDelete(false);
    setSelectedDept("");
    setRoles([]);
    setSelectedRole("");
  }

  async function openEdit(user) {
    setSelectedUser(user);
    setEditMode(true);
    setConfirmDelete(false);
    setSelectedDept(user.department_id || "");
    setSelectedRole(user.role_id || "");
    setRoles([]);
    if (user.department_id) {
      try {
        const res = await API.get(`/users/roles/${user.department_id}`);
        setRoles(res.data || []);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function closePopup() {
    if (saving) return;
    setSelectedUser(null);
  }

  /* ================= SAVE ================= */
  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await API.put(`/users/${selectedUser.id}`, {
        role_id: Number(selectedRole),
        status: "Active",
      });
      flash(editMode ? "User updated" : "Role assigned");
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error(err);
      flash("Couldn't save. Please try again.", true);
    } finally {
      setSaving(false);
    }
  }

  /* ================= DELETE ================= */
  async function deleteUser() {
    setSaving(true);
    try {
      await API.delete(`/users/${selectedUser.id}`);
      flash("User removed");
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error(err);
      flash("Couldn't remove this user.", true);
    } finally {
      setSaving(false);
    }
  }

  /* ================= FILTERED LIST ================= */
  const pendingCount = useMemo(() => users.filter(needsAssignment).length, [users]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "pending" && !needsAssignment(u)) return false;
      if (filter === "active" && needsAssignment(u)) return false;
      if (needle && !`${u.name} ${u.email} ${u.role || ""} ${u.department || ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [users, filter, q]);

  /* ================= UI ================= */
  return (
    <div className="ceo-page">
      <div className="ceo-head">
        <div>
          <h1 className="ceo-title">User Management</h1>
          <p className="ceo-sub">
            {users.length} people · {pendingCount ? `${pendingCount} waiting for a role` : "everyone has a role"}
          </p>
        </div>
      </div>

      <div className="ceo-toolbar">
        {FILTERS.map((f) => (
          <button key={f.id} className={`ceo-pill${filter === f.id ? " is-active" : ""}`} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id === "pending" && pendingCount > 0 && <span className="um-count">{pendingCount}</span>}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <label className="ceo-search">
          <Search />
          <input placeholder="Search name, email or role" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && <div className="ceo-card" style={{ marginBottom: 18, color: "var(--c-bad)" }}>{error}</div>}

      <Card>
        <div className="ceo-table-wrap" style={{ margin: "-20px -22px" }}>
          <table className="ceo-table um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6}><Empty>Loading users…</Empty></td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={6}><Empty>No users match this view.</Empty></td></tr>}
              {visible.map((user) => {
                const pending = needsAssignment(user);
                const active = (user.status || "").toLowerCase() === "active";
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="ceo-cell-user">
                        <span className="cd-avatar">{initials(user.name)}</span>
                        <b>{user.name}</b>
                      </div>
                    </td>
                    <td className="um-email">{user.email}</td>
                    <td>{user.department || <span className="ceo-muted">—</span>}</td>
                    <td>{user.role ? <span className="ceo-chip ceo-chip--blue">{user.role}</span> : <span className="ceo-muted">Not assigned</span>}</td>
                    <td>
                      <span className={`ceo-chip ${pending ? "ceo-chip--warn" : active ? "ceo-chip--ok" : ""}`}>
                        {pending ? "Pending" : user.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {pending ? (
                        <button className="ceo-btn ceo-btn--primary um-row-btn" onClick={() => openAssign(user)}>Assign</button>
                      ) : (
                        <button className="ceo-btn ceo-btn--outline" onClick={() => openEdit(user)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ================= POPUP MODAL (drawn on <body>) ================= */}
      {selectedUser && (
        <OnBody>
          <div className="um-overlay" style={{ zIndex: 5000 }} onClick={closePopup}>
            <div className="um-modal" role="dialog" aria-modal="true" aria-labelledby="um-title" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal__head">
                <h2 id="um-title">{editMode ? "Edit user" : "Assign role"}</h2>
                <button className="crp-close" onClick={closePopup} aria-label="Close">✕</button>
              </div>

              <div className="um-modal__who">
                <span className="cd-avatar">{initials(selectedUser.name)}</span>
                <div>
                  <div className="cd-row__name">{selectedUser.name}</div>
                  <div className="cd-row__meta">{selectedUser.email}</div>
                </div>
              </div>

              <label className="um-field">
                <span>Department</span>
                <select value={selectedDept} onChange={(e) => handleDeptChange(e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              <label className="um-field">
                <span>Role</span>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={!selectedDept}>
                  <option value="">{selectedDept ? "Select role" : "Choose a department first"}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>

              {confirmDelete && (
                <div className="um-confirm">
                  Remove <b>{selectedUser.name}</b> permanently? This can't be undone.
                </div>
              )}

              <div className="um-modal__actions">
                {editMode && !confirmDelete && (
                  <button className="ceo-btn ceo-btn--danger" onClick={() => setConfirmDelete(true)} disabled={saving}>Delete</button>
                )}
                {editMode && confirmDelete && (
                  <button className="ceo-btn ceo-btn--danger" onClick={deleteUser} disabled={saving}>{saving ? "Removing…" : "Yes, remove"}</button>
                )}
                <span style={{ flex: 1 }} />
                <button className="ceo-btn ceo-btn--ghost um-cancel" onClick={closePopup} disabled={saving}>Cancel</button>
                <button className="ceo-btn ceo-btn--primary" onClick={handleSave} disabled={saving || !selectedRole}>
                  {saving ? "Saving…" : editMode ? "Save changes" : "Assign role"}
                </button>
              </div>
            </div>
          </div>
        </OnBody>
      )}

      {toast && (
        <OnBody>
          <div className={`ceo-toast${toast.isError ? " is-error" : ""}`} role="status">{toast.msg}</div>
        </OnBody>
      )}
    </div>
  );
}