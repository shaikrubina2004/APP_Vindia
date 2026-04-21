import React, { useState } from "react";
import "./ArchitectCoordination.css";

const CLASH_DATA = [
  {
    id: "CL-001",
    type: "Hard Clash",
    discipline: "MEP vs Structural",
    location: "Level 5, Grid B-12",
    description: "HVAC duct intersects beam (150mm overlap)",
    status: "Open",
    priority: "High",
    engineer: "T. Kumar (MEP)",
    daysOpen: 3,
    files: ["Clash-Photo-1.jpg", "Section-DWG.pdf"]
  },
  {
    id: "CL-002",
    type: "Soft Clash",
    discipline: "MEP vs Architecture", 
    location: "Level 4 Ceiling, West Wing",
    description: "Duct clearance violation (50mm gap required)",
    status: "Resolved",
    priority: "Medium",
    engineer: "Eng. Sharma (Struct)",
    daysOpen: 0,
    files: ["Resolution-Sketch.pdf"]
  },
  {
    id: "CL-003",
    type: "Hard Clash",
    discipline: "Structural vs Architecture",
    location: "Core B Staircase",
    description: "Column clashes with stair stringer",
    status: "In Progress",
    priority: "Critical",
    engineer: "P. Rao (Arch)",
    daysOpen: 5,
    files: ["3D-Model-Extract.dwg"]
  }
];

const ENGINEERS = [
  { id: "TK", name: "T. Kumar", discipline: "MEP", status: "Online" },
  { id: "ES", name: "Eng. Sharma", discipline: "Structural", status: "Busy" },
  { id: "PR", name: "P. Rao", discipline: "Architecture", status: "Online" }
];

function ArchitectCoordination() {
  const [clashes, setClashes] = useState(CLASH_DATA);
  const [filterDiscipline, setFilterDiscipline] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedClash, setSelectedClash] = useState(null);
  const [newComment, setNewComment] = useState("");

  const filteredClashes = clashes.filter(clash => 
    (filterDiscipline === "All" || clash.discipline === filterDiscipline) &&
    (filterStatus === "All" || clash.status === filterStatus)
  );

  const updateClashStatus = (id, status) => {
    setClashes(prev => prev.map(c => 
      c.id === id ? { ...c, status } : c
    ));
  };

  const addComment = () => {
    if (!newComment.trim() || !selectedClash) return;
    // Simulate adding comment
    setNewComment("");
  };

  const assignEngineer = (engineerId) => {
    if (!selectedClash) return;
    // Simulate assignment
  };

  return (
    <div className="coord-main">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Coordination Hub</h1>
          <p className="page-subtitle">
            {filteredClashes.length} clashes • {clashes.filter(c => c.status === "Open").length} open
          </p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <select 
              className="filter-select"
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
            >
              <option>All Disciplines</option>
              <option>MEP vs Structural</option>
              <option>MEP vs Architecture</option>
              <option>Structural vs Architecture</option>
            </select>
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option>All Statuses</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
          </div>
          <button className="run-clash-btn">Run Clash Detection</button>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="kpi-row">
        <div className="kpi-card critical">
          <div className="kpi-number">3</div>
          <div className="kpi-label">Critical Clashes</div>
        </div>
        <div className="kpi-card high">
          <div className="kpi-number">5</div>
          <div className="kpi-label">High Priority</div>
        </div>
        <div className="kpi-card open">
          <div className="kpi-number">8</div>
          <div className="kpi-label">Open Issues</div>
        </div>
        <div className="kpi-card resolved">
          <div className="kpi-number">12</div>
          <div className="kpi-label">Resolved (90%)</div>
        </div>
      </div>

      <div className="coord-content">
        {/* CLASHES LIST */}
        <div className="clashes-panel">
          <div className="panel-header">
            <h3>Open Clashes</h3>
            <div className="legend">
              <span className="legend-item hard">Hard Clash</span>
              <span className="legend-item soft">Soft Clash</span>
            </div>
          </div>
          
          <div className="clashes-list">
            {filteredClashes.map((clash) => (
              <div 
                key={clash.id}
                className="clash-item"
                onClick={() => setSelectedClash(clash)}
              >
                <div className={`clash-type ${clash.type.toLowerCase().replace(' ', '-')}`}>
                  {clash.type}
                </div>
                
                <div className="clash-main">
                  <h4>{clash.description}</h4>
                  <div className="clash-location">📍 {clash.location}</div>
                </div>
                
                <div className="clash-meta">
                  <span className={`priority ${clash.priority.toLowerCase()}`}>
                    {clash.priority}
                  </span>
                  <span className={`status ${clash.status.toLowerCase().replace(' ', '-')}`}>
                    {clash.status}
                  </span>
                  <span>{clash.daysOpen}d</span>
                  <span className="engineer">{clash.engineer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ENGINEERS ONLINE */}
        <div className="engineers-panel">
          <h3>Team Online</h3>
          {ENGINEERS.map(engineer => (
            <div 
              key={engineer.id}
              className={`engineer-card ${engineer.status.toLowerCase()}`}
              onClick={() => assignEngineer(engineer.id)}
            >
              <div className="engineer-avatar">{engineer.id}</div>
              <div>
                <div className="engineer-name">{engineer.name}</div>
                <div className="engineer-role">{engineer.discipline}</div>
              </div>
              <div className={`status-dot ${engineer.status.toLowerCase()}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* CLASH DETAIL MODAL */}
      {selectedClash && (
        <div className="clash-modal-overlay" onClick={() => setSelectedClash(null)}>
          <div className="clash-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>CL-{selectedClash.id.slice(-3)}: {selectedClash.description}</h2>
              <button className="close-btn" onClick={() => setSelectedClash(null)}>×</button>
            </div>
            
            <div className="clash-detail-grid">
              <div className="detail-section">
                <h4>Details</h4>
                <div><strong>Type:</strong> {selectedClash.type}</div>
                <div><strong>Location:</strong> {selectedClash.location}</div>
                <div><strong>Discipline:</strong> {selectedClash.discipline}</div>
              </div>
              
              <div className="detail-section">
                <h4>Status</h4>
                <select 
                  value={selectedClash.status}
                  onChange={(e) => updateClashStatus(selectedClash.id, e.target.value)}
                  className="status-select"
                >
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
            
            <div className="comments-section">
              <h4>Discussion</h4>
              <textarea
                className="comment-input"
                placeholder="Add comment or resolution note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="add-comment-btn" onClick={addComment}>Post Comment</button>
            </div>
            
            <div className="files-section">
              <h4>Related Files</h4>
              {selectedClash.files.map((file, i) => (
                <div key={i} className="file-item">
                  📎 {file} <button>View</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectCoordination;