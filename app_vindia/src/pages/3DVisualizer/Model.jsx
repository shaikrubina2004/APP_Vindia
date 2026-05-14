// src/pages/3DVisualizer/Models.jsx
import { useState, useEffect, useCallback } from "react";
import { modelsApi, drawingsApi } from "../../services/modelsService";
import "./Model.css";

// ─── SVG Icons ────────────────────────────────────────────────────
const Ico = {
  Cube: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  File: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  House: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Comment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
};

// ─── Status configuration ─────────────────────────────────────────
const STATUS = {
  draft:          { label: "Draft",           color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  pending_review: { label: "Pending Review",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  approved:       { label: "Approved",        color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  rejected:       { label: "Rejected",        color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

// ─── Helpers ──────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return "—";
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ─── StatusBadge ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.draft;
  return (
    <span
      className="status-badge"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span className="status-badge__dot" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type === "success" && <Ico.Check />}
          {t.type === "error" && <Ico.Alert />}
          {t.type === "info" && <Ico.Clock />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, wide, children }) {
  if (!isOpen) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-box${wide ? " modal-box--wide" : ""}`}>
        <div className="modal-header">
          <h3 className="modal-header__title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <Ico.X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── ModelCard ────────────────────────────────────────────────────
function ModelCard({ model, currentRole, onView, onSubmit, onDelete }) {
  const isViz = currentRole === "visualizer";
  const isArch = currentRole === "architect";
  const canSubmit = isViz && ["draft", "rejected"].includes(model.status);
  const canReview = isArch && model.status === "pending_review";

  const feedbackBg = model.status === "approved" ? "#ecfdf5" : "#fef2f2";
  const feedbackBorder = model.status === "approved" ? "#6ee7b7" : "#fca5a5";

  return (
    <div className="model-card">
      {/* Thumbnail */}
      <div
        className="model-card__thumb"
        style={{ background: `linear-gradient(135deg, ${model.thumbnailColor || "#1e40af"}, #3b82f6)` }}
      >
        <Ico.Cube />
        <div className="model-card__status-badge">
          <StatusBadge status={model.status} />
        </div>
        {(model.version || 1) > 1 && (
          <div className="model-card__version">v{model.version}</div>
        )}
      </div>

      {/* Body */}
      <div className="model-card__body">
        <h4 className="model-card__title">{model.title}</h4>
        <p className="model-card__desc">{model.description || "No description provided."}</p>

        <div className="model-card__meta">
          <div className="model-card__meta-row">
            <Ico.File />
            <span>{model.drawingTitle}</span>
          </div>
          <div className="model-card__meta-row">
            <Ico.Clock />
            <span>Created {timeAgo(model.createdAt)}</span>
          </div>
          {model.submittedAt && (
            <div className="model-card__meta-row">
              <Ico.Send />
              <span>Submitted {timeAgo(model.submittedAt)}</span>
            </div>
          )}
        </div>

        {model.architectComment && (
          <div
            className="model-card__feedback"
            style={{ background: feedbackBg, border: `1px solid ${feedbackBorder}` }}
          >
            <div className="model-card__feedback-title">Architect Feedback</div>
            <p className="model-card__feedback-text">{model.architectComment}</p>
          </div>
        )}

        {/* Actions */}
        <div className="model-card__actions">
          <button className="btn btn-view-small" onClick={() => onView(model)}>
            <Ico.Eye /> View
          </button>

          {canSubmit && (
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => onSubmit(model)}>
              <Ico.Send />
              {model.status === "rejected" ? "Resubmit" : "Submit"}
            </button>
          )}

          {canReview && (
            <button className="btn btn-success" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => onView(model)}>
              <Ico.Check /> Review
            </button>
          )}

          {isViz && model.status === "draft" && (
            <button className="btn btn-icon-danger" onClick={() => onDelete(model.id)} title="Delete draft">
              <Ico.Trash />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────
function StatsBar({ models }) {
  const items = [
    { label: "Total Models",    value: models.length,                                           color: "#1d4ed8" },
    { label: "Pending Review",  value: models.filter((m) => m.status === "pending_review").length, color: "#d97706" },
    { label: "Approved",        value: models.filter((m) => m.status === "approved").length,    color: "#059669" },
    { label: "Rejected",        value: models.filter((m) => m.status === "rejected").length,    color: "#dc2626" },
  ];
  return (
    <div className="models-stats">
      {items.map((item) => (
        <div className="stat-card" key={item.label}>
          <div className="stat-card__number" style={{ color: item.color }}>{item.value}</div>
          <div className="stat-card__label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Create Model Modal ───────────────────────────────────────────
function CreateModelModal({ isOpen, onClose, drawings, onCreated, toast }) {
  const [form, setForm] = useState({ title: "", description: "", drawingId: "", fileName: "", notes: "" });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast("Title is required", "error");
    if (!form.drawingId) return toast("Please select a drawing", "error");
    setLoading(true);
    try {
      const drawing = drawings.find((d) => d.id === form.drawingId);
      const colors = ["#1e40af", "#1d4ed8", "#1e3a8a", "#0f4c81", "#1a5276"];
      await modelsApi.createModel({
        ...form,
        fileName: form.fileName || "model.fbx",
        drawingTitle: drawing?.title || "Unknown",
        projectName: drawing?.projectName || "",
        createdByName: "Mike (3D Visualizer)",
        thumbnailColor: colors[Math.floor(Math.random() * colors.length)],
      });
      toast("Model created successfully!", "success");
      setForm({ title: "", description: "", drawingId: "", fileName: "", notes: "" });
      onCreated();
      onClose();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New 3D Model">
      <div className="modal-body">
        <div className="field-group">
          <label className="field-label">Model Title *</label>
          <input className="field-input" placeholder="e.g. Block A — 3D Model v2" value={form.title} onChange={set("title")} />
        </div>

        <div className="field-group">
          <label className="field-label">Based on Drawing *</label>
          <select className="field-select" value={form.drawingId} onChange={set("drawingId")}>
            <option value="">— Select a drawing —</option>
            {drawings.map((d) => (
              <option key={d.id} value={d.id}>{d.title} ({d.projectName})</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea className="field-textarea" placeholder="Describe what this model covers..." value={form.description} onChange={set("description")} />
        </div>

        <div className="field-group">
          <label className="field-label">File Name</label>
          <input className="field-input" placeholder="model_v1.fbx" value={form.fileName} onChange={set("fileName")} />
        </div>

        <div className="field-group">
          <label className="field-label">Notes for Architect</label>
          <textarea className="field-textarea" style={{ minHeight: 70 }} placeholder="Any notes or questions for the architect..." value={form.notes} onChange={set("notes")} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Ico.Cube /> {loading ? "Creating..." : "Create Model"}
        </button>
      </div>
    </Modal>
  );
}

// ─── View / Review Modal ──────────────────────────────────────────
function ViewModelModal({ isOpen, model, onClose, currentRole, onRefresh, toast }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const isArch = currentRole === "architect";
  const isViz = currentRole === "visualizer";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await modelsApi.approveModel(model.id, comment || "Approved.");
      toast("Model approved!", "success");
      onClose();
      onRefresh();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) return toast("Please enter rejection feedback", "error");
    setLoading(true);
    try {
      await modelsApi.rejectModel(model.id, comment);
      toast("Model rejected with feedback.", "info");
      onClose();
      onRefresh();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    setLoading(true);
    try {
      await modelsApi.submitForReview(model.id);
      toast("Model resubmitted for review!", "success");
      onClose();
      onRefresh();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!model) return null;

  const feedbackApproved = model.status === "approved";
  const feedbackBg    = feedbackApproved ? "#ecfdf5" : "#fef2f2";
  const feedbackBdr   = feedbackApproved ? "#6ee7b7" : "#fca5a5";
  const feedbackColor = feedbackApproved ? "#059669" : "#dc2626";

  const detailItems = [
    { key: "Project",     val: model.projectName },
    { key: "Drawing Ref", val: model.drawingTitle },
    { key: "Created By",  val: model.createdByName },
    { key: "File",        val: model.fileName },
    { key: "Created",     val: fmtDate(model.createdAt) },
    { key: "Submitted",   val: fmtDate(model.submittedAt) },
    ...(model.reviewedAt ? [
      { key: "Reviewed By", val: model.reviewedByName },
      { key: "Reviewed At", val: fmtDate(model.reviewedAt) },
    ] : []),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Model Details" wide>
      <div className="modal-body">
        {/* Coloured header */}
        <div
          className="detail-thumb"
          style={{ background: `linear-gradient(135deg, ${model.thumbnailColor || "#1e40af"}, #3b82f6)` }}
        >
          <div className="detail-thumb__icon"><Ico.Cube /></div>
          <div>
            <h3 className="detail-thumb__title">{model.title}</h3>
            <div className="detail-thumb__badges">
              <StatusBadge status={model.status} />
              {(model.version || 1) > 1 && (
                <span className="detail-thumb__version">v{model.version}</span>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="detail-grid">
          {detailItems.map((item) => (
            <div className="detail-item" key={item.key}>
              <div className="detail-item__key">{item.key}</div>
              <div className="detail-item__value">{item.val || "—"}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {model.description && (
          <div className="detail-description">{model.description}</div>
        )}

        {/* Architect feedback */}
        {model.architectComment && (
          <div className="detail-feedback" style={{ background: feedbackBg, borderColor: feedbackBdr }}>
            <div className="detail-feedback__header">
              <span style={{ color: feedbackColor }}>
                {feedbackApproved ? <Ico.Check /> : <Ico.X />}
              </span>
              <span className="detail-feedback__label">Architect Feedback</span>
            </div>
            <p className="detail-feedback__text">{model.architectComment}</p>
          </div>
        )}

        {/* Architect review controls */}
        {isArch && model.status === "pending_review" && (
          <div className="review-box">
            <div className="review-box__title">
              <Ico.House /> Review This Model
            </div>
            <div className="field-group">
              <label className="field-label">Your Feedback / Comment</label>
              <textarea
                className="field-textarea"
                placeholder="Add your feedback (required for rejection)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="review-box__actions">
              <button className="btn btn-danger" onClick={handleReject} disabled={loading}>
                <Ico.X /> Reject
              </button>
              <button className="btn btn-success" onClick={handleApprove} disabled={loading}>
                <Ico.Check /> Approve
              </button>
            </div>
          </div>
        )}

        {/* Visualizer resubmit on rejected */}
        {isViz && model.status === "rejected" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleResubmit} disabled={loading}>
              <Ico.Refresh /> {loading ? "Submitting..." : "Revise & Resubmit"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── TABS config ──────────────────────────────────────────────────
const TABS = [
  { key: "all",           label: "All Models" },
  { key: "draft",         label: "Draft" },
  { key: "pending_review",label: "Pending Review" },
  { key: "approved",      label: "Approved" },
  { key: "rejected",      label: "Rejected" },
];

// ─── Main Page Component ──────────────────────────────────────────
// Props:
//   currentRole: "visualizer" | "architect"
//   Pass from your auth context: currentRole={user.role === "architect" ? "architect" : "visualizer"}
const Models = ({ currentRole = "visualizer" }) => {
  const [models, setModels]   = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [toasts, setToasts]   = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewModel, setViewModel] = useState(null);

  // ── Toast helper ──────────────────────────────────────────────
  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([modelsApi.getAll(), drawingsApi.getAll()]);
      setModels(m);
      setDrawings(d);
    } catch {
      toast("Failed to load data. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = filter === "all"
    ? models
    : models.filter((m) => m.status === filter);

  // ── Submit model ──────────────────────────────────────────────
  const handleSubmit = async (model) => {
    try {
      await modelsApi.submitForReview(model.id);
      toast("Model submitted for architect review!", "success");
      fetchAll();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ── Delete model ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft model?")) return;
    await modelsApi.deleteModel(id);
    toast("Model deleted.", "info");
    fetchAll();
  };

  const tabCount = (key) =>
    key === "all" ? models.length : models.filter((m) => m.status === key).length;

  return (
    <>
      {/* Google Font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="models-page">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="models-header">
          <div className="models-header__dots" />
          <div className="models-header__inner">
            <div className="models-header__top">
              <div>
                <div className="models-header__title-wrap">
                  <div className="models-header__icon"><Ico.Cube /></div>
                  <h1 className="models-header__title">My Models</h1>
                </div>
                <p className="models-header__subtitle">
                  {currentRole === "architect"
                    ? "Review & approve 3D models submitted by visualizers"
                    : "Create 3D models from architect drawings and submit for review"}
                </p>
              </div>

              <div className="models-header__actions">
                <button className="btn btn-ghost" onClick={fetchAll}>
                  <Ico.Refresh /> Refresh
                </button>
                {currentRole === "visualizer" && (
                  <button className="btn btn-white" onClick={() => setCreateOpen(true)}>
                    <Ico.Plus /> New Model
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="models-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`models-tab${filter === tab.key ? " active" : ""}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                  <span className="tab-count">{tabCount(tab.key)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="models-body">
          <StatsBar models={models} />

          {loading ? (
            <div className="models-loading">
              <div className="models-loading__spinner" />
              <p className="models-loading__text">Loading models...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="models-empty">
              <Ico.Cube />
              <p className="models-empty__title">No models found</p>
              <p className="models-empty__sub">
                {currentRole === "visualizer"
                  ? "Create your first 3D model from an architect drawing"
                  : "No models match this filter"}
              </p>
              {currentRole === "visualizer" && (
                <button className="btn btn-primary" style={{ margin: "0 auto" }} onClick={() => setCreateOpen(true)}>
                  <Ico.Plus /> Create Model
                </button>
              )}
            </div>
          ) : (
            <div className="models-grid">
              {filtered.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  currentRole={currentRole}
                  onView={setViewModel}
                  onSubmit={handleSubmit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Modal ────────────────────────────────────── */}
      <CreateModelModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        drawings={drawings}
        onCreated={fetchAll}
        toast={toast}
      />

      {/* ── View / Review Modal ──────────────────────────────── */}
      <ViewModelModal
        isOpen={!!viewModel}
        model={viewModel}
        onClose={() => setViewModel(null)}
        currentRole={currentRole}
        onRefresh={fetchAll}
        toast={toast}
      />

      {/* ── Toasts ──────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </>
  );
};

export default Models;