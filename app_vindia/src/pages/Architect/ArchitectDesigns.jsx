import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ArchitectDesigns.css";

const DESIGN_DATA = [
  {
    id: "DWG-A101",
    title: "Level 4 Floor Plan - Block A",
    version: "Rev C (v2.4)",
    format: "DWG",
    size: "2.1 MB",
    updated: "Apr 20, 2:15 PM",
    author: "Arjun K. (AK)",
    status: "Current",
    issues: 2,
    approvals: "Approved",
    downloads: 14,
    phase: "Construction Docs"
  },
  {
    id: "DWG-A201", 
    title: "Facade Elevation - South Wing",
    version: "Rev D (v1.7)",
    format: "DWG",
    size: "1.8 MB",
    updated: "Apr 19, 11:30 AM",
    author: "S. Mehta (SM)",
    status: "Pending Review",
    issues: 1,
    approvals: "Pending",
    downloads: 8,
    phase: "Design Development"
  },
  {
    id: "PDF-MEP501",
    title: "MEP Coordination Sheet - Level 5",
    version: "Rev 2.1",
    format: "PDF",
    size: "845 KB",
    updated: "Apr 18, 4:45 PM", 
    author: "T. Kumar (TK)",
    status: "Approved",
    issues: 0,
    approvals: "Approved",
    downloads: 23,
    phase: "Construction Docs"
  },
  {
    id: "RVT-STRUCT001",
    title: "Structural Model - Core B",
    version: "v3.0",
    format: "RVT",
    size: "48.2 MB",
    updated: "Apr 17, 9:20 AM",
    author: "Eng. Sharma",
    status: "Current",
    issues: 3,
    approvals: "Pending",
    downloads: 5,
    phase: "Design Development"
  }
];

function ArchitectDesigns() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState(DESIGN_DATA);
  const [filterPhase, setFilterPhase] = useState("All Phases");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const filteredDesigns = designs.filter(d => 
    (filterPhase === "All Phases" || d.phase === filterPhase) &&
    (d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     d.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUpload = () => {
    if (uploadFile) {
      // Simulate upload
      const newDesign = {
        id: `DWG-NEW-${Date.now()}`,
        title: uploadFile.name,
        version: "Rev A (v1.0)",
        format: uploadFile.name.split('.').pop().toUpperCase(),
        size: `${(uploadFile.size / 1024 / 1024).toFixed(1)} MB`,
        updated: new Date().toLocaleString(),
        author: "Arjun K. (AK)",
        status: "New",
        issues: 0,
        approvals: "Draft",
        downloads: 0,
        phase: "Schematic Design"
      };
      setDesigns([newDesign, ...designs]);
      setUploadFile(null);
    }
  };

  return (
    <div className="designs-main">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Design Library</h1>
          <p className="page-subtitle">
            {filteredDesigns.length} drawings • {designs.filter(d => d.status === "Current").length} active versions
          </p>
        </div>
        <div className="header-actions">
          <input
            className="search-input"
            placeholder="Search drawings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="upload-btn">
            <input 
              type="file" 
              accept=".dwg,.pdf,.rvt,.dxf,.ifc"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{ display: "none" }}
            />
            Upload Drawing
          </label>
          {uploadFile && (
            <button className="confirm-upload" onClick={handleUpload}>
              Confirm Upload
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-row">
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
        
        <div className="filter-chips">
          <span className="chip active">DWG</span>
          <span className="chip">PDF</span>
          <span className="chip">RVT</span>
          <span className="chip">Issues</span>
          <span className="chip">Pending</span>
        </div>
      </div>

      {/* DRAWINGS GRID */}
      <div className="drawings-grid">
        {filteredDesigns.map((design) => (
          <div 
            key={design.id}
            className="drawing-card"
            onClick={() => setSelectedDesign(design)}
          >
            <div className="card-header">
              <div className="design-id">{design.id}</div>
              <div className={`status-badge ${design.status.toLowerCase()}`}>
                {design.status}
              </div>
            </div>
            
            <div className="design-title">{design.title}</div>
            <div className="design-meta">
              <span>v{design.version}</span>
              <span>{design.format}</span>
              <span>{design.size}</span>
            </div>
            
            <div className="design-actions">
              <div className="issues-count">
                <span className="issues-icon">!</span>
                {design.issues}
              </div>
              <div className={`approval ${design.approvals.toLowerCase()}`}>
                {design.approvals}
              </div>
              <div className="downloads">{design.downloads}↓</div>
            </div>
            
            <div className="design-footer">
              <span className="author">{design.author}</span>
              <span>{design.updated}</span>
            </div>
          </div>
        ))}
      </div>

      {/* UPLOAD ZONE */}
      {uploadFile && (
        <div className="upload-preview">
          <div className="preview-content">
            <span className="preview-icon">📄</span>
            <div>
              <div className="preview-title">{uploadFile.name}</div>
              <div className="preview-size">
                {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <button className="btn-cancel" onClick={() => setUploadFile(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL - SELECTED DESIGN */}
      {selectedDesign && (
        <div className="design-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedDesign.title}</h2>
              <button 
                className="modal-close" 
                onClick={() => setSelectedDesign(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-primary">Download</button>
              <button className="btn-secondary">View Online</button>
              <button className="btn-danger">New Revision</button>
              <button>Link Issues ({selectedDesign.issues})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectDesigns;