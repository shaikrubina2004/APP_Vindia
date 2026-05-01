import React, { useEffect, useMemo, useRef, useState, useReducer } from "react";
import ReactDOM from "react-dom";
import "./ArchitectDesigns.css";
import { getArchitectProjects } from "../../services/architectprojectService";
import {
  getDrawingsByProject,
  createDrawing,
} from "../../services/architectDesignService";
const DRAWING_TYPES = ["Working Drawing", "Detailed Drawing"];
const STATUSES = ["Pending", "Approved", "Rejected", "Accepted"];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();
const fmt = (v) => (v ? new Date(v).toLocaleString() : "—");
const pretty = (f) => f.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
const badgeClass = (v) => `chip chip-${String(v).toLowerCase().replace(/\s+/g, "-")}`;
const displayStage = (d) => (d?.status === "Approved" ? "Fully Approved" : d?.stage || "—");

const emptyNode = () => ({
  state: "pending",
  sentAt: null,
  returnedAt: null,
  approvedAt: null,
  sentBy: "",
  note: "",
  revision: "",
});

const emptyWorkflow = () => ({
  qs: emptyNode(),
  site: emptyNode(),
  pm: emptyNode(),
  client: emptyNode(),
});

const makeDrawing = ({
  id,
  project,
  name,
  drawingType,
  revision,
  stage = "Draft",
  status = "Pending",
  description = "",
  fileName = "",
  previewUrl = "",
}) => ({
  id,
  project,
  name,
  drawingType,
  revision,
  stage,
  status,
  description,
  fileName,
  previewUrl,
  createdAt: now(),
  updated: now(),
  approvedRevision: "",
  workflow: emptyWorkflow(),
  history: [
    {
      rev: revision,
      stage,
      status,
      updated: now(),
      previewUrl,
      note: description || "Initial upload",
    },
  ],
  actionLog: [
    {
      ts: now(),
      action: "Created",
      stage: "—",
      note: description || "Drawing created",
    },
  ],
});

const STAGE_LABELS = {
  qs: "Quantity Surveyor",
  site: "Site Engineer",
  pm: "Project Manager",
  client: "Client",
};

const stageOrderFor = () => ["qs", "site", "pm", "client"];

const stageActions = (d, step) => {
  const w = d.workflow || {};
  const node = w[step] || emptyNode();
  const isDetailed = d.drawingType === "Detailed Drawing";

  return {
    canSend: isDetailed ? node.state === "pending" : step === "qs" ? node.state === "pending" : w.qs.state === "sent" && node.state === "pending",
    canApprove: step === "client" && node.state === "sent",
    canReject: step === "client" && node.state === "sent",
    canReturn: false,
    canView: node.state !== "pending",
  };
};

