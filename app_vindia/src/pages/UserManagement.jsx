import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";
import AppLayout from "../layout/AppLayout";
import axios from "axios";

function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");

      setUsers(res.data);

    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Change role
  const handleRoleChange = async (id, newRole) => {

    try {

      await axios.put(
        `http://localhost:5000/api/users/${id}/role`,
        { role: newRole }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role: newRole } : u
        )
      );

    } catch (error) {
      console.error("Role update failed", error);
    }
  };

  // Only CEO can access
  if (user?.role !== ROLES.CEO) {
    return <h2 style={{ padding: "40px" }}>Access Denied</h2>;
  }

  return (
    <AppLayout>

      <h2>User Management</h2>

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>

        <thead>
          <tr style={{ background: "#f4f4f4" }}>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Name</th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Role</th>
          </tr>
        </thead>

        <tbody>

          {users.map((u) => (

            <tr key={u.id}>

              <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                {u.name}
              </td>

              <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                <select
                  value={u.role}
                  onChange={(e) =>
                    handleRoleChange(u.id, e.target.value)
                  }
                >
                  <option value={ROLES.EMPLOYEE}>Employee</option>
                  <option value={ROLES.FINANCE}>Finance</option>
                  <option value={ROLES.MARKETING}>Marketing</option>
                  <option value={ROLES.CLIENT}>Client</option>
                  <option value={ROLES.CEO}>CEO</option>
                </select>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </AppLayout>
  );
}

export default UserManagement;