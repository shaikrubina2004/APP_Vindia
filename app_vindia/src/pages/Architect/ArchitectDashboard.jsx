import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./ArchitectDashboard.css";

const projectsData = [
  {
    id: 1,
    name: "Skyward Residency",
    version: "v4.2.1-RELEASE",
    clashes: 4,
    signoffs: 2,
    tasks: 9,
    accuracy: 98.4,
    incidents: [
      { id: 1, issue: "Beam clash with HVAC (Grid B-12)", priority: "HIGH", status: "Coordination Required", discipline: "MEP/Struct" },
      { id: 2, issue: "Column offset Basement B2", priority: "MEDIUM", status: "Awaiting Architect", discipline: "Structural" },
    ],
  },
  {
    id: 2,
    name: "Green Valley Towers",
    version: "v2.3.0-DRAFT",
    clashes: 1,
    signoffs: 0,
    tasks: 3,
    accuracy: 92.1,
    incidents: [
      { id: 1, issue: "Pipe routing conflict Level 3", priority: "MEDIUM", status: "Pending Review", discipline: "MEP" },
    ],
  },
];

function ArchitectDashboard() {
  const [projects] = useState(projectsData);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const [logSubmitted, setLogSubmitted] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSignOff = (incidentId) => {
    alert(`✓ Client Sign-off Initiated\nRef: ARC-${selectedProject.id}0${incidentId}\n${selectedProject.name} → Project Manager → Client`);
  };

  const trendData = [
    { day: "Apr 4", clashes: 6, resolved: 1 },
    { day: "Apr 5", clashes: 5, resolved: 3 },
    { day: "Apr 6", clashes: 4, resolved: 5 },
    { day: "Apr 7", clashes: 3, resolved: 7 },
  ];

  return (
    <div className="app">
      <div className="main-layout">
        {/* 🔷 PROFESSIONAL HEADER */}
        <header className="dash-header premium">
          <div className="header-content">
            <div className="project-title">
              <h1>{selectedProject.name}</h1>
              <span className="version-badge">{selectedProject.version}</span>
            </div>
            <p>Phase 1 • Real-time BIM Coordination • {new Date().toLocaleDateString()}</p>
          </div>

          <div className="header-actions">
            <select
              className="project-switcher"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.version})
                </option>
              ))}
            </select>
            <button className="action-btn secondary">📊 Export Report</button>
            <button className="action-btn primary large">+ New Issue</button>
          </div>
        </header>

        {/* 🔷 ENTERPRISE KPI DASHBOARD */}
        <div className="kpi-grid">
          <div className="kpi-card elevated danger">
            <div className="kpi-metric">04</div>
            <div className="kpi-label">Open Clashes</div>
            <div className="kpi-trend ↓2">Requires coordination</div>
          </div>
          <div className="kpi-card elevated warning">
            <div className="kpi-metric">02</div>
            <div className="kpi-label">Awaiting Sign-off</div>
            <div className="kpi-trend →0">Client pending</div>
          </div>
          <div className="kpi-card elevated info">
            <div className="kpi-metric">09</div>
            <div className="kpi-label">Active Tasks</div>
            <div className="kpi-trend ↑3">Team assignments</div>
          </div>
          <div className="kpi-card elevated success">
            <div className="kpi-metric">{selectedProject.accuracy}%</div>
            <div className="kpi-label">Model Accuracy</div>
            <div className="kpi-trend ✓OK">Federated model</div>
          </div>
        </div>

        <div className="premium-grid">
          {/* 🔷 ENHANCED INCIDENT QUEUE */}
          <div className="panel-main">
            <div className="panel-header">
              <h2>Design Incident Queue</h2>
              <div className="panel-controls">
                <select className="filter-select">
                  <option>All Disciplines</option>
                  <option>MEP</option>
                  <option>Structural</option>
                </select>
              </div>
            </div>

            <div className="incident-table">
              <div className="table-header">
                <span>Ref ID</span>
                <span>Issue</span>
                <span>Discipline</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {selectedProject.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="table-row clickable"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <span className="ref-id">ARC-{selectedProject.id}0{incident.id}</span>
                  <span className="issue">{incident.issue}</span>
                  <span className={`discipline ${incident.discipline.toLowerCase().replace('/', '-')}`}>{incident.discipline}</span>
                  <span className={`priority-badge ${incident.priority.toLowerCase()}`}>{incident.priority}</span>
                  <span className={`status-badge ${incident.status.toLowerCase().replace(' ', '-')}`}>
                    {incident.status}
                  </span>
                  <div className="actions">
                    <button className="btn-sm primary" onClick={(e) => { e.stopPropagation(); handleSignOff(incident.id); }}>
                      Sign-off
                    </button>
                    <button className="btn-sm secondary">Assign</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🔷 PROFESSIONAL SIDE PANEL */}
          <div className="side-panel">
            {/* DAILY LOG - MANDATORY EOD */}
            <div className={`daily-log-card ${logSubmitted ? 'completed' : 'pending'}`}>
              <div className="log-header">
                <h3>📋 Daily Log (Mandatory)</h3>
                <span className={`log-status ${logSubmitted ? 'success' : 'warning'}`}>
                  {logSubmitted ? '✓ Submitted' : '⚠ Required'}
                </span>
              </div>
              <div className="log-content">
                <div className="log-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                {!logSubmitted ? (
                  <button className="log-submit primary" onClick={() => setLogSubmitted(true)}>
                    Submit EOD Log
                  </button>
                ) : (
                  <div className="log-complete">
                    <span className="checkmark">✓</span>
                    <span>COMPLETE</span>
                  </div>
                )}
              </div>
            </div>

            {/* TASK ASSIGNMENT */}
            <div className="panel-card">
              <div className="panel-header">
                <h4>Quick Actions</h4>
              </div>
              <div className="action-list">
                <button className="action-item">👥 Assign Task</button>
                <button className="action-item">📋 Version Control</button>
                <button className="action-item">🎯 3D Review</button>
              </div>
            </div>

            {/* TREND CHART */}
            <div className="panel-card chart-panel">
              <h4>Clash Resolution Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis width={30} fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clashes" stroke="#ef4444" strokeWidth={3} dot={false} name="Open" />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={false} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* INCIDENT MODAL */}
      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedIncident.issue}</h3>
            <div className="modal-details">
              <span>Ref: ARC-{selectedProject.id}0{selectedIncident.id}</span>
              <span>Discipline: {selectedIncident.discipline}</span>
              <span>Status: {selectedIncident.status}</span>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => handleSignOff(selectedIncident.id)}>
                Request Client Sign-off
              </button>
              <button className="btn secondary" onClick={() => setSelectedIncident(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectDashboard;