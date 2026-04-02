import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import "./EmployeesTable.css";

function EmployeesTable({ employees, search }) {
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

  // 🔍 FUZZY SEARCH
  const fuse = useMemo(() => {
    return new Fuse(employees, {
      keys: ["name", "email", "department", "designation"],
      threshold: 0.3,
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    return fuse.search(search).map((result) => result.item);
  }, [search, fuse, employees]);

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
            <th>Manager</th>
            <th>Status</th>
            <th>View</th>
          </tr>
        </thead>

        <tbody>
          {filteredEmployees.map((emp) => {
            const formatted = {
              ...emp,
              assignedTo: emp.manager_name || "Not Assigned",
              status: emp.status || "active",
            };

            // ✅ FIXED STATUS
            const statusKey = formatted.status; // 🔥 DO NOT MODIFY
            const statusText = formatted.status
              .replace("_", " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <tr key={formatted.id}>
                <td>{formatted.id}</td>

                <td>
                  {formatted.name}
                  {isAnniversary(formatted.join_date) && (
                    <span className="anniversary">🎉</span>
                  )}
                </td>

                <td>{formatted.email}</td>
                <td>{formatted.department}</td>
                <td>{formatted.designation}</td>

                <td>{formatted.assignedTo}</td>

                {/* ✅ CLEAN STATUS */}
                <td className={`status-${statusKey}`}>
                  {statusText}
                </td>

                {/* ✅ ALWAYS VISIBLE BUTTON */}
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate(`/hr/employee/${formatted.id}`, {
                        state: formatted,
                      })
                    }
                  >
                    View
                  </button>
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