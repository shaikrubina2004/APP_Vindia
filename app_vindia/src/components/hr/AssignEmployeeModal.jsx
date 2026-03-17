import { useState } from "react";
import "../../styles/employees.css";

function AssignEmployeeModal({ employee, onClose, onAssign }) {

  const [manager, setManager] = useState("");

  const managers = [
    "CEO",
    "HR Manager",
    "Marketing Head",
    "Team Lead"
  ];

  const handleAssign = () => {

    if (!manager) {
      alert("Please select a manager");
      return;
    }

    onAssign(employee.id, manager);
    onClose();

  };

  return (

    <div className="modal-overlay">

      <div className="assign-modal">

        <h2>Assign Employee</h2>

        <p>
          Employee : <strong>{employee.name}</strong>
        </p>

        <label>Assign To</label>

        <select
          value={manager}
          onChange={(e) => setManager(e.target.value)}
        >
          <option value="">Select Manager</option>

          {managers.map((m, index) => (
            <option key={index} value={m}>
              {m}
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