import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import EmployeeStats from "../../components/hr/EmployeeStats";
import EmployeesTable from "../../components/hr/EmployeesTable";
import AssignEmployeeModal from "../../components/hr/AssignEmployeeModal";

import { getEmployees } from "../../services/employeeService";

import "../../styles/employees.css";

function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ✅ NEW FILTER STATE
  const [filter, setFilter] = useState("all");

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

  // ✅ UPDATED FILTER LOGIC
  const filteredEmployees = employees.filter((emp) => {
    const nameMatch = emp.name
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!nameMatch) return false;

    if (filter === "all") return true;
    if (filter === "active") return emp.status === "active";
    if (filter === "leave") return emp.status === "on_leave";
    if (filter === "inactive") return emp.status === "inactive";

    if (filter === "new") {
      const joinDate = new Date(emp.join_date);
      const today = new Date();
      const diffDays =
        (today - joinDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }

    return true;
  });

  return (
    <div className="employees-page">

      {/* 🔷 HEADER */}
      <div className="employees-header">
        <h1>Employees</h1>

        <div className="header-actions">
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
      </div>

      {/* 🔷 STATS (CLICKABLE 🔥) */}
      <EmployeeStats
        employees={employees}
        setFilter={setFilter}
        activeFilter={filter}
      />

      {/* 🔷 LOADING */}
      {loading && <p className="loading-text">Loading employees...</p>}

      {/* 🔷 EMPTY */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="empty-state">
          No employees found
        </div>
      )}

      {/* 🔷 TABLE */}
      {!loading && filteredEmployees.length > 0 && (
        <EmployeesTable
          employees={filteredEmployees}
          setEmployees={setEmployees}
          onAssignClick={(emp) => setSelectedEmployee(emp)}
        />
      )}

      {/* 🔷 MODAL */}
      {selectedEmployee && (
        <AssignEmployeeModal
          employee={selectedEmployee}
          employees={employees}
          onClose={() => setSelectedEmployee(null)}
          onAssignSuccess={fetchEmployees}
        />
      )}

    </div>
  );
}

export default Employees;