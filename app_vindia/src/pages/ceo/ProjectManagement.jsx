import React, { useState, useEffect } from "react";
import "./ProjectManagement.css";
import ProjectCard from "../../components/project/ProjectCard";
import CostTracking from "../../pages/projects/CostTracking";
import WbsPage from "../../pages/wbs/WbsPage";
import { getProjectTimesheets } from "../../services/timesheetService";
import { useAuth } from "../../context/useAuth";
import ProjectPhotosGrid from "../../components/photos/ProjectPhotosGrid";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ── Helpers ── */

/* This page uses plain fetch() rather than axios, so it never
   picked up the global Authorization header added in main.jsx.
   The project/cost-summary backend routes now require a logged-in
   user, so every request here needs to carry the token. */
const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const buildTimeline = (proj) => {
  if (!proj) return [];
  const p = proj.progress || 0;
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
    const base = Math.round(p * ((i + 1) / 7));
    return {
      day,
      completed: base,
      progress: Math.min(100, Math.round(base * 1.1 + i * 2)),
      delay: Math.max(0, Math.round((100 - base) * 0.15 - i)),
    };
  });
};

/* ── Status Pill ── */
const StatusPill = ({ status }) => {
  const map = {
    "IN PROGRESS": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
    "In Progress": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
    Active: { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    active: { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    Completed: { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    Pending: { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
    Rejected: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
  };
  const cfg = map[status] || {
    bg: "#f8fafc",
    color: "#64748b",
    border: "#e2e8f0",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.color,
          display: "inline-block",
        }}
      />
      {status}
    </span>
  );
};

/* ── Animated counter ── */
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) {
      setV(0);
      return;
    }
    let cur = 0;
    const step = Math.ceil(target / (dur / 16));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) {
        setV(target);
        clearInterval(t);
      } else setV(cur);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

/* ── Stat Card ── */
const StatCard = ({ label, value, accent }) => {
  const isNum = typeof value === "number";
  const n = useCountUp(isNum ? value : 0);
  return (
    <div
      style={{
        flex: 1,
        borderLeft: `3px solid ${accent}`,
        padding: "12px 16px",
        background: "#fff",
        borderRadius: 8,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent, margin: 0 }}>
        {isNum ? n : value}
      </p>
    </div>
  );
};

