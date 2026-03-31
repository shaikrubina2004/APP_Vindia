import { useState } from "react";
import { updateEmployee } from "../../services/employeeService";
import "../../styles/employees.css";

function AssignEmployeeModal({ employee, employees, onClose, onAssignSuccess }) {
  const [manager, setManager] = useState("");

  // ✅ Get real managers
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

      // ✅ refresh UI (NO reload)
      onAssignSuccess();

      // ✅ close modal
      onClose();

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

        <label>Manager Role</label>

        <select
          value={manager}
          onChange={(e) => setManager(e.target.value)}
        >
          <option value="">Select Manager</option>

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