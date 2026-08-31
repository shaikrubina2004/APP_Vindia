import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../../services/projectService";
import CheckInButton from "../../SharedResourse/CheckInButton";
import "./ThreeDVisualizerDashboard.css";

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n) >= 10000000 ? `₹${(Number(n) / 10000000).toFixed(1)}Cr`
  : Number(n) >= 100000  ? `₹${(Number(n) / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }) : "—";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
}

/* ── Ring ─────────────────────────────────────────────────── */
const Ring = ({ pct = 0, size = 56, stroke = 5 }) => {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#dbeafe" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2563eb" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
};

/* ── Status pill ──────────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const map = {
    "IN PROGRESS": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
    Active:        { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    active:        { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    "ON HOLD":     { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    Completed:     { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  };
  const cfg = map[status] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <span className="tviz-status-pill"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="tviz-status-dot" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

/* ── Badge ────────────────────────────────────────────────── */
const Badge = ({ status }) => {
  const map = {
    active: "blue", "in-progress": "blue", pending: "amber",
    approved: "green", rejected: "red", open: "blue",
    closed: "green", resolved: "green", completed: "green",
    sent: "green", draft: "gray",
  };
  const color = map[(status || "").toLowerCase()] || "gray";
  return <span className={`tviz-badge tviz-badge--${color}`}>{status || "—"}</span>;
};

/* ── Project card (read-only, no click-to-select) ─────────── */
const ProjectCard = ({ proj }) => (
  <div className="tviz-proj-card">
    <div className="tviz-proj-card__accent" />
    <div className="tviz-proj-card__top">
      <div className="tviz-proj-card__info">
        <p className="tviz-proj-card__client">{proj.client}</p>
        <h3 className="tviz-proj-card__name">{proj.name}</h3>
        <StatusPill status={proj.status} />
      </div>
      <div className="tviz-proj-card__ring-wrap">
        <Ring pct={proj.progress || 0} />
        <span className="tviz-proj-card__pct">{proj.progress || 0}%</span>
      </div>
    </div>
    <div className="tviz-proj-card__meta">
      <div><p className="tviz-meta-lbl">Engineer</p><p className="tviz-meta-val">{proj.site_engineer_name || "—"}</p></div>
      <div><p className="tviz-meta-lbl">Budget</p><p className="tviz-meta-val">{fmt(proj.budget)}</p></div>
      <div><p className="tviz-meta-lbl">Deadline</p><p className="tviz-meta-val">{fmtDate(proj.end_date)}</p></div>
    </div>
    <div className="tviz-bar-track">
      <div className="tviz-bar-fill" style={{ width: `${proj.progress || 0}%` }} />
    </div>
  </div>
);

/* ── Panel header ─────────────────────────────────────────── */
const PanelHeader = ({ title, count, linkLabel, onLink }) => (
  <div className="tviz-panel-header">
    <span className="tviz-panel-title">
      {title}
      {count != null && <span className="tviz-count-chip">{count}</span>}
    </span>
    {linkLabel && (
      <button className="tviz-link-btn" onClick={onLink}>{linkLabel} →</button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function ThreeDVisualizerDashboard() {
  const navigate   = useNavigate();
  const user       = getUser();
  const userId     = user?.id;
  const userName   = user?.name || "3D Vizualizer";
  const employeeId = user?.employee_id || user?.id || null;
  // Used by the shared CheckInButton — decides whether to skip location
  // capture for the CEO. Falls back to role if designation isn't stored yet.
  const designation = user?.designation || user?.role || null;

  const [projects,  setProjects]  = useState([]);
  const [drawings,  setDrawings]  = useState([]);
  const [rfis,      setRfis]      = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [showAll,   setShowAll]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const projRes = await getProjects();
      const data    = projRes.data || [];
      setProjects(data);

      const [drawRes, rfiRes, incRes] = await Promise.allSettled([
        fetch(`/api/architect-drawings?userId=${userId}&role=3d_visualizer`).then(r => r.json()),
        fetch("/api/rfis").then(r => r.json()),
        fetch("/api/incidents").then(r => r.json()),
      ]);

      if (drawRes.status === "fulfilled") {
        const d = drawRes.value?.data ?? drawRes.value ?? [];
        setDrawings(Array.isArray(d) ? d : []);
      }
      if (rfiRes.status === "fulfilled") {
        const d = rfiRes.value?.data ?? rfiRes.value ?? [];
        setRfis(Array.isArray(d) ? d : []);
      }
      if (incRes.status === "fulfilled") {
        const d = incRes.value?.data ?? incRes.value ?? [];
        setIncidents(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error("[3D Viz]", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── derived ── */
  const sortedProjects  = [
    ...projects.filter(p => p.status === "IN PROGRESS"),
    ...projects.filter(p => p.status !== "IN PROGRESS"),
  ];
  const visibleProjects = showAll ? sortedProjects : sortedProjects.slice(0, 3);
  const hasMore         = sortedProjects.length > 3;
  const activeCount     = projects.filter(p =>
    ["active", "in progress"].includes((p.status || "").toLowerCase())
  ).length;
  const pendingRfis     = rfis.filter(r =>
    ["open", "pending"].includes((r.status || "").toLowerCase())
  );
  const openIncidents   = incidents.filter(i =>
    !["closed", "resolved"].includes((i.status || "").toLowerCase())
  );
  const recentDrawings  = [...drawings]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);

  /* ── skeleton ── */
  if (loading) return (
    <div className="tviz-page">
      <div className="tviz-sk tviz-sk--hdr" />
      <div className="tviz-proj-row">
        {[1, 2, 3].map(i => <div key={i} className="tviz-sk tviz-sk--card" />)}
      </div>
      <div className="tviz-sk tviz-sk--body" />
    </div>
  );

  return (
    <div className="tviz-page">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="tviz-header">
        <div>
          <p className="tviz-breadcrumb">Dashboard</p>
          <h1 className="tviz-title">
            {getGreeting()}, <span className="tviz-title--blue">{userName}</span>
          </h1>
        </div>
        <div className="tviz-header-actions">
          {employeeId && (
            <CheckInButton employeeId={employeeId} designation={designation} />
          )}
          <button className="tviz-btn tviz-btn--outline"
            onClick={() => navigate("/3d-visualizer/drawings")}>
            Drawings
          </button>
          <button className="tviz-btn tviz-btn--primary"
            onClick={() => navigate("/3d-visualizer/models")}>
            + Upload Model
          </button>
        </div>
      </div>

      {/* ── STAT CHIPS ─────────────────────────────────── */}
      <div className="tviz-stat-row">
        <div className="tviz-stat tviz-stat--blue">
          <p className="tviz-stat__num">{activeCount}</p>
          <p className="tviz-stat__lbl">Active Projects</p>
        </div>
        <div className="tviz-stat tviz-stat--indigo">
          <p className="tviz-stat__num">{drawings.length}</p>
          <p className="tviz-stat__lbl">Drawings from Architect</p>
        </div>
        <div className={`tviz-stat ${pendingRfis.length > 0 ? "tviz-stat--amber" : "tviz-stat--green"}`}>
          <p className="tviz-stat__num">{pendingRfis.length}</p>
          <p className="tviz-stat__lbl">Open RFIs</p>
        </div>
        <div className={`tviz-stat ${openIncidents.length > 0 ? "tviz-stat--red" : "tviz-stat--green"}`}>
          <p className="tviz-stat__num">{openIncidents.length}</p>
          <p className="tviz-stat__lbl">Open Incidents</p>
        </div>
      </div>

      {/* ── PROJECT CARDS (no click handler, no detail panel) ── */}
      <div className="tviz-proj-row">
        {projects.length === 0 ? (
          <p className="tviz-empty-text">No projects assigned.</p>
        ) : (
          visibleProjects.map(proj => (
            <ProjectCard key={proj.id} proj={proj} />
          ))
        )}
      </div>

      {/* see more / less */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, marginTop: -4 }}>
          <button className="tviz-see-more" onClick={() => setShowAll(v => !v)}>
            {showAll ? "Show Less ↑" : `See More ↓ (${sortedProjects.length - 3} more)`}
          </button>
        </div>
      )}

      {/* ── BOTTOM GRID: drawings + RFIs + incidents ───── */}
      <div className="tviz-content-grid">

        {/* LEFT: drawings */}
        <div className="tviz-col-left">
          <div className="tviz-panel-card">
            <PanelHeader
              title="Drawings from Architect"
              count={drawings.length}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/drawings")}
            />
            {recentDrawings.length === 0 ? (
              <p className="tviz-empty">No drawings shared with you yet.</p>
            ) : (
              <div className="tviz-draw-list">
                {recentDrawings.map(d => (
                  <div key={d.id} className="tviz-draw-row">
                    <div className="tviz-draw-icon">
                      <i className="ti ti-file-description" />
                    </div>
                    <div className="tviz-draw-info">
                      <div className="tviz-draw-name">{d.name || d.drawing_name || "Untitled"}</div>
                      <div className="tviz-draw-meta">
                        {d.project_name || "—"} · Rev {d.current_revision || d.revision || "—"} · {fmtDateTime(d.created_at)}
                      </div>
                    </div>
                    <span className={`tviz-tag ${d.drawing_type === "Working Drawing" ? "tviz-tag--gold" : "tviz-tag--blue"}`}>
                      {d.drawing_type === "Working Drawing" ? "Working" : "Detailed"}
                    </span>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="tviz-dl-btn" title="Download">
                        <i className="ti ti-download" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: RFIs + incidents */}
        <div className="tviz-col-right">

          {/* RFIs */}
          <div className="tviz-panel-card">
            <PanelHeader
              title="Recent RFIs"
              count={pendingRfis.length > 0 ? pendingRfis.length : null}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/rfi")}
            />
            {rfis.length === 0 ? (
              <p className="tviz-empty">No RFIs found.</p>
            ) : (
              rfis.slice(0, 5).map(r => (
                <div key={r.id} className="tviz-rfi-row"
                  onClick={() => navigate(`/3d-visualizer/rfi/${r.id}`)}>
                  <div className="tviz-rfi-left">
                    <div className="tviz-rfi-subject">{r.subject || r.title || `RFI #${r.id}`}</div>
                    <div className="tviz-rfi-meta">{r.project_name || "—"} · {fmtDateTime(r.created_at)}</div>
                  </div>
                  <Badge status={r.status || "Open"} />
                </div>
              ))
            )}
          </div>

          {/* incidents */}
          <div className="tviz-panel-card">
            <PanelHeader
              title="Recent Incidents"
              count={openIncidents.length > 0 ? openIncidents.length : null}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/incidents")}
            />
            {incidents.length === 0 ? (
              <p className="tviz-empty">No incidents reported.</p>
            ) : (
              incidents.slice(0, 5).map(inc => (
                <div key={inc.id} className="tviz-inc-row">
                  <div className={`tviz-inc-sev tviz-inc-sev--${(inc.severity || inc.priority || "low").toLowerCase()}`} />
                  <div className="tviz-inc-info">
                    <div className="tviz-inc-title">{inc.title || `Incident #${inc.id}`}</div>
                    <div className="tviz-inc-meta">{inc.project_name || "—"} · {fmtDateTime(inc.created_at)}</div>
                  </div>
                  <Badge status={inc.status || "Open"} />
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}