// QuantitySurveyorDashboard.jsx

import "./QuantitySurveyorDashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + " min ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + " hrs ago";

  return Math.floor(seconds / 86400) + " days ago";
};
export default function QuantitySurveyorDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState({});

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/qs/dashboard");

    setDashboard(res.data.data);
    setTasks(res.data.data.tasks || {});   // ✅ ADD THIS LINE

  } catch (err) {
    console.error(err);
  }
};

  const quantityProgress = dashboard?.progress?.[0]?.quantity_progress || 0;
  const overallProgress = dashboard?.progress?.[0]?.overall_progress || 0;
 const totalProjects = dashboard?.totalProjects || 0;

  return (
    <div className="qsdb">

      {/* HEADER */}
      <div className="qsdb-header">
        <div className="header-text">
          <h2>Dashboard</h2>
          <p>Welcome back! Here's what's happening on your projects.</p>
        </div>
        <div className="header-date">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* TOP STAT CARDS */}
      <div className="top-cards">

        <div className="top-card card-blue">
          <div className="card-content">
            <p className="card-label">Total Projects</p>
            <h2 className="card-value">{totalProjects}</h2>
            <span className="card-sub">● Active Projects</span>
          </div>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18M3 12h18M3 17h18"/><rect x="1" y="3" width="22" height="18" rx="2"/></svg>
          </div>
        </div>

        <div className="top-card card-teal">
          <div className="card-content">
            <p className="card-label">Quantity Progress</p>
            <h2 className="card-value">{quantityProgress}%</h2>
            <span className="card-sub">↑ +8% from last week</span>
          </div>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
        </div>

        <div className="top-card card-sky">
          <div className="card-content">
            <p className="card-label">Cost Utilization</p>
            <h2 className="card-value">{overallProgress}%</h2>
            <span className="card-sub">✔ On Budget</span>
          </div>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
        </div>

        <div className="top-card card-indigo">
          <div className="card-content">
            <p className="card-label">Tasks Pending</p>
         <h2 className="card-value">{tasks?.pending || 0}</h2>
            <span className="card-sub">⚠ Requires attention</span>
          </div>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
        </div>

      </div>

      {/* MIDDLE GRID */}
      <div className="mid-grid">

        {/* RECENT ACTIVITIES */}
        <div className="card-box">
          <div className="card-header">
            <h3>Recent Activities</h3>
           
          </div>

         <div className="activity-list">
  {dashboard?.activities?.map((a, i) => {
    let dot = "dot-blue";

    if (a.title === "Cost Alert") dot = "dot-red";
    if (a.title === "Daily Update Submitted") dot = "dot-sky";
    if (a.title === "BOQ Updated") dot = "dot-blue";

    return (
      <div key={i} className="activity-item">
        <div className={`activity-dot ${dot}`}></div>

        <div className="activity-body">
          <p className="activity-title">{a.title}</p>
          <span className="activity-sub">{a.description}</span>
        </div>

        <span className="activity-time">
          {timeAgo(a.created_at)}
        </span>
      </div>
    );
  })}
</div>
        </div>

        {/* ALERTS */}
        <div className="card-box">
          <div className="card-header">
            <h3>Alerts</h3>
          </div>

          <div className="alerts-list">
            {dashboard?.notifications?.length > 0 ? (
              dashboard.notifications.slice(0, 3).map((n) => {
                let cls = "alert-ok";
                let icon = "✔";
                if (n.severity === "critical") { cls = "alert-critical"; icon = "⚠"; }
                else if (n.severity === "warn") { cls = "alert-warn"; icon = "⏳"; }
                return (
                  <div key={n.id} className={`alert-row ${cls}`}>
                    <span className="alert-icon">{icon}</span>
                    <span className="alert-title">{n.title}</span>
                    <span className="alert-time">{n.time}</span>
                  </div>
                );
              })
            ) : (
              <div className="no-alerts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                <p>All clear — no alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* PROJECT OVERVIEW */}
        <div className="card-box">
          <div className="card-header">
            <h3>Project Overview</h3>
          </div>

          <div className="overview-list">
            <div className="overview-item">
              <div className="overview-labels">
                <span>Quantity Work</span>
                <span className="overview-pct">{quantityProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-blue" style={{ width: `${quantityProgress}%` }}></div>
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-labels">
                <span>Cost Utilization</span>
                <span className="overview-pct">55%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-teal" style={{ width: "55%" }}></div>
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-labels">
                <span>Project Progress</span>
                <span className="overview-pct">40%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-sky" style={{ width: "40%" }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM GRID */}
      <div className="bottom-grid">

        {/* WORK DISTRIBUTION */}
        <div className="card-box">
          <div className="card-header">
            <h3>Work Distribution</h3>
          </div>
          <div className="donut-wrapper">
            <svg viewBox="0 0 100 100" className="donut-svg">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#e8f4fd" strokeWidth="12"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke="#0ea5e9" strokeWidth="12"
                strokeDasharray="167.6 71.9"
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#bae6fd" strokeWidth="12"
                strokeDasharray="71.9 167.6"
                strokeDashoffset="-167.6"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="donut-label">70%</div>
          </div>
          <div className="donut-legend">
            <span><span className="legend-dot dot-completed"></span>Completed 70%</span>
            <span><span className="legend-dot dot-pending"></span>Pending 30%</span>
          </div>
        </div>

        {/* TASKS OVERVIEW */}
        <div className="card-box">
          <div className="card-header">
            <h3>Tasks Overview</h3>
          </div>
          <div className="task-list">
            <div className="task-row">
              <span className="task-label"><span className="task-dot td-yellow"></span>Pending</span>
           <span className="task-count">{tasks?.pending || 0}</span>
            </div>
            <div className="task-row">
              <span className="task-label"><span className="task-dot td-blue"></span>In Progress</span>
             <span className="task-count">{tasks?.inProgress || 0}</span>
            </div>
            <div className="task-row">
              <span className="task-label"><span className="task-dot td-green"></span>Completed</span>
             <span className="task-count">{tasks?.done || 0}</span>
            </div>
            <div className="task-row">
              <span className="task-label"><span className="task-dot td-red"></span>Overdue</span>
              <span className="task-count">2</span>
            </div>
          </div>
        </div>

        {/* UPCOMING DEADLINES */}
        <div className="card-box">
          <div className="card-header">
            <h3>Upcoming Deadlines</h3>
          </div>
          <div className="deadline-list">
            <div className="deadline-row">
              <div className="deadline-info">
                <p className="deadline-title">Cost Report — April</p>
                <span className="deadline-project">Skyline Tower</span>
              </div>
              <span className="deadline-badge badge-red">25 Apr</span>
            </div>
            <div className="deadline-row">
              <div className="deadline-info">
                <p className="deadline-title">Measurement Approval</p>
                <span className="deadline-project">Green View Residency</span>
              </div>
              <span className="deadline-badge badge-yellow">27 Apr</span>
            </div>
            <div className="deadline-row">
              <div className="deadline-info">
                <p className="deadline-title">BOQ Finalization</p>
                <span className="deadline-project">Central Plaza</span>
              </div>
              <span className="deadline-badge badge-green">30 Apr</span>
            </div>
          </div>
        </div>

      </div>
u
    </div>
  );
}