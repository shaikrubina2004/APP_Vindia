// pages/structural-engineer/StructuralEngineerDashboard.jsx
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import CountUp from "react-countup";
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
import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { fetchDashboard, QUERY_KEYS } from "../../api/structuralApi";
import "./StructuralEngineerDashboard.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

// ─── Skeleton (replaces spinner — feels 3× faster) ────────────────────────
const DashboardSkeleton = () => (
  <div className="se-container">
    <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 25, borderRadius: 8 }} />
    <div className="se-cards">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
    <div className="se-charts" style={{ marginTop: 30 }}>
      <div className="skeleton skeleton-chart" />
      <div className="skeleton skeleton-chart" />
    </div>
    <div className="skeleton" style={{ height: 140, marginTop: 30, borderRadius: 16 }} />
  </div>
);

// ─── Error State ───────────────────────────────────────────────────────────
const DashboardError = ({ refetch }) => (
  <div className="se-loading">
    <p style={{ color: "#ef4444", fontSize: 15 }}>⚠️ Failed to load dashboard</p>
    <button
      onClick={refetch}
      style={{
        marginTop: 12, padding: "8px 18px", background: "#4f46e5",
        color: "white", border: "none", borderRadius: 8, cursor: "pointer",
      }}
    >
      Retry
    </button>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────
const StructuralEngineerDashboard = () => {
  const navigate = useNavigate();

  // ✅ useQuery — cached 5 min, auto-retry, instant on revisit
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: fetchDashboard,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <DashboardError refetch={refetch} />;

  // ─── Chart Data ─────────────────────────────────────────────────────────
  const barData = {
    labels: ["Drawings", "Incidents", "Notifications"],
    datasets: [
      {
        label: "Project Stats",    // ✅ FIX: was "undefined" in legend
        data: [stats.totalDrawings, stats.pendingIncidents, stats.notifications],
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

      {/* ── CARDS ─────────────────────────────────────────────────────── */}
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

      {/* ── CHARTS — each wrapped so one crash doesn't kill the other ─── */}
      <div className="se-charts">
        <ErrorBoundary label="Project Overview chart">
          <div className="chart-box">
            <h3>Project Overview</h3>
            <Bar data={barData} options={{ maintainAspectRatio: false }} />
          </div>
        </ErrorBoundary>

        <ErrorBoundary label="Distribution chart">
          <div className="chart-box">
            <h3>Distribution</h3>
            <Doughnut data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
        </ErrorBoundary>
      </div>

      {/* ── ACTIVITY ──────────────────────────────────────────────────── */}
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