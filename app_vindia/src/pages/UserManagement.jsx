import { useState } from "react";
import AppLayout from "../layout/AppLayout";
import "../styles/users.css";

const roles = [
  "CEO",
  "HR",
  "FINANCE",
  "MARKETING",
  "SITE_ENGINEER",
  "EMPLOYEE"
];

function UserManagement() {

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: ""
  });

  const users = [
    {
      id: 1,
      name: "Ravi Kumar",
      email: "ravi@mail.com",
      role: "Employee",
      status: "Active"
    },
    {
      id: 2,
      name: "Meena Sharma",
      email: "meena@mail.com",
      role: "HR",
      status: "Active"
    },
    {
      id: 3,
      name: "Arun Das",
      email: "arun@mail.com",
      role: null,
      status: "Pending"
    }
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const openRoleModal = (user) => {
    setSelectedUser(user);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedRole("");
  };

  const assignRole = () => {

    if (!selectedRole) {
      alert("Please select a role");
      return;
    }

    alert(`Assigned ${selectedRole} role to ${selectedUser.name}`);
    closeModal();
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const handleInputChange = (e) => {
    setNewUser({
      ...newUser,
      [e.target.name]: e.target.value
    });
  };

  const addUser = () => {

    if (!newUser.name || !newUser.email || !newUser.role) {
      alert("Please fill all fields");
      return;
    }

    alert(`User ${newUser.name} added successfully`);

    setNewUser({
      name: "",
      email: "",
      role: ""
    });

    closeAddModal();
  };

  return (
    <AppLayout>

      <div className="users-container">

        <div className="users-header">

          <h1>User Management</h1>

          <div className="users-actions">

            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              className="add-user-btn"
              onClick={openAddModal}
            >
              + Add User
            </button>

          </div>

        </div>

        <table className="users-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
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

                <td>
                  {user.role ? user.role : "Not Assigned"}
                </td>

                <td>
                  <span className={`status ${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>

                <td>

                  {user.status === "Pending" ? (

                    <button
                      className="assign-btn"
                      onClick={() => openRoleModal(user)}
                    >
                      Assign Role
                    </button>

                  ) : (

                    <button
                      className="edit-btn"
                      onClick={() => openRoleModal(user)}
                    >
                      Edit
                    </button>

                  )}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* ASSIGN ROLE MODAL */}

      {selectedUser && (

        <div className="modal-overlay">

          <div className="modal">

            <h2>Assign Role</h2>

            <p className="selected-user">
              {selectedUser.name}
            </p>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >

              <option value="">Select Role</option>

              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}

            </select>

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                className="assign-btn"
                onClick={assignRole}
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ADD USER MODAL */}

      {showAddModal && (

        <div className="modal-overlay">

          <div className="modal">

            <h2>Add User</h2>

            <input
              type="text"
              name="name"
              placeholder="Name"
              value={newUser.name}
              onChange={handleInputChange}
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={newUser.email}
              onChange={handleInputChange}
            />

            <select
              name="role"
              value={newUser.role}
              onChange={handleInputChange}
            >

              <option value="">Select Role</option>

              {roles.map(role => (
                <option key={role}>{role}</option>
              ))}

            </select>

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={closeAddModal}
              >
                Cancel
              </button>

              <button
                className="assign-btn"
                onClick={addUser}
              >
                Add
              </button>

            </div>

          </div>

        </div>

      )}

    </AppLayout>
  );
}

export default UserManagement;