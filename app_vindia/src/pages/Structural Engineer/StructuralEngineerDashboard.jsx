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
  Legend
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

  const barData = {
    labels: ["Drawings", "Incidents", "Notifications"],
    datasets: [
      {
        data: [
          stats.totalDrawings,
          stats.pendingIncidents,
          stats.notifications,
        ],
        backgroundColor: ["#4f46e5", "#f59e0b", "#06b6d4"],
        borderRadius: 8,
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
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className="se-container">
      <h1 className="se-title">Structural Engineer Dashboard</h1>

      {/* CARDS */}
      <div className="se-cards">
        <div
          className="se-card primary"
          onClick={() => navigate("/structural-engineer/drawings")}
        >
          <div className="card-icon">📐</div>
          <h3>Total Drawings</h3>
          <p><CountUp end={stats.totalDrawings} duration={1.5} /></p>
        </div>

        <div className="se-card neutral">
          <div className="card-icon">🧩</div>
          <h3>Latest Version</h3>
          <p>{stats.latestVersion}</p>
        </div>

        <div className="se-card warning">
          <div className="card-icon">⚠️</div>
          <h3>Pending Incidents</h3>
          <p><CountUp end={stats.pendingIncidents} duration={1.5} /></p>
        </div>

        <div className="se-card info">
          <div className="card-icon">🔔</div>
          <h3>Notifications</h3>
          <p><CountUp end={stats.notifications} duration={1.5} /></p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="se-charts">
        <div className="chart-box">
          <h3>Project Overview</h3>
          <Bar data={barData} options={{ maintainAspectRatio: false }} />
        </div>

        <div className="chart-box">
          <h3>Distribution</h3>
          <Doughnut data={pieData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      {/* ACTIVITY */}
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