// src/pages/admin/UserManagement.jsx

import { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/users.css";

const API = "http://localhost:5000/api/users";

function needsAssignment(user) {
  return (
    (user.status || "").toLowerCase() === "pending" ||
    !user.role ||
    user.role === "Not Assigned"
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [selectedDept, setSelectedDept] = useState("");
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  async function loadUsers() {
    const res = await axios.get(API);
    setUsers(res.data || []);
  }

  async function loadDepartments() {
    const res = await axios.get(`${API}/departments`);
    setDepartments(res.data || []);
  }

  async function handleDeptChange(deptId) {
    setSelectedDept(deptId);
    setSelectedRole("");

    const res = await axios.get(`${API}/roles/${deptId}`);
    setRoles(res.data || []);
  }

  /* ================= POPUP ================= */
  function openAssign(user) {
    setSelectedUser(user);
    setEditMode(false);
    setSelectedDept("");
    setRoles([]);
    setSelectedRole("");
  }

  async function openEdit(user) {
    setSelectedUser(user);
    setEditMode(true);

    if (user.department_id) {
      setSelectedDept(user.department_id);

      const res = await axios.get(`${API}/roles/${user.department_id}`);
      setRoles(res.data || []);
      setSelectedRole(user.role_id);
    }
  }

  function closePopup() {
    setSelectedUser(null);
  }

  /* ================= SAVE ================= */
  async function handleSave() {
    try {
      await axios.put(`${API}/${selectedUser.id}`, {
        role_id: Number(selectedRole),
        status: "Active",
      });

      alert("Saved ✅");
      loadUsers();
      closePopup();

    } catch (err) {
      console.error(err);
      alert("Server error ❌");
    }
  }

  /* ================= DELETE ================= */
  async function deleteUser() {
    await axios.delete(`${API}/${selectedUser.id}`);
    loadUsers();
    closePopup();
  }

  /* ================= UI ================= */
  return (
    <div className="users-container">

      <h1>User Management</h1>

      {/* TABLE */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>

              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.department || "-"}</td>
              <td>{user.role || "Not Assigned"}</td>
              <td>{user.status}</td>

              <td>
                {needsAssignment(user) ? (
                  <button
                    className="assign-btn"
                    onClick={() => openAssign(user)}
                  >
                    Assign
                  </button>
                ) : (
                  <button
                    className="edit-btn"
                    onClick={() => openEdit(user)}
                  >
                    Edit
                  </button>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= POPUP MODAL ================= */}
      {selectedUser && (
        <div className="modal-overlay" onClick={closePopup}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>

            <h2>{editMode ? "Edit User" : "Assign Role"}</h2>

            <p><b>{selectedUser.name}</b></p>

            {/* DEPARTMENT */}
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* ROLE */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button onClick={closePopup}>Cancel</button>

              {editMode && (
                <button className="delete-btn" onClick={deleteUser}>
                  Delete
                </button>
              )}

              <button className="assign-btn" onClick={handleSave}>
                {editMode ? "Save" : "Assign"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}