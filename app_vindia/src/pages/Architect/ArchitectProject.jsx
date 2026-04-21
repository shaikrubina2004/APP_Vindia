import React, { useState } from "react";
import "./ArchitectProject.css";

const PROJECT_DATA = [
  {
    id: "P-001",
    name: "Skyward Residency",
    status: "Construction",
    phase: "Construction Docs",
    role: "Lead Architect",
    budget: "₹4.2 Cr",
    progress: 68,
    deadline: "Dec 15, 2026",
    team: 12,
    issues: 8,
    drawings: 42,
    lastUpdate: "Apr 20, 2:15 PM"
  },
  {
    id: "P-002",
    name: "Green Valley Towers",
    status: "Design Development", 
    phase: "Design Development",
    role: "Architect",
    budget: "₹2.8 Cr",
    progress: 45,
    deadline: "Aug 30, 2026",
    team: 8,
    issues: 3,
    drawings: 28,
    lastUpdate: "Apr 19, 11:30 AM"
  },
  {
    id: "P-003",
    name: "Urban Plaza Commercial",
    status: "Pre-Design",
    phase: "Schematic Design",
    role: "Project Architect",
    budget: "₹6.5 Cr",
    progress: 12,
    deadline: "Jun 20, 2026",
    team: 5,
    issues: 1,
    drawings: 8,
    lastUpdate: "Apr 18, 4:45 PM"
  }
];

const TEAM_MEMBERS = [
  { id: "AK", name: "Arjun K.", role: "Lead Architect", status: "Online" },
  { id: "SM", name: "S. Mehta", role: "Architect", status: "Online" },
  { id: "TK", name: "T. Kumar", role: "MEP Engineer", status: "Busy" },
  { id: "ES", name: "Eng. Sharma", role: "Structural", status: "Online" }
];

function ArchitectProject() {
  const [projects, setProjects] = useState(PROJECT_DATA);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPhase, setFilterPhase] = useState("All");
  const [selectedProject, setSelectedProject] = useState(null);
  const [newTask, setNewTask] = useState("");

  const filteredProjects = projects.filter(project => 
    (filterStatus === "All" || project.status === filterStatus) &&
    (filterPhase === "All" || project.phase === filterPhase)
  );

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status !== "Completed").length,
    critical: projects.filter(p => p.issues > 5).length,
    onTrack: projects.filter(p => p.progress > 50).length
  };

  const updateProgress = (id, progress) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, progress } : p
    ));
  };

  const addTask = () => {
    if (!newTask.trim() || !selectedProject) return;
    // Simulate task addition
    setNewTask("");
  };

  return (
    <div className="project-main">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects Overview</h1>
          <p className="page-subtitle">
            {stats.total} projects • {stats.active} active • ₹{projects.reduce((sum, p) => sum + parseFloat(p.budget.replace(/[₹, Cr]/g, '')), 0).toFixed(1)} Cr total
          </p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option>All Status</option>
              <option>Pre-Design</option>
              <option>Design Development</option>
              <option>Construction</option>
              <option>Completed</option>
            </select>
            <select 
              className="filter-select"
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
            >
              <option>All Phases</option>
              <option>Schematic Design</option>
              <option>Design Development</option>
              <option>Construction Docs</option>
            </select>
          </div>
          <button className="new-project-btn">+ New Project</button>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="kpi-row">
        <div className="kpi-card total">
          <div className="kpi-number">{stats.total}</div>
          <div className="kpi-label">Total Projects</div>
        </div>
        <div className="kpi-card active">
          <div className="kpi-number">{stats.active}</div>
          <div className="kpi-label">Active</div>
        </div>
        <div className="kpi-card critical">
          <div className="kpi-number">{stats.critical}</div>
          <div className="kpi-label">Critical Issues</div>
        </div>
        <div className="kpi-card ontrack">
          <div className="kpi-number">{stats.onTrack}</div>
          <div className="kpi-label">On Track</div>
        </div>
      </div>

      <div className="project-content">
        {/* PROJECTS LIST */}
        <div className="projects-panel">
          <div className="panel-header">
            <h3>Project Portfolio</h3>
          </div>
          
          <div className="projects-list">
            {filteredProjects.map((project) => (
              <div 
                key={project.id}
                className="project-card"
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-header">
                  <div className={`status-badge ${project.status.toLowerCase()}`}>
                    {project.status}
                  </div>
                  <div className={`phase-badge ${project.phase.toLowerCase().replace(' ', '-')}`}>
                    {project.phase}
                  </div>
                </div>
                
                <h3 className="project-name">{project.name}</h3>
                <div className="project-role">{project.role}</div>
                
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>
                
                <div className="project-metrics">
                  <span>₹{project.budget}</span>
                  <span>{project.team} team</span>
                  <span>{project.issues} issues</span>
                  <span>{project.drawings} drawings</span>
                </div>
                
                <div className="project-footer">
                  <span>Due: {project.deadline}</span>
                  <span>Last: {project.lastUpdate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM DIRECTORY */}
        <div className="team-panel">
          <h3>Project Team</h3>
          {TEAM_MEMBERS.map(member => (
            <div 
              key={member.id}
              className={`team-card ${member.status.toLowerCase()}`}
            >
              <div className="team-avatar">{member.id}</div>
              <div className="team-info">
                <div className="team-name">{member.name}</div>
                <div className="team-role">{member.role}</div>
              </div>
              <div className={`team-status ${member.status.toLowerCase()}`}>
                {member.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div className="project-modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="project-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProject.name}</h2>
              <button className="close-btn" onClick={() => setSelectedProject(null)}>×</button>
            </div>
            
            <div className="project-detail-grid">
              <div className="detail-section">
                <h4>Progress</h4>
                <div className="large-progress">
                  <div 
                    className="large-progress-fill"
                    style={{ width: `${selectedProject.progress}%` }}
                  ></div>
                </div>
                <div className="progress-label">{selectedProject.progress}% Complete</div>
              </div>
              
              <div className="detail-section">
                <h4>Key Metrics</h4>
                <div className="metrics-list">
                  <div>Budget: <strong>₹{selectedProject.budget}</strong></div>
                  <div>Team: <strong>{selectedProject.team} members</strong></div>
                  <div>Issues: <strong>{selectedProject.issues}</strong></div>
                  <div>Drawings: <strong>{selectedProject.drawings}</strong></div>
                </div>
              </div>
            </div>
            
            <div className="quick-actions">
              <button className="action-btn primary">Dashboard</button>
              <button className="action-btn secondary">Tasks</button>
              <button className="action-btn secondary">Designs</button>
              <button className="action-btn secondary">Coordination</button>
              <button className="action-btn danger">Issues ({selectedProject.issues})</button>
            </div>
            
            <div className="task-section">
              <h4>Quick Tasks</h4>
              <div className="task-input-group">
                <input
                  className="quick-task-input"
                  placeholder="Add quick task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                />
                <button className="add-task-btn" onClick={addTask}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectProject;