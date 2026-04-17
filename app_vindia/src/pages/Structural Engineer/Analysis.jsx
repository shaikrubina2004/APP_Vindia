import "./Analysis.css";
import { useEffect, useState } from "react";
import axios from "axios";
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

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

function Analysis() {
  const [data, setData] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ CLEAN EFFECT (no warning)
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/analysis");
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ===== STATS =====
  const total = data.length;
  const approved = data.filter((d) => d.status === "Approved").length;
  const pending = data.filter((d) => d.status === "Pending").length;
  const rejected = data.filter((d) => d.status === "Rejected").length;

  // ===== FILTER =====
  const filteredData = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    return true;
  });

  // ===== PIE DATA =====
  const pieData = {
    labels: ["Approved", "Pending", "Rejected"],
    datasets: [
      {
        data: [approved, pending, rejected],
        backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
      },
    ],
  };

  // ===== BAR DATA =====
  const typeCounts = {};
  data.forEach((item) => {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  });

  const barData = {
    labels: Object.keys(typeCounts),
    datasets: [
      {
        label: "Analysis Count",
        data: Object.values(typeCounts),
        backgroundColor: "#4a90e2",
      },
    ],
  };

  return (
    <div className="analysis-wrapper">
      <div className="analysis-container">
        <h2 className="page-title">Structural Analysis Dashboard</h2>

        {/* ===== CARDS ===== */}
        <div className="analysis-cards">
          <div
            className={`card ${!statusFilter ? "active" : ""}`}
            onClick={() => {
              setStatusFilter(null);
              setTypeFilter(null);
            }}
          >
            <h3>{total}</h3>
            <p>Total</p>
          </div>

          <div
            className={`card approved ${
              statusFilter === "Approved" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Approved")}
          >
            <h3>{approved}</h3>
            <p>Approved</p>
          </div>

          <div
            className={`card pending ${
              statusFilter === "Pending" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Pending")}
          >
            <h3>{pending}</h3>
            <p>Pending</p>
          </div>

          <div
            className={`card rejected ${
              statusFilter === "Rejected" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Rejected")}
          >
            <h3>{rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>

        {/* ===== CHARTS ===== */}
        <div className="analysis-charts">
          <div className="chart-box">
            <h4>Status Distribution</h4>
            <Pie
              data={pieData}
              options={{
                onClick: (evt, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    setStatusFilter(pieData.labels[index]);
                  }
                },
              }}
            />
          </div>

          <div className="chart-box">
            <h4>Type Analysis</h4>
            <Bar
              data={barData}
              options={{
                onClick: (evt, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    setTypeFilter(barData.labels[index]);
                  }
                },
              }}
            />
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="analysis-table">
          <div className="table-header">
            <h4>Recent Analysis</h4>

            <button
              className="clear-btn"
              onClick={() => {
                setStatusFilter(null);
                setTypeFilter(null);
              }}
            >
              Clear Filters
            </button>
          </div>

          {loading ? (
            <p className="no-data">Loading data...</p>
          ) : filteredData.length === 0 ? (
            <p className="no-data">No Data Found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.project_name}</td>
                    <td>{item.type}</td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
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