import { useState } from "react";
import { useNavigate } from "react-router-dom";

function EmployeeToolbar() {

  const [search, setSearch] = useState("");
  const navigate = useNavigate(); 

  return (
    <div className="employee-toolbar">

      <input
        type="text"
        placeholder="Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button
        className="add-btn"
        onClick={() => navigate("/hr/add-employee")}
      >
        + Add Employee
      </button>

    </div>
  );
}

export default EmployeeToolbar;