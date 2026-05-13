import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./ThreeDVisualizerDashboard.css";

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtTime = (v) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      className={`viz-stat-card viz-stat-card--${color}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="viz-stat-icon">
        <i className={`ti ti-${icon}`} aria-hidden="true" />
      </div>
      <div className="viz-stat-body">
        <div className="viz-stat-value">{value ?? "—"}</div>
        <div className="viz-stat-label">{label}</div>
        {sub && <div className="viz-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, icon, count, linkLabel, onLink }) {
  return (
    <div className="viz-section-header">
      <div className="viz-section-title">
        <i className={`ti ti-${icon}`} aria-hidden="true" />
        {title}
        {count != null && <span className="viz-count-badge">{count}</span>}
      </div>
      {linkLabel && (
        <button className="viz-link-btn" onClick={onLink}>
          {linkLabel} →
        </button>
      )}
    </div>
  );
}

// ─── empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, message }) {
  return (
    <div className="viz-empty">
      <i className={`ti ti-${icon}`} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

// ─── status badge ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    active:      "blue",
    "in-progress": "blue",
    pending:     "amber",
    approved:    "green",
    rejected:    "red",
    open:        "blue",
    closed:      "green",
    resolved:    "green",
    completed:   "green",
    sent:        "green",
    draft:       "gray",
  };
  const color = map[(status || "").toLowerCase()] || "gray";
  return (
    <span className={`viz-badge viz-badge--${color}`}>
      {status || "—"}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function ThreeDVisualizerDashboard() {
  const navigate  = useNavigate();
  const user      = getUser();
  const userId    = user?.id;
  const userName  = user?.name || "Visualizer";

  // ── state ──────────────────────────────────────────────────────────────────
  const [projects,  setProjects]  = useState([]);
  const [designs,   setDesigns]   = useState([]);
  const [drawings,  setDrawings]  = useState([]);
  const [rfis,      setRfis]      = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // ── fetch all APIs in parallel ─────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const [projRes, designRes, drawRes, rfiRes, incRes] = await Promise.allSettled([
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/architect-designs").then((r) => r.json()),
        fetch(`/api/architect-drawings?userId=${userId}&role=3d_visualizer`).then((r) => r.json()),
        fetch("/api/rfis").then((r) => r.json()),
        fetch("/api/incidents").then((r) => r.json()),
      ]);

      if (projRes.status === "fulfilled") {
        const data = projRes.value?.data ?? projRes.value ?? [];
        setProjects(Array.isArray(data) ? data : []);
      }
      if (designRes.status === "fulfilled") {
        const data = designRes.value?.data ?? designRes.value ?? [];
        setDesigns(Array.isArray(data) ? data : []);
      }
      if (drawRes.status === "fulfilled") {
        const data = drawRes.value?.data ?? drawRes.value ?? [];
        setDrawings(Array.isArray(data) ? data : []);
      }
      if (rfiRes.status === "fulfilled") {
        const data = rfiRes.value?.data ?? rfiRes.value ?? [];
        setRfis(Array.isArray(data) ? data : []);
      }
      if (incRes.status === "fulfilled") {
        const data = incRes.value?.data ?? incRes.value ?? [];
        setIncidents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Failed to load dashboard data. Please refresh.");
      console.error("[3D Viz Dashboard]", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── derived stats ──────────────────────────────────────────────────────────
  const activeProjects    = projects.filter((p) => (p.status || "").toLowerCase() === "active");
  const pendingRfis       = rfis.filter((r) => (r.status || "").toLowerCase() === "open" || (r.status || "").toLowerCase() === "pending");
  const openIncidents     = incidents.filter((i) => (i.status || "").toLowerCase() !== "closed" && (i.status || "").toLowerCase() !== "resolved");
  const recentDrawings    = [...drawings].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  const recentDesigns     = [...designs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4);

  // ── skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="viz-page">
        <div className="viz-skeleton-header" />
        <div className="viz-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="viz-skeleton-card" />
          ))}
        </div>
        <div className="viz-skeleton-body" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="viz-page">
        <div className="viz-error-box">
          <i className="ti ti-wifi-off" />
          <p>{error}</p>
          <button className="viz-btn viz-btn--primary" onClick={loadAll}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="viz-page">

      {/* ── top welcome bar ──────────────────────────────────────────────── */}
      <div className="viz-welcome-bar">
        <div className="viz-welcome-left">
          <div className="viz-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <div className="viz-greeting">
              {getGreeting()}, <span>{userName}</span>
            </div>
            <div className="viz-role-tag">
              <i className="ti ti-cube" aria-hidden="true" /> 3D Visualizer
            </div>
          </div>
        </div>
        <div className="viz-welcome-right">
          <div className="viz-today">
            <i className="ti ti-calendar" aria-hidden="true" />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            className="viz-btn viz-btn--primary"
            onClick={() => navigate("/3d-visualizer/models")}
          >
            <i className="ti ti-upload" aria-hidden="true" /> Upload Model
          </button>
        </div>
      </div>

      {/* ── stat cards ───────────────────────────────────────────────────── */}
      <div className="viz-stats-grid">
        <StatCard
          icon="building"
          label="Active Projects"
          value={activeProjects.length}
          sub={`${projects.length} total`}
          color="blue"
          onClick={() => navigate("/3d-visualizer/drawings")}
        />
        <StatCard
          icon="file-description"
          label="Drawings from Architect"
          value={drawings.length}
          sub={`${recentDrawings.length > 0 ? "Latest: " + fmt(recentDrawings[0]?.created_at) : "None yet"}`}
          color="indigo"
          onClick={() => navigate("/3d-visualizer/drawings")}
        />
        <StatCard
          icon="message-square"
          label="Open RFIs"
          value={pendingRfis.length}
          sub={`${rfis.length} total`}
          color={pendingRfis.length > 0 ? "amber" : "green"}
          onClick={() => navigate("/3d-visualizer/rfi")}
        />
        <StatCard
          icon="alert-triangle"
          label="Open Incidents"
          value={openIncidents.length}
          sub={`${incidents.length} total`}
          color={openIncidents.length > 0 ? "red" : "green"}
          onClick={() => navigate("/3d-visualizer/incidents")}
        />
      </div>

      {/* ── main content grid ─────────────────────────────────────────────── */}
      <div className="viz-content-grid">

        {/* ── left column ─────────────────────────────────────────────────── */}
        <div className="viz-col-left">

          {/* drawings from architect */}
          <div className="viz-card">
            <SectionHeader
              title="Drawings from Architect"
              icon="file-download"
              count={drawings.length}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/drawings")}
            />
            {recentDrawings.length === 0 ? (
              <EmptyState icon="file-off" message="No drawings shared with you yet." />
            ) : (
              <div className="viz-drawing-list">
                {recentDrawings.map((d) => (
                  <div key={d.id} className="viz-drawing-row">
                    <div className="viz-drawing-icon">
                      <i className="ti ti-file-type-pdf" aria-hidden="true" />
                    </div>
                    <div className="viz-drawing-info">
                      <div className="viz-drawing-name">{d.name || d.drawing_name || "Untitled"}</div>
                      <div className="viz-drawing-meta">
                        <span>{d.project_name || "—"}</span>
                        <span className="viz-dot">·</span>
                        <span>Rev {d.current_revision || d.revision || "—"}</span>
                        <span className="viz-dot">·</span>
                        <span>{fmtTime(d.created_at)}</span>
                      </div>
                    </div>
                    <div className="viz-drawing-type">
                      <span className={`viz-tag ${d.drawing_type === "Working Drawing" ? "viz-tag--gold" : "viz-tag--blue"}`}>
                        {d.drawing_type === "Working Drawing" ? "Working" : "Detailed"}
                      </span>
                    </div>
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="viz-icon-btn"
                        title="Download"
                      >
                        <i className="ti ti-download" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* architect designs */}
          <div className="viz-card">
            <SectionHeader
              title="Architect Designs"
              icon="palette"
              count={designs.length}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/drawings")}
            />
            {recentDesigns.length === 0 ? (
              <EmptyState icon="palette-off" message="No designs available yet." />
            ) : (
              <div className="viz-design-grid">
                {recentDesigns.map((d) => (
                  <div key={d.id} className="viz-design-card">
                    <div className="viz-design-thumb">
                      {d.file_url && /\.(png|jpg|jpeg|webp|gif)$/i.test(d.file_url) ? (
                        <img src={d.file_url} alt={d.name} />
                      ) : (
                        <div className="viz-design-placeholder">
                          <i className="ti ti-file-3d" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="viz-design-info">
                      <div className="viz-design-name">{d.name || d.title || "Untitled"}</div>
                      <div className="viz-design-project">{d.project_name || "—"}</div>
                      <div className="viz-design-date">{fmt(d.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── right column ────────────────────────────────────────────────── */}
        <div className="viz-col-right">

          {/* active projects */}
          <div className="viz-card">
            <SectionHeader
              title="Active Projects"
              icon="building"
              count={activeProjects.length}
              linkLabel="All projects"
              onLink={() => navigate("/3d-visualizer/drawings")}
            />
            {activeProjects.length === 0 ? (
              <EmptyState icon="building-off" message="No active projects assigned." />
            ) : (
              <div className="viz-project-list">
                {activeProjects.slice(0, 5).map((p) => (
                  <div key={p.id} className="viz-project-row">
                    <div className="viz-project-dot" />
                    <div className="viz-project-info">
                      <div className="viz-project-name">{p.name}</div>
                      <div className="viz-project-client">{p.client || "—"}</div>
                    </div>
                    <div className="viz-project-right">
                      <Badge status={p.status} />
                      {p.end_date && (
                        <div className="viz-project-due">{fmt(p.end_date)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* recent RFIs */}
          <div className="viz-card">
            <SectionHeader
              title="Recent RFIs"
              icon="message-square"
              count={pendingRfis.length > 0 ? pendingRfis.length : null}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/rfi")}
            />
            {rfis.length === 0 ? (
              <EmptyState icon="message-off" message="No RFIs found." />
            ) : (
              <div className="viz-rfi-list">
                {rfis.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="viz-rfi-row"
                    onClick={() => navigate(`/3d-visualizer/rfi/${r.id}`)}
                  >
                    <div className="viz-rfi-left">
                      <div className="viz-rfi-subject">
                        {r.subject || r.title || `RFI #${r.id}`}
                      </div>
                      <div className="viz-rfi-meta">
                        {r.project_name || "—"} · {fmtTime(r.created_at)}
                      </div>
                    </div>
                    <Badge status={r.status || "Open"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* recent incidents */}
          <div className="viz-card">
            <SectionHeader
              title="Recent Incidents"
              icon="alert-triangle"
              count={openIncidents.length > 0 ? openIncidents.length : null}
              linkLabel="View all"
              onLink={() => navigate("/3d-visualizer/incidents")}
            />
            {incidents.length === 0 ? (
              <EmptyState icon="mood-happy" message="No incidents reported." />
            ) : (
              <div className="viz-incident-list">
                {incidents.slice(0, 4).map((inc) => (
                  <div key={inc.id} className="viz-incident-row">
                    <div
                      className={`viz-incident-sev viz-incident-sev--${
                        (inc.severity || inc.priority || "low").toLowerCase()
                      }`}
                    />
                    <div className="viz-incident-info">
                      <div className="viz-incident-title">
                        {inc.title || inc.description?.slice(0, 50) || `Incident #${inc.id}`}
                      </div>
                      <div className="viz-incident-meta">
                        {inc.project_name || "—"} · {fmtTime(inc.created_at)}
                      </div>
                    </div>
                    <Badge status={inc.status || "Open"} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}