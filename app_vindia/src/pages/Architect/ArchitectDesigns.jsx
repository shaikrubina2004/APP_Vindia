import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { getArchitectProjects } from "../../services/architectprojectService";
import "./ArchitectDesigns.css";
import {
  createDrawing,
  getDrawings,
  sendDrawing,
  requestDrawing,
  getRequests,
} from "../../services/architectDesignService";

// ─── Role mapping ──────────────────────────────────────────────────────────────
const ROLE_MAP = {
  architect:           "Architect",
  draftsman:           "Architect",
  project_coordinator: "Program Coordinator",
  quantity_surveyor:   "Quantity Surveyor",
  site_engineer:       "Site Engineer",
  client:              "Client",
  project_manager:     "Architect",
  ceo:                 "Architect",
};

const DRAWING_TYPES = ["Working Drawing", "Detailed Drawing"];

const WORKING_DRAWING_SEQUENCE = [
  "Quantity Surveyor",
  "Site Engineer",
  "Program Coordinator",
  "Client",
];

const DMS_ROLE_TO_CODE = {   
  "Architect":           "architect",
  "Program Coordinator": "project_coordinator",
  "Quantity Surveyor":   "quantity_surveyor",
  "Site Engineer":       "site_engineer",
  "Client":              "client",
};

const PROJECT_SCOPED_ROLES = new Set(["Site Engineer", "Client"]);
const CAN_REQUEST_ROLES = new Set(["Site Engineer", "Client"]);

const DEFAULT_REQUEST_NOTE =
  "I am formally requesting a detailed drawing for the above-mentioned project. " +
  "The working drawing currently available does not provide sufficient detail for our on-site requirements. " +
  "Specifically, we require enlarged plans, sections, and elevations that clearly indicate material specifications, " +
  "dimensions, and construction notes. Please ensure the drawing is updated to the latest revision and issued at the earliest convenience. " +
  "Kindly acknowledge receipt of this request and advise on the expected turnaround time.";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fmt = (v) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const badgeClass = (status) => {
  const map = {
    Pending:  "dms-badge dms-badge-pending",
    Sent:     "dms-badge dms-badge-sent",
    Approved: "dms-badge dms-badge-approved",
    Rejected: "dms-badge dms-badge-rejected",
  };
  return map[status] || "dms-badge dms-badge-pending";
};

function resolveActiveRole(user) {
  if (!user) return null;
  const code = (user.role || "").toLowerCase().trim();
  return ROLE_MAP[code] || null;
}

function normaliseDrawing(row) {
  return {
    id:          row.id,
    projectId:   String(row.project_id),
    projectName: row.project_name || row.name || "—",
    drawingName: row.name,
    drawingType: row.drawing_type,
    revision:    row.current_revision || row.revision || "—",
    fileName:    row.file_name || "",
    fileUrl:     row.file_url || "",
    blobKey:     null,
    uploadedAt:  row.created_at,
    sentTo: Array.isArray(row.recipients)
      ? row.recipients.map((r) => ({
          role:           r.role,
          sentAt:         r.sent_at,
          assignedUserId: r.user_id ? Number(r.user_id) : null,
        }))
      : [],
  };
}

