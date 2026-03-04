import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";
import AppLayout from "../layout/AppLayout";

function UserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState([
    { id: 1, name: "John", role: ROLES.EMPLOYEE },
    { id: 2, name: "Meena", role: ROLES.FINANCE },
  ]);

  const handleRoleChange = (id, newRole) => {
    const updated = users.map((u) =>
      u.id === id ? { ...u, role: newRole } : u
    );
    setUsers(updated);
  };

  if (user?.role !== ROLES.CEO) {
    return <h2 style={{ padding: "40px" }}>Access Denied</h2>;
  }

  return (
    <AppLayout>
      <h2>User Management</h2>

      <table style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>
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