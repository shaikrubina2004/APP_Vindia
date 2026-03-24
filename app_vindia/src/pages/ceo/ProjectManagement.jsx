import React, { useState } from "react";
import "./ProjectManagement.css";

function ProjectManagement() {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "Commercial Tower - Downtown",
      client: "ABC Developers",
      startDate: "2024-01-15",
      endDate: "2025-12-31",
      budget: "₹50,00,00,000",
      status: "In Progress",
      progress: 45,
      manager: "Rajesh Kumar",
      teamSize: 45,
      wbs: [
        {
          id: "WBS-1",
          code: "1.0",
          name: "Site Preparation & Foundation",
          status: "Completed",
          progress: 100,
          budget: "₹8,00,00,000",
          tasks: [
            {
              id: "T1",
              name: "Land Clearing",
              status: "Completed",
              duration: "30 days",
            },
            {
              id: "T2",
              name: "Soil Testing",
              status: "Completed",
              duration: "15 days",
            },
            {
              id: "T3",
              name: "Foundation Excavation",
              status: "Completed",
              duration: "45 days",
            },
            {
              id: "T4",
              name: "Foundation Concrete",
              status: "Completed",
              duration: "20 days",
            },
          ],
        },
        {
          id: "WBS-2",
          code: "2.0",
          name: "Structural Work",
          status: "In Progress",
          progress: 60,
          budget: "₹18,00,00,000",
          tasks: [
            {
              id: "T5",
              name: "Column Casting",
              status: "In Progress",
              duration: "60 days",
            },
            {
              id: "T6",
              name: "Beam Installation",
              status: "In Progress",
              duration: "50 days",
            },
            {
              id: "T7",
              name: "Floor Slab Casting",
              status: "Pending",
              duration: "45 days",
            },
            {
              id: "T8",
              name: "Structural Testing",
              status: "Pending",
              duration: "15 days",
            },
          ],
        },
        {
          id: "WBS-3",
          code: "3.0",
          name: "MEP Installation",
          status: "Pending",
          progress: 0,
          budget: "₹15,00,00,000",
          tasks: [
            {
              id: "T9",
              name: "Electrical Rough-in",
              status: "Pending",
              duration: "40 days",
            },
            {
              id: "T10",
              name: "Plumbing Installation",
              status: "Pending",
              duration: "35 days",
            },
            {
              id: "T11",
              name: "HVAC Installation",
              status: "Pending",
              duration: "30 days",
            },
            {
              id: "T12",
              name: "Fire Safety Systems",
              status: "Pending",
              duration: "25 days",
            },
          ],
        },
        {
          id: "WBS-4",
          code: "4.0",
          name: "Interior & Finishing",
          status: "Pending",
          progress: 0,
          budget: "₹7,00,00,000",
          tasks: [
            {
              id: "T13",
              name: "Wall Finishing",
              status: "Pending",
              duration: "35 days",
            },
            {
              id: "T14",
              name: "Flooring Installation",
              status: "Pending",
              duration: "30 days",
            },
            {
              id: "T15",
              name: "Painting & Cladding",
              status: "Pending",
              duration: "25 days",
            },
            {
              id: "T16",
              name: "Fixture Installation",
              status: "Pending",
              duration: "15 days",
            },
          ],
        },
        {
          id: "WBS-5",
          code: "5.0",
          name: "Quality & Handover",
          status: "Pending",
          progress: 0,
          budget: "₹2,00,00,000",
          tasks: [
            {
              id: "T17",
              name: "Quality Inspection",
              status: "Pending",
              duration: "20 days",
            },
            {
              id: "T18",
              name: "Final Testing",
              status: "Pending",
              duration: "15 days",
            },
            {
              id: "T19",
              name: "Client Handover",
              status: "Pending",
              duration: "10 days",
            },
          ],
        },
      ],
    },
    {
      id: 2,
      name: "Residential Complex - North Zone",
      client: "XYZ Construction",
      startDate: "2024-03-01",
      endDate: "2025-09-30",
      budget: "₹35,00,00,000",
      status: "In Progress",
      progress: 30,
      manager: "Priya Singh",
      teamSize: 35,
      wbs: [
        {
          id: "WBS-6",
          code: "1.0",
          name: "Foundation & Structure",
          status: "In Progress",
          progress: 50,
          budget: "₹15,00,00,000",
          tasks: [
            {
              id: "T20",
              name: "Foundation Work",
              status: "Completed",
              duration: "60 days",
            },
            {
              id: "T21",
              name: "Structural Frame",
              status: "In Progress",
              duration: "90 days",
            },
          ],
        },
        {
          id: "WBS-7",
          code: "2.0",
          name: "MEP & Finishing",
          status: "Pending",
          progress: 0,
          budget: "₹15,00,00,000",
          tasks: [
            {
              id: "T22",
              name: "Utilities Installation",
              status: "Pending",
              duration: "60 days",
            },
            {
              id: "T23",
              name: "Interior Finishing",
              status: "Pending",
              duration: "45 days",
            },
          ],
        },
      ],
    },
  ]);

  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const [expandedWBS, setExpandedWBS] = useState(new Set([0]));
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleWBSExpand = (index) => {
    const newExpanded = new Set(expandedWBS);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWBS(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "#22c55e";
      case "In Progress":
        return "#f59e0b";
      case "Pending":
        return "#ef4444";
      default:
        return "#7a7a8a";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "Completed":
        return "rgba(34, 197, 94, 0.1)";
      case "In Progress":
        return "rgba(245, 158, 11, 0.1)";
      case "Pending":
        return "rgba(239, 68, 68, 0.1)";
      default:
        return "rgba(122, 122, 138, 0.1)";
    }
  };

  return (
    <div className="project-management-page">
      {/* Header */}
      <div className="pm-header">
        <div>
          <h1>Project Management</h1>
          <p>Construction Projects with WBS (Work Breakdown Structure)</p>
        </div>
        <button
          className="new-project-btn"
          onClick={() => setShowAddModal(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Project
        </button>
      </div>

      <div className="pm-container">
        {/* Projects List Sidebar */}
        <div className="projects-sidebar">
          <h3>All Projects</h3>
          <div className="projects-list">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`project-item ${selectedProject.id === project.id ? "active" : ""}`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-info">
                  <h4>{project.name}</h4>
                  <p>{project.client}</p>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="pm-content">
          {/* Project Overview */}
          <div className="project-overview">
            <div className="overview-header">
              <h2>{selectedProject.name}</h2>
              <span
                className="status-badge"
                style={{
                  backgroundColor: getStatusBgColor(selectedProject.status),
                  color: getStatusColor(selectedProject.status),
                }}
              >
                {selectedProject.status}
              </span>
            </div>

            <div className="overview-grid">
              <div className="overview-card">
                <span className="label">Client</span>
                <span className="value">{selectedProject.client}</span>
              </div>
              <div className="overview-card">
                <span className="label">Project Manager</span>
                <span className="value">{selectedProject.manager}</span>
              </div>
              <div className="overview-card">
                <span className="label">Team Size</span>
                <span className="value">
                  {selectedProject.teamSize} Members
                </span>
              </div>
              <div className="overview-card">
                <span className="label">Budget</span>
                <span className="value">{selectedProject.budget}</span>
              </div>
              <div className="overview-card">
                <span className="label">Start Date</span>
                <span className="value">
                  {new Date(selectedProject.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="overview-card">
                <span className="label">End Date</span>
                <span className="value">
                  {new Date(selectedProject.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="progress-section">
              <div className="progress-header">
                <h3>Overall Progress</h3>
                <span className="percentage">{selectedProject.progress}%</span>
              </div>
              <div className="overall-progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${selectedProject.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* WBS Tree */}
          <div className="wbs-section">
            <h2>Work Breakdown Structure (WBS)</h2>
            <div className="wbs-tree">
              {selectedProject.wbs.map((wbsItem, index) => (
                <div key={wbsItem.id} className="wbs-item">
                  <div
                    className="wbs-header"
                    onClick={() => toggleWBSExpand(index)}
                  >
                    <button className="expand-btn">
                      {expandedWBS.has(index) ? "▼" : "▶"}
                    </button>
                    <div className="wbs-code">{wbsItem.code}</div>
                    <div className="wbs-info">
                      <h4>{wbsItem.name}</h4>
                      <p>{wbsItem.budget}</p>
                    </div>
                    <div className="wbs-status">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusBgColor(wbsItem.status),
                          color: getStatusColor(wbsItem.status),
                        }}
                      >
                        {wbsItem.status}
                      </span>
                      <div className="mini-progress">
                        <div
                          className="progress-fill"
                          style={{ width: `${wbsItem.progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{wbsItem.progress}%</span>
                    </div>
                  </div>

                  {/* Tasks */}
                  {expandedWBS.has(index) && (
                    <div className="tasks-container">
                      {wbsItem.tasks.map((task) => (
                        <div key={task.id} className="task-item">
                          <div className="task-checkbox">
                            <input
                              type="checkbox"
                              checked={task.status === "Completed"}
                              readOnly
                            />
                          </div>
                          <div className="task-info">
                            <span className="task-name">{task.name}</span>
                            <span className="task-duration">
                              {task.duration}
                            </span>
                          </div>
                          <span
                            className="task-status"
                            style={{
                              backgroundColor: getStatusBgColor(task.status),
                              color: getStatusColor(task.status),
                            }}
                          >
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Tasks</div>
              <div className="stat-value">
                {selectedProject.wbs.reduce(
                  (sum, w) => sum + w.tasks.length,
                  0,
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed Tasks</div>
              <div className="stat-value">
                {selectedProject.wbs.reduce(
                  (sum, w) =>
                    sum +
                    w.tasks.filter((t) => t.status === "Completed").length,
                  0,
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Progress Tasks</div>
              <div className="stat-value">
                {selectedProject.wbs.reduce(
                  (sum, w) =>
                    sum +
                    w.tasks.filter((t) => t.status === "In Progress").length,
                  0,
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Tasks</div>
              <div className="stat-value">
                {selectedProject.wbs.reduce(
                  (sum, w) =>
                    sum + w.tasks.filter((t) => t.status === "Pending").length,
                  0,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Project Name</label>
                <input type="text" placeholder="Enter project name" />
              </div>
              <div className="form-group">
                <label>Client Name</label>
                <input type="text" placeholder="Enter client name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" />
                </div>
              </div>
              <div className="form-group">
                <label>Budget</label>
                <input type="text" placeholder="₹ Enter budget" />
              </div>
              <div className="form-group">
                <label>Project Manager</label>
                <select>
                  <option>Select Manager</option>
                  <option>Rajesh Kumar</option>
                  <option>Priya Singh</option>
                  <option>Vikram Patel</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="btn-create">Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectManagement;