function normaliseRequest(row) {
  return {
    id:          row.id,
    from:        row.requester_name || row.role || "—",
    fromRole:    row.requester_role || row.role || "—",
    projectId:   String(row.project_id),
    projectName: row.project_name || "—",
    note:        row.description || "",
    sentAt:      row.created_at,
    seen:        row.status !== "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURE SUB-COMPONENTS (defined OUTSIDE main component to prevent remount bug)
// ═══════════════════════════════════════════════════════════════════════════════

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const typeClass =
    toast.type === "success" ? "dms-toast dms-toast-success"
    : toast.type === "error" ? "dms-toast dms-toast-error"
    : "dms-toast dms-toast-info";
  return ReactDOM.createPortal(
    <div className={typeClass}>{toast.message}</div>,
    document.body
  );
}

function Modal({ title, wide, onClose, children, footer }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div className="dms-backdrop" onMouseDown={handleBackdropClick}>
      <div className={`dms-modal${wide ? " dms-modal-wide" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="dms-modal-head">
          <h3 className="dms-modal-title">{title}</h3>
          <button className="dms-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="dms-modal-body">{children}</div>
        {footer && <div className="dms-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

function WorkflowTracker({ sentTo }) {
  return (
    <div className="dms-workflow-row">
      {WORKING_DRAWING_SEQUENCE.map((role, i) => {
        const info = sentTo.find((s) => s.role === role);
        return (
          <React.Fragment key={role}>
            <div className="dms-wf-step">
              <div className={`dms-wf-dot${info ? " sent" : ""}`}>
                {info ? "✓" : i + 1}
              </div>
              <div className={`dms-wf-label${info ? " sent" : ""}`}>
                {role.split(" ").map((w) => w[0]).join(".")}
              </div>
            </div>
            {i < WORKING_DRAWING_SEQUENCE.length - 1 && (
              <div className={`dms-wf-line${info ? " done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RolePill({ role }) {
  return (
    <span className="dms-role-pill" data-role={role.toLowerCase().replace(/\s+/g, "-")}>
      {role}
    </span>
  );
}

function FilePreview({ d, fileBlobs, maxHeight = 380 }) {
  const blobUrl = fileBlobs[d.blobKey];
  const src = blobUrl || d.fileUrl || null;
  const nameToCheck = d.fileName || d.fileUrl || "";
  const isImg = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(nameToCheck);
  const isPDF = /\.pdf$/i.test(nameToCheck);

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.fileName || "drawing";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  };

  return (
    <>
      <div className="dms-file-preview-box">
        {src && isImg && (
          <img src={src} alt={d.drawingName}
            style={{ maxWidth: "100%", maxHeight, objectFit: "contain" }} />
        )}
        {src && isPDF && (
          <iframe src={src} style={{ width: "100%", height: maxHeight, border: "none" }}
            title={d.drawingName} />
        )}
        {src && !isImg && !isPDF && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--ink-muted)" }}>
            <div className="dms-file-icon">📄</div>
            <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>{d.fileName}</div>
            <button onClick={handleDownload} className="dms-btn dms-btn-success">
              ↓ Download File
            </button>
          </div>
        )}
        {!src && (
          <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>Preview unavailable</div>
        )}
      </div>
      {src && (isImg || isPDF) && (
        <button onClick={handleDownload} className="dms-btn dms-btn-success dms-download-link">
          ↓ Download {d.fileName}
        </button>
      )}
    </>
  );
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ uf, setUf, projects, fileRef, handleFileChange, handleUpload, onClose }) {
  return (
    <Modal
      title="Upload Drawing"
      onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dms-btn dms-btn-primary" onClick={handleUpload}>Upload Drawing</button>
        </>
      }
    >
      <div className="dms-form-field">
        <label className="dms-label">Project *</label>
        <select className="dms-input" value={uf.projectId}
          onChange={(e) => setUf((p) => ({ ...p, projectId: e.target.value }))}>
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="dms-form-field">
        <label className="dms-label">Drawing Name *</label>
        <input className="dms-input" value={uf.drawingName} placeholder="e.g. Ground Floor Plan"
          onChange={(e) => setUf((p) => ({ ...p, drawingName: e.target.value }))} />
      </div>
      <div className="dms-grid-2">
        <div className="dms-form-field">
          <label className="dms-label">Drawing Type *</label>
          <select className="dms-input" value={uf.drawingType}
            onChange={(e) => setUf((p) => ({ ...p, drawingType: e.target.value }))}>
            {DRAWING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="dms-form-field">
          <label className="dms-label">Revision *</label>
          <input className="dms-input" value={uf.revision} placeholder="e.g. R1"
            onChange={(e) => setUf((p) => ({ ...p, revision: e.target.value }))} />
        </div>
      </div>
      <div className="dms-form-field">
        <label className="dms-label">File *</label>
        <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }}
          onChange={handleFileChange} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="dms-btn dms-btn-ghost" onClick={() => fileRef.current?.click()}>
            Choose File
          </button>
          {uf.fileName && (
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{uf.fileName}</span>
          )}
        </div>
      </div>
      {uf.drawingType === "Working Drawing" && (
        <div className="dms-info-box dms-info-box-gold">
          ⚡ Working drawings follow a fixed sequence:<br />
          <strong>QS → Site Engineer → Program Coordinator → Client</strong>
        </div>
      )}
      {uf.drawingType === "Detailed Drawing" && (
        <div className="dms-info-box dms-info-box-blue">
          📤 Detailed drawings can be sent to any recipient in any order.
        </div>
      )}
    </Modal>
  );
}

