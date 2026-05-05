import React from "react";

function ProjectCard({ proj, isActive, onClick, variant, children }) {
   const statusStyles = {
    Active: {
      bg: "#dcfce7",
      color: "#16a34a",
    },
    "In Progress": {
      bg: "#dbeafe",
      color: "#2563eb",
    },
    Pending: {
      bg: "#fff7ed",
      color: "#92400e",
    },
    Completed: {
      bg: "#ecfdf5",
      color: "#166534",
    },
    Rejected: {
      bg: "#fef2f2",
      color: "#991b1b",
    },
  };

  const style = statusStyles[proj?.status] || {
    bg: "#f3f4f6",
    color: "#374151",
  };

  // ✅ Safe check (prevents crash)
  if (!proj && !children) return null;
 



 return (
  <div
    className={`project-card ${variant === "overview" ? "overview-card" : ""} ${isActive ? "active" : ""}`}
    onClick={onClick}
  >

    {/* ✅ PROJECT CARD (top 4 cards) */}
    {proj ? (
      <>
        <div className="card-header">
          <h3>{proj.name}</h3>

        <span
  className="status-badge"
  style={{
    backgroundColor: style.bg,
    color: style.color,
  }}
>
  {proj.status || "Active"}
</span>
        </div>

        <div className="card-info">
          <p><strong>Client:</strong> {proj.client}</p>
          <p><strong>Site Engineer:</strong> {proj.site_engineer_name || "N/A"}</p>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${proj.progress || 0}%` }}
          ></div>
        </div>

        <p className="progress-text">
          {proj.progress || 0}% Complete
        </p>
      </>
    ) : (
      /* ✅ OVERVIEW CARDS (Quick / Timesheet / Activities) */
      <div className="card-body">
        {children}
      </div>
    )}
  </div>
);
}

export default ProjectCard;