/* ── Detail Row ── */
const DetailRow = ({ icon, label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "12px 14px",
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          margin: "0 0 3px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>
        {value || "—"}
      </p>
    </div>
  </div>
);

/* ── Chart Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          style={{ color: p.color, fontWeight: 700, margin: "2px 0" }}
        >
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
function ProjectManagement() {
  const [activePhase, setActivePhase] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeTask, setActiveTask] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [animate, setAnimate] = useState(true);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const PROJECTS_INITIAL_COUNT = 8;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setAnimate(false);
        setTimeout(() => setAnimate(true), 200);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // This page is shared between the CEO (who should see every project)
    // and the Project Manager (who was also seeing every project — the
    // same gap already fixed for the Project Coordinator's own dashboard).
    // A CEO legitimately needs the full company view; a PM only ever works
    // with their own assigned projects, so /mine scopes that server-side
    // the same way it already does for Coordinator, Site Engineer, etc.
    const endpoint = user?.role === "project_manager" ? "/api/projects/mine" : "/api/projects";
    authFetch(`http://localhost:5000${endpoint}`)
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [user?.role]);

  const [siteEngineers, setSiteEngineers] = useState([]);
  useEffect(() => {
    authFetch("http://localhost:5000/api/projects/site-engineers")
      .then((res) => res.json())
      .then((data) => setSiteEngineers(data))
      .catch(console.error);
  }, []);

  const [managers, setManagers] = useState([]);
  useEffect(() => {
    authFetch("http://localhost:5000/api/projects/managers")
      .then((res) => res.json())
      .then((data) => setManagers(data))
      .catch(console.error);
  }, []);

  const [coordinators, setCoordinators] = useState([]);
  const [architects, setArchitects] = useState([]);
  const [clients, setClients] = useState([]);
  useEffect(() => {
    authFetch("http://localhost:5000/api/projects/coordinators")
      .then((res) => res.json())
      .then((data) => setCoordinators(data))
      .catch(console.error);

    authFetch("http://localhost:5000/api/projects/architects")
      .then((res) => res.json())
      .then((data) => setArchitects(Array.isArray(data) ? data : []))
      .catch(console.error);

    authFetch("http://localhost:5000/api/projects/clients")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const [selectedProject, setSelectedProject] = useState(null);
  const [costSummary, setCostSummary] = useState([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    authFetch(`http://localhost:5000/api/cost-summary/${selectedProject.id}`)
      .then((res) => res.json())
      .then((data) => setCostSummary(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedProject]);

  // Previously hardcoded mock rows (same problem as Payments above) — the
  // "Timesheet" tab showed 4 fake employees/hours that never changed no
  // matter which project was selected. Pulled from a new endpoint,
  // GET /api/timesheets/project/:projectId, which returns the actual
  // timesheet_entries logged against this project (who, how many hours,
  // on which task, this week's status) — the existing /timesheets/team
  // endpoint couldn't be reused here since it only returns whole-timesheet
  // totals per employee with no per-project breakdown at all.
  const [timesheets, setTimesheets] = useState([]);
  const [timesheetSummary, setTimesheetSummary] = useState(null);
  const [timesheetsLoading, setTimesheetsLoading] = useState(false);
  const [timesheetsError, setTimesheetsError] = useState(null);

  useEffect(() => {
    if (!selectedProject?.id) { setTimesheets([]); setTimesheetSummary(null); return; }
    setTimesheetsLoading(true);
    setTimesheetsError(null);
    getProjectTimesheets(selectedProject.id)
      .then((body) => {
        const rows = Array.isArray(body?.data) ? body.data : [];
        // Normalized to the field names the "Timesheet Submissions" widget on
        // the Overview tab already uses (ts.employee / ts.task / ts.hours /
        // ts.date / ts.status), while keeping the raw fields too for the
        // fuller table on the Timesheet tab itself.
        setTimesheets(rows.map((r) => ({
          ...r,
          employee: r.employee_name,
          task: r.task_title || "—",
          hours: r.regular_hours + r.overtime_hours,
          date: r.work_date,
        })));
        setTimesheetSummary(body?.summary || null);
      })
      .catch((err) => {
        const data = err?.response?.data;
        setTimesheetsError(data?.detail || data?.error || err.message);
        setTimesheets([]);
        setTimesheetSummary(null);
      })
      .finally(() => setTimesheetsLoading(false));
  }, [selectedProject]);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    startDate: "",
    endDate: "",
    budget: "",
    manager: "",
    teamSize: "",
    coordinator_id: "",
    architect_id: "",
    client_user_id: "",
    building_type: "",
    floors: "",
    description: "",
    location: "",
    plot_size: "",
    phone: "",
  });

  // Previously hardcoded mock rows that were never even rendered — the
  // "Payments" tab just showed a literal "Payments content" placeholder.
  // A real payments backend already exists (GET /api/finance/payments),
  // it just wasn't wired to this page (and didn't allow project_manager
  // to read it at all — see financeRoutes.js). Pulled from there now,
  // scoped to the selected project, same pattern as costSummary above.
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);

  useEffect(() => {
    if (!selectedProject?.id) { setPayments([]); return; }
    setPaymentsLoading(true);
    setPaymentsError(null);
    authFetch(`http://localhost:5000/api/finance/payments?project_id=${selectedProject.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status code ${res.status}`);
        return res.json();
      })
      .then((body) => setPayments(Array.isArray(body?.data) ? body.data : []))
      .catch((err) => { setPaymentsError(err.message); setPayments([]); })
      .finally(() => setPaymentsLoading(false));
  }, [selectedProject]);

  /* ── Derived ── */
  const filteredProjects =
    statusFilter === "All"
      ? projects
      : projects.filter(
          (p) => p.status?.toLowerCase() === statusFilter.toLowerCase(),
        );

  const visibleProjects = showAllProjects
    ? filteredProjects
    : filteredProjects.slice(0, PROJECTS_INITIAL_COUNT);

  const hiddenCount = filteredProjects.length - PROJECTS_INITIAL_COUNT;

  const costBreakdown = {
    labour: costSummary.reduce((s, w) => s + Number(w.labour_cost || 0), 0),
    material: costSummary.reduce((s, w) => s + Number(w.material_cost || 0), 0),
  };

  /* ── Selected project values ── */
  const sp = selectedProject;
  const progress = sp?.progress || 0;
  const budget = Number(sp?.budget || 0);
  const spent = Number(sp?.spent || 0);
  const paid = Number(sp?.client_paid || 0);
  const remaining = Math.max(0, budget - spent);
  const spentPct = budget ? (spent / budget) * 100 : 0;
  const paidPct = budget ? (paid / budget) * 100 : 0;
  const timelineData = buildTimeline(sp);

  /* ── Handlers ── */
  const handleAddProject = async () => {
    try {
      if (!newProject.name || !newProject.client || !newProject.budget) {
        alert("Please fill required fields");
        return;
      }
      const res = await authFetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProject.name,
          client: newProject.client,
          budget: newProject.budget,
          status: "Active",
          start_date: newProject.startDate,
          end_date: newProject.endDate,
          manager_id: newProject.manager_id,
          site_engineer_id: newProject.site_engineer_id,
          coordinator_id: newProject.coordinator_id,
          architect_id: newProject.architect_id || null,
          client_user_id: newProject.client_user_id || null,
          building_type: newProject.building_type,
          floors: newProject.floors,
          description: newProject.description,
          location: newProject.location,
          plot_size: newProject.plot_size,
          phone: newProject.phone,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setProjects((prev) => [data, ...prev]);
        setSelectedProject(data);
      }
      setNewProject({
        name: "",
        client: "",
        phone: "",
        startDate: "",
        endDate: "",
        budget: "",
        site_engineer_id: "",
        coordinator_id: "",
        building_type: "",
        floors: "",
        description: "",
        location: "",
        plot_size: "",
      });
      setShowProjectModal(false);
    } catch (err) {
      console.error("Create project error:", err);
    }
  };

  const calculateRemaining = (budget, spent) => budget - spent;
  const calculatePercentage = (spent, budget) =>
    ((spent / budget) * 100).toFixed(1);

  return (
    <div className="project-management-page">
      {/* Header */}
      <div className="pm-header">
        <div>
          <h1>Project Management System</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowProjectModal(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      <div className="pm-content">
        <div className="overview-section">
          {/* FILTER BUTTONS */}
          <div className="filter-buttons">
            {[
              "All",
              "Active",
              "In Progress",
              "Pending",
              "Completed",
              "Rejected",
            ].map((status) => (
              <button
                key={status}
                className={`filter-btn ${statusFilter === status ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter(status);
                  setShowAllProjects(false);
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* PROJECT CARDS */}
          {loading ? (
            <p>Loading projects...</p>
          ) : (
            <>
              <div className="projects-grid">
                {visibleProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    proj={proj}
                    isActive={selectedProject?.id === proj.id}
                    onClick={() => setSelectedProject(proj)}
                    variant="overview"
                  />
                ))}
              </div>

              {filteredProjects.length > PROJECTS_INITIAL_COUNT && (
                <div className="see-more-container">
                  <button
                    className="see-more-btn"
                    onClick={() => setShowAllProjects(!showAllProjects)}
                  >
                    {showAllProjects
                      ? "See Less ↑"
                      : `See More ↓ (${hiddenCount} more)`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* TABS */}
          <div className="pm-tabs">
            {[
              { key: "overview", label: "≡ Project Overview" },
              { key: "wbs", label: "⬚ WBS & Tasks" },
              { key: "timesheet", label: "🗂 Timesheet" },
              { key: "cost", label: "📊 Cost Tracking" },
              { key: "payments", label: "✳ Payments" },
              { key: "photos", label: "📷 Site Photos" },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={activeTab === key ? "active" : ""}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════
              TAB: PROJECT OVERVIEW
          ═══════════════════════════════ */}
          {activeTab === "overview" && sp && (
            <div className="pm-overview-grid">
              {/* LEFT — Detail Panel */}
              <div className="pm-detail-panel">
                {/* Title + status */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#0a2540",
                        margin: "0 0 4px",
                      }}
                    >
                      {sp.name}
                    </h2>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                      {sp.description || "—"}
                    </p>
                  </div>
                  <StatusPill status={sp.status} />
                </div>

                {/* Stat cards row */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <StatCard
                    label="Progress"
                    value={progress}
                    accent="#2563eb"
                  />
                  <StatCard
                    label="Budget"
                    value={fmt(budget)}
                    accent="#0a2540"
                  />
                  <StatCard label="Spent" value={fmt(spent)} accent="#dc2626" />
                  <StatCard
                    label="Client Paid"
                    value={fmt(paid)}
                    accent="#16a34a"
                  />
                </div>

                {/* Budget bar */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      height: 8,
                      background: "#e2e8f0",
                      borderRadius: 10,
                      overflow: "hidden",
                      position: "relative",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${Math.min(100, spentPct)}%`,
                        background: "#dc2626",
                        borderRadius: 10,
                        transition: "width 1s ease",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${Math.min(100, paidPct)}%`,
                        background: "#16a34a",
                        borderRadius: 10,
                        opacity: 0.6,
                        transition: "width 1s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    <span>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#dc2626",
                          marginRight: 5,
                        }}
                      />
                      Spent {fmt(spent)}
                    </span>
                    <span>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#16a34a",
                          marginRight: 5,
                        }}
                      />
                      Received {fmt(paid)}
                    </span>
                    <span>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#2563eb",
                          marginRight: 5,
                        }}
                      />
                      Remaining {fmt(remaining)}
                    </span>
                  </div>
                </div>

                {/* Info grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <DetailRow icon="📍" label="Location" value={sp.location} />
                  <DetailRow
                    icon="🏗️"
                    label="Building Type"
                    value={sp.building_type}
                  />
                  <DetailRow
                    icon="📐"
                    label="Plot Size"
                    value={sp.plot_size ? `${sp.plot_size} sq ft` : null}
                  />
                  <DetailRow icon="🏢" label="Floors" value={sp.floors} />
                  <DetailRow
                    icon="📅"
                    label="Start Date"
                    value={fmtDate(sp.start_date)}
                  />
                  <DetailRow
                    icon="🏁"
                    label="End Date"
                    value={fmtDate(sp.end_date)}
                  />
                  <DetailRow icon="👤" label="Client" value={sp.client} />
                  <DetailRow icon="📞" label="Phone" value={sp.phone} />
                </div>
              </div>

              {/* RIGHT — Chart Panel */}
              <div className="pm-chart-panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0a2540",
                        margin: "0 0 2px",
                      }}
                    >
                      Progress Timeline
                    </h3>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      Weekly overview · {sp.name}
                    </p>
                  </div>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      borderRadius: 20,
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Weekly
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#16a34a",
                        marginRight: 5,
                      }}
                    />
                    Completed
                  </span>
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#2563eb",
                        marginRight: 5,
                      }}
                    />
                    Progress
                  </span>
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#dc2626",
                        marginRight: 5,
                      }}
                    />
                    Delay Risk
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={timelineData}
                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "#16a34a",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="progress"
                      name="Progress"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "#2563eb",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="delay"
                      name="Delay Risk"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={{
                        r: 4,
                        fill: "#dc2626",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Chips */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 10,
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#16a34a",
                        margin: "0 0 4px",
                      }}
                    >
                      {progress}%
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#16a34a",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Complete
                    </p>
                  </div>
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 10,
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#2563eb",
                        margin: "0 0 4px",
                      }}
                    >
                      {Math.min(100, progress + 10)}%
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#2563eb",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      In Progress
                    </p>
                  </div>
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: 10,
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#dc2626",
                        margin: "0 0 4px",
                      }}
                    >
                      {Math.max(0, 100 - progress - 15)}%
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#dc2626",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Pending
                    </p>
                  </div>
                </div>

                {/* Recent activities */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: 8,
                    }}
                  >
                    Recent Activities
                  </h4>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    • Sample activity
                  </p>
                </div>

                {/* Timesheet mini */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: 10,
                    }}
                  >
                    Timesheet Submissions
                  </h4>
                  {timesheets.length === 0 && (
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>
                      {timesheetsLoading ? "Loading…" : "No timesheet entries logged for this project yet."}
                    </p>
                  )}
                  {timesheets
                    // Real data comes back newest-first already (unlike the
                    // old mock array, which was oldest-first and needed
                    // slice(-3).reverse() to show the latest 3).
                    .slice(0, 3)
                    .map((ts) => (
                      <div
                        key={ts.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#1e293b",
                            }}
                          >
                            {ts.employee}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              marginLeft: 6,
                            }}
                          >
                            {ts.task}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              background: "#eff6ff",
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {ts.hours}h
                          </span>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {ts.date}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "overview" && !sp && (
            <p style={{ padding: 24, color: "#94a3b8" }}>
              Select a project to see details.
            </p>
          )}

          {activeTab === "wbs" && <WbsPage selectedProject={selectedProject} />}

          {activeTab === "timesheet" && (
            <div className="timesheet-section" style={{ padding: 24 }}>
              {!sp ? (
                <p style={{ color: "#94a3b8" }}>Select a project to see its timesheets.</p>
              ) : timesheetsLoading ? (
                <p style={{ color: "#94a3b8" }}>Loading timesheets…</p>
              ) : timesheetsError ? (
                <p style={{ color: "#dc2626" }}>Couldn't load timesheets: {timesheetsError}</p>
              ) : timesheets.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No hours logged against this project yet.</p>
              ) : (
                <>
                  {timesheetSummary && (
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                      <div style={{ padding: "10px 16px", background: "#eff6ff", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b" }}>TOTAL HOURS</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{timesheetSummary.total_hours}h</div>
                      </div>
                      <div style={{ padding: "10px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b" }}>STAFF LOGGED</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{timesheetSummary.staff_count}</div>
                      </div>
                      <div style={{ padding: "10px 16px", background: "#fefce8", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b" }}>ENTRIES</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{timesheetSummary.entry_count}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "8px 10px" }}>Date</th>
                          <th style={{ padding: "8px 10px" }}>Staff</th>
                          <th style={{ padding: "8px 10px" }}>Task / WBS</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Hours</th>
                          <th style={{ padding: "8px 10px" }}>Timesheet status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheets.map((ts) => (
                          <tr key={ts.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 10px" }}>{fmtDate(ts.date)}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 600 }}>{ts.employee}</td>
                            <td style={{ padding: "8px 10px" }}>{ts.task}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                              {ts.hours}h{ts.leave_hours > 0 ? ` (+${ts.leave_hours}h leave)` : ""}
                            </td>
                            <td style={{ padding: "8px 10px" }}>{ts.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "cost" && (
            <CostTracking
              selectedProject={selectedProject}
              activePhase={activePhase}
              setActivePhase={setActivePhase}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              costBreakdown={costBreakdown}
              calculateRemaining={calculateRemaining}
              calculatePercentage={calculatePercentage}
              costSummary={costSummary}
            />
          )}

          {activeTab === "payments" && (
            <div className="payments-section" style={{ padding: 24 }}>
              {!sp ? (
                <p style={{ color: "#94a3b8" }}>Select a project to see its payments.</p>
              ) : paymentsLoading ? (
                <p style={{ color: "#94a3b8" }}>Loading payments…</p>
              ) : paymentsError ? (
                <p style={{ color: "#dc2626" }}>Couldn't load payments: {paymentsError}</p>
              ) : payments.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No payments recorded for this project yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "8px 10px" }}>Date</th>
                        <th style={{ padding: "8px 10px" }}>Type</th>
                        <th style={{ padding: "8px 10px" }}>Reference</th>
                        <th style={{ padding: "8px 10px" }}>Vendor / Invoice</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
                        <th style={{ padding: "8px 10px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 10px" }}>{fmtDate(p.payment_date)}</td>
                          <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{p.payment_type || "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{p.reference_number || "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{p.vendor_name || p.invoice_number || "—"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{fmt(p.amount)}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "capitalize",
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: p.status === "completed" ? "#dcfce7" : p.status === "pending" ? "#fef9c3" : "#fee2e2",
                                color: p.status === "completed" ? "#166534" : p.status === "pending" ? "#854d0e" : "#991b1b",
                              }}
                            >
                              {p.status || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "photos" && (
            <div className="photos-section" style={{ padding: 24 }}>
              <ProjectPhotosGrid projectId={sp?.id} />
            </div>
          )}
        </div>

        {/* NEW PROJECT MODAL */}
        {showProjectModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowProjectModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Project</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowProjectModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Commercial Tower - Downtown"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={newProject.client_user_id || ""}
                    onChange={(e) => {
                      const selected = clients.find(
                        (c) => String(c.id) === e.target.value,
                      );
                      setNewProject({
                        ...newProject,
                        client_user_id: e.target.value,
                        client: selected ? selected.name : "",
                      });
                    }}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g., 9876543210"
                    value={newProject.phone}
                    onChange={(e) =>
                      setNewProject({ ...newProject, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Budget (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 50000000"
                    value={newProject.budget}
                    onChange={(e) =>
                      setNewProject({ ...newProject, budget: e.target.value })
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Building Type</label>
                    <select
                      value={newProject.building_type}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          building_type: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Type</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Residential">Residential</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Floors</label>
                    <input
                      type="text"
                      placeholder="e.g. G+5, B+G+10"
                      value={newProject.floors}
                      onChange={(e) =>
                        setNewProject({ ...newProject, floors: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    placeholder="Enter location"
                    value={newProject.location}
                    onChange={(e) =>
                      setNewProject({ ...newProject, location: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Plot Size (sq ft)</label>
                  <input
                    type="number"
                    placeholder="e.g., 1200"
                    value={newProject.plot_size}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        plot_size: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Project description..."
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Project Manager</label>
                    <select
                      value={newProject.manager_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          manager_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Manager</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Site Engineer</label>
                    <select
                      value={newProject.site_engineer_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          site_engineer_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Site Engineer</option>
                      {siteEngineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Project Coordinator</label>
                    <select
                      value={newProject.coordinator_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          coordinator_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Coordinator</option>
                      {coordinators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Architect</label>
                    <select
                      value={newProject.architect_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          architect_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Architect</option>
                      {architects.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Team Size</label>
                    <input
                      type="number"
                      placeholder="e.g., 45"
                      value={newProject.teamSize}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          teamSize: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleAddProject}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectManagement;