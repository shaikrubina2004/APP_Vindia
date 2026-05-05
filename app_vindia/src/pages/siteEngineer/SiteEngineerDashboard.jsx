// src/pages/siteEngineer/SiteEngineerDashboard.jsx
// FULLY UPDATED — live data, all modules connected, notifications, planned vs actual,
// pending approvals, snag count, SI count, material requests, auto-reminders
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useNotifications } from "../../context/NotificationContext";
import { useAutoReminders } from "../../hooks/useAutoReminders";
import NotificationBell from "../../components/notifications/NotificationBell";
import "../../styles/siteEngineer.css";

/* ── helpers ─────────────────────────────────────────────── */
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
function fmtTime(d) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function nowISO() { return new Date().toISOString().slice(0, 10); }

/* ── badge components ────────────────────────────────────── */
function PriorityBadge({ p }) {
  const map = { critical: "dash-badge dash-badge--critical", high: "dash-badge dash-badge--high", medium: "dash-badge dash-badge--medium", low: "dash-badge dash-badge--low" };
  return <span className={map[p] || "dash-badge dash-badge--low"}>{p || "medium"}</span>;
}
function StatusBadge({ s }) {
  const map = { open: "dash-badge dash-badge--open", responded: "dash-badge dash-badge--responded", closed: "dash-badge dash-badge--closed", pending: "dash-badge dash-badge--open", approved: "dash-badge dash-badge--responded", implemented: "dash-badge dash-badge--closed" };
  return <span className={map[s] || "dash-badge dash-badge--open"}>{s || "open"}</span>;
}

/* ── zone config ─────────────────────────────────────────── */
const ZONE_CFG = {
  complete:    { color: "#6EA2B3", label: "Complete"      },
  near:        { color: "#4E8EA2", label: "Near Complete" },
  in_progress: { color: "#0A4174", label: "In Progress"   },
  delayed:     { color: "#b07020", label: "Delayed"       },
  not_started: { color: "#BDD8E9", label: "Not Started"   },
};

const PIP = {
  rfi: "#7BBDE8", ncr: "#b83232", dsr: "#6EA2B3", itp: "#4E8EA2",
  mat: "#49769F", att: "#BDD8E9", snag: "#EF9F27", si: "#C49FDC",
  approval: "#5DCAA5", photo: "#6EA2B3",
};

