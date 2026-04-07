import React from "react";
import "./CoordinatorPages.css";

export default function MilestonePage() {
  return (
    <div className="page-container">

      <h2>Milestone Management</h2>

      <div className="milestone-card">
        <h3>Foundation</h3>
        <p>Status: Completed</p>
      </div>

      <div className="milestone-card">
        <h3>Structure</h3>
        <p>Status: In Progress</p>
      </div>

      <div className="milestone-card next">
        <h3>Finishing</h3>
        <p>Status: Planned</p>
        <button className="btn">Plan Next Stage</button>
      </div>

    </div>
  );
}