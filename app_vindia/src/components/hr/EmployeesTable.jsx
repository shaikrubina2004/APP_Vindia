import { useState } from "react";
import AssignEmployeeModal from "./AssignEmployeeModal";

function EmployeesTable() {

  // 🔹 State for modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // 🔹 Employees data (temporary)
  const [employees, setEmployees] = useState([
    {
      id: 1,
      name: "Rahul",
      email: "rahul@mail.com",
      department: "Marketing",
      role: "Manager",
      assignedTo: "CEO",
      joiningDate: "2023-03-16",
      status: "Active",
    },
    {
      id: 2,
      name: "Sneha",
      email: "sneha@mail.com",
      department: "HR",
      role: "Executive",
      assignedTo: "HR Manager",
      joiningDate: "2024-01-10",
      status: "Active",
    },
  ]);

  const today = new Date();

  // 🔹 Anniversary logic
  const isAnniversary = (joiningDate) => {
    const join = new Date(joiningDate);

    return (
      join.getDate() === today.getDate() &&
      join.getMonth() === today.getMonth() &&
      today.getFullYear() - join.getFullYear() >= 1
    );
  };

  // 🔹 Assign handler
  const handleAssign = (id, manager) => {

    const updatedEmployees = employees.map((emp) =>
      emp.id === id ? { ...emp, assignedTo: manager } : emp
    );

    setEmployees(updatedEmployees);
  };

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
            <th>Assigned To</th>
            <th>Joining Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>

              <td>{emp.id}</td>

              <td>
                {emp.name}

                {isAnniversary(emp.joiningDate) && (
                  <span className="anniversary"> 🎉 1 Year</span>
                )}
              </td>

              <td>{emp.email}</td>
              <td>{emp.department}</td>
              <td>{emp.role}</td>

              <td>
                {emp.assignedTo || "Not Assigned"}
              </td>

              <td>{emp.joiningDate}</td>

              <td
                className={
                  emp.status === "Active"
                    ? "status-active"
                    : "status-leave"
                }
              >
                {emp.status}
              </td>

              <td>
                <div className="action-buttons">

                  <button className="edit-btn">Edit</button>

                  <button
                    className="assign-btn"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    Assign
                  </button>

                  <button className="delete-btn">Delete</button>

                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔹 Assign Modal */}
      {selectedEmployee && (
        <AssignEmployeeModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onAssign={(id, manager) => {
            handleAssign(id, manager);
            setSelectedEmployee(null);
          }}
        />
      )}

    </div>
  );
}

export default EmployeesTable;