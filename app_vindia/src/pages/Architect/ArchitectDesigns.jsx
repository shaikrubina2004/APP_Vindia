/* COMPLETE ArchitectDesigns.jsx - UPLOAD + REVISE + DELETE + UNDO + REVISION HISTORY */
import { useState, useRef } from "react";
import "./ArchitectDesigns.css";

const INITIAL_DESIGN_DATA = [
  {
  id: "DWG-001",
  name: "Tower A Ground Floor Plan",
  project: "Skyline Heights",
  
  revision: "R4",
  stage: "Internal Review",
  updated: "2 hrs ago",
  status: "Pending",
  coordination: { open: 0, clear: true },

  approvals: {
    mep: "pending",
    structural: "pending",
    pm: "pending"
  },

  description: "Ground floor plan for Tower A residential block.",
  revisions: [
    { id: "DWG-001", rev: "R1", stage: "Draft", status: "Pending", updated: "2026-01-15 10:00" },
    { id: "DWG-001", rev: "R2", stage: "Internal Review", status: "Pending", updated: "2026-01-17 14:30" },
    { id: "DWG-001", rev: "R3", stage: "Client Review", status: "Revision", updated: "2026-01-19 09:15" },
    { id: "DWG-001", rev: "R4", stage: "Internal Review", status: "Pending", updated: "2026-01-20 16:40" }
  ]
},
  {
    id: "DWG-002",
    name: "South Elevation Package",
    project: "Urban Crest",
    
    revision: "R2",
    stage: "Client Review",
    updated: "Yesterday",
    status: "Approved",
    coordination: { open: 2, clear: false },
    approvals: {
  mep: "approved",
  structural: "approved",
  pm: "approved"
},
    description: "Complete south elevation for tower cluster.",
    revisions: [
      { id: "DWG-002", rev: "R1", stage: "Draft", status: "Pending", updated: "2026-01-10 11:20" },
      { id: "DWG-002", rev: "R2", stage: "Client Review", status: "Approved", updated: "2026-01-12 15:45" }
    ]
  },
  {
    id: "DWG-003",
    name: "Core Wall Section",
    project: "Marina Bay",
    
    revision: "R1",
    stage: "Draft",
    updated: "3 days ago",
    status: "Revision",
    coordination: { open: 5, clear: false },
    approvals: {
  mep: "Approved",
  structural: "pending",
  pm: "pending"
},
    description: "Typical core wall section at Levels 1–10.",
    revisions: [
      { id: "DWG-003", rev: "R1", stage: "Draft", status: "Revision", updated: "2026-01-08 09:10" }
    ]
  }
];

