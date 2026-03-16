import { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/users.css";

const roles = [
  "HR",
  "FINANCE",
  "MARKETING",
  "SITE_ENGINEER",
  "EMPLOYEE",
  "CLIENT"
];

function UserManagement() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [editMode, setEditMode] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setSelectedRole("");
    setSelectedStatus("Active");
    setEditMode(false);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSelectedStatus(user.status);
    setEditMode(true);
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  const updateUser = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/users/${selectedUser.id}`,
        {
          role: selectedRole,
          status: selectedStatus
        }
      );

      fetchUsers();
      closeModal();

    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async () => {

    if(!window.confirm("Delete this user?")) return;

    try {

      await axios.delete(
        `http://localhost:5000/api/users/${selectedUser.id}`
      );

      fetchUsers();
      closeModal();

    } catch (error) {
      console.error(error);
    }

  };

  return (

    <div className="users-container">

      <div className="users-header">

        <h1>User Management</h1>

        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />

      </div>

      {/* USERS TABLE */}

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
                    onClick={()=>openAssignModal(user)}
                  >
                    Assign Role
                  </button>

                ) : (

                  <button
                    className="edit-btn"
                    onClick={()=>openEditModal(user)}
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

  );

}

export default UserManagement;