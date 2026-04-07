import { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/users.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [editMode, setEditMode] = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/users/departments",
      );
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── When department is selected, fetch roles for that dept ────────────────
  const handleDeptChange = async (deptId) => {
    setSelectedDept(deptId);
    setSelectedRoleId("");
    setFilteredRoles([]);
    if (!deptId) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/users/roles/${deptId}`,
      );
      setFilteredRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Search filter ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Open Assign Role modal ────────────────────────────────────────────────
  const openAssignModal = (user) => {
    setSelectedUser(user);
    setSelectedDept("");
    setFilteredRoles([]);
    setSelectedRoleId("");
    setSelectedStatus("Active");
    setEditMode(false);
  };

  // ── Open Edit modal — pre-fill dept & role from user data ─────────────────
  const openEditModal = async (user) => {
    setSelectedUser(user);
    setSelectedStatus(user.status || "Active");
    setEditMode(true);

    if (user.department_id && user.role_id) {
      // Fetch roles for the user's existing department
      try {
        const res = await axios.get(
          `http://localhost:5000/api/users/roles/${user.department_id}`,
        );
        setFilteredRoles(res.data);
        setSelectedDept(String(user.department_id));
        setSelectedRoleId(String(user.role_id));
      } catch (err) {
        console.error(err);
        setSelectedDept("");
        setFilteredRoles([]);
        setSelectedRoleId("");
      }
    } else {
      setSelectedDept("");
      setFilteredRoles([]);
      setSelectedRoleId("");
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedDept("");
    setFilteredRoles([]);
    setSelectedRoleId("");
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const updateUser = async () => {
    if (!selectedRoleId) {
      alert("Please select a department and role.");
      return;
    }
    try {
      await axios.put(`http://localhost:5000/api/users/${selectedUser.id}`, {
        role_id: Number(selectedRoleId),
        status: selectedStatus,
      });
      fetchUsers();
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteUser = async () => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${selectedUser.id}`);
      fetchUsers();
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="users-container">
      {/* ── Header ── */}
      <div className="users-header">
        <h1>User Management</h1>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Users Table ── */}
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
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              {/* department + role come directly from the JOIN in GET /api/users */}
              <td>{user.department || "—"}</td>
              <td>{user.role || "Not Assigned"}</td>
              <td>
                <span className={`status ${user.status?.toLowerCase()}`}>
                  {user.status}
                </span>
              </td>
              <td>
                {user.role === "CEO" ? (
                  <span>Locked</span>
                ) : user.status === "Pending" ? (
                  <button
                    className="assign-btn"
                    onClick={() => openAssignModal(user)}
                  >
                    Assign Role
                  </button>
                ) : (
                  <button
                    className="edit-btn"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Modal ── */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editMode ? "Edit User" : "Assign Role"}</h2>
            <p className="selected-user">{selectedUser.name}</p>

            {/* Step 1 — Department */}
            <label className="modal-label">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Step 2 — Role (loads after dept selected) */}
            <label className="modal-label">Role</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={!selectedDept}
              style={{ opacity: !selectedDept ? 0.5 : 1 }}
            >
              <option value="">
                {!selectedDept
                  ? "Select a department first"
                  : filteredRoles.length > 0
                    ? "Select Role"
                    : "No roles in this department"}
              </option>
              {filteredRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            {/* Status — edit mode only */}
            {editMode && (
              <>
                <label className="modal-label">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal}>
                Cancel
              </button>
              <button className="assign-btn" onClick={updateUser}>
                Save
              </button>
              {editMode && (
                <button className="delete-btn" onClick={deleteUser}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
