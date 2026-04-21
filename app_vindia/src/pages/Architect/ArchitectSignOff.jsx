import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ArchitectSignOff.css";

const SIGNOFF_DATA = [
  {
    id: "SO-001",
    title: "Level 4 Floor Plan - Block A",
    drawing: "DWG-A101 Rev C",
    submitted: "Apr 17, 2026",
    status: "Awaiting Client",
    approvers: ["Mr. Rajan (Client)", "PM Singh"],
    daysPending: 4,
    comments: ["Window sizes need confirmation", "Stair location approved"],
    files: ["DWG-A101-RevC.dwg", "FloorPlan-PDF.pdf"]
  },
  {
    id: "SO-002",
    title: "Facade Elevation - South Wing", 
    drawing: "DWG-A201 Rev D",
    submitted: "Apr 19, 2026",
    status: "Approved",
    approvers: ["Mr. Rajan (Client)"],
    daysPending: 0,
    comments: ["Approved as submitted"],
    files: ["DWG-A201-RevD.dwg"]
  },
  {
    id: "SO-003",
    title: "MEP Coordination - Level 5",
    drawing: "PDF-MEP501 Rev 2.1",
    submitted: "Apr 18, 2026", 
    status: "Rejected",
    approvers: ["Mr. Rajan (Client)", "MEP Lead"],
    daysPending: 0,
    comments: ["Duct clash unresolved - revise"],
    files: ["MEP-Coordination-L5.pdf"]
  }
];

function ArchitectSignOff() {
  const navigate = useNavigate();
  const [signoffs, setSignoffs] = useState(SIGNOFF_DATA);
  const [newSignoff, setNewSignoff] = useState({
    title: "",
    drawing: "",
    approvers: []
  });
  const [selectedSignoff, setSelectedSignoff] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredSignoffs = signoffs.filter(s => 
    filterStatus === "All" || s.status === filterStatus
  );

  const submitNewSignoff = () => {
    if (!newSignoff.title || !newSignoff.drawing) return;
    
    const signoff = {
      id: `SO-${String(signoffs.length + 1).padStart(3, '0')}`,
      title: newSignoff.title,
      drawing: newSignoff.drawing,
      submitted: new Date().toLocaleDateString('en-IN'),
      status: "Awaiting Client",
      approvers: newSignoff.approvers,
      daysPending: 0,
      comments: [],
      files: [newSignoff.drawing]
    };
    
    setSignoffs([signoff, ...signoffs]);
    setNewSignoff({ title: "", drawing: "", approvers: [] });
  };

  const updateStatus = (id, status) => {
    setSignoffs(prev => prev.map(s => 
      s.id === id ? { ...s, status } : s
    ));
  };

  return (
    <div className="signoff-main">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Sign-Offs</h1>
          <p className="page-subtitle">
            {filteredSignoffs.length} active • {signoffs.filter(s => s.status === "Awaiting Client").length} pending approval
          </p>
        </div>
        <div className="header-actions">
          <select 
            className="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option>All</option>
            <option>Awaiting Client</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>

      {/* NEW SIGNOFF FORM */}
      <div className="new-signoff-panel">
        <h3>Submit New For Approval</h3>
        <div className="signoff-form">
          <input
            className="form-input"
            placeholder="Drawing Title (e.g. Level 5 Floor Plan)"
            value={newSignoff.title}
            onChange={(e) => setNewSignoff({...newSignoff, title: e.target.value})}
          />
          <input
            className="form-input"
            placeholder="Drawing ID (e.g. DWG-A101 Rev C)"
            value={newSignoff.drawing}
            onChange={(e) => setNewSignoff({...newSignoff, drawing: e.target.value})}
          />
          <div className="approvers-section">
            <label>Approvers</label>
            <div className="approver-chips">
              {["Mr. Rajan (Client)", "PM Singh", "MEP Lead", "Structural Eng"].map(a => (
                <button
                  key={a}
                  className={`approver-chip ${newSignoff.approvers.includes(a) ? 'selected' : ''}`}
                  onClick={() => {
                    setNewSignoff(prev => ({
                      ...prev,
                      approvers: prev.approvers.includes(a)
                        ? prev.approvers.filter(ap => ap !== a)
                        : [...prev.approvers, a]
                    }));
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button 
            className="submit-signoff-btn"
            onClick={submitNewSignoff}
            disabled={!newSignoff.title || !newSignoff.drawing}
          >
            Submit for Client Review
          </button>
        </div>
      </div>

      {/* SIGNOFF LIST */}
      <div className="signoffs-grid">
        {filteredSignoffs.map((signoff) => (
          <div 
            key={signoff.id}
            className="signoff-card"
            onClick={() => setSelectedSignoff(signoff)}
          >
            <div className="card-header">
              <div className="signoff-id">SO-{signoff.id.slice(-3)}</div>
              <div className={`status-badge ${signoff.status.toLowerCase().replace(' ', '-')}`}>
                {signoff.status}
              </div>
            </div>
            
            <h3 className="signoff-title">{signoff.title}</h3>
            <div className="signoff-drawing">{signoff.drawing}</div>
            
            <div className="signoff-meta">
              <span>Submitted: {signoff.submitted}</span>
              <span>{signoff.daysPending > 0 && `${signoff.daysPending}d pending`}</span>
            </div>
            
            <div className="approvers-list">
              {signoff.approvers.map(a => (
                <span key={a} className="approver">{a}</span>
              ))}
            </div>
            
            {signoff.comments.length > 0 && (
              <div className="comments-preview">
                <strong>{signoff.comments[0]}</strong>
                {signoff.comments.length > 1 && ` +${signoff.comments.length - 1} more`}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedSignoff && (
        <div className="signoff-modal-overlay" onClick={() => setSelectedSignoff(null)}>
          <div className="signoff-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSignoff.title}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedSignoff(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="status-section">
                <h4>Current Status</h4>
                <select 
                  value={selectedSignoff.status}
                  onChange={(e) => updateStatus(selectedSignoff.id, e.target.value)}
                  className="status-select"
                >
                  <option>Awaiting Client</option>
                  <option>Under Review</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>
              
              <div className="files-section">
                <h4>Files</h4>
                {selectedSignoff.files.map(file => (
                  <div key={file} className="file-item">
                    📄 {file} <button>Download</button>
                  </div>
                ))}
              </div>
              
              <div className="comments-section">
                <h4>Client Comments</h4>
                {selectedSignoff.comments.map((comment, i) => (
                  <div key={i} className="comment">
                    <div className="comment-text">{comment}</div>
                  </div>
                ))}
              </div>
              
              <div className="modal-actions">
                <button className="action-primary">Notify Approvers</button>
                <button className="action-secondary">Revise & Resubmit</button>
                <button className="action-link" onClick={() => navigate("/architect/designs")}>
                  Edit Drawings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectSignOff;