import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatCard from "./components/StatCard";

export default function SiteEngineerDashboard() {
  const [data, setData] = useState({
    tasks: 0,
    openRFI: 0,
    openNCR: 0,
  });

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // ✅ navigation

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <h2 style={styles.heading}>Site Engineer Dashboard</h2>

      {/* LOADING */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* STATS */}
          <div style={styles.cardContainer}>
            <StatCard title="Tasks" value={data.tasks} color="#007bff" />
            <StatCard title="Open RFIs" value={data.openRFI} color="#f39c12" />
            <StatCard title="Open NCRs" value={data.openNCR} color="#e74c3c" />
          </div>

          {/* MAIN GRID */}
          <div style={styles.grid}>
            {/* RECENT ACTIVITY */}
            <div style={styles.box}>
              <h3>Recent Activities</h3>
              <ul style={styles.list}>
                <li>No recent activity</li>
              </ul>
            </div>

            {/* ISSUES */}
            <div style={styles.box}>
              <h3>Issues / Alerts</h3>
              <ul style={styles.list}>
                <li>No issues reported</li>
              </ul>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div style={{ marginTop: "30px" }}>
            <h3>Quick Actions</h3>

            <div style={styles.actions}>
              <button
                style={styles.button}
                onClick={() => navigate("/site-engineer/daily-diary")}
              >
                + Add Daily Diary
              </button>

              <button
                style={styles.button}
                onClick={() => navigate("/site-engineer/rfi")}
              >
                + Raise RFI
              </button>

              <button
                style={styles.button}
                onClick={() => navigate("/site-engineer/ncr")}
              >
                + Raise NCR
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  container: {
    padding: "20px",
  },
  heading: {
    marginBottom: "20px",
  },
  cardContainer: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "30px",
  },
  box: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  },
  list: {
    paddingLeft: "20px",
    color: "#555",
  },
  actions: {
    display: "flex",
    gap: "15px",
    marginTop: "10px",
  },
  button: {
    padding: "10px 15px",
    borderRadius: "8px",
    border: "none",
    background: "#007bff",
    color: "#fff",
    cursor: "pointer",
  },
};