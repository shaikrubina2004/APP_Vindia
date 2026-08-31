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

// Note field for the visualizer's "Request Planning Drawing" flow starts blank —
// the visualizer writes their own message rather than editing a canned one.
const DEFAULT_REQUEST_NOTE = "";

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
    projectId:       row.project_id != null ? String(row.project_id) : null,
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

// ─── Compact Submission Card ──────────────────────────────────────────────
// Same visual shape as .dms-plan-card (colored top bar, tag/rev row, title,
// project line, divider, field + button row), just smaller via the
// `dms-plan-card-compact` modifier — used for both the 3D Visualizer's "My
// Submissions" list and the Architect's "Approvals" list so both stay
// visually consistent with the Planning-drawing cards. Nothing from the
// original row layout is dropped: status, revision, filename, submitted
// date, and (in the modal opened via View/Review) review notes/approval
// date are all still reachable.
function SubmissionCard({ sub, showSubmitter, onView }) {
  const statusClass =
    sub.status === "Approved" ? "dms-plan-card-approved"
    : sub.status === "Rejected" ? "dms-plan-card-rejected"
    : "dms-plan-card-pending";

  return (
    <article className={`dms-plan-card dms-plan-card-compact ${statusClass}`}>
      <div className="dms-plan-card-top">
        <span className={badgeClass(sub.status)}>{sub.status}</span>
        <span className="dms-plan-card-rev">{sub.drawingRevision || "R1"}</span>
      </div>

      <h3 className="dms-plan-card-name">{sub.drawingName}</h3>
      <div className="dms-plan-card-project">
        {sub.projectName}
        {showSubmitter && sub.submitterName ? <> · {sub.submitterName}</> : null}
      </div>

      <div className="dms-plan-card-sent">
        <span className="dms-mini-chip" title={sub.fileName}>{sub.fileName || "file"}</span>
      </div>

      <div className="dms-plan-card-block">
        <div className="dms-plan-card-field">
          <span className="dms-plan-card-field-label">Submitted</span>
          <span className="dms-plan-card-field-value">{fmt(sub.submittedAt)}</span>
        </div>
        <button className="dms-btn dms-btn-ghost dms-plan-card-btn" onClick={() => onView(sub)}>
          {sub.status === "Pending" ? "Review →" : "View →"}
        </button>
      </div>
    </article>
  );
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
function SubmissionReviewModal({ sub, currentUserId, onReview, onClose, readOnly }) {
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
        !readOnly && sub.status === "Pending" ? (
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
              <div className="dms-label">{readOnly ? "Architect Feedback" : "Review Note"}</div>
              <pre className="dms-note-pre" style={{ fontSize: 12 }}>{sub.reviewNote}</pre>
            </div>
          )}
          {sub.notes && (
            <div className="dms-form-field">
              <div className="dms-label">Visualizer Notes</div>
              <pre className="dms-note-pre" style={{ fontSize: 12 }}>{sub.notes}</pre>
            </div>
          )}
          {!readOnly && sub.status === "Pending" && (
            <div className="dms-form-field">
              <div className="dms-label">Review Note (optional)</div>
              <textarea className="dms-input" style={{ minHeight: 80 }}
                placeholder="Add feedback for the 3D visualizer…"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          {readOnly && sub.status === "Pending" && (
            <div className="dms-info-box dms-info-box-gold" style={{ fontSize: 12 }}>
              ⏳ Waiting on the Architect to review this submission.
            </div>
          )}
        </div>
        <div>
          <div className="dms-label" style={{ marginBottom: 8 }}>Render File</div>
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

  const [previewRevision, setPreviewRevision] = useState(null);

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

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/architect-designs/${d.id}/revisions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = (json?.data || json || []).map(normaliseRevision);
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRevisions(list);

        const withFile = list.find((r) => r.fileUrl);
        if (withFile) {
          setPreviewRevision(withFile);
        } else {
          if (d.fileUrl) {
            setPreviewRevision({ revision: d.revision, fileUrl: d.fileUrl, fileName: d.fileName });
          }
        }
      } catch (e) {
        console.error("Revision history load failed:", e);
        setRevisions([]);
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

      await onRevisionIncrement(d.id, newRevLabel, fileUrl, addRevFile.name);

      setToast3D({ type: "success", message: `Revision ${newRevLabel} uploaded.` });

      const newRev = {
        id:        uid(),
        revision:  newRevLabel,
        fileUrl,
        fileName:  addRevFile.name,
        createdAt: new Date().toISOString(),
      };
      setRevisions((prev) => [newRev, ...prev]);
      setPreviewRevision(newRev);
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

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

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

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <div className="dms-label" style={{ marginBottom: 8 }}>
                File Preview
                {previewRevision && (
                  <span className="dms-revision dms-revision-purple" style={{ marginLeft: 8, fontSize: 11 }}>
                    {previewRevision.revision}
                  </span>
                )}
              </div>
              <FilePreview
                fileUrl={previewRevision?.fileUrl || ""}
                fileName={previewRevision?.fileName || ""}
                maxHeight={280}
              />
            </div>

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

// ─── Visualizer Send-to-Architect Modal (a.k.a. "Upload Drawing" for the 3D Visualizer) ─────
// Lets the 3D Visualizer send a file straight to the architect assigned to a
// project — no prior drawing/send from the architect required. Also serves as the
// single entry point for submitting renders: revision is auto-computed per project.
function SendToArchitectModal({ projects, currentUserId, mySubmissions, onSubmitted, onClose }) {
  const [projectId, setProjectId] = useState("");
  const [file,      setFile]      = useState(null);
  const [fileName,  setFileName]  = useState("");
  const [notes,     setNotes]     = useState("");
  const [busy,      setBusy]      = useState(false);
  const fileRef = useRef(null);

  const assignableProjects = projects.filter((p) => p.architectId);
  const selectedProject = projects.find((p) => String(p.id) === String(projectId));

  // Auto-increment revision based on prior submissions to this same project.
  // Matched by project ID (not name) so casing/formatting differences between
  // `project.name` and the submission's `project_name` field can't cause a
  // false "no prior submissions" result — that bug was resetting every
  // resubmission back to R1 regardless of actual history.
  const autoRevision = React.useMemo(() => {
    if (!selectedProject) return null;
    const priorForProject = (mySubmissions || []).filter(
      (s) => String(s.projectId) === String(selectedProject.id)
    );
    if (priorForProject.length === 0) return null;

    const revisions = priorForProject.map((s) => s.drawingRevision).filter(Boolean);
    if (revisions.length === 0) {
      return { current: null, next: `R${priorForProject.length + 1}` };
    }
    const sorted = [...revisions].sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || ["0"])[0], 10);
      const nb = parseInt((b.match(/\d+/) || ["0"])[0], 10);
      return nb - na;
    });
    const latest = sorted[0];
    return { current: latest, next: nextRevision(latest) };
  }, [selectedProject, mySubmissions]);

  const revisionToSend = autoRevision ? autoRevision.next : "R1";

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!projectId) return alert("Please select a project.");
    if (!file) return alert("Please choose a file to send.");
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
      await fetch("/api/architect-designs/submit-to-architect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:       parseInt(projectId, 10),
          submitted_by:     currentUserId,
          file_url:         uploadedUrl,
          file_name:        uploadedName,
          notes:            notes.trim(),
          drawing_revision: revisionToSend,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Request failed");
        }
      });
      onSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to send to architect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Upload Drawing"
      onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="dms-btn dms-btn-purple" onClick={handleSubmit} disabled={busy}>
            {busy ? "Sending…" : "Send to Architect"}
          </button>
        </>
      }
    >
      <div className="dms-form-field">
        <label className="dms-label">
          Project *
          {selectedProject && (
            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--purple)" }}>
              → Revision <strong>{revisionToSend}</strong>
            </span>
          )}
        </label>
        <select className="dms-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select a project…</option>
          {assignableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {assignableProjects.length === 0 && (
          <div className="dms-info-box dms-info-box-red" style={{ marginTop: 10, fontSize: 12 }}>
            No projects currently have an architect assigned. Ask your coordinator to assign one first.
          </div>
        )}
      </div>

      <div className="dms-form-field">
        <label className="dms-label">File *</label>
        <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }}
          onChange={handleFileChange} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="dms-btn dms-btn-ghost" onClick={() => fileRef.current?.click()}>
            Choose File
          </button>
          {fileName && <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{fileName}</span>}
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
      onSent({ projectId, note: note.trim() });
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
          placeholder="e.g. Requesting the latest revision of the planning drawing for this project…"
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

