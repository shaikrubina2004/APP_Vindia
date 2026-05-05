// FILE PATH: src/pages/StructuralEngineer/StructuralEngineerDashboard.jsx

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
// import { useContext } from "react";
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
import { QUERY_KEYS } from "../../api/structuralApi";
import { useProject } from "../../context/ProjectContext";
import "./StructuralEngineerDashboard.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Skeleton ─────────────────────────────────────────────────────────────
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

// ─── Error State ──────────────────────────────────────────────────────────
const DashboardError = ({ refetch }) => (
  <div className="se-loading">
    <p style={{ color: "#ef4444", fontSize: 15 }}>⚠️ Failed to load dashboard</p>
    <button
      onClick={refetch}
      style={{ marginTop: 12, padding: "8px 18px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
    >
      Retry
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────
const StructuralEngineerDashboard = () => {
  const navigate = useNavigate();

  // Get selected project from context (same context used in SharedDrawingPage)
// ✅ CORRECT — use activeProject which is what the context provides
const { activeProject: selectedProject } = useProject() || {};
const projectId = selectedProject?.id || null;


  // ── Dashboard stats — re-fetches when project changes ──────────────────
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // Include projectId in key so it refetches when project changes
    queryKey: [...QUERY_KEYS.dashboard, projectId],
    queryFn: async () => {
      const url = projectId
        ? `${BASE}/api/structural/dashboard?project_id=${projectId}`
        : `${BASE}/api/structural/dashboard`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // ── Recent activity ─────────────────────────────────────────────────────
  const { data: activity } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: () =>
      fetch(`${BASE}/api/structural/recent-activity`).then((res) => res.json()),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError)   return <DashboardError refetch={refetch} />;

  // ─── Chart Data ──────────────────────────────────────────────────────────
  const barData = {
    labels: ["Drawings", "Incidents", "Notifications"],
    datasets: [
      {
        label: "Project Stats",
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
          Math.max(0, stats.totalDrawings - stats.pendingIncidents),
          stats.pendingIncidents,
        ],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className="se-container">
      <h1 className="se-title">Structural Engineer Dashboard</h1>

      {/* Project label */}
      {selectedProject && (
        <p style={{ color: "#6366f1", fontWeight: 600, marginBottom: 12 }}>
          📁 Project: {selectedProject.name || selectedProject.project_name}
        </p>
      )}

      {/* Alert strip */}
      {stats.pendingIncidents > 0 && (
        <div className="se-alert">
          ⚠️ {stats.pendingIncidents} critical issues need attention
        </div>
      )}

      {/* ── CARDS ───────────────────────────────────────────────────────── */}
      <div className="se-cards">
        <div
          className="se-card primary"
          onClick={() => navigate("/structural-engineer/shared/drawings")}
        >
          <div className="card-icon">📐</div>
          <h3>Total Drawings</h3>
          <p><CountUp end={stats.totalDrawings} duration={1.5} /></p>
          {selectedProject && (
            <small style={{ color: "#94a3b8", fontSize: 11 }}>
              in {selectedProject.name || selectedProject.project_name}
            </small>
          )}
        </div>

        <div
          className="se-card neutral"
          onClick={() => navigate("/structural-engineer/shared/drawings")}
        >
          <div className="card-icon">🧩</div>
          <h3>Latest Version</h3>
          <p>{stats.latestVersion}</p>
          <small style={{ color: "#94a3b8", fontSize: 11 }}>
            Most recently uploaded
          </small>
        </div>

        <div
          className="se-card warning"
          onClick={() => navigate("/structural-engineer/incidents")}
        >
          <div className="card-icon">⚠️</div>
          <h3>Pending Incidents</h3>
          <p><CountUp end={stats.pendingIncidents} duration={1.5} /></p>
        </div>

        <div
          className="se-card info"
          onClick={() => navigate("/structural-engineer/notifications")}
        >
          <div className="card-icon">🔔</div>
          <h3>Notifications</h3>
          <p><CountUp end={stats.notifications} duration={1.5} /></p>
        </div>
      </div>

      {/* ── CHARTS ──────────────────────────────────────────────────────── */}
      <div className="se-charts">
        <ErrorBoundary label="Project Overview chart">
          <div
            className="chart-box"
            style={{ cursor: "pointer" }}
          >
            <h3>Project Overview</h3>
            <Bar
              data={barData}
              options={{
                maintainAspectRatio: false,
                onClick: (_event, elements) => {
                  if (!elements.length) return;
                  const index = elements[0].index;
                  if (index === 0) navigate("/structural-engineer/shared/drawings");
                  if (index === 1) navigate("/structural-engineer/incidents");
                  if (index === 2) navigate("/structural-engineer/notifications");
                },
              }}
            />
          </div>
        </ErrorBoundary>

        <ErrorBoundary label="Distribution chart">
          <div
            className="chart-box"
            onClick={() => navigate("/structural-engineer/incidents")}
            style={{ cursor: "pointer" }}
          >
            <h3>Distribution</h3>
            <Doughnut data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
        </ErrorBoundary>
      </div>

      {/* ── ACTIVITY ────────────────────────────────────────────────────── */}
      <div
        className="se-activity-box"
        onClick={() => navigate("/structural-engineer/daily-updates")}
        style={{ cursor: "pointer" }}
      >
        <h2>Recent Activity</h2>
        <ul>
          {activity?.map((item, i) => (
            <li key={i}>
              {item.type === "drawing" ? "📄" : "⚠️"} {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StructuralEngineerDashboard;