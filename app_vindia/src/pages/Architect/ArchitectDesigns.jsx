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
  submit3DRender,
  get3DSubmissions,
  review3DSubmission,
  getMy3DSubmissions,
  getMy3DReviews,
} from "../../services/architectDesignService";

// ─── Role mapping ────────────────────────────────────────────────────────────
const ROLE_MAP = {
  architect:           "Architect",
  draftsman:           "Architect",
  project_coordinator: "Program Coordinator",
  quantity_surveyor:   "Quantity Surveyor",
  site_engineer:       "Site Engineer",
  client:              "Client",
  project_manager:     "Architect",
  ceo:                 "Architect",
  "3d_visualizer":     "3D Visualizer",
  "3dvisualizer":      "3D Visualizer",
};

const DRAWING_TYPES = ["Working Drawing", "Detail Drawing", "Planning"];

const WORKING_DRAWING_SEQUENCE = [
  "Quantity Surveyor",
  "Site Engineer",
  "Program Coordinator",
  "Client",
  "3D Visualizer",
];

const DETAIL_SENDABLE_ROLES = [
  "Quantity Surveyor",
  "Site Engineer",
  "Program Coordinator",
  "Client",
  "3D Visualizer",
];

const DMS_ROLE_TO_CODE = {
  "Architect":           "architect",
  "Program Coordinator": "project_coordinator",
  "Quantity Surveyor":   "quantity_surveyor",
  "Site Engineer":       "site_engineer",
  "Client":              "client",
  "3D Visualizer":       "3d_visualizer",
};

const PROJECT_SCOPED_ROLES = new Set(["Site Engineer", "Client"]);
const CAN_REQUEST_ROLES    = new Set(["Site Engineer", "Client"]);

const DEFAULT_REQUEST_NOTE =
  "Hi, I am formally requesting access to the planning drawing for this project. Please share the latest revision at your earliest convenience.";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nextRevision(current) {
  if (!current) return "R1";
  const match = current.match(/^([A-Za-z]*)(\d+)$/);
  if (match) {
    const prefix = match[1] || "R";
    const num    = parseInt(match[2], 10);
    return `${prefix}${num + 1}`;
  }
  const fallbackMatch = current.match(/^(.*?)(\d+)$/);
  if (fallbackMatch) {
    return `${fallbackMatch[1]}${parseInt(fallbackMatch[2], 10) + 1}`;
  }
  return `${current}-2`;
}

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
  const code = (user.role || "").toLowerCase().replace(/[\s-]/g, "_").trim();
  return ROLE_MAP[code] || null;
}

function normaliseDrawing(row) {
  return {
    id:          row.id,
    projectId:   String(row.project_id),
    projectName: row.project_name || row.name || "—",
    drawingName: row.name,
    drawingType: row.drawing_type,
    revision:    row.current_revision || row.revision || "R1",
    fileName:    row.file_name || "",
    fileUrl:     row.file_url  || "",
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
    note:        row.description   || "",
    sentAt:      row.created_at,
    seen:        row.status !== "pending",
    drawingId:   row.drawing_id || null,
  };
}

function normalise3DSubmission(row) {
  return {
    id:              row.id,
    drawingId:       row.drawing_id,
    drawingName:     row.drawing_name     || "—",
    projectName:     row.project_name     || "—",
    submittedBy:     row.submitted_by,
    submitterName:   row.submitter_name   || "—",
    fileUrl:         row.file_url         || "",
    fileName:        row.file_name        || "",
    notes:           row.notes            || "",
    status:          row.status           || "Pending",
    reviewNote:      row.review_note      || "",
    reviewedAt:      row.reviewed_at      || null,
    submittedAt:     row.created_at,
    drawingRevision: row.drawing_revision || row.current_revision || null,
  };
}

function normaliseRevision(row) {
  return {
    id:        row.id,
    revision:  row.revision,
    fileUrl:   row.file_url   || "",
    fileName:  row.file_name  || "",
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

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

  return ReactDOM.createPortal(
    <div className="dms-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={`dms-modal${wide ? " dms-modal-wide" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
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
    <span className="dms-role-pill" data-role={role.toLowerCase().replace(/[\s]+/g, "-")}>
      {role}
    </span>
  );
}

function DrawingTypeTag({ type }) {
  let cls = "dms-tag";
  let label = type;
  if (type === "Working Drawing") { cls += " dms-tag-gold"; label = "Working"; }
  else if (type === "Detail Drawing") { cls += " dms-tag-blue"; label = "Detail"; }
  else if (type === "Planning") { cls += " dms-tag-purple"; label = "Planning"; }
  return <span className={cls}>{label}</span>;
}

function FilePreview({ fileUrl, fileName, maxHeight = 340 }) {
  const src = fileUrl || null;
  const nameToCheck = fileName || fileUrl || "";
  const isImg  = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(nameToCheck);
  const isPDF  = /\.pdf$/i.test(nameToCheck);

  const handleDownload = async () => {
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = fileName || "drawing";
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
      <div className="dms-file-preview-box" style={{ minHeight: maxHeight }}>
        {src && isImg && (
          <img src={src} alt={fileName}
            style={{ maxWidth: "100%", maxHeight, objectFit: "contain" }} />
        )}
        {src && isPDF && (
          <iframe src={src}
            style={{ width: "100%", height: maxHeight, border: "none" }}
            title={fileName} />
        )}
        {src && !isImg && !isPDF && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--ink-muted)" }}>
            <div className="dms-file-icon">📄</div>
            <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontSize: 13 }}>
              {fileName}
            </div>
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
        <button onClick={handleDownload} className="dms-btn dms-btn-ghost dms-download-link" style={{ marginTop: 10 }}>
          ↓ Download {fileName}
        </button>
      )}
    </>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ uf, setUf, projects, fileRef, handleFileChange, handleUpload, onClose, drawings }) {
  const autoRevision = React.useMemo(() => {
    if (uf.drawingType !== "Planning" || !uf.projectId || !uf.drawingName.trim()) return null;
    const existing = (drawings || []).find(
      (d) =>
        d.drawingType === "Planning" &&
        String(d.projectId) === String(uf.projectId) &&
        d.drawingName.toLowerCase() === uf.drawingName.trim().toLowerCase()
    );
    return existing ? { current: existing.revision, next: nextRevision(existing.revision) } : null;
  }, [uf.drawingType, uf.projectId, uf.drawingName, drawings]);

  React.useEffect(() => {
    if (uf.drawingType !== "Planning") return;
    if (autoRevision) {
      setUf((p) => ({ ...p, revision: autoRevision.next }));
    } else {
      setUf((p) => ({ ...p, revision: "R1" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRevision, uf.drawingType]);

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
        <input className="dms-input" value={uf.drawingName}
          placeholder="e.g. Ground Floor Plan"
          onChange={(e) => setUf((p) => ({ ...p, drawingName: e.target.value }))} />
      </div>

      <div className="dms-grid-2">
        <div className="dms-form-field">
          <label className="dms-label">Drawing Type *</label>
          <select className="dms-input" value={uf.drawingType}
            onChange={(e) => setUf((p) => ({ ...p, drawingType: e.target.value, revision: "R1" }))}>
            {DRAWING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="dms-form-field">
          <label className="dms-label">
            Revision *{" "}
            {uf.drawingType === "Planning" && autoRevision && (
              <span style={{ color: "var(--purple)", fontSize: 10 }}>(auto)</span>
            )}
          </label>
          <input
            className="dms-input"
            value={uf.revision}
            placeholder="e.g. R1"
            readOnly={uf.drawingType === "Planning" && !!autoRevision}
            style={uf.drawingType === "Planning" && autoRevision
              ? { background: "var(--purple-light)", color: "var(--purple)", fontWeight: 700 }
              : {}}
            onChange={(e) => setUf((p) => ({ ...p, revision: e.target.value }))}
          />
        </div>
      </div>

      {uf.drawingType === "Planning" && autoRevision && (
        <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 12 }}>
          🔄 <strong>Existing drawing found at {autoRevision.current}.</strong>{" "}
          Uploading will create revision <strong>{autoRevision.next}</strong>.
        </div>
      )}

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
          <strong>QS → Site Engineer → Program Coordinator → Client → 3D Visualizer</strong>
        </div>
      )}
      {uf.drawingType === "Detail Drawing" && (
        <div className="dms-info-box dms-info-box-blue">
          📤 Detail drawings can be sent to any recipient in any order.
        </div>
      )}
      {uf.drawingType === "Planning" && !autoRevision && (
        <div className="dms-info-box dms-info-box-purple">
          🏗️ Planning drawings are exclusively for the <strong>3D Visualizer</strong>.
        </div>
      )}
    </Modal>
  );
}