// ─── Request Modal ─────────────────────────────────────────────────────────────
function RequestModal({ rf, setRf, projects, sendRequest, onClose }) {
  return (
    <Modal
      title="Request Detailed Drawing"
      onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dms-btn dms-btn-primary" onClick={sendRequest}>Send Request</button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 20 }}>
        This request will be sent to the Architect for a detailed drawing.
      </p>
      <div className="dms-form-field">
        <label className="dms-label">Project *</label>
        <select className="dms-input" value={rf.projectId}
          onChange={(e) => setRf((p) => ({ ...p, projectId: e.target.value }))}>
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="dms-form-field">
        <label className="dms-label">Note (optional)</label>
        <textarea className="dms-input"
          style={{ minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
          value={rf.note}
          onChange={(e) => setRf((p) => ({ ...p, note: e.target.value }))} />
      </div>
    </Modal>
  );
}

// ─── Request Detail Modal ──────────────────────────────────────────────────────
function RequestDetailModal({ req, setRequests, onClose }) {
  if (!req) return null;
  return (
    <Modal
      title="Drawing Request Details"
      onClose={onClose}
      footer={
        <div className="dms-modal-foot-spread">
          {!req.seen && (
            <button className="dms-btn dms-btn-success" onClick={() => {
              setRequests((prev) =>
                prev.map((r) => r.id === req.id ? { ...r, seen: true } : r)
              );
              onClose();
            }}>Mark Seen</button>
          )}
          <button className="dms-btn dms-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="dms-detail-info-card">
          <div className="dms-grid-2" style={{ gap: "12px 24px" }}>
            <div>
              <div className="dms-label">Requested By</div>
              <div style={{ fontWeight: 700, color: "var(--blue-mid)", fontSize: 14 }}>{req.from}</div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{req.fromRole}</div>
            </div>
            <div>
              <div className="dms-label">Sent At</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{fmt(req.sentAt)}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="dms-label">Project</div>
              <div style={{
                fontWeight: 700, color: "var(--amber)", fontSize: 15,
                padding: "6px 10px", background: "var(--surface-2)",
                borderRadius: 6, marginTop: 4,
              }}>
                {req.projectName || "—"}
              </div>
            </div>
            <div>
              <div className="dms-label">Status</div>
              <span className={badgeClass(req.seen ? "Approved" : "Pending")}>
                {req.seen ? "Seen" : "Unseen"}
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="dms-label" style={{ marginBottom: 6 }}>What They Need</div>
          {req.note ? (
            <pre className="dms-note-pre">{req.note}</pre>
          ) : (
            <div className="dms-info-box dms-info-box-gold">No description provided.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Drawing Detail Modal ──────────────────────────────────────────────────────
function DrawingDetailModal({ d, fileBlobs, sendTo, onClose }) {
  if (!d) return null;

  const getNextStage = (drawing) => {
    const sent = drawing.sentTo.map((s) => s.role);
    return WORKING_DRAWING_SEQUENCE.find((r) => !sent.includes(r)) || null;
  };

  const next = d.drawingType === "Working Drawing" ? getNextStage(d) : null;

  return (
    <Modal title={d.drawingName} wide onClose={onClose}>
      <div className="dms-detail-grid">
        <div>
          <div className="dms-form-field">
            <div className="dms-label">Project</div>
            <div style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>{d.projectName}</div>
          </div>
          <div className="dms-grid-2">
            <div className="dms-form-field">
              <div className="dms-label">Type</div>
              <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}>
                {d.drawingType}
              </span>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">Revision</div>
              <span className="dms-revision-lg">{d.revision}</span>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">Uploaded</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fmt(d.uploadedAt)}</div>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">File</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{d.fileName}</div>
            </div>
          </div>

          {d.drawingType === "Working Drawing" && (
            <>
              <div className="dms-label" style={{ marginBottom: 8 }}>Workflow Progress</div>
              <WorkflowTracker sentTo={d.sentTo} />
              {next ? (
                <button
                  className="dms-btn dms-btn-info"
                  style={{ width: "100%", marginTop: 4 }}
                  onClick={() => sendTo(d.id, next)}
                >
                  → Send to {next}
                </button>
              ) : (
                <div className="dms-info-box dms-info-box-gold">✓ Sent to all stages in sequence.</div>
              )}
            </>
          )}

          {d.drawingType === "Detailed Drawing" && (
            <>
              <div className="dms-label" style={{ marginBottom: 8 }}>Send To</div>
              <div className="dms-send-buttons">
                {WORKING_DRAWING_SEQUENCE.map((role) => {
                  const done = d.sentTo.some((s) => s.role === role);
                  return (
                    <button
                      key={role}
                      className={`dms-btn ${done ? "dms-btn-muted" : "dms-btn-primary"}`}
                      disabled={done}
                      onClick={() => sendTo(d.id, role)}
                    >
                      {done ? `✓ ${role}` : `→ ${role}`}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {d.sentTo.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="dms-label">Delivery Log</div>
              {d.sentTo.map((s) => (
                <div key={s.role} className="dms-delivery-row">
                  <span style={{ color: "var(--ink-2)" }}>{s.role}</span>
                  <span style={{ color: "var(--ink-muted)" }}>{fmt(s.sentAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="dms-label">File Preview</div>
          <FilePreview d={d} fileBlobs={fileBlobs} maxHeight={380} />
        </div>
      </div>
    </Modal>
  );
}

// ─── Recipient Detail Modal ────────────────────────────────────────────────────
function RecipientDetailModal({ d, role, fileBlobs, onClose }) {
  if (!d) return null;
  const sentInfo = d.sentTo.find((s) => s.role === role);
  return (
    <Modal title={d.drawingName} wide onClose={onClose}>
      <div className="dms-detail-grid">
        <div>
          <div className="dms-form-field">
            <div className="dms-label">Project</div>
            <div style={{ color: "var(--ink)", fontWeight: 600 }}>{d.projectName}</div>
          </div>
          <div className="dms-grid-2">
            <div className="dms-form-field">
              <div className="dms-label">Type</div>
              <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}>
                {d.drawingType}
              </span>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">Revision</div>
              <span className="dms-revision-lg">{d.revision}</span>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">File</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{d.fileName}</div>
            </div>
            <div className="dms-form-field">
              <div className="dms-label">Received</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fmt(sentInfo?.sentAt)}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="dms-label">File Preview</div>
          <FilePreview d={d} fileBlobs={fileBlobs} maxHeight={360} />
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DrawingManagementSystem() {
  const [currentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  const activeRole = resolveActiveRole(currentUser);

  const [projects, setProjects]               = useState([]);
  const [drawings, setDrawings]               = useState([]);
  const [requests, setRequests]               = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [toast, setToast]                     = useState(null);
  const [modal, setModal]                     = useState(null);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [hoveredRow, setHoveredRow]           = useState(null);
  const [fileBlobs, setFileBlobs]             = useState({});
  const fileRef = useRef(null);

  const [uf, setUf] = useState({
    projectId: "", drawingName: "", drawingType: "Working Drawing",
    revision: "R1", file: null, fileName: "", blobKey: null,
  });
  const [rf, setRf] = useState({ projectId: "", note: DEFAULT_REQUEST_NOTE });

  const [architectViewAs, setArchitectViewAs] = useState("Architect");

  const viewRole = activeRole === "Architect" ? architectViewAs : activeRole;
  const isArchitectPreview = activeRole === "Architect";

  const showToast = useCallback((type, message) => setToast({ type, message }), []);
  const closeModal = useCallback(() => {
    setModal(null);
    setSelectedRequest(null);
  }, []);

  // ── Load projects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      try {
        let res;
        if (activeRole === "Architect") {
          res = await getArchitectProjects(currentUser.id);
        } else {
          res = await fetch("/api/projects").then((r) => r.json());
        }
        const list = res?.data || res || [];
        setProjects(
          list.map((p) => ({
            id:             p.project_id   || p.id   || uid(),
            name:           p.project_name || p.name || "Unnamed Project",
            status:         p.status       || "Pending",
            clientUserId:   p.client_user_id   != null ? Number(p.client_user_id)   : null,
            siteEngineerId: p.site_engineer_id != null ? Number(p.site_engineer_id) : null,
          }))
        );
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    })();
  }, [currentUser?.id, activeRole]);

  // ── Load drawings ──────────────────────────────────────────────────────────
  const loadDrawings = useCallback(async (silent = false) => {
    if (!currentUser?.id || !activeRole) return;
    if (!silent) setLoading(true);
    try {
      const roleCode = DMS_ROLE_TO_CODE[activeRole] || activeRole.toLowerCase();
      const res = await getDrawings(currentUser.id, roleCode);
      const rows = res?.data || res || [];
      setDrawings(rows.map(normaliseDrawing));
    } catch (err) {
      console.error("Failed to load drawings:", err);
      showToast("error", "Could not load drawings from server.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUser?.id, activeRole, showToast]);

  useEffect(() => { loadDrawings(); }, [loadDrawings]);

  // ── Load requests ──────────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    if (activeRole !== "Architect") return;
    try {
      const res = await getRequests();
      const rows = res?.data || res || [];
      setRequests(rows.map(normaliseRequest));
    } catch (err) {
      console.error("Failed to load requests:", err);
    }
  }, [activeRole]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── File pick ──────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const key = uid();
    setFileBlobs((prev) => ({ ...prev, [key]: URL.createObjectURL(f) }));
    setUf((prev) => ({
      ...prev, file: f, fileName: f.name, blobKey: key,
      drawingName: prev.drawingName ||
        f.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim(),
    }));
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uf.projectId)          return showToast("error", "Please select a project.");
    if (!uf.drawingName.trim()) return showToast("error", "Enter a drawing name.");
    if (!uf.revision.trim())    return showToast("error", "Enter a revision.");
    if (!uf.file)               return showToast("error", "Choose a file.");
    if (!currentUser?.id)       return showToast("error", "User not logged in.");

    let fileUrl = "";
    try {
      const formData = new FormData();
      formData.append("file", uf.file);
      const uploadRes = await fetch("/api/architect-drawings/upload", {
        method: "POST", body: formData,
      });
      const uploadData = await uploadRes.json();
      fileUrl = uploadData.url || uploadData.file_url || uploadData.path || "";
    } catch {
      fileUrl = `uploads/${uf.fileName}`;
    }

    const payload = {
      id:           uid(),
      project_id:   parseInt(uf.projectId, 10),
      name:         uf.drawingName.trim(),
      drawing_type: uf.drawingType,
      revision:     uf.revision.trim(),
      file_url:     fileUrl,
      file_name:    uf.fileName,
      user_id:      currentUser.id,
    };

    try {
      await createDrawing(payload);
      showToast("success", `"${payload.name}" uploaded successfully.`);
      setUf({ projectId: "", drawingName: "", drawingType: "Working Drawing",
               revision: "R1", file: null, fileName: "", blobKey: null });
      closeModal();
      await loadDrawings(true);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to save drawing. Please try again.");
    }
  };

  // ── Send drawing ───────────────────────────────────────────────────────────
  const sendTo = useCallback(async (drawingId, role) => {
    const drawing = drawings.find((d) => String(d.id) === String(drawingId));
    const project = projects.find((p) => String(p.id) === String(drawing?.projectId));

    let recipientUserId = null;
    if (role === "Client")        recipientUserId = project?.clientUserId ?? null;
    if (role === "Site Engineer") recipientUserId = project?.siteEngineerId ?? null;

    try {
      await sendDrawing(drawingId, {
        user_id: recipientUserId,
        role:    role,
        sent_by: currentUser.id,
      });
      showToast("success", `Sent to ${role}.`);

      const newEntry = {
        role,
        sentAt:         new Date().toISOString(),
        assignedUserId: recipientUserId,
      };

      setDrawings((prev) =>
        prev.map((d) =>
          String(d.id) !== String(drawingId)
            ? d
            : { ...d, sentTo: [...d.sentTo, newEntry] }
        )
      );

      setSelectedDrawing((prev) => {
        if (!prev || String(prev.id) !== String(drawingId)) return prev;
        return { ...prev, sentTo: [...prev.sentTo, newEntry] };
      });

    } catch (err) {
      console.error(err);
      showToast("error", `Failed to send to ${role}.`);
    }
  }, [drawings, projects, currentUser.id, showToast]);

  // ── Send request ───────────────────────────────────────────────────────────
  const sendRequest = async () => {
    if (!rf.projectId) return showToast("error", "Select a project.");
    try {
      await requestDrawing({
        project_id:   parseInt(rf.projectId, 10),
        requested_by: currentUser.id,
        role:         DMS_ROLE_TO_CODE[activeRole] || activeRole,
        description:  rf.note.trim(),
        due_date:     new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      });
      setRf({ projectId: "", note: DEFAULT_REQUEST_NOTE });
      closeModal();
      showToast("success", "Request sent to Architect.");
      await loadRequests();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to send request.");
    }
  };

  // ── Drawing filter ─────────────────────────────────────────────────────────
  function filterDrawingsForRole(role) {
    return drawings.filter((d) => {
      const entry = d.sentTo.find((s) => s.role === role);
      if (!entry) return false;
      if (isArchitectPreview) return true;
      if (PROJECT_SCOPED_ROLES.has(role)) {
        return entry.assignedUserId === Number(currentUser.id);
      }
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  const ArchitectView = () => {
    const unseenRequests = requests.filter((r) => !r.seen);
    return (
      <div>
        <div className="dms-top-bar">
          <div className="dms-section-title">My Drawings ({drawings.length})</div>
          <button className="dms-btn dms-btn-primary" onClick={() => setModal("upload")}>
            + Upload Drawing
          </button>
        </div>

        {loading ? (
          <div className="dms-card dms-empty-box">
            <div className="dms-spinner" />
            Loading drawings…
          </div>
        ) : drawings.length === 0 ? (
          <div className="dms-card dms-empty-box">
            No drawings yet — click "+ Upload Drawing" to begin.
          </div>
        ) : (
          <div className="dms-card">
            <table className="dms-table">
              <thead>
                <tr>
                  {["Drawing Name", "Project", "Type", "Rev", "Uploaded", "Sent To", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drawings.map((d) => (
                  <tr
                    key={d.id}
                    className={hoveredRow === d.id ? "hovered" : ""}
                    onMouseEnter={() => setHoveredRow(d.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td>
                      <strong style={{ color: "var(--ink)" }}>{d.drawingName}</strong>
                    </td>
                    <td>
                      <span style={{ color: "var(--ink-3)", fontSize: 12 }}>{d.projectName}</span>
                    </td>
                    <td>
                      <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}>
                        {d.drawingType === "Working Drawing" ? "Working" : "Detailed"}
                      </span>
                    </td>
                    <td><span className="dms-revision">{d.revision}</span></td>
                    <td>
                      <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(d.uploadedAt)}</span>
                    </td>
                    <td>
                      {d.sentTo.length === 0 ? (
                        <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>None</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {d.sentTo.map((s) => (
                            <span key={s.role} className={badgeClass("Sent")}>
                              {s.role.split(" ").map((w) => w[0]).join("")}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="dms-btn dms-btn-ghost"
                        onClick={() => { setSelectedDrawing(d); setModal("detail"); }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {requests.length > 0 && (
          <>
            <div className="dms-section-title" style={{ marginTop: 32 }}>
              Incoming Requests
              {unseenRequests.length > 0 && (
                <span className="dms-notif-badge">{unseenRequests.length}</span>
              )}
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`dms-req-card${req.seen ? " seen" : ""}`}
                  onClick={() => { setSelectedRequest(req); setModal("requestDetail"); }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: "var(--blue-mid)" }}>{req.from}</span>
                      {" "}
                      <span style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 400 }}>
                        ({req.fromRole})
                      </span>
                      {" "}
                      <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>
                        requested a detailed drawing
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      Project:{" "}
                      <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                        {req.projectName || "—"}
                      </span>
                    </div>
                    {req.note && (
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4, fontStyle: "italic" }}>
                        "{req.note.slice(0, 80)}{req.note.length > 80 ? "…" : ""}"
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
                      {fmt(req.sentAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <button
                      className="dms-btn dms-btn-info"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(req);
                        setModal("requestDetail");
                      }}
                    >
                      View
                    </button>
                    {!req.seen && (
                      <button
                        className="dms-btn dms-btn-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequests((prev) =>
                            prev.map((r) => r.id === req.id ? { ...r, seen: true } : r)
                          );
                        }}
                      >
                        Mark Seen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const RecipientView = ({ role }) => {
    const canRequest = CAN_REQUEST_ROLES.has(role);
    const mine = filterDrawingsForRole(role);

    return (
      <div>
        <div className="dms-top-bar">
          <div className="dms-section-title">
            {isArchitectPreview
              ? `All drawings sent to ${role} (${mine.length})`
              : `Drawings Sent to Me (${mine.length})`}
          </div>
          {canRequest && !isArchitectPreview && (
            <button
              className="dms-btn dms-btn-ghost"
              onClick={() => {
                setRf({ projectId: "", note: DEFAULT_REQUEST_NOTE });
                setModal("request");
              }}
            >
              + Request Detailed Drawing
            </button>
          )}
        </div>

        {loading ? (
          <div className="dms-card dms-empty-box">Loading drawings…</div>
        ) : mine.length === 0 ? (
          <div className="dms-card dms-empty-box">
            {isArchitectPreview
              ? `No drawings have been sent to ${role} yet.`
              : "No drawings have been sent to you yet."}
          </div>
        ) : (
          <div className="dms-card">
            <table className="dms-table">
              <thead>
                <tr>
                  {["Drawing Name", "Project", "Type", "Revision", "Received", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mine.map((d) => {
                  const sentInfo = d.sentTo.find((s) => s.role === role);
                  return (
                    <tr
                      key={d.id}
                      className={hoveredRow === d.id ? "hovered" : ""}
                      onMouseEnter={() => setHoveredRow(d.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td>
                        <strong style={{ color: "var(--ink)" }}>{d.drawingName}</strong>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                          Rev: {d.revision}
                        </div>
                      </td>
                      <td><span style={{ color: "var(--ink-3)" }}>{d.projectName}</span></td>
                      <td>
                        <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}>
                          {d.drawingType === "Working Drawing" ? "Working" : "Detailed"}
                        </span>
                      </td>
                      <td><span className="dms-revision">{d.revision}</span></td>
                      <td>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                          {fmt(sentInfo?.sentAt)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="dms-btn dms-btn-ghost"
                          onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const NoAccessView = () => (
    <div className="dms-card dms-empty-box" style={{ textAlign: "center", padding: 64 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>
        Access Restricted
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
        Your role (<strong>{currentUser?.role || "unknown"}</strong>) does not have access to the Drawing Management System.
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const ALL_VIEWS = ["Architect", "Quantity Surveyor", "Site Engineer", "Program Coordinator", "Client"];

  return (
    <div className="dms-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="dms-header">
        <h1 className="dms-header-title">Drawing Management System</h1>
        {activeRole && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--mist)", opacity: 0.7 }}>
              {currentUser.name}
            </span>
            <RolePill role={activeRole} />
          </div>
        )}
      </header>

      {activeRole === "Architect" && (
        <div className="dms-role-bar">
          {ALL_VIEWS.map((role) => (
            <button
              key={role}
              className={`dms-role-btn${architectViewAs === role ? " active" : ""}`}
              onClick={() => {
                setArchitectViewAs(role);
                setSelectedDrawing(null);
                setSelectedRequest(null);
                setModal(null);
              }}
            >
              {role}
            </button>
          ))}
        </div>
      )}

      <div className="dms-content">
        {!activeRole && <NoAccessView />}
        {viewRole === "Architect"           && <ArchitectView />}
        {viewRole === "Quantity Surveyor"   && <RecipientView role="Quantity Surveyor" />}
        {viewRole === "Site Engineer"       && <RecipientView role="Site Engineer" />}
        {viewRole === "Program Coordinator" && <RecipientView role="Program Coordinator" />}
        {viewRole === "Client"             && <RecipientView role="Client" />}
      </div>

      {modal === "upload" && (
        <UploadModal
          uf={uf}
          setUf={setUf}
          projects={projects}
          fileRef={fileRef}
          handleFileChange={handleFileChange}
          handleUpload={handleUpload}
          onClose={closeModal}
        />
      )}
      {modal === "request" && (
        <RequestModal
          rf={rf}
          setRf={setRf}
          projects={projects}
          sendRequest={sendRequest}
          onClose={closeModal}
        />
      )}
      {modal === "requestDetail" && selectedRequest && (
        <RequestDetailModal
          req={selectedRequest}
          setRequests={setRequests}
          onClose={closeModal}
        />
      )}
      {modal === "detail" && selectedDrawing && (
        <DrawingDetailModal
          d={selectedDrawing}
          fileBlobs={fileBlobs}
          sendTo={sendTo}
          onClose={closeModal}
        />
      )}
      {modal === "recipientDetail" && selectedDrawing && (
        <RecipientDetailModal
          d={selectedDrawing}
          role={viewRole}
          fileBlobs={fileBlobs}
          onClose={closeModal}
        />
      )}
    </div>
  );
}