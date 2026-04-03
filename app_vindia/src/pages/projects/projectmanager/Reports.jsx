import { useState } from "react";
import "../../../styles/Reports.css";

export default function Reports() {
  const [data] = useState({
    totalHours: 320,
    totalEmployees: 12,
    completedTasks: 45,
    pendingTasks: 10,
    issues: 5,
  });

  return (
    <div className="rp-page">
      <h1>Reports Dashboard</h1>

      {/* SUMMARY CARDS */}
      <div className="rp-cards">
        <div className="rp-card">
          <h3>Total Work Hours</h3>
          <p>{data.totalHours}</p>
        </div>

        <div className="rp-card">
          <h3>Employees</h3>
          <p>{data.totalEmployees}</p>
        </div>

        <div className="rp-card">
          <h3>Completed Tasks</h3>
          <p>{data.completedTasks}</p>
        </div>

        <div className="rp-card">
          <h3>Pending Tasks</h3>
          <p>{data.pendingTasks}</p>
        </div>

        <div className="rp-card danger">
          <h3>Issues</h3>
          <p>{data.issues}</p>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="rp-section">
        <h2>Project Progress</h2>
        <div className="rp-bar">
          <div
            className="rp-fill"
            style={{
              width: `${
                (data.completedTasks /
                  (data.completedTasks + data.pendingTasks)) *
                100
              }%`,
            }}
          ></div>
        </div>
      </div>

      {/* TEAM PERFORMANCE */}
      <div className="rp-section">
        <h2>Team Performance</h2>

        <table className="rp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hours</th>
              <th>Tasks</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Ravi Kumar</td>
              <td>48 hrs</td>
              <td>12</td>
            </tr>
            <tr>
              <td>Meena Sharma</td>
              <td>42 hrs</td>
              <td>10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}