// ─── 3D Submission Review Modal (Architect) ───────────────────────────────────
function SubmissionReviewModal({ sub, currentUserId, onReview, onClose }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReview = async (status) => {
    setBusy(true);
    await onReview(sub.id, status, note);
    setBusy(false);
    onClose();
  };

  const nameToCheck = sub.fileName || sub.fileUrl || "";
  const isImg = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(nameToCheck);
  const isPDF = /\.pdf$/i.test(nameToCheck);

  const handleDownload = async () => {
    try {
      const res  = await fetch(sub.fileUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = sub.fileName || "render";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(sub.fileUrl, "_blank");
    }
  };

  return (
    <Modal
      title="3D Render Submission"
      wide
      onClose={onClose}
      footer={
        sub.status === "Pending" ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="dms-btn dms-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="dms-btn dms-btn-danger" onClick={() => handleReview("Rejected")} disabled={busy}>✕ Reject</button>
            <button className="dms-btn dms-btn-success" onClick={() => handleReview("Approved")} disabled={busy}>✓ Approve</button>
          </div>
        ) : (
          <button className="dms-btn dms-btn-ghost" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="dms-detail-grid">
        <div>
          <div className="dms-form-field">
            <div className="dms-label">Submitted By</div>
            <div style={{ fontWeight: 700, color: "var(--blue-mid)" }}>{sub.submitterName}</div>
          </div>
          {sub.drawingRevision && (
            <div className="dms-form-field">
              <div className="dms-label">Drawing Revision</div>
              <span className="dms-revision dms-revision-purple">{sub.drawingRevision}</span>
            </div>
          )}
          <div className="dms-form-field">
            <div className="dms-label">Submitted At</div>
            <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{fmt(sub.submittedAt)}</div>
          </div>
          <div className="dms-form-field">
            <div className="dms-label">Drawing</div>
            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{sub.drawingName}</div>
          </div>
          <div className="dms-form-field">
            <div className="dms-label">Status</div>
            <span className={badgeClass(sub.status)}>{sub.status}</span>
          </div>
          {sub.status !== "Pending" && sub.reviewNote && (
            <div className="dms-form-field">
              <div className="dms-label">Review Note</div>
              <pre className="dms-note-pre" style={{ fontSize: 12 }}>{sub.reviewNote}</pre>
            </div>
          )}
          {sub.notes && (
            <div className="dms-form-field">
              <div className="dms-label">Visualizer Notes</div>
              <pre className="dms-note-pre" style={{ fontSize: 12 }}>{sub.notes}</pre>
            </div>
          )}
          {sub.status === "Pending" && (
            <div className="dms-form-field">
              <div className="dms-label">Review Note (optional)</div>
              <textarea className="dms-input" style={{ minHeight: 80 }}
                placeholder="Add feedback for the 3D visualizer…"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <div className="dms-label">Render File</div>
          <div className="dms-file-preview-box" style={{ minHeight: 300 }}>
            {sub.fileUrl && isImg && (
              <img src={sub.fileUrl} alt="3D render"
                style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }} />
            )}
            {sub.fileUrl && isPDF && (
              <iframe src={sub.fileUrl}
                style={{ width: "100%", height: 300, border: "none" }} title="3D render PDF" />
            )}
            {sub.fileUrl && !isImg && !isPDF && (
              <div style={{ textAlign: "center", padding: 24 }}>
                <div className="dms-file-icon">🎨</div>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
                  {sub.fileName || "Render file"}
                </div>
                <button onClick={handleDownload} className="dms-btn dms-btn-success">↓ Download</button>
              </div>
            )}
            {!sub.fileUrl && (
              <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>No file available</div>
            )}
          </div>
          {sub.fileUrl && (isImg || isPDF) && (
            <button onClick={handleDownload} className="dms-btn dms-btn-ghost dms-download-link" style={{ marginTop: 10 }}>
              ↓ Download {sub.fileName || "Render"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Planning Drawing Detail Modal (Architect) ────────────────────────────────
function PlanningDrawingDetailModal({ d, currentUserId, sendTo, onRevisionIncrement, onClose }) {
  if (!d) return null;

  const [submissions, setSubmissions]   = useState([]);
  const [revisions,   setRevisions]     = useState([]);
  const [loadingSubs, setLoadingSubs]   = useState(true);
  const [loadingRevs, setLoadingRevs]   = useState(true);
  const [reviewSub,   setReviewSub]     = useState(null);
  const [toast3D,     setToast3D]       = useState(null);

  // Add New Revision panel
  const [showAddRevPanel, setShowAddRevPanel] = useState(false);
  const [addRevFile,      setAddRevFile]      = useState(null);
  const [addRevFileName,  setAddRevFileName]  = useState("");
  const [addRevBusy,      setAddRevBusy]      = useState(false);
  const addRevFileRef = useRef(null);
  const newRevLabel = nextRevision(d.revision);

  // ── FIX 1: previewRevision defaults null; set from loaded revisions OR drawing file
  const [previewRevision, setPreviewRevision] = useState(null);

  // Load 3D submissions
  useEffect(() => {
    (async () => {
      try {
        const res  = await get3DSubmissions(d.id);
        const rows = res?.data || res || [];
        setSubmissions(rows.map(normalise3DSubmission));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [d.id]);

  // ── FIX 2: Load revision history with robust fallback
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/architect-designs/${d.id}/revisions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = (json?.data || json || []).map(normaliseRevision);
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRevisions(list);

        // Default preview = latest revision that has a file
        const withFile = list.find((r) => r.fileUrl);
        if (withFile) {
          setPreviewRevision(withFile);
        } else {
          // Fallback: use the drawing's own file if no revision history files
          if (d.fileUrl) {
            setPreviewRevision({ revision: d.revision, fileUrl: d.fileUrl, fileName: d.fileName });
          }
        }
      } catch (e) {
        console.error("Revision history load failed:", e);
        setRevisions([]);
        // ── FIX 2b: always fall back to drawing's own file for preview
        if (d.fileUrl) {
          setPreviewRevision({ revision: d.revision, fileUrl: d.fileUrl, fileName: d.fileName });
        }
      } finally {
        setLoadingRevs(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id]);

  const handleReview = async (subId, status, note) => {
    try {
      await review3DSubmission(subId, { status, reviewed_by: currentUserId, review_note: note });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? { ...s, status, reviewNote: note, reviewedAt: new Date().toISOString() }
            : s
        )
      );
      setToast3D({ type: "success", message: `Submission ${status}.` });
    } catch {
      setToast3D({ type: "error", message: "Failed to update submission." });
    }
  };

  const handleAddRevUpload = async () => {
    if (!addRevFile) {
      setToast3D({ type: "error", message: "Please choose a file first." });
      return;
    }
    setAddRevBusy(true);
    try {
      let fileUrl = "";
      try {
        const formData = new FormData();
        formData.append("file", addRevFile);
        const uploadRes  = await fetch("/api/architect-drawings/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        fileUrl = uploadData.url || uploadData.file_url || uploadData.path || `uploads/${addRevFile.name}`;
      } catch {
        fileUrl = `uploads/${addRevFile.name}`;
      }

      await fetch(`/api/architect-designs/${d.id}/revision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision:   newRevLabel,
          updated_by: currentUserId,
          file_url:   fileUrl,
          file_name:  addRevFile.name,
        }),
      });

      // ── FIX 3: tell parent to update the drawing's revision in state
      await onRevisionIncrement(d.id, newRevLabel, fileUrl, addRevFile.name);

      setToast3D({ type: "success", message: `Revision ${newRevLabel} uploaded.` });

      // ── FIX 1b: Build new revision entry and immediately set as preview
      const newRev = {
        id:        uid(),
        revision:  newRevLabel,
        fileUrl,
        fileName:  addRevFile.name,
        createdAt: new Date().toISOString(),
      };
      setRevisions((prev) => [newRev, ...prev]);
      setPreviewRevision(newRev);          // <-- immediate preview update
      setShowAddRevPanel(false);
      setAddRevFile(null);
      setAddRevFileName("");
    } catch (err) {
      console.error(err);
      setToast3D({ type: "error", message: "Failed to upload new revision." });
    } finally {
      setAddRevBusy(false);
    }
  };

  const alreadySent = d.sentTo.some((s) => s.role === "3D Visualizer");
  const sentInfo    = d.sentTo.find((s) => s.role === "3D Visualizer");
  const pendingSubs = submissions.filter((s) => s.status === "Pending");

  return (
    <>
      {toast3D && ReactDOM.createPortal(
        <div className={`dms-toast ${toast3D.type === "success" ? "dms-toast-success" : "dms-toast-error"}`}>
          {toast3D.message}
        </div>,
        document.body
      )}

      <Modal title={`🏗️ ${d.drawingName}`} wide onClose={onClose}>
        <div className="dms-planning-detail-grid">

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Meta card */}
            <div className="dms-detail-info-card">
              <div className="dms-grid-2" style={{ gap: "12px 20px" }}>
                <div>
                  <div className="dms-label">Project</div>
                  <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: 14 }}>{d.projectName}</div>
                </div>
                <div>
                  <div className="dms-label">Type</div>
                  <DrawingTypeTag type={d.drawingType} />
                </div>
                <div>
                  <div className="dms-label">Current Revision</div>
                  <span className="dms-revision-lg" style={{ background: "var(--purple-light)", color: "var(--purple)", borderColor: "#ddd6fe" }}>{d.revision}</span>
                </div>
                <div>
                  <div className="dms-label">Uploaded</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fmt(d.uploadedAt)}</div>
                </div>
              </div>
            </div>

            {/* Send to 3D Visualizer */}
            <div style={{ marginBottom: 12 }}>
              <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 10 }}>
                🏗️ <strong>Planning drawings</strong> are exclusively for the <strong>3D Visualizer</strong>.
              </div>
              <button
                className={`dms-btn ${alreadySent ? "dms-btn-muted" : "dms-btn-purple"}`}
                style={{ width: "100%" }}
                disabled={alreadySent}
                onClick={() => sendTo(d.id, "3D Visualizer")}
              >
                {alreadySent ? "✓ Sent to 3D Visualizer" : "→ Send to 3D Visualizer 🎨"}
              </button>
              {alreadySent && sentInfo?.sentAt && (
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6, textAlign: "center" }}>
                  Sent on {fmt(sentInfo.sentAt)}
                </div>
              )}
            </div>

            {/* Add New Revision */}
            <hr className="dms-divider" />
            {!showAddRevPanel ? (
              <button
                className="dms-btn dms-btn-primary"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={() => setShowAddRevPanel(true)}
              >
                + Add New Revision ({d.revision} → {newRevLabel})
              </button>
            ) : (
              <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--purple)" }}>
                  Upload Revision {newRevLabel}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <input ref={addRevFileRef} type="file" accept="*/*" style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setAddRevFile(f);
                      setAddRevFileName(f.name);
                    }} />
                  <button className="dms-btn dms-btn-ghost"
                    onClick={() => addRevFileRef.current?.click()} disabled={addRevBusy}>
                    Choose File
                  </button>
                  {addRevFileName && (
                    <span style={{ fontSize: 12, color: "var(--ink-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {addRevFileName}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="dms-btn dms-btn-ghost"
                    onClick={() => { setShowAddRevPanel(false); setAddRevFile(null); setAddRevFileName(""); }}
                    disabled={addRevBusy}>
                    Cancel
                  </button>
                  <button className="dms-btn dms-btn-purple"
                    onClick={handleAddRevUpload} disabled={addRevBusy || !addRevFile}
                    style={{ flex: 1 }}>
                    {addRevBusy ? "Uploading…" : `Upload as ${newRevLabel}`}
                  </button>
                </div>
              </div>
            )}

            {/* 3D Render Submissions */}
            <hr className="dms-divider" style={{ margin: "4px 0 14px" }} />
            <div className="dms-label" style={{ marginBottom: 8 }}>
              3D Render Submissions
              {pendingSubs.length > 0 && (
                <span className="dms-notif-badge" style={{ marginLeft: 8 }}>{pendingSubs.length} pending</span>
              )}
            </div>

            {loadingSubs ? (
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="dms-info-box dms-info-box-blue" style={{ fontSize: 12 }}>
                No renders submitted yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {submissions.map((sub) => (
                  <div key={sub.id} className="dms-req-card" style={{ padding: "10px 14px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                        {sub.submitterName}
                        <span className={badgeClass(sub.status)} style={{ marginLeft: 8, fontSize: 10 }}>
                          {sub.status}
                        </span>
                        {sub.drawingRevision && (
                          <span className="dms-revision dms-revision-purple" style={{ marginLeft: 8, fontSize: 10, height: 20, minWidth: 28 }}>
                            {sub.drawingRevision}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                        {sub.fileName || "file"} · {fmt(sub.submittedAt)}
                      </div>
                    </div>
                    <button
                      className={`dms-btn ${sub.status === "Pending" ? "dms-btn-info" : "dms-btn-ghost"}`}
                      onClick={() => setReviewSub(sub)}
                    >
                      {sub.status === "Pending" ? "Review" : "View"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* File Preview — shows selected revision */}
            <div>
              <div className="dms-label" style={{ marginBottom: 8 }}>
                File Preview
                {previewRevision && (
                  <span className="dms-revision dms-revision-purple" style={{ marginLeft: 8, fontSize: 11 }}>
                    {previewRevision.revision}
                  </span>
                )}
              </div>
              {/* ── FIX 1c: always render FilePreview; it shows "Preview unavailable" if no src */}
              <FilePreview
                fileUrl={previewRevision?.fileUrl || ""}
                fileName={previewRevision?.fileName || ""}
                maxHeight={280}
              />
            </div>

            {/* Revision History */}
            <div>
              <div className="dms-label" style={{ marginBottom: 8 }}>
                Revision History ({loadingRevs ? "…" : revisions.length})
              </div>
              {loadingRevs ? (
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Loading revisions…</div>
              ) : revisions.length === 0 ? (
                <div className="dms-info-box dms-info-box-blue" style={{ fontSize: 12 }}>
                  No revision history yet. Upload a new revision above to start tracking.
                </div>
              ) : (
                <div className="dms-rev-history">
                  {revisions.map((rev, idx) => {
                    const isLatest   = idx === 0;
                    const isSelected = previewRevision?.revision === rev.revision;
                    return (
                      <div
                        key={rev.id || rev.revision}
                        className={`dms-rev-history-row${isLatest ? " is-latest" : ""}`}
                        style={{ cursor: rev.fileUrl ? "pointer" : "default" }}
                        onClick={() => rev.fileUrl && setPreviewRevision(rev)}
                      >
                        <span className={`dms-rev-badge${isLatest ? " dms-rev-badge-purple" : ""}`}>
                          {rev.revision}
                        </span>
                        {isLatest && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", background: "var(--purple-light)", padding: "2px 7px", borderRadius: 99 }}>
                            LATEST
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rev.fileName || "No file"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(rev.createdAt)}</div>
                        </div>
                        {rev.fileUrl ? (
                          <button
                            className={`dms-btn ${isSelected ? "dms-btn-purple" : "dms-btn-info"}`}
                            style={{ fontSize: 11, padding: "4px 10px" }}
                            onClick={(e) => { e.stopPropagation(); setPreviewRevision(rev); }}
                          >
                            {isSelected ? "Viewing" : "Preview"}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>No file</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {reviewSub && (
        <SubmissionReviewModal
          sub={reviewSub}
          currentUserId={currentUserId}
          onReview={handleReview}
          onClose={() => setReviewSub(null)}
        />
      )}
    </>
  );
}

// ─── Working / Detail Drawing Detail Modal ────────────────────────────────────
function DrawingDetailModal({ d, fileBlobs, sendTo, currentUserId, onClose }) {
  if (!d) return null;

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [reviewSub,   setReviewSub]   = useState(null);
  const [toast3D,     setToast3D]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await get3DSubmissions(d.id);
        const rows = res?.data || res || [];
        setSubmissions(rows.map(normalise3DSubmission));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [d.id]);

  const handleReview = async (subId, status, note) => {
    try {
      await review3DSubmission(subId, { status, reviewed_by: currentUserId, review_note: note });
      setSubmissions((prev) =>
        prev.map((s) => s.id === subId
          ? { ...s, status, reviewNote: note, reviewedAt: new Date().toISOString() }
          : s
        )
      );
      setToast3D({ type: "success", message: `Submission ${status}.` });
    } catch {
      setToast3D({ type: "error", message: "Failed to update submission." });
    }
  };

  const getNextStage = (drawing) => {
    const sent = drawing.sentTo.map((s) => s.role);
    return WORKING_DRAWING_SEQUENCE.find((r) => !sent.includes(r)) || null;
  };

  const next = d.drawingType === "Working Drawing" ? getNextStage(d) : null;
  const pendingSubs = submissions.filter((s) => s.status === "Pending");
  const sendableRoles = d.drawingType === "Detail Drawing" ? DETAIL_SENDABLE_ROLES : [];

  return (
    <>
      {toast3D && ReactDOM.createPortal(
        <div className={`dms-toast ${toast3D.type === "success" ? "dms-toast-success" : "dms-toast-error"}`}>
          {toast3D.message}
        </div>,
        document.body
      )}
      <Modal title={d.drawingName} wide onClose={onClose}>
        <div className="dms-detail-grid">
          <div>
            <div className="dms-detail-info-card">
              <div className="dms-grid-2" style={{ gap: "12px 20px" }}>
                <div>
                  <div className="dms-label">Project</div>
                  <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: 14 }}>{d.projectName}</div>
                </div>
                <div>
                  <div className="dms-label">Type</div>
                  <DrawingTypeTag type={d.drawingType} />
                </div>
                <div>
                  <div className="dms-label">Revision</div>
                  <span className="dms-revision-lg">{d.revision}</span>
                </div>
                <div>
                  <div className="dms-label">Uploaded</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fmt(d.uploadedAt)}</div>
                </div>
              </div>
            </div>

            {d.drawingType === "Working Drawing" && (
              <>
                <div className="dms-label" style={{ marginBottom: 8 }}>Workflow Progress</div>
                <WorkflowTracker sentTo={d.sentTo} />
                {next ? (
                  <button className="dms-btn dms-btn-info" style={{ width: "100%", marginTop: 4 }}
                    onClick={() => sendTo(d.id, next)}>
                    → Send to {next}
                  </button>
                ) : (
                  <div className="dms-info-box dms-info-box-gold">✓ Sent to all stages.</div>
                )}
              </>
            )}

            {d.drawingType === "Detail Drawing" && (
              <>
                <div className="dms-label" style={{ marginBottom: 8 }}>Send To</div>
                <div className="dms-send-buttons">
                  {sendableRoles.map((role) => {
                    const done = d.sentTo.some((s) => s.role === role);
                    const is3D = role === "3D Visualizer";
                    return (
                      <button key={role}
                        className={`dms-btn ${done ? "dms-btn-muted" : is3D ? "dms-btn-purple" : "dms-btn-primary"}`}
                        disabled={done}
                        onClick={() => sendTo(d.id, role)}>
                        {done ? `✓ ${role}` : `→ ${role}`}
                        {is3D && !done && <span style={{ fontSize: 10, marginLeft: 4 }}>🎨</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {d.sentTo.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="dms-label" style={{ marginBottom: 6 }}>Delivery Log</div>
                {d.sentTo.map((s) => (
                  <div key={s.role} className="dms-delivery-row">
                    <span style={{ color: "var(--ink-2)" }}>{s.role}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{fmt(s.sentAt)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div className="dms-label" style={{ marginBottom: 8 }}>
                3D Render Submissions
                {pendingSubs.length > 0 && (
                  <span className="dms-notif-badge" style={{ marginLeft: 8 }}>{pendingSubs.length} pending</span>
                )}
              </div>
              {loadingSubs ? (
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Loading…</div>
              ) : submissions.length === 0 ? (
                <div className="dms-info-box dms-info-box-blue" style={{ fontSize: 12 }}>
                  No renders submitted yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {submissions.map((sub) => (
                    <div key={sub.id} className="dms-req-card" style={{ padding: "10px 14px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                          {sub.submitterName}
                          <span className={badgeClass(sub.status)} style={{ marginLeft: 8, fontSize: 10 }}>
                            {sub.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                          {sub.fileName || "file"} · {fmt(sub.submittedAt)}
                        </div>
                      </div>
                      <button
                        className={`dms-btn ${sub.status === "Pending" ? "dms-btn-info" : "dms-btn-ghost"}`}
                        onClick={() => setReviewSub(sub)}>
                        {sub.status === "Pending" ? "Review" : "View"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="dms-label" style={{ marginBottom: 8 }}>File Preview</div>
            <FilePreview fileUrl={d.fileUrl} fileName={d.fileName} maxHeight={380} />
          </div>
        </div>
      </Modal>

      {reviewSub && (
        <SubmissionReviewModal
          sub={reviewSub}
          currentUserId={currentUserId}
          onReview={handleReview}
          onClose={() => setReviewSub(null)}
        />
      )}
    </>
  );
}

// ─── Recipient Detail Modal ───────────────────────────────────────────────────
function RecipientDetailModal({ d, role, onClose }) {
  if (!d) return null;
  const sentInfo = d.sentTo.find((s) => s.role === role);
  return (
    <Modal title={d.drawingName} wide onClose={onClose}>
      <div className="dms-detail-grid">
        <div>
          <div className="dms-detail-info-card">
            <div className="dms-grid-2" style={{ gap: "12px 20px" }}>
              <div>
                <div className="dms-label">Project</div>
                <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: 14 }}>{d.projectName}</div>
              </div>
              <div>
                <div className="dms-label">Type</div>
                <DrawingTypeTag type={d.drawingType} />
              </div>
              <div>
                <div className="dms-label">Revision</div>
                <span className="dms-revision-lg">{d.revision}</span>
              </div>
              <div>
                <div className="dms-label">Received</div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fmt(sentInfo?.sentAt)}</div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="dms-label" style={{ marginBottom: 8 }}>File Preview</div>
          <FilePreview fileUrl={d.fileUrl} fileName={d.fileName} maxHeight={360} />
        </div>
      </div>
    </Modal>
  );
}

// ─── 3D Visualizer Submit Render Modal ──────────────────────────────────────
function Submit3DModal({ drawing, currentUserId, onSubmitted, onClose }) {
  const [file,     setFile]     = useState(null);
  const [fileName, setFileName] = useState("");
  const [notes,    setNotes]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const fileRef = useRef(null);

  const submittingRevision = drawing.revision;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) return alert("Please choose a file to submit.");
    setBusy(true);

    let uploadedUrl  = "";
    let uploadedName = fileName;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res  = await fetch("/api/architect-drawings/upload", { method: "POST", body: formData });
      const data = await res.json();
      uploadedUrl  = data.url || data.file_url || data.path || `uploads/${file.name}`;
      uploadedName = file.name;
    } catch {
      uploadedUrl  = `uploads/${file.name}`;
      uploadedName = file.name;
    }

    try {
      await submit3DRender(drawing.id, {
        submitted_by:      currentUserId,
        file_url:          uploadedUrl,
        file_name:         uploadedName,
        notes:             notes.trim(),
        drawing_revision:  submittingRevision,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to submit render. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Submit 3D Render — ${drawing.drawingName}`}
      onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="dms-btn dms-btn-purple" onClick={handleSubmit} disabled={busy}>
            {busy ? "Submitting…" : "Submit Render"}
          </button>
        </>
      }
    >
      <div className="dms-submit-meta">
        <span style={{ color: "var(--ink-muted)" }}>Project:</span>
        <strong style={{ color: "var(--amber)" }}>{drawing.projectName}</strong>
        <span style={{ margin: "0 4px", color: "var(--ink-faint)" }}>·</span>
        <span style={{ color: "var(--ink-muted)" }}>Submitting for revision:</span>
        <span className="dms-revision dms-revision-purple">{submittingRevision}</span>
      </div>

      <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 20 }}>
        🏗️ Upload your 3D visualisation for revision <strong>{submittingRevision}</strong>.
        The Architect will review and approve or reject your submission.
      </div>

      <div className="dms-form-field">
        <label className="dms-label">Render File *</label>
        <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }}
          onChange={handleFileChange} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="dms-btn dms-btn-ghost" onClick={() => fileRef.current?.click()}>
            Choose File
          </button>
          {fileName && <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fileName}</span>}
        </div>
        <div className="dms-info-box dms-info-box-blue" style={{ marginTop: 10, fontSize: 12 }}>
          Accepted: images, PDFs, videos, or any format.
        </div>
      </div>

      <div className="dms-form-field">
        <label className="dms-label">Notes (optional)</label>
        <textarea className="dms-input" style={{ minHeight: 80 }}
          placeholder="Describe your work, assumptions, software used…"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

// ─── Visualizer Request Modal ────────────────────────────────────────────────
function VisualizerRequestModal({ projects, currentUserId, onSent, onClose }) {
  const [projectId, setProjectId] = useState("");
  const [note, setNote]           = useState(DEFAULT_REQUEST_NOTE);
  const [busy, setBusy]           = useState(false);

  const handleSend = async () => {
    if (!projectId) return alert("Please select a project.");
    setBusy(true);
    try {
      await requestDrawing({
        project_id:   parseInt(projectId, 10),
        requested_by: currentUserId,
        role:         "3d_visualizer",
        description:  note.trim(),
        due_date:     new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      });
      onSent();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to send request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Request Planning Drawing" onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="dms-btn dms-btn-purple" onClick={handleSend} disabled={busy}>
            {busy ? "Sending…" : "Send Request"}
          </button>
        </>
      }>
      <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 20 }}>
        🏗️ This request will be sent to the <strong>Architect</strong> to provide you with the planning drawing.
      </div>
      <div className="dms-form-field">
        <label className="dms-label">Project *</label>
        <select className="dms-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select a project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="dms-form-field">
        <label className="dms-label">Note (optional)</label>
        <textarea className="dms-input" style={{ minHeight: 120 }}
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

// ─── Request Detail Modal ────────────────────────────────────────────────────
function RequestDetailModal({ req, setRequests, onClose }) {
  if (!req) return null;
  return (
    <Modal title="Drawing Request Details" onClose={onClose}
      footer={
        <div className="dms-modal-foot-spread">
          {!req.seen && (
            <button className="dms-btn dms-btn-success" onClick={() => {
              setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, seen: true } : r));
              onClose();
            }}>
              Mark Seen
            </button>
          )}
          <button className="dms-btn dms-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Close</button>
        </div>
      }>
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
            <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: 15, padding: "6px 10px",
              background: "var(--surface-2)", borderRadius: 6, marginTop: 4 }}>
              {req.projectName || "—"}
            </div>
          </div>
          <div>
            <div className="dms-label">Request Type</div>
            <span className="dms-tag dms-tag-purple">Planning Drawing</span>
          </div>
          <div>
            <div className="dms-label">Status</div>
            <span className={badgeClass(req.seen ? "Approved" : "Pending")}>
              {req.seen ? "Seen" : "Unseen"}
            </span>
          </div>
        </div>
      </div>
      {req.note && (
        <div>
          <div className="dms-label" style={{ marginBottom: 6 }}>What They Need</div>
          <pre className="dms-note-pre">{req.note}</pre>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function DrawingManagementSystem() {
  const [currentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  const activeRole = resolveActiveRole(currentUser);

  const [projects,       setProjects]       = useState([]);
  const [drawings,       setDrawings]       = useState([]);
  const [requests,       setRequests]       = useState([]);
  const [mySubmissions,  setMySubmissions]  = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [toast,          setToast]          = useState(null);
  const [modal,          setModal]          = useState(null);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [hoveredRow,     setHoveredRow]     = useState(null);
  const [fileBlobs,      setFileBlobs]      = useState({});
  const fileRef = useRef(null);

  const [uf, setUf] = useState({
    projectId: "", drawingName: "", drawingType: "Working Drawing",
    revision: "R1", file: null, fileName: "", blobKey: null,
  });

  const [architectViewAs, setArchitectViewAs] = useState("Architect");

  const viewRole           = activeRole === "Architect" ? architectViewAs : activeRole;
  const isArchitectPreview = activeRole === "Architect";

  const showToast  = useCallback((type, message) => setToast({ type, message }), []);
  const closeModal = useCallback(() => { setModal(null); setSelectedRequest(null); }, []);

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
            coordinatorId:  p.coordinator_id   != null ? Number(p.coordinator_id)   : null,
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
      const res      = await getDrawings(currentUser.id, roleCode);
      const rows     = res?.data || res || [];
      setDrawings(rows.map(normaliseDrawing));

      if (activeRole === "Architect") {
        try {
          const subRes  = await getMy3DReviews(currentUser.id);
          const subRows = subRes?.data || subRes || [];
          setAllSubmissions(subRows.map(normalise3DSubmission));
        } catch { /* non-fatal */ }
      } else if (activeRole === "3D Visualizer") {
        try {
          const subRes  = await getMy3DSubmissions(currentUser.id);
          const subRows = subRes?.data || subRes || [];
          setMySubmissions(subRows.map(normalise3DSubmission));
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.error(err);
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
      const res  = await getRequests();
      const rows = res?.data || res || [];
      setRequests(rows.map(normaliseRequest));
    } catch (err) {
      console.error(err);
    }
  }, [activeRole]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Load 3D Visualizer submissions ────────────────────────────────────────
  const loadMySubmissions = useCallback(async () => {
    if (activeRole !== "3D Visualizer") return;
    try {
      const res  = await getMy3DSubmissions(currentUser.id);
      const rows = res?.data || res || [];
      setMySubmissions(rows.map(normalise3DSubmission));
    } catch (err) {
      console.error(err);
    }
  }, [activeRole, currentUser.id]);

  useEffect(() => { loadMySubmissions(); }, [loadMySubmissions]);

  const loadAllSubmissions = useCallback(async () => {
    if (activeRole !== "Architect") return;
    try {
      const res  = await getMy3DReviews(currentUser.id);
      const rows = res?.data || res || [];
      setAllSubmissions(rows.map(normalise3DSubmission));
    } catch (err) {
      console.error(err);
    }
  }, [activeRole, currentUser.id]);

  useEffect(() => { loadAllSubmissions(); }, [loadAllSubmissions]);

  // ── File pick ──────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const key = uid();
    setFileBlobs((prev) => ({ ...prev, [key]: URL.createObjectURL(f) }));
    setUf((prev) => ({
      ...prev, file: f, fileName: f.name, blobKey: key,
      drawingName: prev.drawingName || f.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim(),
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
      const uploadRes  = await fetch("/api/architect-drawings/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      fileUrl = uploadData.url || uploadData.file_url || uploadData.path || "";
    } catch {
      fileUrl = `uploads/${uf.fileName}`;
    }

    const trimmedName = uf.drawingName.trim();
    const isPlanning  = uf.drawingType === "Planning";

    if (isPlanning) {
      const existingPlanning = drawings.find(
        (d) =>
          d.drawingType === "Planning" &&
          String(d.projectId) === String(uf.projectId) &&
          d.drawingName.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingPlanning) {
        const newRev = nextRevision(existingPlanning.revision);
        try {
          await fetch(`/api/architect-designs/${existingPlanning.id}/revision`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ revision: newRev, updated_by: currentUser.id, file_url: fileUrl, file_name: uf.fileName }),
          });
          showToast("success", `"${trimmedName}" updated to revision ${newRev}.`);
          setUf({ projectId: "", drawingName: "", drawingType: "Working Drawing", revision: "R1", file: null, fileName: "", blobKey: null });
          closeModal();
          await loadDrawings(true);
        } catch (err) {
          console.error(err);
          showToast("error", "Failed to increment revision.");
        }
        return;
      }
    }

    const payload = {
      id:           uid(),
      project_id:   parseInt(uf.projectId, 10),
      name:         trimmedName,
      drawing_type: uf.drawingType,
      revision:     uf.revision.trim(),
      file_url:     fileUrl,
      file_name:    uf.fileName,
      user_id:      currentUser.id,
    };

    try {
      await createDrawing(payload);
      showToast("success", `"${payload.name}" uploaded successfully.`);
      setUf({ projectId: "", drawingName: "", drawingType: "Working Drawing", revision: "R1", file: null, fileName: "", blobKey: null });
      closeModal();
      await loadDrawings(true);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to save drawing.");
    }
  };

  // ── Send drawing ───────────────────────────────────────────────────────────
  const sendTo = useCallback(async (drawingId, role) => {
    const drawing = drawings.find((d) => String(d.id) === String(drawingId));
    const project = projects.find((p) => String(p.id) === String(drawing?.projectId));

    let recipientUserId = null;
    if (role === "Client")        recipientUserId = project?.clientUserId   ?? null;
    if (role === "Site Engineer") recipientUserId = project?.siteEngineerId ?? null;

    if (role === "3D Visualizer") {
      try {
        let users = [];
        for (const roleKey of ["3D Visualizer", "3d_visualizer", "3dvisualizer"]) {
          const res  = await fetch(`/api/users/by-role/${encodeURIComponent(roleKey)}`);
          const data = await res.json();
          users = data?.data || data || [];
          if (users.length > 0) break;
        }
        if (users.length > 0) recipientUserId = users[0].id;
      } catch (err) {
        console.warn("Could not fetch 3D Visualizer user:", err);
      }
    }

    try {
      await sendDrawing(drawingId, { user_id: recipientUserId, role, sent_by: currentUser.id });
      showToast("success", `Sent to ${role}.`);

      const newEntry = { role, sentAt: new Date().toISOString(), assignedUserId: recipientUserId };
      setDrawings((prev) =>
        prev.map((d) => String(d.id) !== String(drawingId) ? d : { ...d, sentTo: [...d.sentTo, newEntry] })
      );
      setSelectedDrawing((prev) => {
        if (!prev || String(prev.id) !== String(drawingId)) return prev;
        return { ...prev, sentTo: [...prev.sentTo, newEntry] };
      });
    } catch (err) {
      console.error(err);
      showToast("error", err?.response?.data?.error || `Failed to send to ${role}.`);
    }
  }, [drawings, projects, currentUser.id, showToast]);

  // ── FIX 3: Increment Planning revision — also update fileUrl/fileName in state
  //    so the 3D Visualizer sees the latest file when they next load drawings
  const handleRevisionIncrement = useCallback(async (drawingId, newRevision, newFileUrl, newFileName) => {
    try {
      // PATCH already done in modal, just sync local state
      setDrawings((prev) =>
        prev.map((d) => String(d.id) === String(drawingId)
          ? { ...d, revision: newRevision, fileUrl: newFileUrl || d.fileUrl, fileName: newFileName || d.fileName }
          : d
        )
      );
      setSelectedDrawing((prev) =>
        prev && String(prev.id) === String(drawingId)
          ? { ...prev, revision: newRevision, fileUrl: newFileUrl || prev.fileUrl, fileName: newFileName || prev.fileName }
          : prev
      );
      showToast("success", `Revision updated to ${newRevision}.`);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update revision in state.");
      throw err;
    }
  }, [showToast]);

  // ── Filter helpers ────────────────────────────────────────────────────────
  function filterDrawingsForRole(role) {
    return drawings.filter((d) => {
      const entry = d.sentTo.find((s) => s.role === role);
      if (!entry) return false;
      if (isArchitectPreview) return true;
      if (PROJECT_SCOPED_ROLES.has(role)) return entry.assignedUserId === Number(currentUser.id);
      return true;
    });
  }

  function filterPlanningDrawings() {
    return drawings.filter((d) => d.drawingType === "Planning");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Architect View ───────────────────────────────────────────────────────
  const ArchitectView = () => {
    const unseenRequests  = requests.filter((r) => !r.seen);
    const workingDrawings = drawings.filter((d) => d.drawingType === "Working Drawing");
    const detailDrawings  = drawings.filter((d) => d.drawingType === "Detail Drawing");
    const planningDrawings = drawings.filter((d) => d.drawingType === "Planning");

    const DrawingTable = ({ list, emptyMsg }) => {
      if (list.length === 0) {
        return <div className="dms-empty-box" style={{ padding: "24px 16px" }}>{emptyMsg}</div>;
      }
      return (
        <table className="dms-table">
          <thead>
            <tr>
              {["Drawing Name", "Project", "Type", "Rev", "Uploaded", "Sent To", ""].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className={hoveredRow === d.id ? "hovered" : ""}
                onMouseEnter={() => setHoveredRow(d.id)}
                onMouseLeave={() => setHoveredRow(null)}>
                <td>
                  <strong style={{ color: "var(--ink)", fontSize: 13 }}>{d.drawingName}</strong>
                </td>
                <td>
                  <span style={{ color: "var(--ink-3)", fontSize: 12 }}>{d.projectName}</span>
                </td>
                <td><DrawingTypeTag type={d.drawingType} /></td>
                <td>
                  <span className={`dms-revision${d.drawingType === "Planning" ? " dms-revision-purple" : ""}`}>
                    {d.revision}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(d.uploadedAt)}</span>
                </td>
                <td>
                  {d.drawingType === "Planning" ? (
                    d.sentTo.some((s) => s.role === "3D Visualizer") ? (
                      <span className="dms-badge dms-badge-sent">Sent</span>
                    ) : (
                      <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>Not sent</span>
                    )
                  ) : d.sentTo.length === 0 ? (
                    <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>—</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {d.sentTo.map((s) => (
                        <span key={s.role} className={badgeClass("Sent")} title={s.role}>
                          {s.role === "3D Visualizer" ? "3D" : s.role.split(" ").map((w) => w[0]).join("")}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <button className="dms-btn dms-btn-ghost"
                    onClick={() => {
                      setSelectedDrawing(d);
                      setModal(d.drawingType === "Planning" ? "planningDetail" : "detail");
                    }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    return (
      <div>
        {/* Stat cards — dashboard overview */}
        <div className="dms-stat-row">
          <div className="dms-stat-card">
            <div className="dms-stat-icon dms-stat-icon-blue">🗂️</div>
            <div>
              <div className="dms-stat-value">{drawings.length}</div>
              <div className="dms-stat-label">Total Drawings</div>
            </div>
          </div>
          <div className="dms-stat-card">
            <div className="dms-stat-icon dms-stat-icon-amber">📐</div>
            <div>
              <div className="dms-stat-value">{workingDrawings.length}</div>
              <div className="dms-stat-label">Working Drawings</div>
            </div>
          </div>
          <div className="dms-stat-card">
            <div className="dms-stat-icon dms-stat-icon-purple">🏗️</div>
            <div>
              <div className="dms-stat-value">{planningDrawings.length}</div>
              <div className="dms-stat-label">Planning Drawings</div>
            </div>
          </div>
          <div className="dms-stat-card">
            <div className="dms-stat-icon dms-stat-icon-green">🎨</div>
            <div>
              <div className="dms-stat-value">{allSubmissions.filter((s) => s.status === "Pending").length}</div>
              <div className="dms-stat-label">Renders Pending</div>
            </div>
          </div>
        </div>

        <div className="dms-top-bar">
          <div className="dms-section-title">My Drawings ({drawings.length})</div>
          <button className="dms-btn dms-btn-primary" onClick={() => setModal("upload")}>
            + Upload Drawing
          </button>
        </div>

        {loading ? (
          <div className="dms-card dms-empty-box"><div className="dms-spinner" />Loading drawings…</div>
        ) : (
          <>
            <div className="dms-section-subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
              <span className="dms-tag dms-tag-gold">Working</span>
              Working Drawings ({workingDrawings.length})
            </div>
            <div className="dms-card" style={{ padding: 0 }}>
              <DrawingTable list={workingDrawings} emptyMsg="No working drawings uploaded yet." />
            </div>

            <div className="dms-section-subtitle" style={{ marginTop: 20, marginBottom: 8 }}>
              <span className="dms-tag dms-tag-blue">Detail</span>
              Detail Drawings ({detailDrawings.length})
            </div>
            <div className="dms-card" style={{ padding: 0 }}>
              <DrawingTable list={detailDrawings} emptyMsg="No detail drawings uploaded yet." />
            </div>

            <div className="dms-section-subtitle" style={{ marginTop: 20, marginBottom: 8 }}>
              <span className="dms-tag dms-tag-purple">Planning</span>
              Planning Drawings — 3D Visualizer Exclusive ({planningDrawings.length})
            </div>
            <div className="dms-card" style={{ padding: 0 }}>
              <DrawingTable list={planningDrawings} emptyMsg="No planning drawings uploaded yet." />
            </div>
          </>
        )}

        {/* Incoming Requests */}
        {requests.length > 0 && (
          <>
            <div className="dms-section-title" style={{ marginTop: 32, marginBottom: 12 }}>
              Incoming Requests
              {unseenRequests.length > 0 && (
                <span className="dms-notif-badge">{unseenRequests.length}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {requests.map((req) => (
                <div key={req.id} className={`dms-req-card${req.seen ? " seen" : ""}`}
                  onClick={() => { setSelectedRequest(req); setModal("requestDetail"); }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "var(--blue-mid)" }}>{req.from}</span>
                      {" "}
                      <span style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 400 }}>({req.fromRole})</span>
                      {" "}
                      <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>requested a planning drawing</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      Project: <span style={{ color: "var(--amber)", fontWeight: 600 }}>{req.projectName || "—"}</span>
                    </div>
                    {req.note && (
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4, fontStyle: "italic" }}>
                        "{req.note.slice(0, 80)}{req.note.length > 80 ? "…" : ""}"
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{fmt(req.sentAt)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <button className="dms-btn dms-btn-info"
                      onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setModal("requestDetail"); }}>
                      View
                    </button>
                    {!req.seen && (
                      <button className="dms-btn dms-btn-success"
                        onClick={(e) => { e.stopPropagation(); setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, seen: true } : r)); }}>
                        Mark Seen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 3D Render Submissions */}
        {allSubmissions.length > 0 && (
          <>
            <div className="dms-section-title" style={{ marginTop: 32, marginBottom: 12 }}>
              🎨 3D Render Submissions
              {allSubmissions.filter((s) => s.status === "Pending").length > 0 && (
                <span className="dms-notif-badge" style={{ marginLeft: 8 }}>
                  {allSubmissions.filter((s) => s.status === "Pending").length} pending
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allSubmissions.map((sub) => (
                <div key={sub.id} className={`dms-req-card${sub.status === "Approved" ? " seen" : ""}`}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                      {sub.drawingName}
                      <span className={badgeClass(sub.status)} style={{ marginLeft: 8 }}>{sub.status}</span>
                      {sub.drawingRevision && (
                        <span className="dms-revision dms-revision-purple" style={{ marginLeft: 8, fontSize: 11, height: 20, minWidth: 28 }}>
                          {sub.drawingRevision}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      Project: <span style={{ color: "var(--amber)", fontWeight: 600 }}>{sub.projectName}</span>
                      {" · "}By: <span style={{ color: "var(--blue-mid)" }}>{sub.submitterName}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
                      {sub.fileName && <><strong>File:</strong> {sub.fileName} · </>}
                      Submitted {fmt(sub.submittedAt)}
                    </div>
                    {sub.status !== "Pending" && sub.reviewNote && (
                      <div className="dms-info-box dms-info-box-gold" style={{ marginTop: 8, fontSize: 12 }}>
                        <strong>Your note:</strong> {sub.reviewNote}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexDirection: "column" }}>
                    {sub.fileUrl && (
                      <a href={sub.fileUrl} target="_blank" rel="noreferrer"
                        className="dms-btn dms-btn-ghost" style={{ fontSize: 12 }}>
                        ↓ Download
                      </a>
                    )}
                    {sub.status === "Pending" && (
                      <>
                        <button className="dms-btn dms-btn-success" style={{ fontSize: 12 }}
                          onClick={async () => {
                            const note = window.prompt("Approval note (optional):") ?? "Approved.";
                            try {
                              await review3DSubmission(sub.id, { status: "Approved", reviewed_by: currentUser.id, review_note: note || "Approved." });
                              setAllSubmissions((prev) =>
                                prev.map((s) => s.id === sub.id ? { ...s, status: "Approved", reviewNote: note } : s)
                              );
                              showToast("success", "Submission approved!");
                            } catch { showToast("error", "Failed to approve."); }
                          }}>
                          ✓ Approve
                        </button>
                        <button className="dms-btn dms-btn-danger" style={{ fontSize: 12 }}
                          onClick={async () => {
                            const note = window.prompt("Rejection reason (required):");
                            if (!note?.trim()) return;
                            try {
                              await review3DSubmission(sub.id, { status: "Rejected", reviewed_by: currentUser.id, review_note: note });
                              setAllSubmissions((prev) =>
                                prev.map((s) => s.id === sub.id ? { ...s, status: "Rejected", reviewNote: note } : s)
                              );
                              showToast("info", "Submission rejected.");
                            } catch { showToast("error", "Failed to reject."); }
                          }}>
                          ✗ Reject
                        </button>
                      </>
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

  // ─── 3D Visualizer View ──────────────────────────────────────────────────
  const VisualizerView = () => {
    const planningMine = filterPlanningDrawings().filter((d) =>
      d.sentTo.some((s) => s.role === "3D Visualizer")
    );
    const detailMine = filterDrawingsForRole("3D Visualizer").filter(
      (d) => d.drawingType !== "Planning"
    );
    const pendingCount = mySubmissions.filter((s) => s.status === "Pending").length;

    return (
      <div>
        <div className="dms-top-bar">
          <div className="dms-section-title">
            🏗️ Planning Drawings ({planningMine.length})
          </div>
          <button className="dms-btn dms-btn-purple" onClick={() => setModal("visualizerRequest")}>
            + Request Planning Drawing
          </button>
        </div>

        <div className="dms-info-box dms-info-box-purple" style={{ marginBottom: 16 }}>
          Planning drawings are exclusively for you. View them and submit your 3D renders for Architect approval.
        </div>

        {loading ? (
          <div className="dms-card dms-empty-box">Loading drawings…</div>
        ) : planningMine.length === 0 ? (
          <div className="dms-card dms-empty-box">
            No planning drawings assigned yet. Use <strong>+ Request Planning Drawing</strong> to request one.
          </div>
        ) : (
          <div className="dms-card">
            <table className="dms-table">
              <thead>
                <tr>
                  {["Drawing Name", "Project", "Revision", "Received", ""].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planningMine.map((d) => {
                  const sentInfo  = d.sentTo.find((s) => s.role === "3D Visualizer");
                  // ── FIX 3b: revision shown is always d.revision (updated via handleRevisionIncrement)
                  const subs = mySubmissions
                    .filter((s) => String(s.drawingId) === String(d.id))
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                  const latestSub   = subs[0];
                  const hasPending  = latestSub?.status === "Pending";
                  const hasApproved = latestSub?.status === "Approved";
                  const hasRejected = latestSub?.status === "Rejected";
                  const nextSubmitRevision = d.revision; // always current

                  return (
                    <tr key={d.id} className={hoveredRow === d.id ? "hovered" : ""}
                      onMouseEnter={() => setHoveredRow(d.id)}
                      onMouseLeave={() => setHoveredRow(null)}>
                      <td>
                        <strong style={{ color: "var(--ink)" }}>{d.drawingName}</strong>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>Planning</div>
                      </td>
                      <td><span style={{ color: "var(--ink-3)" }}>{d.projectName}</span></td>
                      <td>
                        {/* ── FIX 3c: badge updates as soon as architect increments */}
                        <span className="dms-revision dms-revision-purple">{d.revision}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(sentInfo?.sentAt)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button className="dms-btn dms-btn-ghost"
                            onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                            View
                          </button>
                          {hasApproved ? (
                            <span className="dms-badge dms-badge-approved">✓ Approved</span>
                          ) : hasPending ? (
                            <span className="dms-badge dms-badge-pending">⏳ Under Review</span>
                          ) : (
                            <button className="dms-btn dms-btn-purple"
                              onClick={() => { setSelectedDrawing(d); setModal("submit3D"); }}
                              title={hasRejected ? `Resubmit for ${nextSubmitRevision}` : `Submit for ${nextSubmitRevision}`}>
                              {hasRejected ? `🔁 Resubmit (${nextSubmitRevision})` : `🎨 Submit Render (${nextSubmitRevision})`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Drawings */}
        {detailMine.length > 0 && (
          <>
            <div className="dms-section-subtitle" style={{ marginTop: 24, marginBottom: 8 }}>
              <span className="dms-tag dms-tag-blue">Detail</span>
              Detail Drawings Sent to Me ({detailMine.length})
            </div>
            <div className="dms-card">
              <table className="dms-table">
                <thead>
                  <tr>
                    {["Drawing Name", "Project", "Revision", "Received", ""].map((h, i) => <th key={i}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {detailMine.map((d) => {
                    const sentInfo    = d.sentTo.find((s) => s.role === "3D Visualizer");
                    const subs        = mySubmissions
                      .filter((s) => String(s.drawingId) === String(d.id))
                      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                    const latestSub   = subs[0];
                    const hasPending  = latestSub?.status === "Pending";
                    const hasApproved = latestSub?.status === "Approved";
                    const hasRejected = latestSub?.status === "Rejected";
                    return (
                      <tr key={d.id} className={hoveredRow === d.id ? "hovered" : ""}
                        onMouseEnter={() => setHoveredRow(d.id)}
                        onMouseLeave={() => setHoveredRow(null)}>
                        <td><strong style={{ color: "var(--ink)" }}>{d.drawingName}</strong></td>
                        <td><span style={{ color: "var(--ink-3)" }}>{d.projectName}</span></td>
                        <td><span className="dms-revision">{d.revision}</span></td>
                        <td><span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(sentInfo?.sentAt)}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button className="dms-btn dms-btn-ghost"
                              onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                              View
                            </button>
                            {hasApproved ? (
                              <span className="dms-badge dms-badge-approved">✓ Approved</span>
                            ) : hasPending ? (
                              <span className="dms-badge dms-badge-pending">⏳ Under Review</span>
                            ) : (
                              <button className="dms-btn dms-btn-purple"
                                onClick={() => { setSelectedDrawing(d); setModal("submit3D"); }}>
                                {hasRejected ? "🔁 Resubmit" : "🎨 Submit Render"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Submission History */}
        <div className="dms-section-title" style={{ marginTop: 32, marginBottom: 12 }}>
          My Submissions
          {pendingCount > 0 && <span className="dms-notif-badge" style={{ marginLeft: 8 }}>{pendingCount} awaiting review</span>}
        </div>
        {mySubmissions.length === 0 ? (
          <div className="dms-card dms-empty-box" style={{ marginTop: 0 }}>No renders submitted yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mySubmissions.map((sub) => (
              <div key={sub.id} className={`dms-req-card${sub.status === "Approved" ? " seen" : ""}`}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                    {sub.drawingName}
                    <span className={badgeClass(sub.status)} style={{ marginLeft: 8 }}>{sub.status}</span>
                    {sub.drawingRevision && (
                      <span className="dms-revision dms-revision-purple" style={{ marginLeft: 8, fontSize: 11, height: 20, minWidth: 28 }}>
                        {sub.drawingRevision}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    Project: <span style={{ color: "var(--amber)", fontWeight: 600 }}>{sub.projectName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
                    {sub.fileName} · Submitted {fmt(sub.submittedAt)}
                  </div>
                  {sub.status === "Rejected" && sub.reviewNote && (
                    <div className="dms-info-box dms-info-box-red" style={{ marginTop: 8, fontSize: 12 }}>
                      <strong>Feedback:</strong> {sub.reviewNote}
                    </div>
                  )}
                  {sub.status === "Approved" && (
                    <div className="dms-info-box dms-info-box-green" style={{ marginTop: 8, fontSize: 12 }}>
                      ✓ Approved by Architect {sub.reviewedAt ? `on ${fmt(sub.reviewedAt)}` : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Recipient View ──────────────────────────────────────────────────────
  const RecipientView = ({ role }) => {
    const canRequest = CAN_REQUEST_ROLES.has(role);
    const mine = filterDrawingsForRole(role).filter((d) =>
      role === "3D Visualizer" ? true : d.drawingType !== "Planning"
    );
    return (
      <div>
        <div className="dms-top-bar">
          <div className="dms-section-title">
            {isArchitectPreview ? `All drawings sent to ${role} (${mine.length})` : `Drawings Sent to Me (${mine.length})`}
          </div>
          {canRequest && !isArchitectPreview && (
            <button className="dms-btn dms-btn-ghost" onClick={() => setModal("request")}>
              + Request Detail Drawing
            </button>
          )}
        </div>
        {loading ? (
          <div className="dms-card dms-empty-box">Loading drawings…</div>
        ) : mine.length === 0 ? (
          <div className="dms-card dms-empty-box">
            {isArchitectPreview ? `No drawings sent to ${role} yet.` : "No drawings have been sent to you yet."}
          </div>
        ) : (
          <div className="dms-card">
            <table className="dms-table">
              <thead>
                <tr>
                  {["Drawing Name", "Project", "Type", "Revision", "Received", ""].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mine.map((d) => {
                  const sentInfo = d.sentTo.find((s) => s.role === role);
                  return (
                    <tr key={d.id} className={hoveredRow === d.id ? "hovered" : ""}
                      onMouseEnter={() => setHoveredRow(d.id)}
                      onMouseLeave={() => setHoveredRow(null)}>
                      <td>
                        <strong style={{ color: "var(--ink)" }}>{d.drawingName}</strong>
                      </td>
                      <td><span style={{ color: "var(--ink-3)" }}>{d.projectName}</span></td>
                      <td><DrawingTypeTag type={d.drawingType} /></td>
                      <td><span className="dms-revision">{d.revision}</span></td>
                      <td><span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{fmt(sentInfo?.sentAt)}</span></td>
                      <td>
                        <button className="dms-btn dms-btn-ghost"
                          onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
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
    <div className="dms-card dms-empty-box" style={{ padding: 64 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>Access Restricted</div>
      <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
        Your role (<strong>{currentUser?.role || "unknown"}</strong>) does not have access to this system.
      </div>
    </div>
  );

  const ALL_VIEWS = ["Architect","Quantity Surveyor","Site Engineer","Program Coordinator","Client","3D Visualizer"];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dms-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="dms-header">
        <h1 className="dms-header-title">Drawing Management System</h1>
        {activeRole && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{currentUser.name}</span>
            <RolePill role={activeRole} />
          </div>
        )}
      </header>

      {activeRole === "Architect" && (
        <div className="dms-role-bar">
          {ALL_VIEWS.map((role) => (
            <button key={role}
              className={`dms-role-btn${architectViewAs === role ? " active" : ""}`}
              onClick={() => {
                setArchitectViewAs(role);
                setSelectedDrawing(null);
                setSelectedRequest(null);
                setModal(null);
              }}>
              {role}
            </button>
          ))}
        </div>
      )}

      <div className="dms-content">
        {!activeRole                        && <NoAccessView />}
        {viewRole === "Architect"           && <ArchitectView />}
        {viewRole === "Quantity Surveyor"   && <RecipientView role="Quantity Surveyor" />}
        {viewRole === "Site Engineer"       && <RecipientView role="Site Engineer" />}
        {viewRole === "Program Coordinator" && <RecipientView role="Program Coordinator" />}
        {viewRole === "Client"              && <RecipientView role="Client" />}
        {viewRole === "3D Visualizer"       &&
          (isArchitectPreview ? <RecipientView role="3D Visualizer" /> : <VisualizerView />)
        }
      </div>

      {/* ── Modals ── */}
      {modal === "upload" && (
        <UploadModal uf={uf} setUf={setUf} projects={projects} fileRef={fileRef}
          handleFileChange={handleFileChange} handleUpload={handleUpload}
          onClose={closeModal} drawings={drawings} />
      )}

      {modal === "visualizerRequest" && (
        <VisualizerRequestModal projects={projects} currentUserId={currentUser.id}
          onSent={() => showToast("success", "Request sent to Architect.")}
          onClose={closeModal} />
      )}

      {modal === "requestDetail" && selectedRequest && (
        <RequestDetailModal req={selectedRequest} setRequests={setRequests} onClose={closeModal} />
      )}

      {modal === "planningDetail" && selectedDrawing && (
        <PlanningDrawingDetailModal
          d={selectedDrawing}
          currentUserId={currentUser.id}
          sendTo={sendTo}
          onRevisionIncrement={handleRevisionIncrement}
          onClose={() => { closeModal(); loadAllSubmissions(); }}
        />
      )}

      {modal === "detail" && selectedDrawing && (
        <DrawingDetailModal d={selectedDrawing} fileBlobs={fileBlobs}
          sendTo={sendTo} currentUserId={currentUser.id} onClose={closeModal} />
      )}

      {modal === "recipientDetail" && selectedDrawing && (
        <RecipientDetailModal d={selectedDrawing} role={viewRole} onClose={closeModal} />
      )}

      {modal === "submit3D" && selectedDrawing && (
        <Submit3DModal drawing={selectedDrawing} currentUserId={currentUser.id}
          onSubmitted={() => { showToast("success", "Render submitted!"); loadMySubmissions(); }}
          onClose={closeModal} />
      )}
    </div>
  );
}