// ─── Request Detail Modal ────────────────────────────────────────────────────
function RequestDetailModal({ req, onMarkSeen, onClose }) {
  if (!req) return null;
  return (
    <Modal title="Drawing Request Details" onClose={onClose}
      footer={
        <div className="dms-modal-foot-spread">
          {!req.seen && (
            <button className="dms-btn dms-btn-success" onClick={async () => {
              await onMarkSeen(req.id);
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

// ─── Delete Drawing Confirm Modal ────────────────────────────────────────────
function DeleteDrawingModal({ drawing, busy, onConfirm, onClose }) {
  if (!drawing) return null;
  const wasSent = drawing.sentTo && drawing.sentTo.length > 0;
  return (
    <Modal title="Delete Drawing" onClose={onClose}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="dms-btn dms-btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : "Delete Permanently"}
          </button>
        </>
      }>
      <div className="dms-info-box dms-info-box-red">
        ⚠️ You're about to permanently delete <strong>{drawing.drawingName}</strong>{" "}
        (<strong>{drawing.revision}</strong>). This cannot be undone.
        {wasSent && (
          <> It has already been sent to {drawing.sentTo.length} recipient{drawing.sentTo.length > 1 ? "s" : ""}, who will lose access to it.</>
        )}
      </div>
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
  const [fileBlobs,      setFileBlobs]      = useState({});
  const fileRef = useRef(null);

  const [uf, setUf] = useState({
    projectId: "", drawingName: "", drawingType: "Working Drawing",
    revision: "R1", file: null, fileName: "", blobKey: null,
  });

  const [architectViewAs, setArchitectViewAs] = useState("Architect");
  const [architectSection, setArchitectSection] = useState("Drawings");
  const [visualizerSection, setVisualizerSection] = useState("Drawings");
  // Requests sent this session — no "list my sent requests" endpoint exists yet,
  // so this is tracked client-side. It resets on page reload. If you want it to
  // persist, add a GET endpoint (e.g. /api/architect-designs/requests/mine) and
  // fetch it the same way `loadRequests` does for the architect side.
  const [myRequestsSent, setMyRequestsSent] = useState([]);
  const [drawingTypeFilter, setDrawingTypeFilter] = useState("All");
  const [drawingProjectFilter, setDrawingProjectFilter] = useState("");
  const [drawingSearch, setDrawingSearch] = useState("");
  const [showPreviewPicker, setShowPreviewPicker] = useState(false);

  // Delete-drawing flow
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy,   setDeleteBusy]   = useState(false);

  const viewRole           = activeRole === "Architect" ? architectViewAs : activeRole;
  const isArchitectPreview = activeRole === "Architect" && architectViewAs !== "Architect";

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
            architectId:    p.architect_id     != null ? Number(p.architect_id)     : null,
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
    if (activeRole !== "Architect" || !currentUser?.id) return;
    try {
      const res  = await getRequests(currentUser.id);
      const rows = res?.data || res || [];
      setRequests(rows.map(normaliseRequest));
    } catch (err) {
      console.error(err);
    }
  }, [activeRole, currentUser?.id]);

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

  // ── Mark a drawing request as seen (persisted) ────────────────────────────
  const markRequestSeen = useCallback(async (reqId) => {
    // Optimistic update so the UI feels instant…
    setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, seen: true } : r)));
    try {
      const res = await fetch(`/api/architect-designs/requests/${reqId}/seen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen_by: currentUser.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Failed to persist seen status:", err);
      showToast("error", "Marked seen locally, but the server didn't confirm it — it may reappear as unseen.");
    }
  }, [currentUser.id, showToast]);

  // ── Delete a drawing (persisted) ──────────────────────────────────────────
  const requestDeleteDrawing = useCallback((drawing) => {
    setDeleteTarget(drawing);
  }, []);

  const confirmDeleteDrawing = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/architect-designs/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrawings((prev) => prev.filter((d) => String(d.id) !== String(deleteTarget.id)));
      setSelectedDrawing((prev) => (prev && String(prev.id) === String(deleteTarget.id) ? null : prev));
      showToast("success", `"${deleteTarget.drawingName}" deleted.`);
      setDeleteTarget(null);
      setModal((m) => (m === "detail" || m === "planningDetail" ? null : m));
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to delete drawing.");
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTarget, showToast]);

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

  const handleRevisionIncrement = useCallback(async (drawingId, newRevision, newFileUrl, newFileName) => {
    try {
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
    const pendingRenderCount = allSubmissions.filter((s) => s.status === "Pending").length;
    const workingDrawings = drawings.filter((d) => d.drawingType === "Working Drawing");
    const detailDrawings  = drawings.filter((d) => d.drawingType === "Detail Drawing");
    const planningDrawings = drawings.filter((d) => d.drawingType === "Planning");

    const filteredDrawings = drawings.filter((d) => {
      if (drawingTypeFilter !== "All" && d.drawingType !== drawingTypeFilter) return false;
      if (drawingProjectFilter && String(d.projectId) !== String(drawingProjectFilter)) return false;
      if (drawingSearch.trim() && !d.drawingName.toLowerCase().includes(drawingSearch.trim().toLowerCase())) return false;
      return true;
    });


    const SECTION_TABS = [
      { key: "Drawings",  label: `Drawings (${drawings.length})` },
      { key: "Requests",  label: "Requests", count: unseenRequests.length },
      { key: "Approvals", label: "Approvals", count: pendingRenderCount },
    ];

    const cardTypeClass = (type) =>
      type === "Working Drawing" ? "dms-plan-card-working"
      : type === "Detail Drawing" ? "dms-plan-card-detail"
      : "dms-plan-card-planning";

    const DrawingCards = ({ list, emptyMsg }) => {
      if (list.length === 0) {
        return <div className="dms-empty-box">{emptyMsg}</div>;
      }
      return (
        <div className="dms-card-grid">
          {list.map((d) => (
            <article key={d.id} className={`dms-plan-card ${cardTypeClass(d.drawingType)}`}>
              <div className="dms-plan-card-top">
                <DrawingTypeTag type={d.drawingType} />
                <span className="dms-plan-card-rev">{d.revision}</span>
              </div>

              <h3 className="dms-plan-card-name">{d.drawingName}</h3>
              <div className="dms-plan-card-project">{d.projectName}</div>

              <div className="dms-plan-card-sent">
                {d.drawingType === "Planning" ? (
                  d.sentTo.some((s) => s.role === "3D Visualizer") ? (
                    <span className="dms-mini-chip">Sent · 3D Visualizer</span>
                  ) : (
                    <span className="dms-plan-card-notsent">Not yet sent</span>
                  )
                ) : d.sentTo.length === 0 ? (
                  <span className="dms-plan-card-notsent">Not yet sent</span>
                ) : (
                  d.sentTo.map((s) => (
                    <span key={s.role} className="dms-mini-chip" title={s.role}>
                      {s.role === "3D Visualizer" ? "3D" : s.role.split(" ").map((w) => w[0]).join("")}
                    </span>
                  ))
                )}
              </div>

              <div className="dms-plan-card-block">
                <div className="dms-plan-card-field">
                  <span className="dms-plan-card-field-label">Uploaded</span>
                  <span className="dms-plan-card-field-value">{fmt(d.uploadedAt)}</span>
                </div>
              </div>

              <div className="dms-plan-card-actions">
                <button className="dms-btn dms-btn-ghost dms-plan-card-btn"
                  onClick={() => {
                    setSelectedDrawing(d);
                    setModal(d.drawingType === "Planning" ? "planningDetail" : "detail");
                  }}>
                  View →
                </button>
                <button
                  className="dms-btn dms-btn-danger-ghost dms-plan-card-btn-icon"
                  title="Delete drawing"
                  onClick={(e) => { e.stopPropagation(); requestDeleteDrawing(d); }}
                >
                  🗑
                </button>
              </div>
            </article>
          ))}
        </div>
      );
    };

    return (
      <div>
        {/* Section tabs replace the old role-switcher tab bar */}
        <div className="dms-role-bar">
          {SECTION_TABS.map((s) => (
            <button key={s.key}
              className={`dms-role-btn${architectSection === s.key ? " active" : ""}`}
              onClick={() => setArchitectSection(s.key)}>
              {s.label}
              {!!s.count && <span className="dms-notif-badge" style={{ marginLeft: 6 }}>{s.count}</span>}
            </button>
          ))}
        </div>

        {architectSection === "Drawings" && (
          <div>
            <div className="dms-stat-strip">
              <div className="dms-stat-block">
                <span className="dms-stat-number">{drawings.length}</span>
                <span className="dms-stat-caption">Total drawings</span>
              </div>
              <div className="dms-stat-block">
                <span className="dms-stat-number">{workingDrawings.length}</span>
                <span className="dms-stat-caption">Working drawings</span>
              </div>
              <div className="dms-stat-block">
                <span className="dms-stat-number">{planningDrawings.length}</span>
                <span className="dms-stat-caption">Planning drawings</span>
              </div>
              <div className={`dms-stat-block${pendingRenderCount > 0 ? " dms-stat-block-alert" : ""}`}>
                <span className="dms-stat-number">{pendingRenderCount}</span>
                <span className="dms-stat-caption">Renders pending</span>
              </div>
            </div>

            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                Drawings <span className="dms-count-chip">{filteredDrawings.length}</span>
              </h2>
              <button className="dms-btn dms-btn-primary" onClick={() => setModal("upload")}>
                + Upload Drawing
              </button>
            </div>

            <div className="dms-toolbar">
              <div className="dms-chip-group">
                <button className={`dms-chip${drawingTypeFilter === "All" ? " active" : ""}`}
                  onClick={() => setDrawingTypeFilter("All")}>All</button>
                {DRAWING_TYPES.map((t) => (
                  <button key={t} className={`dms-chip${drawingTypeFilter === t ? " active" : ""}`}
                    onClick={() => setDrawingTypeFilter(t)}>{t}</button>
                ))}
              </div>
              <select className="dms-input dms-toolbar-select"
                value={drawingProjectFilter} onChange={(e) => setDrawingProjectFilter(e.target.value)}>
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              <input className="dms-input dms-toolbar-search"
                placeholder="Search drawing name…"
                value={drawingSearch} onChange={(e) => setDrawingSearch(e.target.value)} />
            </div>

            {loading ? (
              <div className="dms-empty-box"><div className="dms-spinner" />Loading drawings…</div>
            ) : (
              <DrawingCards list={filteredDrawings} emptyMsg="No drawings match these filters." />
            )}

          </div>
        )}

        {architectSection === "Requests" && (
          <div>
            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                Incoming Requests
                {unseenRequests.length > 0 && (
                  <span className="dms-count-chip dms-count-chip-alert">{unseenRequests.length}</span>
                )}
              </h2>
            </div>
            {requests.length === 0 ? (
              <div className="dms-empty-box">No requests yet.</div>
            ) : (
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
                          onClick={(e) => { e.stopPropagation(); markRequestSeen(req.id); }}>
                          Mark Seen
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {architectSection === "Approvals" && (
          <div>
            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                3D Render Submissions
                {pendingRenderCount > 0 && (
                  <span className="dms-count-chip dms-count-chip-alert">{pendingRenderCount} pending</span>
                )}
              </h2>
            </div>
            {allSubmissions.length === 0 ? (
              <div className="dms-empty-box">No renders submitted yet.</div>
            ) : (
              <div className="dms-card-grid">
                {allSubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    showSubmitter={true}
                    onView={(s) => { setModal("reviewSubmission"); setSelectedRequest(null); setReviewTarget(s); }}
                  />
                ))}
              </div>
            )}
          </div>
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
    const totalDrawings = planningMine.length + detailMine.length;

    const SECTION_TABS = [
      { key: "Drawings",    label: `Drawings (${totalDrawings})` },
      { key: "Requests",    label: "Requests", count: myRequestsSent.length },
      { key: "Submissions", label: "Submissions", count: pendingCount },
    ];

    return (
      <div>
        <div className="dms-role-bar">
          {SECTION_TABS.map((s) => (
            <button key={s.key}
              className={`dms-role-btn${visualizerSection === s.key ? " active" : ""}`}
              onClick={() => setVisualizerSection(s.key)}>
              {s.label}
              {!!s.count && <span className="dms-notif-badge" style={{ marginLeft: 6 }}>{s.count}</span>}
            </button>
          ))}
        </div>

        {visualizerSection === "Drawings" && (
          <div>
            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                Planning Drawings <span className="dms-count-chip">{planningMine.length}</span>
              </h2>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="dms-btn dms-btn-ghost" onClick={() => setModal("visualizerRequest")}>
                  + Request Planning Drawing
                </button>
                <button className="dms-btn dms-btn-purple" onClick={() => setModal("sendToArchitect")}>
                  Upload Drawing
                </button>
              </div>
            </div>

            {loading ? (
              <div className="dms-empty-box">Loading drawings…</div>
            ) : planningMine.length === 0 ? (
              <div className="dms-empty-box">
                No planning drawings assigned yet. Use <strong>+ Request Planning Drawing</strong> to request one.
              </div>
            ) : (
              <div className="dms-card-grid">
                {planningMine.map((d) => {
                  const sentInfo  = d.sentTo.find((s) => s.role === "3D Visualizer");
                  const subs = mySubmissions
                    .filter((s) => String(s.drawingId) === String(d.id))
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                  const latestSub   = subs[0];
                  const hasPending  = latestSub?.status === "Pending";
                  const hasApproved = latestSub?.status === "Approved";
                  const hasRejected = latestSub?.status === "Rejected";

                  return (
                    <article key={d.id} className="dms-plan-card dms-plan-card-planning">
                      <div className="dms-plan-card-top">
                        <DrawingTypeTag type="Planning" />
                        <span className="dms-plan-card-rev">{d.revision}</span>
                      </div>
                      <h3 className="dms-plan-card-name">{d.drawingName}</h3>
                      <div className="dms-plan-card-project">{d.projectName}</div>
                      <div className="dms-plan-card-sent">
                        {hasApproved ? (
                          <span className="dms-badge dms-badge-approved">✓ Approved</span>
                        ) : hasPending ? (
                          <span className="dms-badge dms-badge-pending">⏳ Under review</span>
                        ) : hasRejected ? (
                          <span className="dms-badge dms-badge-rejected">Rejected — resubmit via Upload Drawing</span>
                        ) : (
                          <span className="dms-plan-card-notsent">No render submitted</span>
                        )}
                      </div>
                      <div className="dms-plan-card-block">
                        <div className="dms-plan-card-field">
                          <span className="dms-plan-card-field-label">Received</span>
                          <span className="dms-plan-card-field-value">{fmt(sentInfo?.sentAt)}</span>
                        </div>
                        <button className="dms-btn dms-btn-ghost dms-plan-card-btn"
                          onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                          View →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {detailMine.length > 0 && (
              <>
                <div className="dms-section-heading" style={{ marginTop: 40 }}>
                  <h2 className="dms-section-heading-title">
                    Detail Drawings Sent to Me <span className="dms-count-chip">{detailMine.length}</span>
                  </h2>
                </div>
                <div className="dms-card-grid">
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
                      <article key={d.id} className="dms-plan-card dms-plan-card-detail">
                        <div className="dms-plan-card-top">
                          <DrawingTypeTag type="Detail Drawing" />
                          <span className="dms-plan-card-rev">{d.revision}</span>
                        </div>
                        <h3 className="dms-plan-card-name">{d.drawingName}</h3>
                        <div className="dms-plan-card-project">{d.projectName}</div>
                        <div className="dms-plan-card-sent">
                          {hasApproved ? (
                            <span className="dms-badge dms-badge-approved">✓ Approved</span>
                          ) : hasPending ? (
                            <span className="dms-badge dms-badge-pending">⏳ Under review</span>
                          ) : hasRejected ? (
                            <span className="dms-badge dms-badge-rejected">Rejected — resubmit via Upload Drawing</span>
                          ) : (
                            <span className="dms-plan-card-notsent">No render submitted</span>
                          )}
                        </div>
                        <div className="dms-plan-card-block">
                          <div className="dms-plan-card-field">
                            <span className="dms-plan-card-field-label">Received</span>
                            <span className="dms-plan-card-field-value">{fmt(sentInfo?.sentAt)}</span>
                          </div>
                          <button className="dms-btn dms-btn-ghost dms-plan-card-btn"
                            onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                            View →
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {visualizerSection === "Requests" && (
          <div>
            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                My Requests <span className="dms-count-chip">{myRequestsSent.length}</span>
              </h2>
              <button className="dms-btn dms-btn-purple" onClick={() => setModal("visualizerRequest")}>
                + Request Planning Drawing
              </button>
            </div>
            {myRequestsSent.length === 0 ? (
              <div className="dms-empty-box">
                You haven't requested any planning drawings this session. Use <strong>+ Request Planning Drawing</strong> above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myRequestsSent.map((r) => (
                  <div key={r.id} className="dms-req-card">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                        Request sent to Architect
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        Project: <span style={{ color: "var(--amber)", fontWeight: 600 }}>{r.projectName || "—"}</span>
                      </div>
                      {r.note && (
                        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4, fontStyle: "italic" }}>
                          "{r.note.slice(0, 80)}{r.note.length > 80 ? "…" : ""}"
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{fmt(r.sentAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {visualizerSection === "Submissions" && (
          <div>
            <div className="dms-section-heading">
              <h2 className="dms-section-heading-title">
                My Submissions
                {pendingCount > 0 && <span className="dms-count-chip dms-count-chip-alert">{pendingCount} awaiting review</span>}
              </h2>
              <button className="dms-btn dms-btn-primary" onClick={() => setModal("sendToArchitect")}>
                🎨 Upload Drawing
              </button>
            </div>

            {mySubmissions.length === 0 ? (
              <div className="dms-empty-box">No renders submitted yet.</div>
            ) : (
              <div className="dms-card-grid">
                {mySubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    showSubmitter={false}
                    onView={(s) => { setModal("viewMySubmission"); setSelectedRequest(null); setReviewTarget(s); }}
                  />
                ))}
              </div>
            )}
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
        <div className="dms-section-heading">
          <h2 className="dms-section-heading-title">
            {isArchitectPreview ? `All Drawings Sent to ${role}` : "Drawings Sent to Me"}
            <span className="dms-count-chip">{mine.length}</span>
          </h2>
          {canRequest && !isArchitectPreview && (
            <button className="dms-btn dms-btn-ghost" onClick={() => setModal("request")}>
              + Request Detail Drawing
            </button>
          )}
        </div>
        {loading ? (
          <div className="dms-empty-box">Loading drawings…</div>
        ) : mine.length === 0 ? (
          <div className="dms-empty-box">
            {isArchitectPreview ? `No drawings sent to ${role} yet.` : "No drawings have been sent to you yet."}
          </div>
        ) : (
          <div className="dms-card-grid">
            {mine.map((d) => {
              const sentInfo = d.sentTo.find((s) => s.role === role);
              return (
                <article key={d.id} className={`dms-plan-card ${
                  d.drawingType === "Working Drawing" ? "dms-plan-card-working"
                  : d.drawingType === "Detail Drawing" ? "dms-plan-card-detail"
                  : "dms-plan-card-planning"}`}>
                  <div className="dms-plan-card-top">
                    <DrawingTypeTag type={d.drawingType} />
                    <span className="dms-plan-card-rev">{d.revision}</span>
                  </div>
                  <h3 className="dms-plan-card-name">{d.drawingName}</h3>
                  <div className="dms-plan-card-project">{d.projectName}</div>
                  <div className="dms-plan-card-block">
                    <div className="dms-plan-card-field">
                      <span className="dms-plan-card-field-label">Received</span>
                      <span className="dms-plan-card-field-value">{fmt(sentInfo?.sentAt)}</span>
                    </div>
                    <button className="dms-btn dms-btn-ghost dms-plan-card-btn"
                      onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                      View →
                    </button>
                  </div>
                </article>
              );
            })}
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

  const [reviewTarget, setReviewTarget] = useState(null);

  const handleApprovalReview = async (subId, status, note) => {
    try {
      await review3DSubmission(subId, { status, reviewed_by: currentUser.id, review_note: note });
      setAllSubmissions((prev) => prev.map((s) => s.id === subId ? { ...s, status, reviewNote: note, reviewedAt: new Date().toISOString() } : s));
      showToast("success", `Submission ${status}.`);
    } catch {
      showToast("error", "Failed to update submission.");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dms-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="dms-header">
        <h1 className="dms-header-title">Drawing Management System</h1>
        {activeRole && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{currentUser.name}</span>
            <RolePill role={activeRole} />

            {/* "View as" preview is now a secondary control, not the primary nav */}
            {activeRole === "Architect" && (
              <div style={{ position: "relative" }}>
                <button
                  className="dms-btn dms-btn-ghost"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  onClick={() => setShowPreviewPicker((v) => !v)}
                  title="Preview this system as another role"
                >
                  Preview as {architectViewAs !== "Architect" ? architectViewAs : "…"}
                </button>
                {showPreviewPicker && (
                  <div className="dms-card" style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
                    padding: 6, display: "flex", flexDirection: "column", gap: 2, minWidth: 190,
                  }}>
                    {ALL_VIEWS.map((role) => (
                      <button key={role}
                        className={`dms-role-btn${architectViewAs === role ? " active" : ""}`}
                        style={{ textAlign: "left", justifyContent: "flex-start" }}
                        onClick={() => {
                          setArchitectViewAs(role);
                          setSelectedDrawing(null);
                          setSelectedRequest(null);
                          setModal(null);
                          setShowPreviewPicker(false);
                        }}>
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

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
          onSent={(payload) => {
            showToast("success", "Request sent to Architect.");
            setMyRequestsSent((prev) => [
              {
                id: uid(),
                projectName: projects.find((p) => String(p.id) === String(payload?.projectId))?.name,
                note: payload?.note,
                sentAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onClose={closeModal} />
      )}

      {modal === "sendToArchitect" && (
        <SendToArchitectModal projects={projects} currentUserId={currentUser.id}
          mySubmissions={mySubmissions}
          onSubmitted={() => { showToast("success", "Sent to Architect!"); loadMySubmissions(); }}
          onClose={closeModal} />
      )}

      {modal === "requestDetail" && selectedRequest && (
        <RequestDetailModal req={selectedRequest} onMarkSeen={markRequestSeen} onClose={closeModal} />
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

      {modal === "reviewSubmission" && reviewTarget && (
        <SubmissionReviewModal
          sub={reviewTarget}
          currentUserId={currentUser.id}
          onReview={handleApprovalReview}
          onClose={() => { setModal(null); setReviewTarget(null); }}
        />
      )}

      {modal === "viewMySubmission" && reviewTarget && (
        <SubmissionReviewModal
          sub={reviewTarget}
          currentUserId={currentUser.id}
          onReview={() => {}}
          readOnly
          onClose={() => { setModal(null); setReviewTarget(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteDrawingModal
          drawing={deleteTarget}
          busy={deleteBusy}
          onConfirm={confirmDeleteDrawing}
          onClose={() => !deleteBusy && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}