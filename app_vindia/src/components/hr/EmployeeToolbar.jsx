import { useState } from "react";

function EmployeeToolbar() {

  const [search, setSearch] = useState("");

  return (

    <div className="employee-toolbar">

      <input
        type="text"
        placeholder="Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button className="add-btn">+ Add Employee</button>

    </div>

  );
}

export default EmployeeToolbar;