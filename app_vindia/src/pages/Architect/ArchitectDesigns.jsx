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

// ─── Role mapping ─────────────────────────────────────────────────────────────
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
const CAN_REQUEST_ROLES    = new Set(["Site Engineer", "Client"]);

const ROLE_ICONS = {
  "Architect":             "🏛️",
  "Program Coordinator":   "📋",
  "Quantity Surveyor":     "📐",
  "Site Engineer":         "🔧",
  "Client":                "👤",
};

const ROLE_COLORS = {
  "Architect":             { bg: "#e0eaff", color: "#1e40af", dot: "#3b82f6" },
  "Program Coordinator":   { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  "Quantity Surveyor":     { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  "Site Engineer":         { bg: "#fae8ff", color: "#6b21a8", dot: "#a855f7" },
  "Client":                { bg: "#e0f2fe", color: "#075985", dot: "#0ea5e9" },
};

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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const typeClass =
    toast.type === "success" ? "dms-toast dms-toast-success"
    : toast.type === "error" ? "dms-toast dms-toast-error"
    : "dms-toast dms-toast-info";

  return ReactDOM.createPortal(
    <div className={typeClass}>
      <span style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
      }}>
        {icons[toast.type] || "ℹ"}
      </span>
      {toast.message}
    </div>,
    document.body
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, wide, onClose, children, footer }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return ReactDOM.createPortal(
    <div className="dms-backdrop" onMouseDown={onClose}>
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

// ─── WorkflowTracker ──────────────────────────────────────────────────────────
function WorkflowTracker({ sentTo }) {
  const shortNames = {
    "Quantity Surveyor":   "Q.S",
    "Site Engineer":       "S.E",
    "Program Coordinator": "P.C",
    "Client":              "CLT",
  };
  return (
    <div className="dms-workflow-row">
      {WORKING_DRAWING_SEQUENCE.map((role, i) => {
        const info = sentTo.find((s) => s.role === role);
        return (
          <React.Fragment key={role}>
            <div className="dms-wf-step">
              <div className={`dms-wf-dot${info ? " sent" : ""}`}
                title={role}>
                {info ? "✓" : i + 1}
              </div>
              <div className={`dms-wf-label${info ? " sent" : ""}`}>
                {shortNames[role] || role.split(" ").map((w) => w[0]).join(".")}
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

// ─── Role Pill ────────────────────────────────────────────────────────────────
function RolePill({ role }) {
  const cfg = ROLE_COLORS[role] || { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
  const icon = ROLE_ICONS[role] || "👤";
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      borderRadius: 20,
      padding: "5px 14px 5px 10px",
      fontSize: 12.5,
      fontWeight: 700,
      letterSpacing: 0.3,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      border: `1px solid ${cfg.dot}40`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: cfg.dot, display: "inline-block", flexShrink: 0,
      }} />
      {icon} {role}
    </span>
  );
}

// ─── File Preview ─────────────────────────────────────────────────────────────
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
          <div style={{ textAlign: "center", padding: 32, color: "var(--ink-muted)" }}>
            <div className="dms-file-icon">📄</div>
            <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontSize: 13 }}>
              {d.fileName}
            </div>
            <button onClick={handleDownload} className="dms-btn dms-btn-success">
              ↓ Download File
            </button>
          </div>
        )}
        {!src && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 13 }}>Preview unavailable</div>
          </div>
        )}
      </div>
      {src && (isImg || isPDF) && (
        <button onClick={handleDownload}
          className="dms-btn dms-btn-success dms-download-link"
          style={{ marginTop: 12 }}>
          ↓ Download {d.fileName}
        </button>
      )}
    </>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ drawings, requests }) {
  const working  = drawings.filter((d) => d.drawingType === "Working Drawing").length;
  const detailed = drawings.filter((d) => d.drawingType === "Detailed Drawing").length;
  const unseen   = requests.filter((r) => !r.seen).length;

  const stats = [
    { label: "Total Drawings", value: drawings.length, icon: "📐", color: "var(--blue-mid)" },
    { label: "Working",        value: working,          icon: "📏", color: "var(--warning)" },
    { label: "Detailed",       value: detailed,         icon: "📋", color: "var(--info)" },
    { label: "New Requests",   value: unseen,           icon: "🔔", color: "var(--danger)" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 14,
      marginBottom: 28,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          boxShadow: "var(--shadow-xs)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "all 0.2s",
          cursor: "default",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-xs)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${s.color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 3, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Search & Filter Bar ──────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, minWidth: 220 }}>
      <span style={{
        position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
        color: "var(--ink-faint)", fontSize: 14, pointerEvents: "none",
      }}>🔍</span>
      <input
        className="dms-input"
        style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
      />
    </div>
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
  const [searchQuery, setSearchQuery]         = useState("");
  const [typeFilter, setTypeFilter]           = useState("All");
  const [sendingTo, setSendingTo]             = useState(null);
  const fileRef = useRef(null);

  const [uf, setUf] = useState({
    projectId: "", drawingName: "", drawingType: "Working Drawing",
    revision: "R1", file: null, fileName: "", blobKey: null,
  });
  const [rf, setRf] = useState({ projectId: "", note: DEFAULT_REQUEST_NOTE });
  const [architectViewAs, setArchitectViewAs] = useState("Architect");

  const viewRole = activeRole === "Architect" ? architectViewAs : activeRole;
  const isArchitectPreview = activeRole === "Architect";

  const showToast = (type, message) => setToast({ type, message });
  const closeModal = () => { setModal(null); setSelectedRequest(null); };

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
  const loadDrawings = useCallback(async () => {
    if (!currentUser?.id || !activeRole) return;
    setLoading(true);
    try {
      const roleCode = DMS_ROLE_TO_CODE[activeRole] || activeRole.toLowerCase();
      const res = await getDrawings(currentUser.id, roleCode);
      const rows = res?.data || res || [];
      setDrawings(rows.map(normaliseDrawing));
    } catch (err) {
      console.error("Failed to load drawings:", err);
      showToast("error", "Could not load drawings from server.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, activeRole]);

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
      await loadDrawings();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to save drawing. Please try again.");
    }
  };

  // ── Send drawing ───────────────────────────────────────────────────────────
  const sendTo = async (drawingId, role) => {
    setSendingTo(`${drawingId}-${role}`);
    const drawing = drawings.find((d) => String(d.id) === String(drawingId));
    const project = projects.find((p) => String(p.id) === String(drawing?.projectId));
    let recipientUserId = null;
    if (role === "Client")        recipientUserId = project?.clientUserId ?? null;
    if (role === "Site Engineer") recipientUserId = project?.siteEngineerId ?? null;

    try {
      await sendDrawing(drawingId, {
        user_id: recipientUserId,
        role,
        sent_by: currentUser.id,
      });
      showToast("success", `Sent to ${role}.`);
      await loadDrawings();
      if (selectedDrawing && String(selectedDrawing.id) === String(drawingId)) {
        const updated = drawings.find((d) => String(d.id) === String(drawingId));
        if (updated) setSelectedDrawing(updated);
      }
    } catch {
      showToast("error", `Failed to send to ${role}.`);
    } finally {
      setSendingTo(null);
    }
  };

  useEffect(() => {
    if (!selectedDrawing) return;
    const fresh = drawings.find((d) => String(d.id) === String(selectedDrawing.id));
    if (fresh) setSelectedDrawing(fresh);
  }, [drawings]);

  const getNextStage = (d) => {
    const sent = d.sentTo.map((s) => s.role);
    return WORKING_DRAWING_SEQUENCE.find((r) => !sent.includes(r)) || null;
  };

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
    } catch {
      showToast("error", "Failed to send request.");
    }
  };

  // ── Filtered drawings ──────────────────────────────────────────────────────
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

  function applyFilters(list) {
    let result = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.drawingName.toLowerCase().includes(q) ||
          d.projectName.toLowerCase().includes(q) ||
          d.revision.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "All") {
      result = result.filter((d) => d.drawingType === typeFilter);
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING SKELETON
  // ─────────────────────────────────────────────────────────────────────────
  const LoadingSkeleton = () => (
    <div className="dms-card" style={{ padding: 20, overflow: "hidden" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
          <div className="dms-skeleton" style={{ width: 180, height: 14 }} />
          <div className="dms-skeleton" style={{ width: 120, height: 14 }} />
          <div className="dms-skeleton" style={{ width: 80, height: 14 }} />
          <div className="dms-skeleton" style={{ width: 60, height: 14 }} />
          <div className="dms-skeleton" style={{ width: 100, height: 14 }} />
          <div className="dms-skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  const ArchitectView = () => {
    const unseenRequests   = requests.filter((r) => !r.seen);
    const filteredDrawings = applyFilters(drawings);

    return (
      <div>
        {/* Stats */}
        <StatsStrip drawings={drawings} requests={requests} />

        {/* Drawings Section */}
        <div className="dms-top-bar" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="dms-section-title" style={{ marginBottom: 0 }}>
              My Drawings
            </div>
            {/* Type filter pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Working Drawing", "Detailed Drawing"].map((t) => (
                <button key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1.5px solid ${typeFilter === t ? "var(--blue-mid)" : "var(--border-mid)"}`,
                    background: typeFilter === t ? "var(--blue-mid)" : "var(--surface)",
                    color: typeFilter === t ? "#fff" : "var(--ink-muted)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.18s",
                  }}>
                  {t === "All" ? "All" : t === "Working Drawing" ? "Working" : "Detailed"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search drawings…" />
            <button className="dms-btn dms-btn-primary" onClick={() => setModal("upload")}>
              + Upload Drawing
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredDrawings.length === 0 ? (
          <div className="dms-card dms-empty-box">
            {searchQuery || typeFilter !== "All"
              ? "No drawings match your filters."
              : "No drawings yet — click 'Upload Drawing' to begin."}
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
                {filteredDrawings.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={hoveredRow === d.id ? "hovered" : ""}
                    onMouseEnter={() => setHoveredRow(d.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13.5 }}>
                        {d.drawingName}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: "var(--ink-3)", fontSize: 12.5,
                      }}>
                        <span style={{ fontSize: 10 }}>🏗️</span>
                        {d.projectName}
                      </span>
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
                        <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {d.sentTo.map((s) => {
                            const cfg = ROLE_COLORS[s.role] || { bg: "#f1f5f9", color: "#475569" };
                            return (
                              <span key={s.role} title={s.role} style={{
                                background: cfg.bg, color: cfg.color,
                                borderRadius: 20, padding: "2px 8px",
                                fontSize: 10.5, fontWeight: 700,
                              }}>
                                {s.role.split(" ").map((w) => w[0]).join("")}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <button className="dms-btn dms-btn-info"
                        onClick={() => { setSelectedDrawing(d); setModal("detail"); }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Requests Section */}
        {requests.length > 0 && (
          <>
            <div className="dms-section-title" style={{ marginTop: 32 }}>
              Incoming Requests
              {unseenRequests.length > 0 && (
                <span className="dms-notif-badge">{unseenRequests.length} new</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`dms-req-card${req.seen ? " seen" : ""}`}
                  onClick={() => { setSelectedRequest(req); setModal("requestDetail"); }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {!req.seen && (
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: "var(--blue-mid)", flexShrink: 0,
                          boxShadow: "0 0 0 3px rgba(22,89,199,0.15)",
                        }} />
                      )}
                      <span style={{ fontWeight: 700, color: "var(--blue-mid)", fontSize: 13.5 }}>
                        {req.from}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                        ({req.fromRole})
                      </span>
                      <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>
                        requested a detailed drawing
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10 }}>🏗️</span>
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Project: </span>
                      <span style={{ fontWeight: 700, color: "var(--amber)", fontSize: 12 }}>
                        {req.projectName || "—"}
                      </span>
                    </div>
                    {req.note && (
                      <div style={{
                        fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic",
                        background: "var(--surface-raised)", padding: "6px 10px",
                        borderRadius: 6, borderLeft: "3px solid var(--border-mid)",
                      }}>
                        "{req.note.slice(0, 100)}{req.note.length > 100 ? "…" : ""}"
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                      🕐 {fmt(req.sentAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {!req.seen && (
                      <button className="dms-btn dms-btn-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequests((prev) =>
                            prev.map((r) => r.id === req.id ? { ...r, seen: true } : r)
                          );
                        }}>
                        ✓ Mark Seen
                      </button>
                    )}
                    <button className="dms-btn dms-btn-info"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(req);
                        setModal("requestDetail");
                      }}>
                      View →
                    </button>
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
    const canRequest    = CAN_REQUEST_ROLES.has(role);
    const all           = filterDrawingsForRole(role);
    const filteredMine  = applyFilters(all);

    return (
      <div>
        {/* Mini stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Total Received", value: all.length, color: "var(--blue-mid)" },
            { label: "Working Drawings", value: all.filter((d) => d.drawingType === "Working Drawing").length, color: "var(--warning)" },
            { label: "Detailed Drawings", value: all.filter((d) => d.drawingType === "Detailed Drawing").length, color: "var(--info)" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "12px 18px",
              boxShadow: "var(--shadow-xs)", display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="dms-top-bar" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="dms-section-title" style={{ marginBottom: 0 }}>
              {isArchitectPreview ? `Drawings → ${role}` : "Drawings Sent to Me"}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Working Drawing", "Detailed Drawing"].map((t) => (
                <button key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1.5px solid ${typeFilter === t ? "var(--blue-mid)" : "var(--border-mid)"}`,
                    background: typeFilter === t ? "var(--blue-mid)" : "var(--surface)",
                    color: typeFilter === t ? "#fff" : "var(--ink-muted)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.18s",
                  }}>
                  {t === "All" ? "All" : t === "Working Drawing" ? "Working" : "Detailed"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search…" />
            {canRequest && !isArchitectPreview && (
              <button className="dms-btn dms-btn-ghost"
                onClick={() => { setRf({ projectId: "", note: DEFAULT_REQUEST_NOTE }); setModal("request"); }}>
                + Request Detailed Drawing
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredMine.length === 0 ? (
          <div className="dms-card dms-empty-box">
            {searchQuery || typeFilter !== "All"
              ? "No drawings match your filters."
              : isArchitectPreview
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
                {filteredMine.map((d) => {
                  const sentInfo = d.sentTo.find((s) => s.role === role);
                  return (
                    <tr
                      key={d.id}
                      className={hoveredRow === d.id ? "hovered" : ""}
                      onMouseEnter={() => setHoveredRow(d.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13.5 }}>
                          {d.drawingName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                          Rev: {d.revision}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 12.5 }}>
                          <span style={{ fontSize: 10 }}>🏗️</span>
                          {d.projectName}
                        </span>
                      </td>
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
                        <button className="dms-btn dms-btn-info"
                          onClick={() => { setSelectedDrawing(d); setModal("recipientDetail"); }}>
                          View →
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
    <div className="dms-card dms-empty-box" style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20,
        color: "var(--ink)", marginBottom: 10,
      }}>
        Access Restricted
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: 14, maxWidth: 300, margin: "0 auto" }}>
        Your role (<strong>{currentUser?.role || "unknown"}</strong>) does not have access to the Drawing Management System.
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MODALS
  // ─────────────────────────────────────────────────────────────────────────

  const UploadModal = () => (
    <Modal title="📤 Upload Drawing" onClose={closeModal}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="dms-btn dms-btn-primary" onClick={handleUpload}>
            Upload Drawing
          </button>
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

      {/* File Drop Zone */}
      <div className="dms-form-field">
        <label className="dms-label">File *</label>
        <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }} onChange={handleFileChange} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${uf.fileName ? "var(--blue-mid)" : "var(--border-mid)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: uf.fileName ? "var(--info-bg)" : "var(--surface-raised)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--blue-mid)"; e.currentTarget.style.background = "var(--info-bg)"; }}
          onMouseLeave={(e) => {
            if (!uf.fileName) {
              e.currentTarget.style.borderColor = "var(--border-mid)";
              e.currentTarget.style.background = "var(--surface-raised)";
            }
          }}
        >
          {uf.fileName ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: "var(--blue-mid)", fontSize: 13 }}>{uf.fileName}</div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>Click to change file</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 600, color: "var(--ink-3)", fontSize: 13 }}>Click to choose a file</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>Any file type accepted</div>
            </>
          )}
        </div>
      </div>

      {uf.drawingType === "Working Drawing" && (
        <div className="dms-info-box dms-info-box-gold">
          ⚡ Working drawings follow a fixed sequence: <strong>QS → Site Engineer → Program Coordinator → Client</strong>
        </div>
      )}
      {uf.drawingType === "Detailed Drawing" && (
        <div className="dms-info-box dms-info-box-blue">
          📤 Detailed drawings can be sent to any recipient in any order.
        </div>
      )}
    </Modal>
  );

  const RequestModal = () => (
    <Modal title="📩 Request Detailed Drawing" onClose={closeModal}
      footer={
        <>
          <button className="dms-btn dms-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="dms-btn dms-btn-primary" onClick={sendRequest}>Send Request</button>
        </>
      }
    >
      <div style={{
        background: "var(--info-bg)", border: "1px solid var(--info-border)",
        borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 20,
        fontSize: 13, color: "var(--info)",
      }}>
        ℹ️ This request will be sent directly to the Architect.
      </div>
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
          style={{ minHeight: 130, resize: "vertical", lineHeight: 1.65 }}
          value={rf.note}
          onChange={(e) => setRf((p) => ({ ...p, note: e.target.value }))} />
      </div>
    </Modal>
  );

  const RequestDetailModal = () => {
    if (!selectedRequest) return null;
    const req = selectedRequest;
    return (
      <Modal title="📋 Drawing Request Details" onClose={closeModal}
        footer={
          <div className="dms-modal-foot-spread">
            {!req.seen && (
              <button className="dms-btn dms-btn-success" onClick={() => {
                setRequests((prev) =>
                  prev.map((r) => r.id === req.id ? { ...r, seen: true } : r)
                );
                closeModal();
              }}>✓ Mark Seen</button>
            )}
            <button className="dms-btn dms-btn-ghost" style={{ marginLeft: "auto" }} onClick={closeModal}>
              Close
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="dms-detail-info-card">
            <div className="dms-grid-2" style={{ gap: "14px 24px" }}>
              <div>
                <div className="dms-label">Requested By</div>
                <div style={{ fontWeight: 700, color: "var(--blue-mid)", fontSize: 15, marginTop: 4 }}>
                  {req.from}
                </div>
                <RolePill role={req.fromRole} />
              </div>
              <div>
                <div className="dms-label">Sent At</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>{fmt(req.sentAt)}</div>
                <span className={badgeClass(req.seen ? "Approved" : "Pending")} style={{ marginTop: 6, display: "inline-block" }}>
                  {req.seen ? "✓ Seen" : "● Unseen"}
                </span>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="dms-label">Project</div>
                <div style={{
                  fontWeight: 700, color: "var(--amber)", fontSize: 15,
                  padding: "8px 12px", background: "var(--amber-bg)",
                  border: "1px solid var(--amber-border)",
                  borderRadius: "var(--radius-sm)", marginTop: 6,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  🏗️ {req.projectName || "—"}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="dms-label" style={{ marginBottom: 8 }}>Request Details</div>
            {req.note ? (
              <pre className="dms-note-pre">{req.note}</pre>
            ) : (
              <div className="dms-info-box dms-info-box-gold">No description provided.</div>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const DrawingDetailModal = () => {
    if (!selectedDrawing) return null;
    const d = selectedDrawing;
    const next = d.drawingType === "Working Drawing" ? getNextStage(d) : null;
    return (
      <Modal title={`📐 ${d.drawingName}`} wide onClose={closeModal}>
        <div className="dms-detail-grid">
          <div>
            <div className="dms-detail-info-card" style={{ marginBottom: 18 }}>
              <div className="dms-form-field" style={{ marginBottom: 14 }}>
                <div className="dms-label">Project</div>
                <div style={{
                  fontWeight: 700, color: "var(--ink)", fontSize: 14, marginTop: 4,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  🏗️ {d.projectName}
                </div>
              </div>
              <div className="dms-grid-2">
                <div className="dms-form-field" style={{ marginBottom: 10 }}>
                  <div className="dms-label">Type</div>
                  <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}
                    style={{ marginTop: 4, display: "inline-block" }}>
                    {d.drawingType}
                  </span>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 10 }}>
                  <div className="dms-label">Revision</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="dms-revision-lg">{d.revision}</span>
                  </div>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 0 }}>
                  <div className="dms-label">Uploaded</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{fmt(d.uploadedAt)}</div>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 0 }}>
                  <div className="dms-label">File</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4, wordBreak: "break-all" }}>
                    {d.fileName || "—"}
                  </div>
                </div>
              </div>
            </div>

            {d.drawingType === "Working Drawing" && (
              <div style={{ marginBottom: 18 }}>
                <div className="dms-label" style={{ marginBottom: 10 }}>Workflow Progress</div>
                <WorkflowTracker sentTo={d.sentTo} />
                {next ? (
                  <button
                    className="dms-btn dms-btn-primary"
                    style={{ width: "100%", marginTop: 8, justifyContent: "center" }}
                    disabled={sendingTo === `${d.id}-${next}`}
                    onClick={() => sendTo(d.id, next)}
                  >
                    {sendingTo === `${d.id}-${next}` ? "Sending…" : `→ Send to ${next}`}
                  </button>
                ) : (
                  <div className="dms-info-box dms-info-box-gold">✓ Sent to all stages.</div>
                )}
              </div>
            )}

            {d.drawingType === "Detailed Drawing" && (
              <div style={{ marginBottom: 18 }}>
                <div className="dms-label" style={{ marginBottom: 10 }}>Send To Recipients</div>
                <div className="dms-send-buttons">
                  {WORKING_DRAWING_SEQUENCE.map((role) => {
                    const done = d.sentTo.some((s) => s.role === role);
                    const isSending = sendingTo === `${d.id}-${role}`;
                    return (
                      <button key={role}
                        className={`dms-btn ${done ? "dms-btn-muted" : "dms-btn-primary"}`}
                        disabled={done || !!isSending}
                        onClick={() => sendTo(d.id, role)}>
                        {isSending ? "Sending…" : done ? `✓ ${role}` : `→ ${role}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {d.sentTo.length > 0 && (
              <div>
                <div className="dms-label" style={{ marginBottom: 8 }}>Delivery Log</div>
                <div style={{
                  background: "var(--surface-raised)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", overflow: "hidden",
                }}>
                  {d.sentTo.map((s, i) => {
                    const cfg = ROLE_COLORS[s.role] || { bg: "#f1f5f9", color: "#475569" };
                    return (
                      <div key={s.role} className="dms-delivery-row"
                        style={{
                          padding: "10px 16px",
                          background: i % 2 === 0 ? "transparent" : "var(--surface)",
                        }}>
                        <span style={{
                          background: cfg.bg, color: cfg.color, borderRadius: 20,
                          padding: "3px 10px", fontSize: 11.5, fontWeight: 700,
                        }}>
                          {s.role}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                          {fmt(s.sentAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="dms-label" style={{ marginBottom: 10 }}>File Preview</div>
            <FilePreview d={d} fileBlobs={fileBlobs} maxHeight={380} />
          </div>
        </div>
      </Modal>
    );
  };

  const RecipientDetailModal = ({ role }) => {
    if (!selectedDrawing) return null;
    const d = selectedDrawing;
    const sentInfo = d.sentTo.find((s) => s.role === role);
    return (
      <Modal title={`📐 ${d.drawingName}`} wide onClose={closeModal}>
        <div className="dms-detail-grid">
          <div>
            <div className="dms-detail-info-card">
              <div className="dms-form-field">
                <div className="dms-label">Project</div>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  🏗️ {d.projectName}
                </div>
              </div>
              <div className="dms-grid-2">
                <div className="dms-form-field" style={{ marginBottom: 10 }}>
                  <div className="dms-label">Type</div>
                  <span className={`dms-tag ${d.drawingType === "Working Drawing" ? "dms-tag-gold" : "dms-tag-blue"}`}
                    style={{ marginTop: 4, display: "inline-block" }}>
                    {d.drawingType}
                  </span>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 10 }}>
                  <div className="dms-label">Revision</div>
                  <div style={{ marginTop: 4 }}><span className="dms-revision-lg">{d.revision}</span></div>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 0 }}>
                  <div className="dms-label">File</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{d.fileName || "—"}</div>
                </div>
                <div className="dms-form-field" style={{ marginBottom: 0 }}>
                  <div className="dms-label">Received</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{fmt(sentInfo?.sentAt)}</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="dms-label" style={{ marginBottom: 10 }}>File Preview</div>
            <FilePreview d={d} fileBlobs={fileBlobs} maxHeight={360} />
          </div>
        </div>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const ALL_VIEWS = ["Architect", "Quantity Surveyor", "Site Engineer", "Program Coordinator", "Client"];

  return (
    <div className="dms-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="dms-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, var(--blue), var(--blue-mid))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "var(--shadow-blue)",
          }}>📐</div>
          <h1 className="dms-header-title">Drawing Management System</h1>
        </div>
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
            <button
              key={role}
              className={`dms-role-btn${architectViewAs === role ? " active" : ""}`}
              onClick={() => {
                setArchitectViewAs(role);
                setSelectedDrawing(null);
                setSelectedRequest(null);
                setModal(null);
                setSearchQuery("");
                setTypeFilter("All");
              }}
            >
              {ROLE_ICONS[role]} {role}
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
        {viewRole === "Client"              && <RecipientView role="Client" />}
      </div>

      {modal === "upload"          && <UploadModal />}
      {modal === "request"         && <RequestModal />}
      {modal === "requestDetail"   && selectedRequest && <RequestDetailModal />}
      {modal === "detail"          && selectedDrawing && <DrawingDetailModal />}
      {modal === "recipientDetail" && selectedDrawing && <RecipientDetailModal role={viewRole} />}
    </div>
  );
}