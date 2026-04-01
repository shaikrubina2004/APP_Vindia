import { useEffect, useState } from "react";
import axios from "axios";

import EmployeeStats from "../../components/hr/EmployeeStats";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import NewJoiners from "../../components/hr/NewJoiners";
import PendingRequests from "../../components/hr/PendingRequests";
import Birthdays from "../../components/hr/Birthdays";
import QuickActions from "../../components/hr/QuickActions";
import AttendanceChart from "../../components/hr/AttendanceChart";

import "../../styles/HRDashboard.css";

function HRDashboard() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/employees");
        setEmployees(res.data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="hr-dashboard">
      <h1>HR Dashboard</h1>

      {/* 🔥 REAL DATA HERE */}
      <EmployeeStats employees={employees} />

      <div className="dashboard-grid">
        <AttendanceOverview employees={employees} />
        <NewJoiners employees={employees} />
        <AttendanceChart employees={employees} />
        <PendingRequests />
        <Birthdays employees={employees} />
        <QuickActions />
      </div>
    </div>
  );
}

export default HRDashboard;