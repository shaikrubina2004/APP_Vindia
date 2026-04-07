import React from "react";

function IncidentPanel() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Incidents</h2>

      <div style={{
        background: "white",
        padding: "10px",
        marginBottom: "10px",
        borderRadius: "8px"
      }}>
        <p>Water leakage in basement</p>
        <span style={{ color: "red" }}>P1</span>
        <br />
        <button>Convert to Task</button>
      </div>

      <div style={{
        background: "white",
        padding: "10px",
        borderRadius: "8px"
      }}>
        <p>Material delay</p>
        <span style={{ color: "orange" }}>P2</span>
        <br />
        <button>Convert to Task</button>
      </div>

    </div>
  );
}

export default IncidentPanel;