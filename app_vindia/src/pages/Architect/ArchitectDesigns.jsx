import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ArchitectDesigns.css";

const DESIGN_DATA = [
  {
    id: "A101",
    project: "Skyward Residency",
    discipline: "Architectural",
    type: "Floor Plan",
    title: "Level 4 Floor Plan - Block A",
    versions: [
      { num: "Rev C v2.4", date: "Apr 20", by: "Arjun K.", status: "Approved" },
      { num: "Rev B v2.3", date: "Apr 18", by: "S. Mehta", status: "Under Review" },
      { num: "Rev A v2.0", date: "Apr 15", by: "Arjun K.", status: "Draft" }
    ],
    status: "Approved",
    revisions: 2,
    comments: 3,
    filesize: "2.1 MB"
  },
  {
    id: "MEP501",
    project: "Skyward Residency",
    discipline: "MEP",
    type: "Coordination",
    title: "MEP Coordination Sheet - Level 5",
    versions: [
      { num: "Rev 2.1", date: "Apr 18", by: "T. Kumar", status: "Approved" },
      { num: "Rev 1.0", date: "Apr 16", by: "T. Kumar", status: "Rejected" }
    ],
    status: "Approved",
    revisions: 0,
    comments: 1,
    filesize: "845 KB"
  },
  {
    id: "S001",
    project: "Green Valley Towers",
    discipline: "Structural",
    type: "Site Plan",
    title: "Site Plan Update - Phase 2 Boundary",
    versions: [
      { num: "Rev E v3.0", date: "Apr 17", by: "Eng. Sharma", status: "Approved" },
      { num: "Rev D v2.9", date: "Apr 14", by: "Eng. Sharma", status: "Under Review" }
    ],
    status: "Under Review",
    revisions: 1,
    comments: 2,
    filesize: "1.8 MB"
  }
];