const initialState = {
  projects: [],
  selectedProjectId: "",
  selectedDrawingId: "",
  search: "",
  projectFilter: "All",
  statusFilter: "All",
  modal: null,
  toast: null,
  uploadForm: {
    file: null,
    project: "",
    projectStatus: "Pending",
    drawingName: "",
    drawingType: "Working Drawing",
    revision: "R1",
    previewUrl: "",
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "SET":
      return { ...state, [action.field]: action.value };
    case "OPEN_MODAL":
      return {
        ...state,
        modal: action.modal,
        selectedProjectId: action.projectId || state.selectedProjectId,
        selectedDrawingId: action.drawingId || state.selectedDrawingId,
      };
    case "CLOSE_MODAL":
      return { ...state, modal: null };
    case "BACK_TO_LIST":
      return { ...state, modal: "project" };
    case "SET_TOAST":
      return { ...state, toast: { id: uid(), ...action.toast } };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "SET_UPLOAD_FORM":
      return { ...state, uploadForm: { ...state.uploadForm, [action.field]: action.value } };
    case "RESET_UPLOAD":
      return {
        ...state,
        uploadForm: {
          file: null,
          project: "",
          projectStatus: "Pending",
          drawingName: "",
          drawingType: "Working Drawing",
          revision: "R1",
          previewUrl: "",
        },
      };
    case "ADD_DRAWING": {
      const exists = state.projects.some((p) => p.name === action.projectName);
      const projects = exists
        ? state.projects.map((p) =>
            p.name !== action.projectName ? p : { ...p, drawings: [action.drawing, ...p.drawings], status: action.projectStatus || p.status }
          )
        : [
            ...state.projects,
            {
              id: `PRJ-${String(state.projects.length + 1).padStart(3, "0")}`,
              name: action.projectName,
              status: action.projectStatus || "Pending",
              drawings: [action.drawing],
            },
          ];
      const project = projects.find((p) => p.name === action.projectName);
      return {
        ...state,
        projects,
        selectedProjectId: project?.id || state.selectedProjectId,
        selectedDrawingId: action.drawing.id,
        modal: "project",
      };
    }
    case "UPDATE_DRAWING": {
      const projects = state.projects.map((p) =>
        p.id !== action.projectId ? p : { ...p, drawings: p.drawings.map((d) => (d.id === action.drawing.id ? action.drawing : d)) }
      );
      const updatedProjects = projects.map((p) => {
        if (p.id !== action.projectId) return p;
        const anyApproved = p.drawings.some((d) => d.status === "Approved");
        return { ...p, status: anyApproved ? "Accepted" : p.status };
      });
      return {
        ...state,
        projects: updatedProjects,
        selectedProjectId: action.projectId,
        selectedDrawingId: action.drawing.id,
      };
    }
    case "DELETE_DRAWING": {
      const projects = state.projects.map((p) =>
        p.id !== action.projectId ? p : { ...p, drawings: p.drawings.filter((d) => d.id !== action.drawingId) }
      );
      return {
        ...state,
        projects,
        selectedProjectId: action.projectId,
        selectedDrawingId: "",
      };
    }
    case "SELECT_PROJECT":
      return {
        ...state,
        selectedProjectId: action.projectId,
        selectedDrawingId: action.drawingId || state.selectedDrawingId,
        modal: "project",
      };
    case "SELECT_DRAWING":
      return {
        ...state,
        selectedProjectId: action.projectId,
        selectedDrawingId: action.drawingId,
        modal: "drawing",
      };
    default:
      return state;
  }
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card${accent ? " stat-card--accent" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Modal({ title, subtitle = "", wide = false, small = false, onClose, children, footer }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal${wide ? " modal-wide" : small ? " modal-medium" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <div>
            <h3 id="modal-title" className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return ReactDOM.createPortal(
    <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
    document.body
  );
}

function WorkflowStageCard({ drawing, step, onAction }) {
  const node = drawing.workflow[step] || emptyNode();
  const actions = stageActions(drawing, step);
  const label = STAGE_LABELS[step];

  return (
    <div className={`wf-stage wf-stage--${node.state}`}>
      <div className="wf-stage-head">
        <div className="wf-stage-head-left">
          <strong className="wf-stage-label">{label}</strong>
        </div>
        <span className={`chip chip-${node.state}`}>{node.state}</span>
      </div>
      <div className="wf-stage-actions">
        {actions.canSend && <button className="btn btn--info btn--sm" onClick={() => onAction(step, "send")}>↑ Send</button>}
        {actions.canApprove && <button className="btn btn--success btn--sm" onClick={() => onAction(step, "approve")}>✓ Approve</button>}
        {actions.canReject && <button className="btn btn--danger btn--sm" onClick={() => onAction(step, "reject")}>✕ Reject</button>}
      </div>
    </div>
  );
}

function AddDrawingModal({ project, onClose, onAdd, toastFn, user }) {
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Working Drawing");
  const [revision, setRevision] = useState("R1");
  const [file, setFile] = useState(null);
  const createdUrls = useRef([]);

  useEffect(() => () => createdUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onFileChange = (f) => {
    if (!f) return;
    if (!name.trim()) setName(pretty(f.name) || "Untitled Drawing");
    setFile(f);
    if (fileRef.current) fileRef.current.value = "";
  };

const handleAdd = async () => {
  if (!name.trim()) return toastFn("error", "Enter drawing name");
  if (!revision.trim()) return toastFn("error", "Enter revision");
  if (!file) return toastFn("error", "Select file");

  try {
    await createDrawing({
      id: `DWG-${Date.now()}`,
      project_id: project.id,
      name,
      drawing_type: type,
      current_revision: revision,
     
created_by: user?.id || null,reated_by: 1, // or user.id
      file_name: file.name,
      file_url: "dummy-url"
    });

    toastFn("success", "Saved to DB ✅");
    onClose();

  } catch (err) {
    console.error(err);
    toastFn("error", "Failed to save");
  }
};

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal modal-medium" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3 className="modal-title">Add Drawing</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-field full">
              <label className="form-label">Drawing Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Structural Plan" />
            </div>
            <div className="form-field full">
              <label className="form-label">Drawing Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {DRAWING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field full">
              <label className="form-label">Revision</label>
              <input className="input" value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="e.g. R1" />
            </div>
            <div className="form-field full">
              <label className="form-label">File</label>
              <input ref={fileRef} type="file" accept="*/*" className="hidden-file" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
              <div className="upload-file-row">
                <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>Choose File</button>
                {file && <span className="muted file-name">{file.name}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleAdd}>Add Drawing</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ArchitecturalDrawingManagementSystem() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const globalUploadRef = useRef(null);
  const createdUrlsRef = useRef([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

useEffect(() => {
  if (!user?.id) return;

  const loadProjects = async () => {
    try {
      const res = await getArchitectProjects(user.id);
      const projects = res?.data || res || [];

      const formatted = await Promise.all(
        projects.map(async (p) => {
          const drawingsRes = await getDrawingsByProject(p.id);

          return {
            id: p.id,
            name: p.name,
            status: p.status || "Pending",
            drawings: drawingsRes.data || []
          };
        })
      );

      dispatch({ type: "SET", field: "projects", value: formatted });

    } catch (err) {
      console.error(err);
    }
  };

  loadProjects();
}, [user?.id]);

  useEffect(() => () => createdUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3500);
    return () => clearTimeout(t);
  }, [state.toast]);

  const selectedProject = useMemo(() => state.projects.find((p) => p.id === state.selectedProjectId) || null, [state.projects, state.selectedProjectId]);
  const selectedDrawing = useMemo(() => selectedProject?.drawings.find((d) => d.id === state.selectedDrawingId) || selectedProject?.drawings[0] || null, [selectedProject, state.selectedDrawingId]);

  const filteredProjects = useMemo(
    () =>
      state.projects.filter((p) => {
        const q = state.search.trim().toLowerCase();
        return (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
          (state.projectFilter === "All" || p.name === state.projectFilter) &&
          (state.statusFilter === "All" || p.status === state.statusFilter);
      }),
    [state.projects, state.search, state.projectFilter, state.statusFilter]
  );

  const stats = useMemo(
    () => ({
      totalProjects: state.projects.length,
      totalDrawings: state.projects.reduce((s, p) => s + p.drawings.length, 0),
      pending: state.projects.reduce((s, p) => s + p.drawings.filter((d) => d.status === "Pending").length, 0),
      rejected: state.projects.reduce((s, p) => s + p.drawings.filter((d) => d.status === "Rejected").length, 0),
      approved: state.projects.reduce((s, p) => s + p.drawings.filter((d) => d.status === "Approved").length, 0),
    }),
    [state.projects]
  );

  const toast = (type, message) => dispatch({ type: "SET_TOAST", toast: { type, message } });
  const closeModal = () => {
    dispatch({ type: "CLOSE_MODAL" });
    setShowAddModal(false);
  };
  const openProject = (id) => dispatch({ type: "SELECT_PROJECT", projectId: id });
  const openDrawing = (pid, did) => dispatch({ type: "SELECT_DRAWING", projectId: pid, drawingId: did });

  const onGlobalFileChange = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    createdUrlsRef.current.push(previewUrl);
    dispatch({ type: "SET_UPLOAD_FORM", field: "file", value: file });
    dispatch({ type: "SET_UPLOAD_FORM", field: "previewUrl", value: previewUrl });
    if (!state.uploadForm.drawingName) {
      dispatch({ type: "SET_UPLOAD_FORM", field: "drawingName", value: pretty(file.name) || "Untitled Drawing" });
    }
    if (globalUploadRef.current) globalUploadRef.current.value = "";
  };

  const handleWorkflowAction = (step, actionType) => {
    if (!selectedDrawing || !selectedProject) return;
    const next = structuredClone(selectedDrawing);
    const node = next.workflow[step];

    if (actionType === "send") {
      node.state = "sent";
      node.sentAt = now();
      node.sentBy = user?.name || "Unknown";
      node.note = `Sent to ${STAGE_LABELS[step]}`;
      next.stage = `${STAGE_LABELS[step]} Review`;
      next.status = "Pending";
    }

    if (actionType === "approve") {
      node.state = "approved";
      node.approvedAt = now();
      node.note = `Approved by ${STAGE_LABELS[step]}`;

      if (step === "client") {
        next.status = "Approved";
        next.stage = "Fully Approved";
        next.approvedRevision = next.revision;
      } else if (next.drawingType === "Working Drawing") {
        const order = stageOrderFor(next);
        const currentIndex = order.indexOf(step);
        const nextStep = order[currentIndex + 1];
        if (nextStep) {
          const nextNode = next.workflow[nextStep];
          nextNode.state = "sent";
          nextNode.sentAt = now();
          nextNode.sentBy = STAGE_LABELS[step];
          nextNode.note = `Auto-sent from ${STAGE_LABELS[step]}`;
          next.stage = `${STAGE_LABELS[nextStep]} Review`;
          next.status = "Pending";
        } else {
          next.status = "Approved";
          next.approvedRevision = next.revision;
          next.stage = "Fully Approved";
        }
      } else {
        next.status = "Pending";
        next.stage = `${STAGE_LABELS[step]} Approved`;
      }
    }

    if (actionType === "reject") {
      node.state = "rejected";
      node.returnedAt = now();
      node.note = `Rejected by ${STAGE_LABELS[step]}`;
      next.status = "Rejected";
      next.stage = `${STAGE_LABELS[step]} Rejected`;
    }

    next.updated = now();
    next.actionLog = [{ ts: now(), action: actionType.toUpperCase(), stage: step, note: `${STAGE_LABELS[step] || step} — ${actionType}` }, ...next.actionLog];
    dispatch({ type: "UPDATE_DRAWING", projectId: selectedProject.id, drawing: next });
    toast("success", `${STAGE_LABELS[step] || step} — ${actionType} recorded.`);
  };

  const handleGlobalUpload = () => {
    const { file, project, projectStatus, drawingName, drawingType, revision, previewUrl } = state.uploadForm;
    if (!project) return toast("error", "Select a project.");
    if (!drawingName.trim()) return toast("error", "Enter a drawing name.");
    if (!revision.trim()) return toast("error", "Enter a revision.");
    if (!file) return toast("error", "Please choose a file.");

    const allDrawings = state.projects.flatMap((p) => p.drawings);
    const drawing = makeDrawing({
      id: `DWG-${String(allDrawings.length + 1).padStart(3, "0")}`,
      project,
      name: drawingName.trim(),
      drawingType,
      revision: revision.trim(),
      stage: "Draft",
      status: "Pending",
      fileName: file.name,
      previewUrl,
    });

    dispatch({ type: "ADD_DRAWING", projectName: project, projectStatus, drawing });
    dispatch({ type: "RESET_UPLOAD" });
    closeModal();
    toast("success", `"${drawingName}" uploaded.`);
  };

  const removeDrawing = (projectId, drawingId) => {
    dispatch({ type: "DELETE_DRAWING", projectId, drawingId });
    toast("info", "Drawing removed.");
  };

  const handleAddDrawing = (projectName, projectStatus, drawing, revision) => {
    dispatch({ type: "ADD_DRAWING", projectName, projectStatus, drawing });
    setShowAddModal(false);
    toast("success", `Drawing added — revision ${revision}.`);
  };

  return (
    <div className="page">
      <Toast toast={state.toast} onClose={() => dispatch({ type: "CLEAR_TOAST" })} />
      <input ref={globalUploadRef} type="file" accept="*/*" className="hidden-file" onChange={(e) => onGlobalFileChange(e.target.files?.[0] || null)} />

      <header className="header">
        <div className="header-text">
          <h1 className="header-title">Drawing Management System</h1>
          <p className="header-sub">QS · Site · PM · Client</p>
        </div>
        <div className="header-actions">
          <button className="btn btn--ghost" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "approved" })}>Approved Projects</button>
          <button className="btn btn--primary" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "upload" })}>+ Upload Drawing</button>
        </div>
      </header>

      <div className="stats-row">
        <StatCard label="Total Projects" value={stats.totalProjects} />
        <StatCard label="Total Drawings" value={stats.totalDrawings} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Rejected" value={stats.rejected} />
        <StatCard label="Approved" value={stats.approved} accent />
      </div>

      <div className="filters">
        <input className="input filters-search" placeholder="Search project…" value={state.search} onChange={(e) => dispatch({ type: "SET", field: "search", value: e.target.value })} />
        <select className="input filters-select" value={state.projectFilter} onChange={(e) => dispatch({ type: "SET", field: "projectFilter", value: e.target.value })}>
          <option value="All">All Projects</option>
          {assignedProjects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <select className="input filters-select" value={state.statusFilter} onChange={(e) => dispatch({ type: "SET", field: "statusFilter", value: e.target.value })}>
          <option value="All">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Project ID</th>
              <th>Project Name</th>
              <th>Status</th>
              <th>Drawings</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Rejected</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No projects found.</td></tr>
            ) : (
              filteredProjects.map((project) => {
                const approved = project.drawings.filter((d) => d.status === "Approved").length;
                const pending = project.drawings.filter((d) => d.status === "Pending").length;
                const rejected = project.drawings.filter((d) => d.status === "Rejected").length;
                return (
                  <tr key={project.id} className={`${state.selectedProjectId === project.id ? "row--selected" : ""} ${project.status === "Accepted" ? "row--approved" : ""}`} onClick={() => openProject(project.id)} style={{ cursor: "pointer" }}>
                    <td className="cell-mono muted">{project.id}</td>
                    <td><strong>{project.name}</strong></td>
                    <td><span className={badgeClass(project.status)}>{project.status}</span></td>
                    <td>{project.drawings.length}</td>
                    <td>{approved}</td>
                    <td>{pending}</td>
                    <td>{rejected}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {state.modal === "project" && selectedProject && (
        <Modal title={`Project: ${selectedProject.name}`} onClose={closeModal} small>
          <div className="project-meta-bar">
            <span className="cell-mono muted">{selectedProject.id}</span>
            <span>
              Status: <span className={badgeClass(selectedProject.status)}>{selectedProject.status}</span>
            </span>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddModal(true)}>+ Add Drawing</button>
          </div>
          <p className="section-title">Drawings</p>
          {selectedProject.drawings.length === 0 ? (
            <div className="empty-box">No drawings yet — click "+ Add Drawing" above.</div>
          ) : (
            <div className="drawing-grid">
              {selectedProject.drawings.map((drawing) => (
                <div key={drawing.id} className={`drawing-card${selectedDrawing?.id === drawing.id ? " drawing-card--active" : ""}`} onClick={() => openDrawing(selectedProject.id, drawing.id)}>
                  <div className="drawing-card-top">
                    <strong>{drawing.name}</strong>
                    <span className={badgeClass(drawing.status)}>{drawing.status}</span>
                  </div>
                  <div className="drawing-card-meta">
                    <span>{drawing.drawingType}</span>
                    <span>Rev: <strong>{drawing.revision}</strong></span>
                    {drawing.approvedRevision && <span>✓ {drawing.approvedRevision}</span>}
                  </div>
                  <div className="drawing-card-stage muted">{displayStage(drawing)}</div>
                  <div className="drawing-card-footer">
                    <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); openDrawing(selectedProject.id, drawing.id); }}>View</button>
                    <button className="btn btn--danger btn--sm" onClick={(e) => { e.stopPropagation(); removeDrawing(selectedProject.id, drawing.id); }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {showAddModal && selectedProject && (
        <AddDrawingModal project={selectedProject} onClose={() => setShowAddModal(false)} onAdd={handleAddDrawing} toastFn={toast} user={user} />
      )}

      {state.modal === "drawing" && selectedDrawing && selectedProject && (
        <Modal title="Drawing Workflow" onClose={closeModal} wide>
          <div className="modal-top-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "BACK_TO_LIST" })}>← Back to Projects</button>
          </div>
          <div className="drawing-detail-layout">
            <div className="detail-left">
              <div className="card">
                <div className="card-title">Drawing Info</div>
                <div className="info-grid">
                  <span className="info-label">Name</span>
                  <span>{selectedDrawing.name}</span>
                  <span className="info-label">Project</span>
                  <span>{selectedDrawing.project}</span>
                  <span className="info-label">Type</span>
                  <span>{selectedDrawing.drawingType}</span>
                  <span className="info-label">Current Rev</span>
                  <span><strong>{selectedDrawing.revision}</strong></span>
                  <span className="info-label">Status</span>
                  <span className={badgeClass(selectedDrawing.status)}>{selectedDrawing.status}</span>
                  <span className="info-label">Stage</span>
                  <span>{displayStage(selectedDrawing)}</span>
                  <span className="info-label">Updated</span>
                  <span className="muted cell-mono" style={{ fontSize: 11 }}>{fmt(selectedDrawing.updated)}</span>
                </div>
              </div>
            </div>
            <div className="detail-right">
              <div className="card card--stretch">
                <div className="card-title">
                  Workflow Stages
                  <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>4 stages</span>
                </div>
                <div className="wf-stages">
                  {stageOrderFor(selectedDrawing).map((step) => (
                    <WorkflowStageCard key={step} drawing={selectedDrawing} step={step} onAction={handleWorkflowAction} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {state.modal === "upload" && (
        <Modal
          title="Upload Drawing"
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn--ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn--primary" onClick={handleGlobalUpload}>Upload</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field full">
              <label className="form-label">File</label>
              <div className="upload-file-row">
                <button className="btn btn--ghost btn--sm" onClick={() => globalUploadRef.current?.click()}>Choose File</button>
                {state.uploadForm.file && <span className="muted file-name">{state.uploadForm.file.name}</span>}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Project</label>
              <select className="input" value={state.uploadForm.project} onChange={(e) => dispatch({ type: "SET_UPLOAD_FORM", field: "project", value: e.target.value })}>
                <option value="">Select project</option>
                {assignedProjects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Project Status</label>
              <select className="input" value={state.uploadForm.projectStatus} onChange={(e) => dispatch({ type: "SET_UPLOAD_FORM", field: "projectStatus", value: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Drawing Name</label>
              <input className="input" value={state.uploadForm.drawingName} placeholder="e.g. Tower A Floor Plan" onChange={(e) => dispatch({ type: "SET_UPLOAD_FORM", field: "drawingName", value: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="form-label">Drawing Type</label>
              <select className="input" value={state.uploadForm.drawingType} onChange={(e) => dispatch({ type: "SET_UPLOAD_FORM", field: "drawingType", value: e.target.value })}>
                {DRAWING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Revision</label>
              <input className="input" value={state.uploadForm.revision} placeholder="e.g. R1" onChange={(e) => dispatch({ type: "SET_UPLOAD_FORM", field: "revision", value: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {state.modal === "approved" && (
        <Modal title="Approved Projects" onClose={closeModal} wide>
          <div className="table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Drawings</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {state.projects.filter((p) => p.status === "Accepted").length === 0 ? (
                  <tr><td colSpan={5} className="table-empty">No approved projects yet.</td></tr>
                ) : (
                  state.projects.filter((p) => p.status === "Accepted").map((project) => {
                    const approved = project.drawings.filter((d) => d.status === "Approved").length;
                    return (
                      <tr key={project.id}>
                        <td className="cell-mono muted">{project.id}</td>
                        <td><strong>{project.name}</strong></td>
                        <td><span className={badgeClass(project.status)}>{project.status}</span></td>
                        <td>{project.drawings.length}</td>
                        <td>{approved}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}