import React from "react";

function ProjectCard({ proj, isActive, onClick }) {
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
            backgroundColor:
              proj.status === "In Progress"
                ? "#fef3c7"
                : proj.status === "Pending"
                ? "#e5e7eb"
                : proj.status === "Completed"
                ? "#dcfce7"
                : "#fee2e2",
            color:
              proj.status === "In Progress"
                ? "#92400e"
                : proj.status === "Pending"
                ? "#374151"
                : proj.status === "Completed"
                ? "#166534"
                : "#991b1b",
          }}
        >
          {proj.status}
        </span>
      </div>  

      {/* INFO */}
      <div className="card-info">
        <p><strong>Client:</strong> {proj.client}</p>
        <p><strong>Site Engineer:</strong> {proj.manager}</p>
      </div>

      {/* PROGRESS */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${proj.progress}%` }}
        ></div>
      </div>
      <p className="progress-text">{proj.progress}% Complete</p>

      {/* MINI CARDS */}
      
    </div>
  );
}

export default ProjectCard;