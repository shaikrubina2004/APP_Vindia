// src/pages/Project Coordinator/ProjectCoordinatorDashboard.jsx
import { getProjects } from "../../services/projectService";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Coordinator.css";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import api from "../../services/api";
import CheckInButton from "../../SharedResourse/CheckInButton";

/* ── Formatters ─────────────────────────────────────────── */
const fmt = (n) =>
  Number(n) >= 10000000 ? `₹${(Number(n) / 10000000).toFixed(1)}Cr`
  : Number(n) >= 100000  ? `₹${(Number(n) / 100000).toFixed(1)}L`
  : `₹${Number(n).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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

/* ── Modal styles ────────────────────────────────────────── */
const overlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalStyle = {
  background: "#fff",
  padding: 24,
  borderRadius: 14,
  width: 460,
  maxHeight: "82vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};
const cardStyle = {
  border: "1px solid #e2e8f0",
  padding: "12px 14px",
  marginBottom: 10,
  borderRadius: 8,
  background: "#f8fafc",
};

/* ── Skeleton ────────────────────────────────────────────── */
const Skeleton = ({ w = "100%", h = 16, r = 8, mb = 0 }) => (
  <div className="coord-skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
);

const DetailPanelSkeleton = () => (
  <div className="coord-detail-panel">
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div style={{ flex: 1 }}>
        <Skeleton w="55%" h={22} r={6} mb={10} />
        <Skeleton w="35%" h={13} r={6} />
      </div>
      <Skeleton w={90} h={28} r={20} />
    </div>
    <div className="coord-stats-row">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="coord-stat-card">
          <Skeleton h={12} r={4} mb={10} />
          <Skeleton w="55%" h={22} r={6} />
        </div>
      ))}
    </div>
    <Skeleton h={8} r={10} mb={8} />
    <Skeleton w="50%" h={12} r={6} mb={16} />
    <div className="coord-info-grid">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} h={54} r={10} />)}
    </div>
  </div>
);

/* ── Status pill ─────────────────────────────────────────── */
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
    <span className="coord-status-pill" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="coord-status-dot" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

/* ── Ring ────────────────────────────────────────────────── */
const Ring = ({ pct = 0, size = 56, stroke = 5 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dbeafe" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2563eb" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
};

/* ── Chart tooltip ───────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="coord-tooltip">
      <p className="coord-tooltip__day">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700, fontSize: 12 }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

/* ── Detail row ──────────────────────────────────────────── */
const DetailRow = ({ icon, label, value }) => (
  <div className="coord-detail-row">
    <span className="coord-detail-row__icon">{icon}</span>
    <div>
      <p className="coord-detail-row__label">{label}</p>
      <p className="coord-detail-row__value">{value || "—"}</p>
    </div>
  </div>
);

/* ── Animated number ─────────────────────────────────────── */
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    let cur = 0;
    const step = Math.ceil(target / (dur / 16));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setV(target); clearInterval(t); } else setV(cur);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

/* ── Stat card ───────────────────────────────────────────── */
const StatCard = ({ label, value, accent, suffix = "" }) => {
  const n = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="coord-stat-card" style={{ "--accent": accent }}>
      <p className="coord-stat-card__label">{label}</p>
      <p className="coord-stat-card__value" style={{ color: accent }}>
        {typeof value === "number" ? n : value}{suffix}
      </p>
    </div>
  );
};

/* ── Project Card ────────────────────────────────────────── */
const CoordProjectCard = ({ proj, isActive, isLoading, onClick }) => (
  <div
    className={`coord-project-card ${isActive ? "active" : ""} ${isLoading ? "loading" : ""}`}
    onClick={onClick}
  >
    <div className="coord-project-card__accent" />
    <div className="coord-project-card__ripple" />
    <div className="coord-project-card__top">
      <div className="coord-project-card__info">
        <p className="coord-project-card__client">{proj.client}</p>
        <h3 className="coord-project-card__name">{proj.name}</h3>
        <StatusPill status={proj.status} />
      </div>
      <div className="coord-project-card__ring">
        <Ring pct={proj.progress || 0} />
        <span className="coord-project-card__pct">{proj.progress || 0}%</span>
      </div>
    </div>
    <div className="coord-project-card__meta">
      <div><p className="meta-lbl">Engineer</p><p className="meta-val">{proj.site_engineer_name || "—"}</p></div>
      <div><p className="meta-lbl">Budget</p><p className="meta-val">{fmt(proj.budget)}</p></div>
      <div><p className="meta-lbl">Deadline</p><p className="meta-val">{fmtDate(proj.end_date)}</p></div>
    </div>
    <div className="coord-bar-track">
      <div className="coord-bar-fill" style={{ width: `${proj.progress || 0}%` }} />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   MATERIAL REQUEST MODAL
══════════════════════════════════════════════════════════ */
const MaterialRequestModal = ({ requests, onClose, onUpdate }) => {
  const [view, setView] = useState("list");
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (id, status) => {
    setUpdating(true);
    try {
      await api.put(`/material-request/${id}`, { status });
      onUpdate();
      setView("list");
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {view === "list" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Material Requests</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>
            {requests.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No material requests yet</p>
            ) : (
              requests.map(r => (
                <div key={r.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{r.purpose || "—"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {r.zone && <span>Zone: {r.zone} · </span>}
                        {r.required_by && <span>Due: {fmtDate(r.required_by)}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: r.status === "approved" ? "#f0fdf4" : r.status === "rejected" ? "#fef2f2" : "#eff6ff",
                      color: r.status === "approved" ? "#16a34a" : r.status === "rejected" ? "#dc2626" : "#2563eb",
                      border: `1px solid ${r.status === "approved" ? "#86efac" : r.status === "rejected" ? "#fca5a5" : "#93c5fd"}`,
                    }}>
                      {(r.status || "requested").toUpperCase()}
                    </span>
                  </div>
                  {r.status === "requested" && (
                    <button
                      onClick={() => setView(r)}
                      style={{ marginTop: 8, padding: "5px 14px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd", borderRadius: 8, cursor: "pointer" }}
                    >
                      Review →
                    </button>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setView("list")} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>←</button>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Review Request</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b", marginLeft: "auto" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[
                ["Project",  view.project],
                ["Zone",     view.zone],
                ["Purpose",  view.purpose],
                ["Required By", fmtDate(view.required_by)],
                ["Activity", view.linked_activity],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#475569", minWidth: 90 }}>{label}:</span>
                  <span style={{ color: "#0f172a" }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#94a3b8", marginBottom: 8 }}>Items</div>
              {(() => {
                try {
                  const items = typeof view.items === "string" ? JSON.parse(view.items) : (view.items || []);
                  return items.map((it, i) => (
                    <div key={i} style={{ ...cardStyle, fontSize: 13 }}>
                      <strong>{it.description}</strong>
                      <span style={{ color: "#64748b", marginLeft: 8 }}>{it.qty} {it.unit}</span>
                      {it.spec && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{it.spec}</div>}
                    </div>
                  ));
                } catch {
                  return <p style={{ fontSize: 12, color: "#94a3b8" }}>Could not parse items</p>;
                }
              })()}
            </div>
            {view.notes && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
                <strong>Notes:</strong> {view.notes}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleUpdate(view.id, "approved")}
                disabled={updating}
                style={{ flex: 1, padding: "10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: updating ? 0.6 : 1 }}
              >
                {updating ? "Saving…" : "✓ Approve"}
              </button>
              <button
                onClick={() => handleUpdate(view.id, "rejected")}
                disabled={updating}
                style={{ flex: 1, padding: "10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: updating ? 0.6 : 1 }}
              >
                {updating ? "Saving…" : "✗ Reject"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════ */
const ProjectCoordinatorDashboard = () => {
  const navigate = useNavigate();

  const [projects, setProjects]           = useState([]);
  const [selected, setSelected]           = useState(null);
  const [pageLoading, setPageLoading]     = useState(true);
  const [cardLoading, setCardLoading]     = useState(null);
  const [panelKey, setPanelKey]           = useState(0);
  const [showAll, setShowAll]             = useState(false);
  const [requests, setRequests]           = useState([]);
  const [showMatModal, setShowMatModal]   = useState(false);

  // ── Get current employee info from localStorage / your auth context ──
  // Adjust this to however you store the logged-in user's id.
  // `designation` is only used by CheckInButton to decide whether to
  // skip location capture for the CEO — if your stored "user" object
  // doesn't have designation yet, it falls back to role, same as the
  // BDA dashboard.
  const storedUser  = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId  = storedUser?.employee_id || storedUser?.id || null;
  const designation = storedUser?.designation || storedUser?.role || null;
  console.log("FULL USER:", storedUser);
  console.log("EMPLOYEE ID:", employeeId);

  /* ── Load projects ─────────────────────────────────────── */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await getProjects();
        const data = res.data;
        setProjects(data);
        if (data.length > 0) {
          const sorted = [
            ...data.filter(p => p.status === "IN PROGRESS"),
            ...data.filter(p => p.status !== "IN PROGRESS"),
          ];
          setSelected(sorted[0]);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setPageLoading(false);
      }
    };
    setPageLoading(true);
    fetchProjects();
  }, []);

  /* ── Load material requests ────────────────────────────── */
  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/material-request");
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  /* ── Card select ───────────────────────────────────────── */
  const handleSelect = (proj) => {
    if (!proj || proj.id === selected?.id) return;
    setCardLoading(proj.id);
    setTimeout(() => {
      setSelected(proj);
      setPanelKey(k => k + 1);
      setCardLoading(null);
    }, 300);
  };

  /* ── Derived values ────────────────────────────────────── */
  const sortedProjects = [
    ...projects.filter(p => p.status === "IN PROGRESS"),
    ...projects.filter(p => p.status !== "IN PROGRESS"),
  ];
  const visibleProjects = showAll ? sortedProjects : sortedProjects.slice(0, 3);
  const hasMore = sortedProjects.length > 3;

  const p         = selected?.progress || 0;
  const budget    = Number(selected?.budget || 0);
  const spent     = Number(selected?.spent || 0);
  const paid      = Number(selected?.client_paid || 0);
  const remaining = Math.max(0, budget - spent);
  const spentPercent = budget ? (spent / budget) * 100 : 0;
  const paidPercent  = budget ? (paid  / budget) * 100 : 0;
  const timelineData = selected ? buildTimeline(selected) : [];

  const pendingCount = requests.filter(r => r.status === "requested").length;

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="coord-dashboard">

      {/* HEADER */}
      <div className="coord-header">
        <div>
          <p className="coord-breadcrumb">Dashboard</p>
          <h1 className="coord-title">Project Coordinator</h1>
        </div>
        <div className="coord-header-actions">

          {/* ── CHECK IN / OUT ── */}
          {employeeId && (
            <CheckInButton employeeId={employeeId} designation={designation} />
          )}

          <button className="coord-btn-outline" onClick={() => navigate("/project-coordinator/payments")}>
            Payments
          </button>
          <button className="coord-btn-primary" onClick={() => navigate("/project-coordinator/milestone")}>
            Milestone
          </button>
          <button className="coord-btn-outline" onClick={() => {
            fetchRequests();
            setShowMatModal(true);
          }} style={{ position: "relative" }}>
            Material Requests
            {pendingCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                minWidth: 18, height: 18, borderRadius: 99,
                background: "#dc2626", color: "#fff",
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px",
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PROJECT CARDS */}
      <div className="coord-projects">
        {pageLoading ? (
          <p>Loading projects…</p>
        ) : projects.length === 0 ? (
          <p>No projects found</p>
        ) : (
          visibleProjects.map(proj => (
            <CoordProjectCard
              key={proj.id}
              proj={proj}
              isActive={selected?.id === proj.id}
              isLoading={cardLoading === proj.id}
              onClick={() => handleSelect(proj)}
            />
          ))
        )}
      </div>

      {/* SEE MORE / LESS */}
      {!pageLoading && hasMore && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18, marginTop: -6 }}>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: showAll ? "#f8fbff" : "#eff6ff",
              border: "1.5px solid #bfdbfe",
              color: "#2563eb",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 22px",
              borderRadius: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
            }}
          >
            {showAll ? <>Show Less ↑</> : <>See More ↓ ({sortedProjects.length - 3} more)</>}
          </button>
        </div>
      )}

      {/* DETAIL + CHART */}
      {selected && (
        <div className="coord-main-grid" key={panelKey}>

          {/* Detail panel */}
          {cardLoading ? <DetailPanelSkeleton /> : (
            <div className="coord-detail-panel coord-panel-enter">
              <div className="coord-detail-panel__header">
                <div>
                  <h2 className="coord-detail-panel__name">{selected.name}</h2>
                  <p className="coord-detail-panel__desc">{selected.description}</p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <div className="coord-stats-row">
                <StatCard label="Progress"    value={p}           accent="#2563eb" suffix="%" />
                <StatCard label="Budget"      value={fmt(budget)} accent="#0a2540" />
                <StatCard label="Spent"       value={fmt(spent)}  accent="#dc2626" />
                <StatCard label="Client Paid" value={fmt(paid)}   accent="#16a34a" />
              </div>

              <div className="coord-budget-section">
                <div className="coord-budget-bar-track">
                  <div className="coord-budget-bar-fill coord-budget-bar-fill--spent" style={{ width: `${Math.min(100, spentPercent)}%` }} />
                  <div className="coord-budget-bar-fill coord-budget-bar-fill--paid"  style={{ width: `${Math.min(100, paidPercent)}%` }} />
                </div>
                <div className="coord-budget-legend">
                  <span className="coord-budget-legend__item"><span className="dot dot--red" /> Spent {fmt(spent)}</span>
                  <span className="coord-budget-legend__item"><span className="dot dot--green" /> Received {fmt(paid)}</span>
                  <span className="coord-budget-legend__item"><span className="dot dot--blue" /> Remaining {fmt(remaining)}</span>
                </div>
              </div>

              <div className="coord-info-grid">
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
          )}

          {/* Chart panel */}
          <div className="coord-chart-panel coord-panel-enter">
            <div className="coord-chart-panel__header">
              <div>
                <h3 className="coord-chart-panel__title">Progress Timeline</h3>
                <p className="coord-chart-panel__sub">Weekly overview · {selected.name}</p>
              </div>
              <span className="coord-chart-badge">Weekly</span>
            </div>

            <div className="coord-chart-legend">
              <span className="coord-chart-legend__item"><span className="dot dot--green" />Completed</span>
              <span className="coord-chart-legend__item"><span className="dot dot--blue" />Progress</span>
              <span className="coord-chart-legend__item"><span className="dot dot--red" />Delay Risk</span>
            </div>

            {cardLoading ? <Skeleton h={220} r={10} /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#16a34a" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="progress" name="Progress" stroke="#2563eb" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="delay" name="Delay Risk" stroke="#dc2626" strokeWidth={2.5}
                    strokeDasharray="5 3" dot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className="coord-chart-chips">
              <div className="coord-chip coord-chip--green">
                <p className="coord-chip__num">{p}%</p>
                <p className="coord-chip__label">Complete</p>
              </div>
              <div className="coord-chip coord-chip--blue">
                <p className="coord-chip__num">{Math.min(100, p + 10)}%</p>
                <p className="coord-chip__label">In Progress</p>
              </div>
              <div className="coord-chip coord-chip--red">
                <p className="coord-chip__num">{Math.max(0, 100 - p - 15)}%</p>
                <p className="coord-chip__label">Pending</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MATERIAL REQUEST MODAL */}
      {showMatModal && (
        <MaterialRequestModal
          requests={requests}
          onClose={() => setShowMatModal(false)}
          onUpdate={() => { fetchRequests(); }}
        />
      )}

    </div>
  );
};

export default ProjectCoordinatorDashboard;