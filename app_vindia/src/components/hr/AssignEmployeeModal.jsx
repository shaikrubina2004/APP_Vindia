import { useState } from "react";
import { updateEmployee } from "../../services/employeeService";
import "../../styles/employees.css";

function AssignEmployeeModal({ employee, employees, onClose }) {
  const [manager, setManager] = useState("");

  // ✅ Get real managers from employees list
  const managers = employees.filter((emp) =>
    emp.designation.toLowerCase().includes("manager")
  );

  const handleAssign = async () => {
    if (!manager) {
      alert("Please select a manager");
      return;
    }

    try {
      await updateEmployee(employee.id, {
        ...employee,
        manager_id: Number(manager),
      });

      // ✅ reload to reflect changes
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to assign manager");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="assign-modal">
        <h2>Assign Employee</h2>

        <p>
          Employee : <strong>{employee.name}</strong>
        </p>

        {/* 🔥 Rename label */}
        <label>Manager Role</label>

<select
  value={manager}
  onChange={(e) => setManager(e.target.value)}
>
  <option value="">Select Manager Role</option>

  {managers.map((m) => (
    <option key={m.id} value={m.id}>
      {m.designation} - {m.name}
    </option>
  ))}
</select>
        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button className="save-btn" onClick={handleAssign}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignEmployeeModal;