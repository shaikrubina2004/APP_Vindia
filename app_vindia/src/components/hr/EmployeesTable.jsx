import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { deleteEmployee } from "../../services/employeeService";

function EmployeesTable({ employees, setEmployees, search, onAssignClick }) {
  const navigate = useNavigate();

  const isAnniversary = (date) => {
    const today = new Date();
    const join = new Date(date);
    return (
      join.getDate() === today.getDate() &&
      join.getMonth() === today.getMonth() &&
      today.getFullYear() - join.getFullYear() >= 1
    );
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // 🔍 FUZZY SEARCH
  const filteredEmployees = useMemo(() => {
    if (!search) return employees;

    const fuse = new Fuse(employees, {
      keys: ["name", "email", "department", "designation"],
      threshold: 0.3,
    });

    return fuse.search(search).map((result) => result.item);
  }, [search, employees]);

  return (
    <div className="employees-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Manager</th> {/* 🔥 renamed */}
            <th>Address</th>
            <th>Joining Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredEmployees.map((emp) => {
            const formatted = {
              ...emp,
              role: emp.designation,
              joiningDate: emp.join_date,
              assignedTo: emp.manager_name || "Not Assigned",
              status: emp.status || "active",
              address: emp.address || "N/A",
            };

            return (
              <tr key={formatted.id}>
                <td>{formatted.id}</td>

                <td>
                  {formatted.name}
                  {isAnniversary(formatted.joiningDate) && (
                    <span className="anniversary"> 🎉 1 Year</span>
                  )}
                </td>

                <td>{formatted.email}</td>
                <td>{formatted.department}</td>
                <td>{formatted.role}</td>

                {/* ✅ MANAGER */}
                <td>{formatted.assignedTo}</td>

                {/* ✅ ADDRESS */}
                <td>{formatted.address}</td>

                <td>{formatDate(formatted.joiningDate)}</td>

                {/* ✅ STATUS */}
                <td className={`status-${formatted.status}`}>
                  {formatted.status}
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() =>
                        navigate("/hr/add-employee", { state: formatted })
                      }
                    >
                      Edit
                    </button>

                    {/* 🔥 IMPORTANT CHANGE */}
                    <button
                      className="assign-btn"
                      onClick={() => onAssignClick(formatted)}
                    >
                      Assign
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(formatted.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeesTable;