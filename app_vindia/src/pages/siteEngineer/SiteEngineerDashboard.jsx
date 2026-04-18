// src/pages/siteEngineer/SiteEngineerDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/siteEngineer.css";
function makeKey(item) {
  if (!item) return "";
  if (item.id != null) return String(item.id);
  return `${item.refNo || ""}|${item.subject || item.description || ""}|${item.zone || ""}`;
}
function dedupe(arr = []) {
  const seen = new Set();
  return arr.filter(it => { const k = makeKey(it); if (seen.has(k)) return false; seen.add(k); return true; });
}
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function PriorityBadge({ p }) {
  const map = { critical: "dash-badge dash-badge--critical", high: "dash-badge dash-badge--high", medium: "dash-badge dash-badge--medium", low: "dash-badge dash-badge--low" };
  return <span className={map[p] || "dash-badge dash-badge--low"}>{p || "medium"}</span>;
}
function StatusBadge({ s }) {
  const map = { open: "dash-badge dash-badge--open", responded: "dash-badge dash-badge--responded", closed: "dash-badge dash-badge--closed" };
  return <span className={map[s] || "dash-badge dash-badge--open"}>{s || "open"}</span>;
}

const ZONE_CFG = {
  complete:    { color: "#6EA2B3", label: "Complete"      },
  near:        { color: "#4E8EA2", label: "Near Complete" },
  in_progress: { color: "#0A4174", label: "In Progress"   },
  delayed:     { color: "#b07020", label: "Delayed"       },
  not_started: { color: "#BDD8E9", label: "Not Started"   },
};

const PIP = { rfi: "#7BBDE8", ncr: "#b83232", dsr: "#6EA2B3", itp: "#4E8EA2", mat: "#49769F", att: "#BDD8E9" };

const ZONES = [
  { name: "Basement B1",  planned: 100, actual: 100, status: "complete"    },
  { name: "Ground Floor", planned: 100, actual: 100, status: "complete"    },
  { name: "Level 1",      planned: 100, actual: 95,  status: "near"        },
  { name: "Level 2",      planned: 80,  actual: 72,  status: "in_progress" },
  { name: "Level 3",      planned: 55,  actual: 48,  status: "in_progress" },
  { name: "Level 4",      planned: 20,  actual: 15,  status: "delayed"     },
];

const ACTIVITY = [
  { label: "RFI-003 responded — Foundation depth approved at 1500mm", type: "rfi",  time: "10:42" },
  { label: "NCR-001 raised — Concrete cube failure Level 2 Pour 14",  type: "ncr",  time: "16:05" },
  { label: "Daily Site Report submitted to Project Manager",           type: "dsr",  time: "17:28" },
  { label: "ITP-002 approved — Level 2 formwork inspection passed",   type: "itp",  time: "10:30" },
  { label: "Material request approved — 12mm rebar 15 tonnes",        type: "mat",  time: "09:00" },
  { label: "Attendance logged — 47 workers across 6 gangs",           type: "att",  time: "07:45" },
];

const QUICK = [
  { label: "Submit DSR",       icon: "📋" },
  { label: "Raise RFI",        icon: "❓" },
  { label: "Raise NCR",        icon: "⚠️" },
  { label: "Log Attendance",   icon: "👷" },
  { label: "Request Material", icon: "📦" },
  { label: "ITP Inspection",   icon: "✅" },
];

export default function SiteEngineerDashboard() {
  const [rfis, setRFIs]       = useState([]);
  const [ncrs, setNCRs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime]       = useState(new Date());
  const loaded = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    Promise.all([api.get("/rfi"), api.get("/ncr")])
      .then(([r, n]) => {
        setRFIs(dedupe(Array.isArray(r?.data) ? r.data : []));
        setNCRs(dedupe(Array.isArray(n?.data) ? n.data : []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openRFIs = useMemo(() => rfis.filter(r => !r?.status || r.status === "open"), [rfis]);
  const openNCRs = useMemo(() => ncrs.filter(n => !n?.status || n.status === "open"), [ncrs]);

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">
          <div className="dash-spinner" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">

      {/* ── HERO ──────────────────────────────────── */}
      <header className="dash-hero">
        <div className="dash-hero-grid" aria-hidden="true" />
        <div className="dash-hero-glow" aria-hidden="true" />

        <div className="dash-hero-inner">
          <div className="dash-hero-left">
            <div className="dash-crumb">
              <span className="dash-crumb-dot" />
              Al-Noor Residential Tower
              <span className="dash-crumb-sep">›</span>
              Phase 2
              <span className="dash-crumb-sep">›</span>
              <strong>Block C · ANT-PH2</strong>
            </div>
            <div className="dash-hero-role">Site Engineer</div>
            <h1 className="dash-hero-title">Dashboard</h1>
            <div className="dash-hero-date">{fmtDate(time)}</div>
          </div>

          <div className="dash-hero-right">
            {/* Weather */}
            <div className="dash-weather">
              <div className="dash-weather-top">
                <span className="dash-weather-icon">⛅</span>
                <div>
                  <div className="dash-weather-temp">29°C</div>
                  <div className="dash-weather-cond">Partly Cloudy — Site Clear</div>
                </div>
              </div>
              <div className="dash-weather-stats">
                {[["68%", "Humidity"], ["12 km/h", "Wind"], ["Good", "Visibility"]].map(([v, l], i) => (
                  <React.Fragment key={l}>
                    {i > 0 && <div className="dash-weather-div" />}
                    <div className="dash-weather-stat">
                      <div className="dash-weather-val">{v}</div>
                      <div className="dash-weather-lbl">{l}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <button
              className="dash-cta"
              onClick={() => window.dispatchEvent(new CustomEvent("se:new-rfi"))}
            >
              + New RFI
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────── */}
      <div className="dash-body">

        {/* KPI ROW */}
        <div className="dash-kpi-row">
          {[
            { label: "Week Progress",   value: "78%",           sub: "+6% ahead of target",          mod: "teal",    prog: 78 },
            { label: "Open RFIs",       value: openRFIs.length, sub: `${rfis.length} total raised`,  mod: "sky"           },
            { label: "Open NCRs",       value: openNCRs.length, sub: "1 critical hold active",       mod: "danger"        },
            { label: "Labour Today",    value: 47,              sub: "6 gangs on site",               mod: "navy"          },
          ].map(k => (
            <div key={k.label} className={`dash-kpi dash-kpi--${k.mod}`}>
              <div className="dash-kpi-label">{k.label}</div>
              <div className="dash-kpi-value">{k.value}</div>
              <div className="dash-kpi-sub">{k.sub}</div>
              {k.prog != null && (
                <div className="dash-kpi-track">
                  <div className="dash-kpi-fill" style={{ width: `${k.prog}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="dash-grid">

          {/* LEFT */}
          <div className="dash-col">

            {/* Zone Progress */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">Zone Progress</div>
                  <div className="dash-panel-hint">Planned (light) vs Actual</div>
                </div>
                <div className="dash-ring-wrap">
                  <svg viewBox="0 0 36 36" className="dash-ring-svg">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(189,216,233,0.12)" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#6EA2B3" strokeWidth="3.5"
                      strokeDasharray="53.78 87.96" strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                  </svg>
                  <span className="dash-ring-val">61%</span>
                  <div className="dash-ring-lbl">Overall</div>
                </div>
              </div>
              <div className="dash-panel-body">
                {ZONES.map(z => {
                  const zc = ZONE_CFG[z.status] || ZONE_CFG.not_started;
                  return (
                    <div key={z.name} className="dash-zone">
                      <div className="dash-zone-meta">
                        <span className="dash-zone-name">{z.name}</span>
                        <div className="dash-zone-right">
                          <span className="dash-zone-status" style={{ color: zc.color }}>{zc.label}</span>
                          <span className="dash-zone-pct" style={{ color: zc.color }}>{z.actual}%</span>
                        </div>
                      </div>
                      <div className="dash-bar-track">
                        <div className="dash-bar-planned" style={{ width: `${z.planned}%` }} />
                        <div className="dash-bar-actual"  style={{ width: `${z.actual}%`, background: zc.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="dash-zone-legend">
                  <span><i style={{ background: "rgba(73,118,159,0.2)" }} />Planned</span>
                  <span><i style={{ background: "#6EA2B3" }} />Actual</span>
                </div>
              </div>
            </div>

            {/* RFI Table */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">RFI Register</div>
                  <div className="dash-panel-hint">Request for Information</div>
                </div>
                <span className="dash-pill dash-pill--amber">{openRFIs.length} Open</span>
              </div>
              {rfis.length === 0
                ? <div className="dash-empty">No RFIs raised yet</div>
                : <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>Ref</th><th>Subject</th><th>Assigned To</th><th>Priority</th><th>Status</th></tr></thead>
                      <tbody>
                        {rfis.slice(0, 6).map(r => (
                          <tr key={makeKey(r)}>
                            <td className="dash-ref dash-ref--amber">{r.refNo || `RFI-${String(r.id ?? "").padStart(3, "0")}`}</td>
                            <td className="dash-trunc">{r.subject || r.title || "—"}</td>
                            <td className="dash-muted">{r.assignedTo?.name || r.assignedToName || "—"}</td>
                            <td><PriorityBadge p={r.priority || "medium"} /></td>
                            <td><StatusBadge s={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </div>

          {/* RIGHT */}
          <div className="dash-col">

            {/* NCR Table */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">NCR Register</div>
                  <div className="dash-panel-hint">Non-Conformance Reports</div>
                </div>
                <span className="dash-pill dash-pill--danger">{openNCRs.length} Open</span>
              </div>
              {ncrs.length === 0
                ? <div className="dash-empty">No NCRs raised yet</div>
                : <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>Ref</th><th>Description</th><th>Zone</th><th>Priority</th><th>Hold</th></tr></thead>
                      <tbody>
                        {ncrs.slice(0, 5).map(n => (
                          <tr key={makeKey(n)}>
                            <td className="dash-ref dash-ref--danger">{n.refNo || `NCR-${String(n.id ?? "").padStart(3, "0")}`}</td>
                            <td className="dash-trunc">{n.description || n.subject || "—"}</td>
                            <td className="dash-muted">{n.zone || "—"}</td>
                            <td><PriorityBadge p={n.priority || "medium"} /></td>
                            <td>{n.holdPlaced ? <span className="dash-hold">HOLD</span> : <span className="dash-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>

            {/* Activity */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title">Activity Log</div>
                <span className="dash-panel-hint">Today</span>
              </div>
              <div className="dash-feed">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="dash-feed-item">
                    <div className="dash-feed-pip" style={{ background: PIP[a.type] || "#94a3b8" }} />
                    <div>
                      <div className="dash-feed-text">{a.label}</div>
                      <div className="dash-feed-time">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title">Quick Actions</div>
              </div>
              <div className="dash-actions">
                {QUICK.map(a => (
                  <button
                    key={a.label}
                    className="dash-action-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent("se:quick-action", { detail: { action: a.label } }))}
                  >
                    <span className="dash-action-icon">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
