import { useMemo, useRef, useState } from "react";
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
    approvals: { mep: "pending", structural: "pending", pm: "pending" },
    description: "Ground floor plan for Tower A residential block.",
    revisions: [
      { id: "DWG-001", rev: "R1", stage: "Draft", status: "Pending", updated: "2026-01-15 10:00" },
      { id: "DWG-001", rev: "R2", stage: "Internal Review", status: "Pending", updated: "2026-01-17 14:30" },
      { id: "DWG-001", rev: "R3", stage: "Client Review", status: "Revision", updated: "2026-01-19 09:15" },
      { id: "DWG-001", rev: "R4", stage: "Internal Review", status: "Pending", updated: "2026-01-20 16:40" },
    ],
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
    approvals: { mep: "approved", structural: "approved", pm: "approved" },
    description: "Complete south elevation for tower cluster.",
    revisions: [
      { id: "DWG-002", rev: "R1", stage: "Draft", status: "Pending", updated: "2026-01-10 11:20" },
      { id: "DWG-002", rev: "R2", stage: "Client Review", status: "Approved", updated: "2026-01-12 15:45" },
    ],
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
    approvals: { mep: "approved", structural: "pending", pm: "pending" },
    description: "Typical core wall section at Levels 1–10.",
    revisions: [
      { id: "DWG-003", rev: "R1", stage: "Draft", status: "Revision", updated: "2026-01-08 09:10" },
    ],
  },
];

const emptyUploadForm = {
  file: null,
  name: "",
  project: "Skyline Heights",
  stage: "Draft",
  description: "",
  revision: "R1",
};

const getTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const normalizeFileName = (filename = "") =>
  filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

const sortRevisions = (revisions = []) =>
  [...revisions].sort((a, b) => {
    const ra = parseInt(a.rev?.replace("R", "") || "0", 10);
    const rb = parseInt(b.rev?.replace("R", "") || "0", 10);
    return ra - rb;
  });

