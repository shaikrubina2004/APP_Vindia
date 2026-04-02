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
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, dashRes] = await Promise.all([
          axios.get("http://localhost:5000/api/employees"),
          axios.get("http://localhost:5000/api/dashboard"),
        ]);

        setEmployees(empRes.data);
        setDashboard(dashRes.data);
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="hr-dashboard">
      <h1>HR Dashboard</h1>

      {/* ✅ Employee Stats */}
      <EmployeeStats employees={employees} />

      <div className="dashboard-grid">
        {/* ✅ Attendance Overview */}
        <AttendanceOverview data={dashboard?.attendance} />

        {/* ✅ New Joiners (from employees) */}
        <NewJoiners employees={employees} />

        {/* ✅ Chart */}
        <AttendanceChart data={dashboard?.attendance} />

        {/* ✅ Pending Requests */}
        <PendingRequests data={dashboard?.pending} />

        {/* ✅ Birthdays */}
        <Birthdays data={dashboard?.birthdays} />

        {/* ✅ Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}

export default HRDashboard;
