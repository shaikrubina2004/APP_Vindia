import { useEffect, useState } from "react";
import axios from "axios";
import CountUp from "react-countup";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

import "./StructuralEngineerDashboard.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
);

const StructuralEngineerDashboard = () => {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/structural/dashboard")
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!stats) {
    return (
      <div className="se-loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // 📊 Chart Data
const barData = {
  labels: ["Drawings", "Incidents", "Notifications"],
  datasets: [
    {
      label: "Project Stats",
      data: [
        stats.totalDrawings,
        stats.pendingIncidents,
        stats.notifications,
      ],
      backgroundColor: ["#0A4174", "#4E8EA2", "#7BBDE8"],
    },
  ],
};
  const pieData = {
  labels: ["Completed", "Pending"],
  datasets: [
    {
      data: [
        stats.totalDrawings - stats.pendingIncidents,
        stats.pendingIncidents,
      ],
      backgroundColor: ["#4E8EA2", "#0A4174"],
    },
  ],
};

  return (
    <div className="se-container">
      <h1 className="se-title">Structural Engineer Dashboard</h1>

      {/* Cards */}
      <div className="se-cards">
        <div
          className="se-card card-1"
          onClick={() => navigate("/structural-engineer/drawings")}
        >
          <h3>Total Drawings</h3>
          <p>
            <CountUp end={stats.totalDrawings} duration={1.5} />
          </p>
        </div>

        <div className="se-card card-2">
          <h3>Latest Version</h3>
          <p>{stats.latestVersion}</p>
        </div>

        <div className="se-card card-3">
          <h3>Pending Incidents</h3>
          <p>
            <CountUp end={stats.pendingIncidents} duration={1.5} />
          </p>
        </div>

        <div className="se-card card-4">
          <h3>Notifications</h3>
          <p>
            <CountUp end={stats.notifications} duration={1.5} />
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="se-charts">
        <div className="chart-box">
          <h3>Project Overview</h3>
          <Bar
            data={barData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>

        <div className="chart-box">
          <h3>Distribution</h3>
          <Doughnut
            data={pieData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />{" "}
        </div>
      </div>

      {/* Activity */}
      <div className="se-activity-box">
        <h2>Recent Activity</h2>
        <ul>
          <li>📄 New drawing uploaded</li>
          <li>⚠️ Beam issue detected</li>
          <li>🔔 Approval pending</li>
        </ul>
      </div>
    </div>
  );
};

export default StructuralEngineerDashboard;
