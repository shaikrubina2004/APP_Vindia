import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getProjects } from "../../services/projectService";
import "./ThreeDVisualizerDashboard.css";

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n) >= 10000000 ? `₹${(Number(n) / 10000000).toFixed(1)}Cr`
  : Number(n) >= 100000  ? `₹${(Number(n) / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

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
    <span className="tviz-status-pill" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="tviz-status-dot" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

/* ── Badge ────────────────────────────────────────────────── */
const Badge = ({ status }) => {
  const map = {
    active: "blue", "in-progress": "blue", pending: "amber", approved: "green",
    rejected: "red", open: "blue", closed: "green", resolved: "green",
    completed: "green", sent: "green", draft: "gray",
  };
  const color = map[(status || "").toLowerCase()] || "gray";
  return <span className={`tviz-badge tviz-badge--${color}`}>{status || "—"}</span>;
};

/* ── Project card ─────────────────────────────────────────── */
const ProjectCard = ({ proj, isActive, onClick }) => (
  <div className={`tviz-proj-card ${isActive ? "active" : ""}`} onClick={onClick}>
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
    <div className="tviz-bar-track"><div className="tviz-bar-fill" style={{ width: `${proj.progress || 0}%` }} /></div>
  </div>
);

/* ── Detail row ───────────────────────────────────────────── */
const DetailRow = ({ icon, label, value }) => (
  <div className="tviz-detail-row">
    <span className="tviz-detail-row__icon">{icon}</span>
    <div>
      <p className="tviz-detail-row__label">{label}</p>
      <p className="tviz-detail-row__value">{value || "—"}</p>
    </div>
  </div>
);

/* ── Mini stat ────────────────────────────────────────────── */
const MiniStat = ({ label, value, color }) => (
  <div className="tviz-mini-stat">
    <p className="tviz-mini-stat__label">{label}</p>
    <p className="tviz-mini-stat__value" style={{ color }}>{value}</p>
  </div>
);

/* ── Panel header ─────────────────────────────────────────── */
const PanelHeader = ({ title, count, linkLabel, onLink }) => (
  <div className="tviz-panel-header">
    <span className="tviz-panel-title">
      {title}
      {count != null && <span className="tviz-count-chip">{count}</span>}
    </span>
    {linkLabel && <button className="tviz-link-btn" onClick={onLink}>{linkLabel} →</button>}
  </div>
);

/* ── Check In / Out ───────────────────────────────────────── */
const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(false);
  const [elapsed,    setElapsed]    = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchToday();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs  = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff  = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick(); timerRef.current = setInterval(tick, 1000);
    } else { setElapsed(""); }
  }, [attendance]);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/today?employee_id=${employeeId}`);
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const shiftStart = new Date(); shiftStart.setHours(9, 0, 0, 0);
      const lateMinutes = Math.floor(Math.max(0, now - shiftStart) / 60000);
      const res = await api.post("/attendance", {
        employee_id: employeeId,
        date: now.toISOString().slice(0, 10),
        check_in: now.toTimeString().slice(0, 8),
        status: "Present", shift: "morning",
        late_minutes: lateMinutes,
        remarks: lateMinutes > 0 ? `Late by ${lateMinutes} min` : "",
      });
      setAttendance(res.data);
    } catch (err) { console.error(err); alert("Check-in failed."); }
    finally { setBusy(false); }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const res = await api.put(`/attendance/${attendance.id}`, {
        check_out: new Date().toTimeString().slice(0, 8),
      });
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) { console.error(err); alert("Check-out failed."); }
    finally { setBusy(false); }
  };

  const isIn  = attendance?.check_in && !attendance?.check_out;
  const isDone = attendance?.check_in && attendance?.check_out;

  if (loading) return <button disabled className="tviz-ci-btn tviz-ci-btn--gray"><span className="tviz-ci-dot" /> Loading…</button>;

  if (isDone) return (
    <div className="tviz-ci-wrap">
      <button disabled className="tviz-ci-btn tviz-ci-btn--done"><span className="tviz-ci-dot tviz-ci-dot--green" /> ✓ Done for Today</button>
      <span className="tviz-ci-sub">{fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}</span>
    </div>
  );

  if (isIn) return (
    <div className="tviz-ci-wrap">
      <button onClick={handleCheckOut} disabled={busy} className="tviz-ci-btn tviz-ci-btn--out">
        <span className="tviz-ci-dot tviz-ci-dot--pulse" /> {busy ? "Saving…" : "Check Out"}
      </button>
      <span className="tviz-ci-sub">In: {fmtTime(attendance.check_in)}{elapsed && <> · <strong style={{ color: "#2563eb" }}>{elapsed}</strong></>}</span>
    </div>
  );

  return (
    <button onClick={handleCheckIn} disabled={busy} className="tviz-ci-btn tviz-ci-btn--in">
      <span className="tviz-ci-dot" /> {busy ? "Saving…" : "Check In"}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function ThreeDVisualizerDashboard() {
  const navigate   = useNavigate();
  const user       = getUser();
  const userId     = user?.id;
  const userName   = user?.name || "3D Vizualizer";
  const employeeId = user?.employee_id || user?.id || null;

  const [projects,  setProjects]  = useState([]);
  const [drawings,  setDrawings]  = useState([]);
  const [rfis,      setRfis]      = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [showAll,   setShowAll]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const projRes = await getProjects();
      const data    = projRes.data || [];
      setProjects(data);
      if (data.length > 0) {
        const sorted = [...data.filter(p => p.status === "IN PROGRESS"), ...data.filter(p => p.status !== "IN PROGRESS")];
        setSelected(sorted[0]);
      }

      const [drawRes, rfiRes, incRes] = await Promise.allSettled([
        fetch(`/api/architect-drawings?userId=${userId}&role=3d_visualizer`).then(r => r.json()),
        fetch("/api/rfis").then(r => r.json()),
        fetch("/api/incidents").then(r => r.json()),
      ]);

      if (drawRes.status === "fulfilled") { const d = drawRes.value?.data ?? drawRes.value ?? []; setDrawings(Array.isArray(d) ? d : []); }
      if (rfiRes.status  === "fulfilled") { const d = rfiRes.value?.data  ?? rfiRes.value  ?? []; setRfis(Array.isArray(d) ? d : []); }
      if (incRes.status  === "fulfilled") { const d = incRes.value?.data  ?? incRes.value  ?? []; setIncidents(Array.isArray(d) ? d : []); }
    } catch (err) { console.error("[3D Viz]", err); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sortedProjects  = [...projects.filter(p => p.status === "IN PROGRESS"), ...projects.filter(p => p.status !== "IN PROGRESS")];
  const visibleProjects = showAll ? sortedProjects : sortedProjects.slice(0, 3);
  const hasMore         = sortedProjects.length > 3;
  const activeCount     = projects.filter(p => ["active","in progress"].includes((p.status||"").toLowerCase())).length;
  const pendingRfis     = rfis.filter(r => ["open","pending"].includes((r.status||"").toLowerCase()));
  const openIncidents   = incidents.filter(i => !["closed","resolved"].includes((i.status||"").toLowerCase()));
  const recentDrawings  = [...drawings].sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5);

  const p         = selected?.progress || 0;
  const budget    = Number(selected?.budget || 0);
  const spent     = Number(selected?.spent || 0);
  const paid      = Number(selected?.client_paid || 0);
  const remaining = Math.max(0, budget - spent);
  const spentPct  = budget ? (spent / budget) * 100 : 0;
  const paidPct   = budget ? (paid  / budget) * 100 : 0;

  if (loading) return (
    <div className="tviz-page">
      <div className="tviz-sk tviz-sk--hdr" />
      <div className="tviz-proj-row">{[1,2,3].map(i => <div key={i} className="tviz-sk tviz-sk--card" />)}</div>
      <div className="tviz-sk tviz-sk--body" />
    </div>
  );

  return (
    <div className="tviz-page">

      {/* HEADER */}
      <div className="tviz-header">
        <div>
          <p className="tviz-breadcrumb">Dashboard</p>
          <h1 className="tviz-title">
            {getGreeting()}, <span className="tviz-title--blue">{userName}</span>
          </h1>
        </div>
        <div className="tviz-header-actions">
          {employeeId && <CheckInButton employeeId={employeeId} />}
          <button className="tviz-btn tviz-btn--outline" onClick={() => navigate("/3d-visualizer/drawings")}>
            Drawings
          </button>
          <button className="tviz-btn tviz-btn--primary" onClick={() => navigate("/3d-visualizer/models")}>
            + Upload Model
          </button>
        </div>
      </div>

      {/* STAT CHIPS */}
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

      {/* PROJECT CARDS */}
      <div className="tviz-proj-row">
        {projects.length === 0 ? (
          <p className="tviz-empty">No projects assigned.</p>
        ) : (
          visibleProjects.map(proj => (
            <ProjectCard key={proj.id} proj={proj} isActive={selected?.id === proj.id} onClick={() => setSelected(proj)} />
          ))
        )}
      </div>

      {hasMore && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:18, marginTop:-6 }}>
          <button className="tviz-see-more" onClick={() => setShowAll(v => !v)}>
            {showAll ? "Show Less ↑" : `See More ↓ (${sortedProjects.length - 3} more)`}
          </button>
        </div>
      )}

      {/* DETAIL GRID */}
      {selected && (
        <div className="tviz-main-grid">

          {/* left: project detail */}
          <div className="tviz-detail-panel">
            <div className="tviz-detail-panel__hdr">
              <div>
                <h2 className="tviz-detail-panel__name">{selected.name}</h2>
                <p className="tviz-detail-panel__desc">{selected.description || "—"}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="tviz-mini-row">
              <MiniStat label="Progress"    value={`${p}%`}     color="#2563eb" />
              <MiniStat label="Budget"      value={fmt(budget)} color="#0a2540" />
              <MiniStat label="Spent"       value={fmt(spent)}  color="#dc2626" />
              <MiniStat label="Client Paid" value={fmt(paid)}   color="#16a34a" />
            </div>

            <div className="tviz-budget-section">
              <div className="tviz-budget-track">
                <div className="tviz-budget-fill tviz-budget-fill--spent" style={{ width:`${Math.min(100,spentPct)}%` }} />
                <div className="tviz-budget-fill tviz-budget-fill--paid"  style={{ width:`${Math.min(100,paidPct)}%` }} />
              </div>
              <div className="tviz-budget-legend">
                <span><span className="tviz-ldot tviz-ldot--red" /> Spent {fmt(spent)}</span>
                <span><span className="tviz-ldot tviz-ldot--green" /> Received {fmt(paid)}</span>
                <span><span className="tviz-ldot tviz-ldot--blue" /> Remaining {fmt(remaining)}</span>
              </div>
            </div>

            <div className="tviz-info-grid">
              <DetailRow icon="📍" label="Location"      value={selected.location} />
              <DetailRow icon="🏗️" label="Building Type" value={selected.building_type} />
              <DetailRow icon="📐" label="Plot Size"     value={selected.plot_size} />
              <DetailRow icon="🏢" label="Floors"        value={selected.floors} />
              <DetailRow icon="📅" label="Start Date"    value={fmtDate(selected.start_date)} />
              <DetailRow icon="🏁" label="End Date"      value={fmtDate(selected.end_date)} />
              <DetailRow icon="👤" label="Client"        value={selected.client} />
              <DetailRow icon="📞" label="Phone"         value={selected.phone} />
            </div>
          </div>

          {/* right: drawings + RFIs + incidents */}
          <div className="tviz-right-col">

            {/* drawings */}
            <div className="tviz-panel-card">
              <PanelHeader title="Drawings from Architect" count={drawings.length} linkLabel="View all" onLink={() => navigate("/3d-visualizer/drawings")} />
              {recentDrawings.length === 0 ? (
                <p className="tviz-empty">No drawings shared yet.</p>
              ) : recentDrawings.map(d => (
                <div key={d.id} className="tviz-draw-row">
                  <div className="tviz-draw-icon"><i className="ti ti-file-description" /></div>
                  <div className="tviz-draw-info">
                    <div className="tviz-draw-name">{d.name || "Untitled"}</div>
                    <div className="tviz-draw-meta">{d.project_name || "—"} · Rev {d.current_revision || d.revision || "—"} · {fmtDateTime(d.created_at)}</div>
                  </div>
                  <span className={`tviz-tag ${d.drawing_type === "Working Drawing" ? "tviz-tag--gold" : "tviz-tag--blue"}`}>
                    {d.drawing_type === "Working Drawing" ? "Working" : "Detailed"}
                  </span>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="tviz-dl-btn"><i className="ti ti-download" /></a>
                  )}
                </div>
              ))}
            </div>

            {/* RFIs */}
            <div className="tviz-panel-card">
              <PanelHeader title="Recent RFIs" count={pendingRfis.length > 0 ? pendingRfis.length : null} linkLabel="View all" onLink={() => navigate("/3d-visualizer/rfi")} />
              {rfis.length === 0 ? <p className="tviz-empty">No RFIs found.</p> : rfis.slice(0,4).map(r => (
                <div key={r.id} className="tviz-rfi-row" onClick={() => navigate(`/3d-visualizer/rfi/${r.id}`)}>
                  <div>
                    <div className="tviz-rfi-subject">{r.subject || r.title || `RFI #${r.id}`}</div>
                    <div className="tviz-rfi-meta">{r.project_name || "—"} · {fmtDateTime(r.created_at)}</div>
                  </div>
                  <Badge status={r.status || "Open"} />
                </div>
              ))}
            </div>

            {/* incidents */}
            <div className="tviz-panel-card">
              <PanelHeader title="Recent Incidents" count={openIncidents.length > 0 ? openIncidents.length : null} linkLabel="View all" onLink={() => navigate("/3d-visualizer/incidents")} />
              {incidents.length === 0 ? <p className="tviz-empty">No incidents reported.</p> : incidents.slice(0,4).map(inc => (
                <div key={inc.id} className="tviz-inc-row">
                  <div className={`tviz-inc-sev tviz-inc-sev--${(inc.severity||inc.priority||"low").toLowerCase()}`} />
                  <div className="tviz-inc-info">
                    <div className="tviz-inc-title">{inc.title || `Incident #${inc.id}`}</div>
                    <div className="tviz-inc-meta">{inc.project_name || "—"} · {fmtDateTime(inc.created_at)}</div>
                  </div>
                  <Badge status={inc.status || "Open"} />
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}