export default function ArchitectDesigns() {
  const [designData, setDesignData] = useState(INITIAL_DESIGN_DATA);
  const [selectedId, setSelectedId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadHistory, setUploadHistory] = useState([]);
  const [revisionHistory, setRevisionHistory] = useState([]);

  const uploadFileRef = useRef(null);
  const revisionFileRef = useRef(null);

  const selected = useMemo(
    () => designData.find((item) => item.id === selectedId) || null,
    [designData, selectedId]
  );

  const canSendToPM =
    selected?.approvals?.mep === "approved" &&
    selected?.approvals?.structural === "approved";

  const filteredData = useMemo(() => {
    return designData.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());
      const matchesProject =
        projectFilter === "All Projects" || item.project === projectFilter;
      const matchesStatus =
        statusFilter === "All Status" || item.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [designData, search, projectFilter, statusFilter]);

  const resetUploadForm = () => {
    setUploadForm(emptyUploadForm);
    setUploadProgress(0);
    if (uploadFileRef.current) uploadFileRef.current.value = "";
  };

  const handleUploadFormChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "file") {
      const file = files?.[0];
      if (!file) return;

      setUploadForm((prev) => ({
        ...prev,
        file,
        name: normalizeFileName(file.name),
      }));
      return;
    }

    setUploadForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmUpload = () => {
    if (!uploadForm.file || !uploadForm.name) {
      alert("⚠️ Please select a file and enter design name!");
      return;
    }

    const timestamp = getTimestamp();
    const newId = `DWG-${Date.now().toString().slice(-4)}`;

    const newDesign = {
      id: newId,
      name: uploadForm.name,
      project: uploadForm.project,
      revision: uploadForm.revision,
      stage: uploadForm.stage,
      updated: timestamp,
      status: "Pending",
      description: uploadForm.description,
      coordination: { open: 0, clear: true },
      approvals: { mep: "pending", structural: "pending", pm: "pending" },
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

    setDesignData((prev) => [newDesign, ...prev]);
    setUploadHistory((prev) => [...prev, newDesign]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 8;
      setUploadProgress(Math.min(progress, 95));
      if (progress >= 95) clearInterval(interval);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadForm();
      }, 500);
    }, 1500);
  };

  const handleUploadCancel = () => {
    setShowUploadModal(false);
    resetUploadForm();
  };

  const handleUndoUpload = () => {
    if (uploadHistory.length === 0) {
      alert("No uploads to undo!");
      return;
    }

    const lastUpload = uploadHistory[uploadHistory.length - 1];
    setDesignData((prev) => prev.filter((item) => item.id !== lastUpload.id));
    setUploadHistory((prev) => prev.slice(0, -1));

    if (selectedId === lastUpload.id) setSelectedId(null);
    alert("↩ Last upload removed!");
  };

  const handleDeleteDrawing = () => {
    if (!selected) return alert("Select row!");

    if (window.confirm(`Delete "${selected.name}" (${selected.revision}) permanently?`)) {
      setDesignData((prev) => prev.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      alert("🗑️ Permanently deleted!");
    }
  };

  const handleNewRevisionClick = () => {
    if (!selected) {
      alert("Select drawing first");
      return;
    }
    revisionFileRef.current?.click();
  };

  const handleRevisionFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    const newRevNum = parseInt(selected.revision.slice(1), 10) + 1;
    const timestamp = getTimestamp();

    const previousState = {
      id: selected.id,
      oldRevision: selected.revision,
      oldStatus: selected.status,
      oldUpdated: selected.updated,
      oldStage: selected.stage,
    };

    setRevisionHistory((prev) => [...prev, previousState]);

    const updated = {
      ...selected,
      revision: `R${newRevNum}`,
      stage: "Draft",
      status: "Pending",
      updated: timestamp,
      coordination: { open: 0, clear: true },
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
      prev.map((item) => (item.id === selected.id ? updated : item))
    );

    setSelectedId(selected.id);
    e.target.value = "";
    alert(`✅ R${newRevNum} created!`);
  };

  const handleUndoLastRevision = () => {
    if (revisionHistory.length === 0) {
      alert("No revisions to cancel!");
      return;
    }

    const lastRev = revisionHistory[revisionHistory.length - 1];

    setDesignData((prev) =>
      prev.map((item) => {
        if (item.id !== lastRev.id) return item;
        const updatedRevisions = [...(item.revisions || [])];
        updatedRevisions.pop();
        return {
          ...item,
          revision: lastRev.oldRevision,
          status: lastRev.oldStatus,
          updated: lastRev.oldUpdated,
          stage: lastRev.oldStage,
          revisions: updatedRevisions,
        };
      })
    );

    setRevisionHistory((prev) => prev.slice(0, -1));
    alert("Latest revision removed successfully!");
  };

  const handleCancelSpecificRevision = (revToRemove) => {
    if (!selected) return;

    const updatedRevisions = (selected.revisions || []).filter(
      (rev) => rev.rev !== revToRemove
    );

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
      prev.map((item) => (item.id === selected.id ? updatedDrawing : item))
    );
    alert(`${revToRemove} removed successfully`);
  };

  const handleSendToPM = () => {
    if (!canSendToPM) return;
    setDesignData((prev) =>
      prev.map((item) =>
        item.id === selected.id
          ? { ...item, approvals: { ...item.approvals, pm: "approved" } }
          : item
      )
    );
    alert("Sent to Project Manager");
  };

  const updateRevisionStage = (revId, newStage) => {
    if (!selected) return;

    const updatedRevisions = (selected.revisions || []).map((rev) =>
      rev.rev === revId ? { ...rev, stage: newStage } : rev
    );

    const latest = updatedRevisions[updatedRevisions.length - 1];
    const updatedSelected = {
      ...selected,
      revisions: updatedRevisions,
      stage: latest?.stage || selected.stage,
    };

    setDesignData((prev) =>
      prev.map((item) => (item.id === selected.id ? updatedSelected : item))
    );
  };

  return (
    <div className="design-page">
      <div className="page-header">
        <div>
          <p className="page-subtitle">ARCHITECT DESIGN MANAGEMENT</p>
          <h1>The Designs</h1>
          <span className="record-count">
            {filteredData.length} of {designData.length}
          </span>
        </div>

        <div className="header-actions">
          <button className="secondary-btn" onClick={handleUndoUpload} disabled={uploadHistory.length === 0}>
            Undo Upload
          </button>
          <button className="secondary-btn" onClick={handleUndoLastRevision} disabled={revisionHistory.length === 0}>
            Undo Revision
          </button>
          <button className="primary-btn" onClick={() => setShowUploadModal(true)}>
            Upload
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-top"><span>Active Packages</span></div><h2>47</h2><div className="progress"><div className="progress-fill" style={{ width: "78%" }} /></div></div>
        <div className="stat-card"><div className="stat-top"><span>Pending Review</span><h2>18</h2><span className="badge orange">Urgent</span></div><div className="progress"><div className="progress-fill orange" style={{ width: "42%" }} /></div></div>
        <div className="stat-card"><div className="stat-top"><span>Revision Requests</span><h2>11</h2><span className="badge red">Open</span></div><div className="progress"><div className="progress-fill red" style={{ width: "65%" }} /></div></div>
        <div className="stat-card"><div className="stat-top"><span>Ready Sign-Off</span><h2>29</h2><span className="badge green">Approved</span></div><div className="progress"><div className="progress-fill green" style={{ width: "92%" }} /></div></div>
      </div>

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
                onClick={() => setSelectedId(item.id)}
                className={selected?.id === item.id ? "selected" : ""}
              >
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.project}</td>
                <td><span className="revision-badge">{item.revision}</span></td>
                <td>{item.stage}</td>
                <td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td>{item.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showUploadModal && (
        <div className="modal-overlay open" onClick={handleUploadCancel}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Upload New Drawing</h3>
              <button className="close-btn" onClick={handleUploadCancel}>✕</button>
            </div>

            <div className="modal-body">
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
                <select name="revision" value={uploadForm.revision} onChange={handleUploadFormChange}>
                  <option value="R1">R1</option>
                  <option value="R2">R2</option>
                  <option value="R3">R3</option>
                  <option value="R4">R4</option>
                  <option value="R5">R5</option>
                </select>
              </div>

              <div className="form-group">
                <label>Project</label>
                <select name="project" value={uploadForm.project} onChange={handleUploadFormChange}>
                  <option value="Skyline Heights">Skyline Heights</option>
                  <option value="Urban Crest">Urban Crest</option>
                  <option value="Marina Bay">Marina Bay</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stage</label>
                  <select name="stage" value={uploadForm.stage} onChange={handleUploadFormChange}>
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

              {uploadProgress > 0 && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p>{Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={handleUploadCancel}>Cancel</button>
              <button
                className={`primary-btn ${!uploadForm.file || !uploadForm.name ? "disabled" : ""}`}
                onClick={handleConfirmUpload}
                disabled={!uploadForm.file || !uploadForm.name}
              >
                Upload Drawing
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="drawer-overlay open" onClick={() => setSelectedId(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>{selected.name}</h2>
              <button className="close-btn" onClick={() => setSelectedId(null)}>✕</button>
            </div>

            <div className="drawer-body">
              <div className="detail-grid">
                <div className="detail-item"><span>ID:</span><strong>{selected.id}</strong></div>
                <div className="detail-item"><span>Project:</span><strong>{selected.project}</strong></div>
                <div className="detail-item"><span>Revision:</span><strong>{selected.revision}</strong></div>
                <div className="detail-item">
                  <span>Coordination:</span>
                  <strong className={selected.coordination?.clear ? "success" : "warning"}>
                    {selected.coordination?.clear ? "Clear" : `${selected.coordination?.open || 0}`}
                  </strong>
                </div>
              </div>

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
                  {sortRevisions(selected.revisions).map((r) => (
                    <tr key={`${r.id}-${r.rev}`}>
                      <td><span className="revision-badge">{r.rev}</span></td>
                      <td>
                        <select
                          value={r.stage}
                          onChange={(e) => updateRevisionStage(r.rev, e.target.value)}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Internal Review">Internal Review</option>
                          <option value="Client Review">Client Review</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </td>
                      <td><span className={`status ${String(r.status || "pending").toLowerCase()}`}>{r.status}</span></td>
                      <td>{r.updated}</td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        <button className="view-revision-btn" onClick={() => r.previewUrl && window.open(r.previewUrl, "_blank")}>
                          View
                        </button>
                        <button className="remove-revision-btn" onClick={() => handleCancelSpecificRevision(r.rev)}>
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
              <button className="secondary-btn danger" onClick={handleDeleteDrawing}>
                Delete
              </button>
              <button className="secondary-btn" onClick={handleNewRevisionClick}>
                New Revision Upload
              </button>
              <button
                className={`primary-btn ${canSendToPM ? "" : "disabled"}`}
                disabled={!canSendToPM}
                onClick={handleSendToPM}
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