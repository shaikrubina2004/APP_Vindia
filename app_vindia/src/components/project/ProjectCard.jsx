import React from "react";

function ProjectCard({ proj, isActive, onClick, variant, children }) {
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
                backgroundColor:
                  proj?.status === "Pending"
                    ? "#fff7ed"
                    : proj?.status === "Completed"
                      ? "#ecfdf5"
                      : proj?.status === "Rejected"
                        ? "#fef2f2"
                        : "#eef4ff",

                color:
                  proj?.status === "Pending"
                    ? "#92400e"
                    : proj?.status === "Completed"
                      ? "#166534"
                      : proj?.status === "Rejected"
                        ? "#991b1b"
                        : "#1e40af",
              }}
            >
              {proj.status}
            </span>
          </div>

          <div className="card-info">
            <p className="client-text">
              Client: <span>{proj.client}</span>
            </p>

            <p className="engineer-text">
              Site Engineer: <span>{proj.site_engineer_name || "N/A"}</span>
            </p>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${proj.progress || 0}%` }}
            ></div>
          </div>

          <p className="progress-text">{proj.progress || 0}% Complete</p>
        </>
      ) : (
        /* ✅ OVERVIEW CARDS (Quick / Timesheet / Activities) */
        <div className="card-body">{children}</div>
      )}
    </div>
  );
}

export default ProjectCard;