export default function ArchitectDesigns() {
  // MAIN STATE
  const [designData, setDesignData] = useState(INITIAL_DESIGN_DATA);
  const [selected, setSelected] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // FILTERS
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // UNDO STATE
  const [uploadHistory, setUploadHistory] = useState([]);
  const [revisionHistory, setRevisionHistory] = useState([]);
  const canSendToPM =
  selected?.approvals?.mep === "approved" &&
  selected?.approvals?.structural === "approved";
  // UPLOAD FORM STATE
  const [uploadForm, setUploadForm] = useState({
  file: null,
  name: "",
  project: "Skyline Heights",
  stage: "Draft",
  description: "",
  revision: "R1"   // 👈 ADD THIS
});
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadFileRef = useRef(null);
const revisionFileRef = useRef(null);

  // FILTERED DATA
  const filteredData = designData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "All Projects" || item.project === projectFilter;
    const matchesStatus = statusFilter === "All Status" || item.status === statusFilter;
    return matchesSearch && matchesProject && matchesStatus;
  });

  // HANDLE UPLOAD FORM CHANGES
  const handleUploadFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      const file = files[0];
      if (file) {
        setUploadForm((prev) => ({
          ...prev,
          file,
          name: file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        }));
      }
    } else {
      setUploadForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // UPLOAD CONFIRM - CREATE NEW DESIGN
 const handleConfirmUpload = () => {
  if (!uploadForm.file || !uploadForm.name) {
    alert("⚠️ Please select a file and enter design name!");
    return;
  }

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const newId = `DWG-${Date.now().toString().slice(-4)}`;

  const newDesign = {
    id: newId,
    name: uploadForm.name,
    project: uploadForm.project,
    approvals: {
  mep: "pending",
  structural: "pending",
  pm: "pending"
},
    revision: uploadForm.revision,
    stage: uploadForm.stage,
    updated: timestamp,
    status: "Pending",
    description: uploadForm.description,
    coordination: { open: 0, clear: true },

    revisions: [
      {
        id: newId,
        rev: uploadForm.revision,
        stage: uploadForm.stage,
        status: "Pending",
        updated: timestamp,
        file: uploadForm.file,
        previewUrl: URL.createObjectURL(uploadForm.file),
      },
    ],
  };

  // ADD TO TABLE
  setDesignData((prev) => [newDesign, ...prev]);

  // STORE FOR UNDO
  setUploadHistory((prev) => [...prev, newDesign]);

  // PROGRESS
  let progress = 0;

  const interval = setInterval(() => {
    progress += 8;
    setUploadProgress(Math.min(progress, 95));

    if (progress >= 95) clearInterval(interval);
  }, 100);

  setTimeout(() => {
    setUploadProgress(100);

    setTimeout(() => {
      setShowUploadModal(false);

      setUploadForm({
        file: null,
        name: "",
        project: "Skyline Heights",
        
        stage: "Draft",
        description: "",
        revision: "R1",
      });

      setUploadProgress(0);

      if (uploadFileRef.current) {
        uploadFileRef.current.value = "";
      }
    }, 800);
  }, 1800);
};

  // CANCEL UPLOAD
  const handleUploadCancel = () => {
    setShowUploadModal(false);
    setUploadForm({
      file: null,
      name: "",
      project: "Skyline Heights",
      stage: "Draft",
      description: "",
    });
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // NEW REVISION ✅ WITH REVISION HISTORY
  const handleNewRevision = () => {
     if (!selected) return alert("Select drawing first");

  // trigger file upload for new revision
  fileInputRef.current.click();

    const oldRevision = selected.revision;
    const oldStatus = selected.status;
    const newRevNum = parseInt(selected.revision.slice(1)) + 1;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Track OLD state for CANCEL REVISION
    setRevisionHistory((prev) => [
      ...prev,
      {
        id: selected.id,
        oldRevision,
        oldStatus,
        oldUpdated: selected.updated,
      },
    ]);

    // CREATE NEW REVISION
    setDesignData((prevData) =>
      prevData.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              revision: `R${newRevNum}`,
              stage: "Draft",
              updated: timestamp,
              status: "Pending",
              coordination: { open: 0, clear: true },
              // Append new revision to revisions array
              revisions: [
                ...(item.revisions || []),
                {
                  id: item.id,
                  rev: `R${newRevNum}`,
                  stage: "Draft",
                  status: "Pending",
                  updated: timestamp,
                },
              ],
            }
          : item
      )
    );

    setSelected((prev) => ({
      ...prev,
      revision: `R${newRevNum}`,
      stage: "Draft",
      updated: timestamp,
      status: "Pending",
      coordination: { open: 0, clear: true },
      revisions: [
        ...(prev.revisions || []),
        {
          id: prev.id,
          rev: `R${newRevNum}`,
          stage: "Draft",
          status: "Pending",
          updated: timestamp,
        },
      ],
    }));

    alert(`✅ R${newRevNum} created! (Undo Revision available)`);
  };

  const handleCancelRevision = () => {
  if (revisionHistory.length === 0) {
    alert("No revisions to cancel!");
    return;
  }

  const lastRev = revisionHistory[revisionHistory.length - 1];

  setDesignData((prevData) =>
    prevData.map((item) => {
      if (item.id !== lastRev.id) return item;

      // Remove latest revision from revisions array
      const updatedRevisions = [...(item.revisions || [])];
      updatedRevisions.pop();

      return {
        ...item,
        revision: lastRev.oldRevision,
        status: lastRev.oldStatus,
        updated: lastRev.oldUpdated,
        revisions: updatedRevisions,
      };
    })
  );

  // Update selected drawer data
  if (selected?.id === lastRev.id) {
    const updatedRevisions = [...(selected.revisions || [])];
    updatedRevisions.pop();

    setSelected({
      ...selected,
      revision: lastRev.oldRevision,
      status: lastRev.oldStatus,
      updated: lastRev.oldUpdated,
      revisions: updatedRevisions,
    });
  }

  // Remove undo history
  setRevisionHistory((prev) => prev.slice(0, -1));

  alert(" Latest revision removed successfully!");
};
const handleCancelSpecificRevision = (revToRemove) => {
  if (!selected) return;

  const updatedRevisions = selected.revisions.filter(
    (rev) => rev.rev !== revToRemove
  );

  // Get latest remaining revision
  const latestRevision = updatedRevisions[updatedRevisions.length - 1];

  const updatedDrawing = {
    ...selected,
    revisions: updatedRevisions,
    revision: latestRevision ? latestRevision.rev : "R1",
    stage: latestRevision ? latestRevision.stage : "Draft",
    status: latestRevision ? latestRevision.status : "Pending",
    updated: latestRevision ? latestRevision.updated : selected.updated,
  };

  setDesignData((prev) =>
    prev.map((item) =>
      item.id === selected.id ? updatedDrawing : item
    )
  );

  setSelected(updatedDrawing);

  alert(`${revToRemove} removed successfully`);
};
  // UNDO UPLOAD
  const handleUndoUpload = () => {
    if (uploadHistory.length === 0) return alert("No uploads to undo!");

    const lastUpload = uploadHistory[uploadHistory.length - 1];
    setDesignData((prev) => prev.filter((item) => item.id !== lastUpload.id));
    setUploadHistory((prev) => prev.slice(0, -1));
    alert("↩ Last upload removed!");
  };

  // DELETE PERMANENT
  const handleDeleteDrawing = () => {
    if (!selected) return alert("Select row!");
    if (confirm(`Delete "${selected.name}" (${selected.revision}) permanently?`)) {
      setDesignData((prev) => prev.filter((item) => item.id !== selected.id));
      setSelected(null);
      alert("🗑️ Permanently deleted!");
    }
  };

  // SIGN OFF
  const handleSignOff = () => {
    if (selected?.coordination?.clear) {
      alert(`✅ ${selected.name} → Sign-Off page!`);
      setSelected(null);
    } else {
      alert(`⚠️ Fix ${selected.coordination?.open || 0} issues first!`);
    }
  };
  // NEW REVISION FILE UPLOAD (ADD THIS INSIDE COMPONENT)
const handleRevisionFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file || !selected) return;

  const newRevNum = parseInt(selected.revision.slice(1)) + 1;
  const timestamp = new Date().toLocaleTimeString();

  const updated = {
    ...selected,
    revision: `R${newRevNum}`,
    stage: "Draft",
    status: "Pending",
    updated: timestamp,
    coordination: { open: 0, clear: true },

    // KEEP OLD + ADD NEW REVISION (IMPORTANT)
    revisions: [
      ...(selected.revisions || []),
      {
        id: selected.id,
        rev: `R${newRevNum}`,
        stage: "Draft",
        status: "Pending",
        updated: timestamp,
        file,
        previewUrl: URL.createObjectURL(file),
      },
    ],
  };

  setDesignData((prev) =>
    prev.map((item) =>
      item.id === selected.id ? updated : item
    )
  );

  setSelected(updated);

  e.target.value = "";
};

  return (
    <div className="design-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <p className="page-subtitle">ARCHITECT DESIGN MANAGEMENT</p>
          <h1>The Designs</h1>
          <span className="record-count">{filteredData.length} of {designData.length}</span>
        </div>
        <div className="header-actions">
          <button
            className="secondary-btn"
            onClick={handleUndoUpload}
            disabled={uploadHistory.length === 0}
          >
             Undo Upload
          </button>
          <button
            className="primary-btn"
            onClick={() => setShowUploadModal(true)}
          >
             Upload
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Active Packages</span>
            
          </div>
          <h2>47</h2>
          <div className="progress">
            <div className="progress-fill" style={{ width: "78%" }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Pending Review</span>
            <h2>18</h2>
            <span className="badge orange">Urgent</span>
          </div>
          
          <div className="progress">
            <div className="progress-fill orange" style={{ width: "42%" }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Revision Requests</span>
            <h2>11</h2>
            <span className="badge red">Open</span>
          </div>
          
          <div className="progress">
            <div className="progress-fill red" style={{ width: "65%" }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Ready Sign-Off</span>
             <h2>29</h2>
            <span className="badge green">Approved</span>
          </div>
         
          <div className="progress">
            <div className="progress-fill green" style={{ width: "92%" }} />
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <input
          placeholder="🔍 Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option>All Projects</option>
          <option>Skyline Heights</option>
          <option>Urban Crest</option>
          <option>Marina Bay</option>
        </select>
      
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Revision</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Project</th>
              
              <th>Rev</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className={selected?.id === item.id ? "selected" : ""}
              >
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.project}</td>
                
                <td>
                  <span className="revision-badge">{item.revision}</span>
                </td>
                <td>{item.stage}</td>
                <td>
                  <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                </td>
                <td>{item.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay open" onClick={handleUploadCancel}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Upload New Drawing</h3>
              <button className="close-btn" onClick={handleUploadCancel}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* FILE UPLOAD */}
              <div className="form-group">
                <label>Drawing File <span className="required">*</span></label>
                <label className="file-input-label">
                  <input
                    ref={uploadFileRef}
                    type="file"
                    name="file"
                    accept=".dwg,.pdf,.rvt,.dwf,.dxf"
                    onChange={handleUploadFormChange}
                    className="file-input"
                  />
                  <div className="file-dropzone">
                    {uploadForm.file ? `✅ ${uploadForm.file.name}` : "Click or drag DWG/PDF/RVT files"}
                  </div>
                </label>
              </div>

              {/* DESIGN NAME */}
              <div className="form-group">
                <label>Design Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={uploadForm.name}
                  onChange={handleUploadFormChange}
                  placeholder="e.g., Tower B First Floor Plan"
                />
              </div>
              <div className="form-group">
  <label>Revision</label>
  <select
    name="revision"
    value={uploadForm.revision}
    onChange={handleUploadFormChange}
  >
    <option value="R1">R1</option>
    <option value="R2">R2</option>
    <option value="R3">R3</option>
    <option value="R4">R4</option>
    <option value="R5">R5</option>
  </select>
</div>

              {/* PROJECT */}
<div className="form-group">
  <label>Project</label>
  <select
    name="project"
    value={uploadForm.project}
    onChange={handleUploadFormChange}
  >
    <option value="Skyline Heights">Skyline Heights</option>
    <option value="Urban Crest">Urban Crest</option>
    <option value="Marina Bay">Marina Bay</option>
  </select>
</div>

{/* DISCIPLINE */}

              {/* STAGE & DESCRIPTION */}
              <div className="form-row">
                <div className="form-group">
                  <label>Stage</label>
                  <select
                    name="stage"
                    value={uploadForm.stage}
                    onChange={handleUploadFormChange}
                  >
                    <option>Draft</option>
                    <option>Internal Review</option>
                    <option>Client Review</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={uploadForm.description}
                    onChange={handleUploadFormChange}
                    placeholder="Brief description of this drawing..."
                    rows="2"
                  />
                </div>
              </div>

              {/* PROGRESS */}
              {uploadProgress > 0 && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p>{Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={handleUploadCancel}>
                Cancel
              </button>
              <button
                className={`primary-btn ${!uploadForm.file || !uploadForm.name ? 'disabled' : ''}`}
                onClick={handleConfirmUpload}
                disabled={!uploadForm.file || !uploadForm.name}
              >
                Upload Drawing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER */}
      {selected && (
        <div className="drawer-overlay open" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>{selected.name}</h2>
              <button className="close-btn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span>ID:</span>
                  <strong>{selected.id}</strong>
                </div>
                <div className="detail-item">
                  <span>Project:</span>
                  <strong>{selected.project}</strong>
                </div>
                
                <div className="detail-item">
                  <span>Revision:</span>
                  <strong>{selected.revision}</strong>
                </div>
               
                <div className="detail-item">
                  <span>Coordination:</span>
                  <strong
                    className={selected.coordination.clear ? 'success' : 'warning'}
                  >
                    {selected.coordination.clear
                      ? 'Clear'
                      : `${selected.coordination.open}`}
                  </strong>
                </div>
              </div>

              {/* REVISION HISTORY TABLE */}
              <div className="section-title">Revision History</div>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th>Rev</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.revisions &&
                    selected.revisions
                      .sort((a, b) => {
                        const rA = parseInt(a.rev.slice(1));
                        const rB = parseInt(b.rev.slice(1));
                        return rA - rB;
                      })
                      .map((r) => (
                        <tr key={r.rev}>
                          <td>
                            <span className="revision-badge">{r.rev}</span>
                          </td>
                          <td>
  <select
    value={r.stage}
    onChange={(e) => {
      const newStage = e.target.value;

      setSelected((prev) => {
        const updatedRevisions = prev.revisions.map((rev) =>
          rev.rev === r.rev
            ? { ...rev, stage: newStage }
            : rev
        );

        const latest = updatedRevisions[updatedRevisions.length - 1];

        const updatedSelected = {
          ...prev,
          revisions: updatedRevisions,
          stage: latest?.stage || prev.stage,
        };

        setDesignData((data) =>
          data.map((item) =>
            item.id === prev.id ? updatedSelected : item
          )
        );

        return updatedSelected;
      });
    }}
  >
    <option value="Draft">Draft</option>
    <option value="Internal Review">Internal Review</option>
    <option value="Client Review">Client Review</option>
    <option value="Approved">Approved</option>
  </select>
</td>
                          <td>
                            <span
                              className={`status ${r.status.toLowerCase()}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td>{r.updated}</td>
                       <td style={{ display: "flex", gap: "8px" }}>
  <button
    className="view-revision-btn"
    onClick={() => window.open(r.previewUrl, "_blank")}
  >
    View
  </button>

  <button
    className="remove-revision-btn"
    onClick={() => handleCancelSpecificRevision(r.rev)}
  >
    Remove
  </button>
</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            <div className="drawer-footer">
              <input
  type="file"
  ref={revisionFileRef}
  style={{ display: "none" }}
  onChange={handleRevisionFileUpload}
/>
              
              <button
                className="secondary-btn danger"
                onClick={handleDeleteDrawing}
              >
                 Delete 
              </button>
              <button
  className="secondary-btn"
  onClick={() => revisionFileRef.current.click()}
>
  New Revision Upload
</button>
            <button
  className={`primary-btn ${canSendToPM ? '' : 'disabled'}`}
  disabled={!canSendToPM}
  onClick={() => {
    setSelected((prev) => ({
      ...prev,
      approvals: {
        ...prev.approvals,
        pm: "approved"
      }
    }));
    alert("Sent to Project Manager");
  }}
>
  {canSendToPM ? "Send to PM" : "Waiting for MEP + Structural"}
</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}