/* ── quick actions — all wired to real routes ────────────── */
const QUICK_ACTIONS = [
  { label: "Daily Diary",       icon: "📋", route: "/site-engineer/diary"             },
  { label: "Raise RFI",         icon: "❓", route: "/site-engineer/rfi"               },
  { label: "Log Progress",      icon: "📊", route: "/site-engineer/progress"          },
  { label: "Material Request",  icon: "📦", route: "/site-engineer/materials"         },
  { label: "Request Approval",  icon: "✅", route: "/site-engineer/approvals"         },
  { label: "Upload Photos",     icon: "📸", route: "/site-engineer/photos"            },
  { label: "Site Instructions", icon: "📝", route: "/site-engineer/site-instructions" },
  { label: "Snag List",         icon: "🔧", route: "/site-engineer/snag-list"         },
];

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function SiteEngineerDashboard() {
  // ── hooks ─────────────────────────────────────────────────
  useAutoReminders(); // fires deadline/RFI/task reminders automatically
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();

  // ── state ──────────────────────────────────────────────────
  const [time, setTime]             = useState(new Date());
  const [loading, setLoading]       = useState(true);

  // Module data
  const [rfis, setRFIs]             = useState([]);
  const [ncrs, setNCRs]             = useState([]);
  const [progressEntries, setProg]  = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [openSnags, setOpenSnags]   = useState([]);
  const [pendingSIs, setPendingSIs] = useState([]);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [diaryToday, setDiaryToday] = useState(false);

  const loaded = useRef(false);

  // ── clock ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  // ── data load ──────────────────────────────────────────────
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const today = nowISO();

    Promise.allSettled([
      api.get("/site-engineer/rfi"),
      api.get("/ncr"),
      api.get("/progress"),
      api.get("/approvals"),
      api.get("/snags"),
      api.get("/site-instructions"),
      api.get("/material-request"),
      api.get("/diary"),
    ]).then(([rfiRes, ncrRes, progRes, aprRes, snagRes, siRes, matRes, diaryRes]) => {

      if (rfiRes.status === "fulfilled")
        setRFIs(dedupe(Array.isArray(rfiRes.value?.data) ? rfiRes.value.data : []));

      if (ncrRes.status === "fulfilled")
        setNCRs(dedupe(Array.isArray(ncrRes.value?.data) ? ncrRes.value.data : []));

      if (progRes.status === "fulfilled")
        setProg(Array.isArray(progRes.value?.data) ? progRes.value.data : []);

      if (aprRes.status === "fulfilled") {
        const all = Array.isArray(aprRes.value?.data) ? aprRes.value.data : [];
        setPendingApprovals(all.filter(a => !a.status || a.status === "pending"));
      }

      if (snagRes.status === "fulfilled") {
        const all = Array.isArray(snagRes.value?.data) ? snagRes.value.data : [];
        setOpenSnags(all.filter(s => s.status !== "closed"));
      }

      if (siRes.status === "fulfilled") {
        const all = Array.isArray(siRes.value?.data) ? siRes.value.data : [];
        setPendingSIs(all.filter(s => s.status === "issued")); // needs acknowledgement
      }

      if (matRes.status === "fulfilled") {
        const all = Array.isArray(matRes.value?.data) ? matRes.value.data : [];
        setPendingMaterials(all.filter(m => m.status === "requested"));
      }

      if (diaryRes.status === "fulfilled") {
        const all = Array.isArray(diaryRes.value?.data) ? diaryRes.value.data : [];
        setDiaryToday(all.some(d => (d.date || "").slice(0, 10) === today));
      }

    }).finally(() => setLoading(false));
  }, []);

  // ── derived ────────────────────────────────────────────────
  const openRFIs  = useMemo(() => rfis.filter(r => !r?.status || r.status === "open"), [rfis]);
  const openNCRs  = useMemo(() => ncrs.filter(n => !n?.status || n.status === "open"), [ncrs]);

  // Planned vs Actual from progress entries
  const avgPlanned = useMemo(() =>
    progressEntries.length
      ? Math.round(progressEntries.reduce((s, x) => s + Number(x.planned_percent || 0), 0) / progressEntries.length)
      : 0,
    [progressEntries]);

  const avgActual = useMemo(() =>
    progressEntries.length
      ? Math.round(progressEntries.reduce((s, x) => s + Number(x.percent_complete || 0), 0) / progressEntries.length)
      : 0,
    [progressEntries]);

  const overallDelay = avgPlanned - avgActual;

  // Build zone summary from progress entries (group by zone, take latest)
  const zoneSummary = useMemo(() => {
    const map = {};
    progressEntries.forEach(e => {
      if (!e.zone) return;
      if (!map[e.zone] || new Date(e.date) > new Date(map[e.zone].date)) map[e.zone] = e;
    });
    return Object.entries(map).slice(0, 6).map(([zone, entry]) => {
      const actual  = Number(entry.percent_complete || 0);
      const planned = Number(entry.planned_percent  || 0);
      let status = "not_started";
      if (actual >= 100) status = "complete";
      else if (actual >= planned - 2) status = actual >= 90 ? "near" : "in_progress";
      else status = "delayed";
      return { name: zone, planned, actual, status };
    });
  }, [progressEntries]);

  // Recent activity feed — built from live data
  const activityFeed = useMemo(() => {
    const items = [];
    rfis.slice(0, 2).forEach(r => items.push({ label: `RFI ${r.refNo || ""} — ${r.title || r.subject || "raised"}`, type: "rfi", time: r.createdAt }));
    ncrs.slice(0, 2).forEach(n => items.push({ label: `NCR ${n.refNo || ""} — ${n.description?.slice(0, 60) || "raised"}`, type: "ncr", time: n.createdAt }));
    pendingSIs.slice(0, 1).forEach(s => items.push({ label: `Site Instruction received: ${s.title || s.si_number || ""}`, type: "si", time: s.issued_date || s.createdAt }));
    openSnags.slice(0, 1).forEach(s => items.push({ label: `Snag open: ${s.title || s.snag_number || ""} — ${s.zone || ""}`, type: "snag", time: s.raised_date || s.createdAt }));
    pendingApprovals.slice(0, 1).forEach(a => items.push({ label: `Approval pending: ${a.title || ""}`, type: "approval", time: a.createdAt }));
    if (diaryToday) items.push({ label: "Daily Diary submitted today ✓", type: "dsr", time: new Date().toISOString() });
    return items
      .filter(i => i.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);
  }, [rfis, ncrs, pendingSIs, openSnags, pendingApprovals, diaryToday]);

  // ── loading ────────────────────────────────────────────────
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

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="dash-page">

      {/* ── HERO ──────────────────────────────────────────── */}
      <header className="dash-hero">
        <div className="dash-hero-grid"  aria-hidden="true" />
        <div className="dash-hero-glow"  aria-hidden="true" />

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
            <div className="dash-hero-date">{fmtDate(time)} · {fmtTime(time)}</div>

            {/* Diary not submitted warning */}
            {!diaryToday && (
              <div
                onClick={() => navigate("/site-engineer/diary")}
                style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "rgba(184,50,50,0.18)", border: "1px solid rgba(184,50,50,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#ffcdd2", fontWeight: 500 }}
              >
                ⚠ Daily Diary not submitted today — tap to submit
              </div>
            )}
          </div>

          <div className="dash-hero-right">
            {/* Notification bell in hero */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <NotificationBell />
            </div>

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

            <button className="dash-cta" onClick={() => navigate("/site-engineer/rfi")}>
              + New RFI
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────── */}
      <div className="dash-body">

        {/* ── ALERT STRIP — action items needing attention ── */}
        {(pendingSIs.length > 0 || openSnags.length > 0 || pendingApprovals.length > 0) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {pendingSIs.length > 0 && (
              <div onClick={() => navigate("/site-engineer/site-instructions")} style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#F3EDF8", border: "1px solid #C49FDC", borderRadius: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 20 }}>📝</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4A1A6E" }}>{pendingSIs.length} Site Instruction{pendingSIs.length > 1 ? "s" : ""} need acknowledgement</div>
                  <div style={{ fontSize: 11, color: "#7B4FA6" }}>Tap to acknowledge →</div>
                </div>
              </div>
            )}
            {openSnags.length > 0 && (
              <div onClick={() => navigate("/site-engineer/snag-list")} style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 20 }}>🔧</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#633806" }}>{openSnags.length} open snag{openSnags.length > 1 ? "s" : ""} from Architect</div>
                  <div style={{ fontSize: 11, color: "#9A5A10" }}>Tap to resolve →</div>
                </div>
              </div>
            )}
            {pendingApprovals.length > 0 && (
              <div onClick={() => navigate("/site-engineer/approvals")} style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#E6F1FB", border: "1px solid #90C1EF", borderRadius: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#185FA5" }}>{pendingApprovals.length} approval request{pendingApprovals.length > 1 ? "s" : ""} pending</div>
                  <div style={{ fontSize: 11, color: "#2E7BD6" }}>Tap to view →</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KPI ROW ─────────────────────────────────────── */}
        <div className="dash-kpi-row">
          {/* Planned vs Actual */}
          <div
            className={`dash-kpi ${overallDelay > 0 ? "dash-kpi--danger" : "dash-kpi--teal"}`}
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/site-engineer/progress")}
          >
            <div className="dash-kpi-label">Overall Progress</div>
            <div className="dash-kpi-value">{avgActual}%</div>
            <div className="dash-kpi-sub">
              {overallDelay > 0
                ? <span style={{ color: "#ffcdd2", fontWeight: 600 }}>▼ {overallDelay}% behind plan ({avgPlanned}%)</span>
                : overallDelay < 0
                  ? <span style={{ color: "#b9fad8", fontWeight: 600 }}>▲ {Math.abs(overallDelay)}% ahead of plan</span>
                  : `On track — planned ${avgPlanned}%`
              }
            </div>
            <div className="dash-kpi-track">
              <div className="dash-kpi-fill" style={{ width: `${avgPlanned}%`, opacity: 0.3 }} />
              <div className="dash-kpi-fill" style={{ width: `${avgActual}%`, position: "absolute", top: 0, left: 0 }} />
            </div>
          </div>

          <div className="dash-kpi dash-kpi--sky" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/rfi")}>
            <div className="dash-kpi-label">Open RFIs</div>
            <div className="dash-kpi-value">{openRFIs.length}</div>
            <div className="dash-kpi-sub">{rfis.length} total raised</div>
          </div>

          <div className="dash-kpi dash-kpi--danger" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/ncr")}>
            <div className="dash-kpi-label">Open NCRs</div>
            <div className="dash-kpi-value">{openNCRs.length}</div>
            <div className="dash-kpi-sub">{ncrs.length} total raised</div>
          </div>

          <div className="dash-kpi dash-kpi--navy" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/materials")}>
            <div className="dash-kpi-label">Material Requests</div>
            <div className="dash-kpi-value">{pendingMaterials.length}</div>
            <div className="dash-kpi-sub">Awaiting procurement</div>
          </div>
        </div>

        {/* ── MAIN GRID ────────────────────────────────────── */}
        <div className="dash-grid">

          {/* ── LEFT COL ──────────────────────────────────── */}
          <div className="dash-col">

            {/* Zone Progress — live from progress entries */}
            <div className="dash-panel" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/progress")}>
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">Zone Progress</div>
                  <div className="dash-panel-hint">
                    Planned <span style={{ color: "#BDD8E9" }}>░</span> vs Actual — click to manage
                  </div>
                </div>
                <div className="dash-ring-wrap">
                  <svg viewBox="0 0 36 36" className="dash-ring-svg">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(189,216,233,0.12)" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#6EA2B3" strokeWidth="3.5"
                      strokeDasharray={`${(avgActual / 100) * 87.96} 87.96`} strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                  </svg>
                  <span className="dash-ring-val">{avgActual}%</span>
                  <div className="dash-ring-lbl">Actual</div>
                </div>
              </div>
              <div className="dash-panel-body">
                {zoneSummary.length === 0 ? (
                  <div className="dash-empty">No progress entries yet — <span style={{ color: "#6EA2B3", cursor: "pointer" }} onClick={e => { e.stopPropagation(); navigate("/site-engineer/progress"); }}>log first entry</span></div>
                ) : (
                  zoneSummary.map(z => {
                    const zc = ZONE_CFG[z.status] || ZONE_CFG.not_started;
                    return (
                      <div key={z.name} className="dash-zone">
                        <div className="dash-zone-meta">
                          <span className="dash-zone-name">{z.name}</span>
                          <div className="dash-zone-right">
                            {z.actual < z.planned && <span style={{ fontSize: 10, color: "#b07020", fontWeight: 600, marginRight: 6 }}>▼{z.planned - z.actual}%</span>}
                            <span className="dash-zone-status" style={{ color: zc.color }}>{zc.label}</span>
                            <span className="dash-zone-pct" style={{ color: zc.color }}>{z.actual}%</span>
                          </div>
                        </div>
                        <div className="dash-bar-track">
                          <div className="dash-bar-planned" style={{ width: `${z.planned}%` }} />
                          <div className="dash-bar-actual" style={{ width: `${z.actual}%`, background: z.actual < z.planned ? "#b07020" : zc.color }} />
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="dash-zone-legend">
                  <span><i style={{ background: "rgba(73,118,159,0.2)" }} />Planned</span>
                  <span><i style={{ background: "#6EA2B3" }} />Actual</span>
                  <span><i style={{ background: "#b07020" }} />Delayed</span>
                </div>
              </div>
            </div>

            {/* RFI Table — live */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">RFI Register</div>
                  <div className="dash-panel-hint">Raise → Architect responds</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="dash-pill dash-pill--amber">{openRFIs.length} Open</span>
                  <button className="dash-pill" style={{ background: "#0A4174", color: "#fff", border: "none", cursor: "pointer" }} onClick={() => navigate("/site-engineer/rfi")}>+ New</button>
                </div>
              </div>
              {rfis.length === 0
                ? <div className="dash-empty">No RFIs raised yet — <span style={{ color: "#6EA2B3", cursor: "pointer" }} onClick={() => navigate("/site-engineer/rfi")}>raise first RFI</span></div>
                : (
                  <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>Ref</th><th>Title</th><th>Drawing</th><th>Priority</th><th>Status</th></tr></thead>
                      <tbody>
                        {rfis.slice(0, 6).map(r => (
                          <tr key={makeKey(r)} style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/rfi")}>
                            <td className="dash-ref dash-ref--amber">{r.refNo || `RFI-${String(r.id ?? "").padStart(3, "0")}`}</td>
                            <td className="dash-trunc">{r.title || r.subject || "—"}</td>
                            <td className="dash-muted">{r.drawing_ref || "—"}</td>
                            <td><PriorityBadge p={r.priority || "medium"} /></td>
                            <td><StatusBadge s={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Snag List summary — Architect raised */}
            <div className="dash-panel" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/snag-list")}>
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">Snag List</div>
                  <div className="dash-panel-hint">Raised by Architect — you resolve</div>
                </div>
                {openSnags.length > 0
                  ? <span className="dash-pill" style={{ background: "#FAEEDA", color: "#633806", border: "0.5px solid #EF9F27" }}>{openSnags.length} Open</span>
                  : <span className="dash-pill" style={{ background: "#E1F5EE", color: "#085041", border: "0.5px solid #5DCAA5" }}>All Closed ✓</span>
                }
              </div>
              {openSnags.length === 0
                ? <div className="dash-empty">No open snags — well done!</div>
                : (
                  <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>Ref</th><th>Title</th><th>Zone</th><th>Priority</th><th>Status</th></tr></thead>
                      <tbody>
                        {openSnags.slice(0, 5).map(s => (
                          <tr key={makeKey(s)}>
                            <td className="dash-ref" style={{ color: "#BA7517" }}>{s.snag_number || `SNS-${String(s.id ?? "").padStart(3, "0")}`}</td>
                            <td className="dash-trunc">{s.title || "—"}</td>
                            <td className="dash-muted">{s.zone || "—"}</td>
                            <td><PriorityBadge p={s.priority || "medium"} /></td>
                            <td><StatusBadge s={s.status || "open"} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </div>

          {/* ── RIGHT COL ─────────────────────────────────── */}
          <div className="dash-col">

            {/* Linked system status — MODULE CONNECTION SUMMARY */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title">System Status</div>
                <div className="dash-panel-hint">All connected modules</div>
              </div>
              <div className="dash-panel-body">
                {[
                  { label: "Daily Diary",       icon: "📋", value: diaryToday ? "Submitted ✓" : "⚠ Not submitted", ok: diaryToday,  route: "/site-engineer/diary"             },
                  { label: "Open RFIs",         icon: "❓", value: `${openRFIs.length} open`,                       ok: openRFIs.length === 0, route: "/site-engineer/rfi"     },
                  { label: "Open NCRs",         icon: "⚠️", value: `${openNCRs.length} open`,                       ok: openNCRs.length === 0, route: "/site-engineer/ncr"     },
                  { label: "Site Instructions", icon: "📝", value: pendingSIs.length > 0 ? `${pendingSIs.length} need acknowledgement` : "All acknowledged ✓", ok: pendingSIs.length === 0, route: "/site-engineer/site-instructions" },
                  { label: "Snag List",         icon: "🔧", value: `${openSnags.length} open`,                      ok: openSnags.length === 0, route: "/site-engineer/snag-list" },
                  { label: "Approvals",         icon: "✅", value: `${pendingApprovals.length} pending`,             ok: pendingApprovals.length === 0, route: "/site-engineer/approvals" },
                  { label: "Materials",         icon: "📦", value: `${pendingMaterials.length} awaiting procurement`, ok: pendingMaterials.length === 0, route: "/site-engineer/materials" },
                  { label: "Notifications",     icon: "🔔", value: `${unreadCount} unread`,                         ok: unreadCount === 0, route: null },
                ].map(({ label, icon, value, ok, route }) => (
                  <div
                    key={label}
                    onClick={() => route && navigate(route)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: route ? "pointer" : "default" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: ok ? "#085041" : "#b83232" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NCR Table */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <div className="dash-panel-title">NCR Register</div>
                  <div className="dash-panel-hint">Non-Conformance Reports</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="dash-pill dash-pill--danger">{openNCRs.length} Open</span>
                  <button className="dash-pill" style={{ background: "#b83232", color: "#fff", border: "none", cursor: "pointer" }} onClick={() => navigate("/site-engineer/ncr")}>+ Raise</button>
                </div>
              </div>
              {ncrs.length === 0
                ? <div className="dash-empty">No NCRs raised yet</div>
                : (
                  <div className="dash-table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>Ref</th><th>Description</th><th>Zone</th><th>Priority</th><th>Hold</th></tr></thead>
                      <tbody>
                        {ncrs.slice(0, 5).map(n => (
                          <tr key={makeKey(n)} style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/ncr")}>
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
                )
              }
            </div>

            {/* Activity Feed — live */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title">Activity Feed</div>
                <span className="dash-panel-hint" style={{ cursor: "pointer" }} onClick={() => navigate("/site-engineer/activity-log")}>View all →</span>
              </div>
              <div className="dash-feed">
                {activityFeed.length === 0
                  ? <div className="dash-empty">No activity yet today</div>
                  : activityFeed.map((a, i) => (
                      <div key={i} className="dash-feed-item">
                        <div className="dash-feed-pip" style={{ background: PIP[a.type] || "#94a3b8" }} />
                        <div>
                          <div className="dash-feed-text">{a.label}</div>
                          <div className="dash-feed-time">
                            {a.time ? new Date(a.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Quick Actions — all navigate to real routes */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title">Quick Actions</div>
              </div>
              <div className="dash-actions">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    className="dash-action-btn"
                    onClick={() => navigate(a.route)}
                  >
                    <span className="dash-action-icon">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── WORKFLOW REMINDER STRIP ──────────────────────── */}
        <div style={{ marginTop: 24, padding: "14px 20px", background: "rgba(10,65,116,0.06)", border: "0.5px solid rgba(10,65,116,0.15)", borderRadius: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
          <strong style={{ color: "var(--color-text-primary)", fontSize: 13 }}>Daily workflow reminder</strong>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
            {[
              "1. Submit Daily Diary by 17:30",
              "2. Log Progress with Planned vs Actual",
              "3. Raise RFIs for design conflicts immediately",
              "4. Acknowledge Site Instructions within 24h",
              "5. Record measurements for QS review",
              "6. Resolve snags before next inspection",
            ].map(s => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#6EA2B3" }}>›</span> {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}