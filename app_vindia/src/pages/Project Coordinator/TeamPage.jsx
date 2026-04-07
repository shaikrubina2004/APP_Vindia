import React from "react";
import "./CoordinatorPages.css";

export default function TeamPage() {
  return (
    <div className="page-container">

      <h2>Team Coordination</h2>

      <div className="team-card">
        <p>Architect → Design</p>
      </div>

      <div className="team-card">
        <p>Site Engineer → Execution</p>
      </div>

      <div className="team-card">
        <p>Project Manager → Planning</p>
      </div>

    </div>
  );
}