// pages/structural-engineer/Analysis.jsx
import "./Analysis.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { fetchAnalysis, QUERY_KEYS } from "../../api/structuralApi";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ─── Skeleton ──────────────────────────────────────────────────────────────
const AnalysisSkeleton = () => (
  <div className="analysis-wrapper">
    <div className="analysis-container">
      <div className="skeleton" style={{ height: 28, width: 260, marginBottom: 25, borderRadius: 6 }} />
      <div className="analysis-cards">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />
        ))}
      </div>
      <div className="analysis-charts">
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
    </div>
  </div>
);

function Analysis() {
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  // ✅ useQuery — replaces useEffect + axios + loading state
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.analysis,
    queryFn: fetchAnalysis,
  });

  if (isLoading) return <AnalysisSkeleton />;
  if (isError) return (
    <div className="analysis-wrapper">
      <div className="analysis-container">
        <p className="no-data" style={{ color: "#ef4444" }}>
          ⚠️ Failed to load analysis data. Please refresh.
        </p>
      </div>
    </div>
  );

  // ─── Stats ──────────────────────────────────────────────────────────────
  const total    = data.length;
  const approved = data.filter((d) => d.status === "Approved").length;
  const pending  = data.filter((d) => d.status === "Pending").length;
  const rejected = data.filter((d) => d.status === "Rejected").length;

  // ─── Filter ─────────────────────────────────────────────────────────────
  const filteredData = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    return true;
  });

  // ─── Chart Data ─────────────────────────────────────────────────────────
  const pieData = {
    labels: ["Approved", "Pending", "Rejected"],
    datasets: [{ data: [approved, pending, rejected], backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"] }],
  };

  const typeCounts = {};
  data.forEach((item) => {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  });

  const barData = {
    labels: Object.keys(typeCounts),
    datasets: [{
      label: "Analysis Count",
      data: Object.values(typeCounts),
      backgroundColor: "#4a90e2",
    }],
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { size: 13, family: "Inter, sans-serif" }, color: "#374151" } } },
  };

  return (
    <div className="analysis-wrapper">
      <div className="analysis-container">
        <h2 className="page-title">Structural Analysis Dashboard</h2>

        {/* ── CARDS ───────────────────────────────────────────────────── */}
        <div className="analysis-cards">
          <div className={`card ${!statusFilter ? "active" : ""}`}
            onClick={() => { setStatusFilter(null); setTypeFilter(null); }}>
            <h3>{total}</h3><p>Total</p>
          </div>
          <div className={`card approved ${statusFilter === "Approved" ? "active" : ""}`}
            onClick={() => setStatusFilter("Approved")}>
            <h3>{approved}</h3><p>Approved</p>
          </div>
          <div className={`card pending ${statusFilter === "Pending" ? "active" : ""}`}
            onClick={() => setStatusFilter("Pending")}>
            <h3>{pending}</h3><p>Pending</p>
          </div>
          <div className={`card rejected ${statusFilter === "Rejected" ? "active" : ""}`}
            onClick={() => setStatusFilter("Rejected")}>
            <h3>{rejected}</h3><p>Rejected</p>
          </div>
        </div>

        {/* ── CHARTS ──────────────────────────────────────────────────── */}
        <div className="analysis-charts">
          <ErrorBoundary label="Pie chart">
            <div className="chart-box">
              <h4>Status Distribution</h4>
              <Pie
                data={pieData}
                options={{
                  ...commonChartOptions,
                  onClick: (_, elements) => {
                    if (elements.length > 0) setStatusFilter(pieData.labels[elements[0].index]);
                  },
                }}
              />
            </div>
          </ErrorBoundary>

          <ErrorBoundary label="Bar chart">
            <div className="chart-box">
              <h4>Type Analysis</h4>
              <Bar
                data={barData}
                options={{
                  ...commonChartOptions,
                  scales: {
                    x: { ticks: { color: "#6b7280", font: { size: 12 } } },
                    y: { ticks: { color: "#6b7280", font: { size: 12 } } },
                  },
                  onClick: (_, elements) => {
                    if (elements.length > 0) setTypeFilter(barData.labels[elements[0].index]);
                  },
                }}
              />
            </div>
          </ErrorBoundary>
        </div>

        {/* ── TABLE ───────────────────────────────────────────────────── */}
        <div className="analysis-table">
          <div className="table-header">
            <h4>Recent Analysis</h4>
            <button className="clear-btn" onClick={() => { setStatusFilter(null); setTypeFilter(null); }}>
              Clear Filters
            </button>
          </div>

          {filteredData.length === 0 ? (
            <p className="no-data">No Data Found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project</th><th>Type</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.project_name}</td>
                    <td>{item.type}</td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analysis;