function ArchitectDesigns() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState(DESIGN_DATA);
  const [filters, setFilters] = useState({
    project: "All Projects",
    discipline: "All Disciplines",
    status: "All Statuses"
  });
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const projects = ["All Projects", "Skyward Residency", "Green Valley Towers"];
  const disciplines = ["All Disciplines", "Architectural", "Structural", "MEP"];
  const statuses = ["All Statuses", "Draft", "Under Review", "Approved", "Rejected"];

  const filteredDesigns = designs.filter(d => 
    (filters.project === "All Projects" || d.project === filters.project) &&
    (filters.discipline === "All Disciplines" || d.discipline === filters.discipline) &&
    (filters.status === "All Statuses" || d.status === filters.status)
  );

  const handleUpload = () => {
    if (uploadFile) {
      // Simulate new design upload
      const newDesign = {
        id: `NEW-${Date.now() % 1000}`,
        project: "Skyward Residency",
        discipline: uploadFile.name.includes('MEP') ? "MEP" : "Architectural",
        type: "Plan",
        title: uploadFile.name,
        versions: [{ num: "Rev A v1.0", date: "Today", by: "Arjun K.", status: "Draft" }],
        status: "Draft",
        revisions: 0,
        comments: 0,
        filesize: `${(uploadFile.size/1024/1024).toFixed(1)} MB`
      };
      setDesigns([newDesign, ...designs]);
      setUploadFile(null);
    }
  };

  return (
    <div className="designs-erp">
      {/* 🏗️ HEADER WITH STATS */}
      <div className="erp-header">
        <div className="header-left">
          <h1 className="erp-title">Design Library</h1>
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-number">{filteredDesigns.length}</div>
              <div className="stat-label">Drawings</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{designs.filter(d => d.status === "Approved").length}</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{designs.reduce((sum, d) => sum + d.revisions, 0)}</div>
              <div className="stat-label">Revisions</div>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <input 
            className="search-bar" 
            placeholder="Search drawings..." 
          />
          <label className="upload-trigger">
            <input 
              type="file" 
              accept=".dwg,.pdf,.rvt,.dxf,.ifc"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{display: 'none'}}
            />
            <span>📤 Upload Design</span>
          </label>
          {uploadFile && (
            <button className="confirm-upload" onClick={handleUpload}>
              Confirm Upload
            </button>
          )}
        </div>
      </div>

      {/* 🔍 FILTERS */}
      <div className="filters-bar">
        <select 
          className="filter-dropdown"
          value={filters.project}
          onChange={(e) => setFilters({...filters, project: e.target.value})}
        >
          {projects.map(p => <option key={p}>{p}</option>)}
        </select>
        <select 
          className="filter-dropdown"
          value={filters.discipline}
          onChange={(e) => setFilters({...filters, discipline: e.target.value})}
        >
          {disciplines.map(d => <option key={d}>{d}</option>)}
        </select>
        <select 
          className="filter-dropdown"
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* 📂 DESIGN LIBRARY */}
      <div className="design-grid">
        {filteredDesigns.map((design) => (
          <div 
            key={design.id}
            className="design-card"
            onClick={() => setSelectedDesign(design)}
          >
            {/* PROJECT & DISCIPLINE HEADER */}
            <div className="card-header">
              <div className="project-tag">{design.project}</div>
              <div className={`discipline-badge ${design.discipline.toLowerCase()}`}>
                {design.discipline}
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="card-main">
              <div className="design-id">#{design.id}</div>
              <div className="design-title">{design.title}</div>
              <div className="design-type">{design.type}</div>
              
              {/* LATEST VERSION */}
              <div className="latest-version">
                <div className="version-info">
                  <span className="version-number">
                    {design.versions[0]?.num || "No versions"}
                  </span>
                  <span className="version-date">{design.versions[0]?.date}</span>
                  <span className="version-by">{design.versions[0]?.by}</span>
                </div>
                <div className={`version-status ${design.versions[0]?.status?.toLowerCase() || 'draft'}`}>
                  {design.versions[0]?.status || "Draft"}
                </div>
              </div>

              {/* METRICS */}
              <div className="design-metrics">
                <span className="metric">
                  <strong>{design.revisions}</strong> Revisions
                </span>
                <span className="metric">
                  <strong>{design.comments}</strong> Comments
                </span>
                <span className="metric filesize">{design.filesize}</span>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="card-actions">
              <button className="action-btn small primary">New Version</button>
              <button className="action-btn small secondary">Send Review</button>
              <button className="action-btn small download">Download</button>
            </div>
          </div>
        ))}
      </div>

      {/* 📈 ACTIVITY TIMELINE */}
      <div className="activity-panel">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon approved">✓</div>
            <div className="activity-content">
              <strong>A101 Rev C v2.4</strong> approved by Client
              <span>2 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon revision">↻</div>
            <div className="activity-content">
              <strong>MEP501 Rev 2.1</strong> new revision requested by MEP Lead
              <span>1 day ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon upload">📤</div>
            <div className="activity-content">
              <strong>S001 Rev E v3.0</strong> uploaded by Eng. Sharma
              <span>3 days ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: DESIGN DETAIL */}
      {selectedDesign && (
        <div className="modal-overlay" onClick={() => setSelectedDesign(null)}>
          <div className="design-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedDesign.title}</h2>
                <div className="modal-meta">
                  <span className="project-tag">{selectedDesign.project}</span>
                  <span className={`discipline-badge ${selectedDesign.discipline.toLowerCase()}`}>
                    {selectedDesign.discipline}
                  </span>
                </div>
              </div>
              <button className="close-btn">×</button>
            </div>

            {/* VERSION HISTORY */}
            <div className="version-history">
              <h4>Version History ({selectedDesign.versions.length})</h4>
              <div className="versions-list">
                {selectedDesign.versions.map((version, index) => (
                  <div key={version.num} className={`version-row ${index === 0 ? 'current' : ''}`}>
                    <div className="version-left">
                      <span className="version-number">{version.num}</span>
                      <span className="version-date">{version.date}</span>
                      <span className="version-by">by {version.by}</span>
                    </div>
                    <div className={`version-status-badge ${version.status.toLowerCase()}`}>
                      {version.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REVISION REQUESTS */}
            <div className="revision-requests">
              <h4>Revision Requests ({selectedDesign.revisions})</h4>
              <div className="requests-list">
                <div className="request-item">
                  <div className="request-header">
                    <span className="request-by">MEP Lead</span>
                    <span className="request-priority high">High</span>
                  </div>
                  <div className="request-desc">"Adjust duct routing at Grid B-12"</div>
                </div>
                <div className="request-item resolved">
                  <div className="request-header">
                    <span className="request-by">Client</span>
                    <span className="request-priority medium">Medium</span>
                  </div>
                  <div className="request-desc">"Window sizes confirmed"</div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="modal-actions">
              <button className="action-btn primary large">Create New Version</button>
              <button className="action-btn secondary large">Send for Approval</button>
              <button className="action-btn secondary large">Compare Versions</button>
              <button className="action-btn download large">Download Latest</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectDesigns;