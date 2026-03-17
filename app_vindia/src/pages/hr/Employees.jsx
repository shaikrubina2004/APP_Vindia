import EmployeeToolbar from "../../components/hr/EmployeeToolbar";
import EmployeeStats from "../../components/hr/EmployeeStats";
import EmployeesTable from "../../components/hr/EmployeesTable";

import "../../styles/employees.css";

function Employees() {

  return (

    <div className="employees-page">

      <h1>Employees</h1>

      {/* Search + Add */}
      <EmployeeToolbar />

      {/* Stats Cards */}
      <EmployeeStats />

      {/* Employees Table */}
      <EmployeesTable />

    </div>

  );

}

export default Employees;