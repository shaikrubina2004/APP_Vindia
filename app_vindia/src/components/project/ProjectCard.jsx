import React from "react";

function ProjectCard({ proj, isActive, onClick }) {
  // 🔥 Normalize status (fixes your issue)
  const status = proj.status?.toLowerCase();

  // ✅ Status styles mapping
  const statusStyles = {
    "in progress": { bg: "#fef3c7", text: "#92400e" },
    pending: { bg: "#e5e7eb", text: "#374151" },
    completed: { bg: "#dcfce7", text: "#166534" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
  };

  const style = statusStyles[status] || statusStyles["pending"];

  return (
    <div
      className={`project-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {/* HEADER */}
      <div className="card-header">
        <h3>{proj.name}</h3>

        <span
          className="status-badge"
          style={{
            backgroundColor: style.bg,
            color: style.text,
          }}
        >
          {proj.status}
        </span>
      </div>

      {/* INFO */}
      <div className="card-info">
        <p>
          <strong>Client:</strong> {proj.client}
        </p>
        <p>
          <strong>Site Engineer:</strong> {proj.site_engineer_name || "N/A"}
        </p>
      </div>

      {/* PROGRESS */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${proj.progress || 0}%`,
          }}
        ></div>
      </div>

      <p className="progress-text">{proj.progress || 0}% Complete</p>
    </div>
  );
}

export default ProjectCard;