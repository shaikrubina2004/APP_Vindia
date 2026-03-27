import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import EmployeeToolbar from "../../components/hr/EmployeeToolbar";
import EmployeeStats from "../../components/hr/EmployeeStats";
import EmployeesTable from "../../components/hr/EmployeesTable";
import AssignEmployeeModal from "../../components/hr/AssignEmployeeModal"; // ✅ ADD THIS

import { getEmployees } from "../../services/employeeService";

import "../../styles/employees.css";

function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null); // ✅ ADD THIS

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employees-page">
      <h1>Employees</h1>

      <EmployeeToolbar
        onAdd={() => navigate("/hr/add-employee")}
        search={search}
        setSearch={setSearch}
      />

      <EmployeeStats employees={employees} />

      {loading && employees.length === 0 && (
        <p style={{ textAlign: "center", marginBottom: "10px" }}>
          Fetching employees...
        </p>
      )}

      <EmployeesTable
        employees={employees}
        setEmployees={setEmployees}
        search={search}
        onAssignClick={(emp) => setSelectedEmployee(emp)} // ✅ ADD THIS
      />

      {/* ✅ MODAL */}
      {selectedEmployee && (
        <AssignEmployeeModal
          employee={selectedEmployee}
          employees={employees}   // 🔥 IMPORTANT
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

export default Employees;