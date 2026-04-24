// QuantitySurveyorDashboard.jsx

import "./QuantitySurveyorDashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
export default function QuantitySurveyorDashboard() {
  const navigate = useNavigate();
const [dashboard, setDashboard] = useState(null);

useEffect(() => {
  fetchDashboard();
}, []);

const fetchDashboard = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/qs/dashboard");
    setDashboard(res.data.data);
  } catch (err) {
    console.error(err);
  }
};
  
  return (
    <div className="qsdb">

      {/* HEADER */}
      <div className="header">
        <h2>Dashboard</h2>
        <p>Welcome back! Here's what's happening on your projects.</p>
      </div>

      {/* TOP CARDS */}
     <div className="top-cards">

  {/* CARD 1 */}
  <div className="top-card">
    <div>
      <p className="label">Total Projects</p>
   <h2>{dashboard?.projects?.length || 0}</h2>
      <span className="sub purple-text">● Active Projects</span>
    </div>
    <div className="icon-box purple-bg">📁</div>
  </div>

  {/* CARD 2 */}
  <div className="top-card">
    <div>
      <p className="label">Quantity Progress</p>
      <h2>{dashboard?.progress?.[0]?.quantity_progress || 0}%</h2>
      <span className="sub green-text">+8% from last week</span>
    </div>
    <div className="icon-box green-bg">📈</div>
  </div>

  {/* CARD 3 */}
  <div className="top-card">
    <div>
      <p className="label">Cost Utilization</p>
     <h2>{dashboard?.progress?.[0]?.overall_progress || 0}%</h2>
      <span className="sub orange-text">On Budget</span>
    </div>
    <div className="icon-box orange-bg">💰</div>
  </div>

  {/* CARD 4 */}
  <div className="top-card">
    <div>
      <p className="label">Tasks Pending</p>
      <h2>8</h2>
      <span className="sub blue-text">Requires attention</span>
    </div>
    <div className="icon-box blue-bg">📋</div>
  </div>

</div>

      {/* MAIN GRID */}
   <div className="mid-grid">

  {/* RECENT */}
  <div className="card-box">
  <div className="card-header">
    <h3>Recent Activities</h3>
   <span onClick={() => navigate("/quantity-surveyor/daily-updates")}>
  View all
</span>
  </div>

  <div className="activity-item">
    <div className="icon purple">📄</div>
    <div>
      <p className="title">BOQ Updated</p>
      <span className="sub">Steel quantity revised for Block A</span>
    </div>
    <span className="time">10 min ago</span>
  </div>

  <div className="activity-item">
    <div className="icon green">📏</div>
    <div>
      <p className="title">Measurement Added</p>
      <span className="sub">Concrete work updated</span>
    </div>
    <span className="time">1 hour ago</span>
  </div>

  <div className="activity-item">
    <div className="icon orange">💰</div>
    <div>
      <p className="title">Cost Alert</p>
      <span className="sub red-text">Over budget detected</span>
    </div>
    <span className="time">3 hours ago</span>
  </div>

  <div className="activity-item">
    <div className="icon blue">📋</div>
    <div>
      <p className="title">Daily Update Submitted</p>
      <span className="sub">Daily progress submitted</span>
    </div>
    <span className="time">5 hours ago</span>
  </div>
</div>
  {/* ALERTS */}
  <div className="card-box">
  <div className="card-header">
    <h3>Alerts</h3>
  </div>

  {dashboard?.notifications?.length > 0 ? (
   dashboard.notifications.slice(0, 3).map((n) => {
      let colorClass = "green";

      if (n.severity === "critical") colorClass = "red";
      else if (n.severity === "warn") colorClass = "yellow";

      return (
        <div key={n.id} className={`alert ${colorClass}`}>
          <span>
            {n.severity === "critical" && "⚠ "}
            {n.severity === "warn" && "⏳ "}
            {n.severity === "ok" && "✔ "}
            {n.title}
          </span>
          <span>{n.time}</span>
        </div>
      );
    })
  ) : (
    <p>No alerts available</p>
  )}
</div>

  {/* PROJECT OVERVIEW */}
<div className="card-box">
  <div className="card-header">
    <h3>Project Overview</h3>
  </div>

  <div className="overview">

    {/* Quantity */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Quantity Work</span>
       <span>{dashboard?.progress?.[0]?.quantity_progress || 0}%</span>
      </div>
      <div className="progress-bar purple">
       <div style={{ width: `${dashboard?.progress?.[0]?.quantity_progress || 0}%` }}></div>
      </div>
    </div>

    {/* Cost */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Cost Utilization</span>
        <span>55%</span>
      </div>
      <div className="progress-bar blue">
        <div style={{ width: "55%" }}></div>
      </div>
    </div>

    {/* Progress */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Project Progress</span>
        <span>40%</span>
      </div>
      <div className="progress-bar cyan">
        <div style={{ width: "40%" }}></div>
      </div>
    </div>

  </div>
</div>

</div>
<div className="bottom-grid">

  {/* WORK DISTRIBUTION */}
  <div className="card-box">
    <h3>Work Distribution</h3>

    <div className="donut">
      <div className="donut-inner">70%</div>
    </div>

    <div className="legend">
      <span><b className="green"></b> Completed 70%</span>
      <span><b className="red"></b> Pending 30%</span>
    </div>
  </div>

  {/* TASK OVERVIEW */}
  <div className="card-box">
    <div className="card-header">
      <h3>Tasks Overview</h3>
     
    </div>

    <div className="task-list">
      <p>🟡 Pending <span>8</span></p>
      <p>🔵 In Progress <span>5</span></p>
      <p>🟢 Completed <span>12</span></p>
      <p>🔴 Overdue <span>2</span></p>
    </div>
  </div>

  {/* UPCOMING DEADLINES */}
  <div className="card-box">
    <div className="card-header">
      <h3>Upcoming Deadlines</h3>
     
    </div>

    <div className="deadline">
      <p>📅 Cost Report - April <span className="red-tag">25 Apr</span></p>
      <small>Skyline Tower</small>
    </div>

    <div className="deadline">
      <p>📅 Measurement Approval <span className="yellow-tag">27 Apr</span></p>
      <small>Green View Residency</small>
    </div>

    <div className="deadline">
      <p>📅 BOQ Finalization <span className="green-tag">30 Apr</span></p>
      <small>Central Plaza</small>
    </div>
  </div>

</div>

        

        </div>

     
  );
}