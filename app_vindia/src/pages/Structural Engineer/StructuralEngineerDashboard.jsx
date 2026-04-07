import { useState } from "react";
import "./StructuralEngineerDashboard.css";

const StructuralEngineerDashboard = () => {
  // ✅ Direct initialization (no useEffect needed)
  const [stats] = useState({
    totalDrawings: 24,
    latestVersion: "v3.0",
    pendingIncidents: 5,
    notifications: 3,
  });

  return (
    <div className="se-main">
      {/* Header */}
      <div className="se-header">
        <h1>Structural Engineer Dashboard</h1>
        <p className="se-subtitle">
          Manage drawings, versions, and structural coordination
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="se-grid">
        <div className="se-card">
          <h3>Total Drawings</h3>
          <p>{stats.totalDrawings}</p>
        </div>

        <div className="se-card">
          <h3>Latest Version</h3>
          <p>{stats.latestVersion}</p>
        </div>

        <div className="se-card">
          <h3>Pending Incidents</h3>
          <p>{stats.pendingIncidents}</p>
        </div>

        <div className="se-card">
          <h3>Team Updates</h3>
          <p>{stats.notifications} New Alerts</p>
        </div>
      </div>

      {/* Activity Section */}
      <div className="se-section">
        <h2>Recent Activity</h2>

        <div className="se-activity">
          <p>📄 New drawing uploaded (Foundation Plan v2.1)</p>
          <p>⚠️ Incident reported: Beam misalignment</p>
          <p>🔔 MEP team requested coordination update</p>
        </div>
      </div>
    </div>
  );
};

export default StructuralEngineerDashboard;