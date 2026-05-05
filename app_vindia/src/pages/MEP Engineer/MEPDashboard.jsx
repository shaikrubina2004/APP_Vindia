import { useState, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import { API } from "../../services/authService";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   PROJECT SWITCHER
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   MILESTONE DATA  (per project)
   In production these come from your API
   calculated from daily log submissions
═══════════════════════════════════════ */

const DISC_META = {
  M: { label: "🔧 Mechanical", barCls: "mf-bar-m" },
  E: { label: "⚡ Electrical", barCls: "mf-bar-e" },
  P: { label: "🚿 Plumbing", barCls: "mf-bar-p" },
};

const STATUS_LABEL = {
  done: "Complete",
  inprog: "In Progress",
  notstart: "Not Started",
};
const STATUS_CLS = {
  done: "ms-done",
  inprog: "ms-inprog",
  notstart: "ms-notstart",
};

function calcOverall(floors) {
  if (!floors || !floors.length) return 0;
  return Math.round(
    floors.reduce((s, f) => s + (parseFloat(f.pct) || 0), 0) / floors.length,
  );
}

/* ═══════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════ */

const QUICK = [
  { icon: "⬆️", label: "Upload Drawing", href: "/mep/upload" },
  { icon: "🚨", label: "Raise Incident", href: "/mep/incidents" },
  { icon: "📋", label: "Post Log", href: "/mep/daily-log" },
  { icon: "📬", label: "Coordination", href: "/mep/coordination" },
  { icon: "🗂️", label: "Versions", href: "/mep/version-control" },
  { icon: "📐", label: "Drawings", href: "/mep/drawings" },
];

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function MEPDashboard() {
  const [dateStr, setDateStr] = useState("");
  const { activeProject } = useProject();
  const [openDisc, setOpenDisc] = useState("M");

  // Backend state
  const [drawings, setDrawings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [milestones, setMilestones] = useState({ M: [], E: [], P: [] });
  const [loading, setLoading] = useState(true);

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.id;
    } catch {
      return null;
    }
  })();

  const currentUserName = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.name || "MEP Engineer";
    } catch {
      return "MEP Engineer";
    }
  })();

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);

    Promise.all([
      API.get(`/drawings/project/${activeProject.id}`).catch(() => ({
        data: [],
      })),
      API.get("/incidents").catch(() => ({ data: { data: [] } })),
      API.get(`/drawings/daily-logs/${activeProject.id}?limit=100`).catch(
        () => ({ data: [] }),
      ),
    ])
      .then(([drawingsRes, incidentsRes, logsRes]) => {
        // Filter drawings to current user
        const myDrawings = (drawingsRes.data || []).filter(
          (d) => d.created_by === currentUserId,
        );
        setDrawings(myDrawings);

        // Filter open incidents assigned to or created by current user
        const allIncidents = incidentsRes.data?.data || [];
        setIncidents(allIncidents);

        // Build milestones from daily logs
        const logs = logsRes.data || [];
        const mFloors = {},
          eFloors = {},
          pFloors = {};

        logs.forEach((log) => {
          const floor = log.floor_name || "Unknown";
          const pct = parseFloat(log.completion_pct) || 0;
          const statusRaw =
            pct === 100 ? "done" : pct > 0 ? "inprog" : "notstart";

          if (log.discipline === "Mechanical") {
            mFloors[floor] = { floor, pct, status: statusRaw };
          } else if (log.discipline === "Electrical") {
            eFloors[floor] = { floor, pct, status: statusRaw };
          } else if (log.discipline === "Plumbing") {
            pFloors[floor] = { floor, pct, status: statusRaw };
          }
        });

        setMilestones({
          M: Object.values(mFloors),
          E: Object.values(eFloors),
          P: Object.values(pFloors),
        });
      })
      .finally(() => setLoading(false));
  }, [activeProject]);

  if (!activeProject) return null;

  const openIncidents = incidents.filter(
    (i) => !["Resolved", "Closed"].includes(i.status),
  );
  const overallM = calcOverall(milestones.M);
  const overallE = calcOverall(milestones.E);
  const overallP = calcOverall(milestones.P);
  const nonEmptyCount = [milestones.M, milestones.E, milestones.P].filter(
    (a) => a.length > 0,
  ).length;
  const overallAll =
    nonEmptyCount > 0
      ? Math.round((overallM + overallE + overallP) / nonEmptyCount)
      : 0;

  return (
    <div className="mep-page">
      {/* ── HERO BANNER ── */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-hero-greeting">
            MEP Engineer · {currentUserName}
          </div>
          <div className="dash-hero-title">
            Good morning 👋
            <br />
            {activeProject.name}
          </div>
          <div className="dash-hero-sub">
            {activeProject.code} · {activeProject.location} · {dateStr}
          </div>
          <a href="/mep/daily-log" className="dash-hero-btn">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Post Today's Log
          </a>
        </div>
        <div className="dash-hero-right">
          <div className="dash-hero-stat">
            <span className="dhs-val">{drawings.length}</span>
            <span className="dhs-lbl">Drawings</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val" style={{ color: "#fbbf24" }}>
              {openIncidents.length}
            </span>
            <span className="dhs-lbl">Incidents</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val">{overallAll}%</span>
            <span className="dhs-lbl">Overall</span>
          </div>
          <div className="dash-hero-stat">
            <span className="dhs-val" style={{ color: "#86efac" }}>
              6
            </span>
            <span className="dhs-lbl">Log Streak</span>
          </div>
        </div>
      </div>

      {/* ── PROJECT SWITCHER + STAT CARDS ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <ProjectSwitcher />
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            {
              icon: "📐",
              label: "Drawings Uploaded",
              value: drawings.length,
              sub: drawings[0]?.name
                ? `Last: ${drawings[0].name}`
                : "No drawings yet",
              ic: "ic-blue",
            },
            {
              icon: "⚠️",
              label: "Open Incidents",
              value: openIncidents.length,
              sub: `${openIncidents.filter((i) => i.priority === "P1").length} high priority`,
              ic: "ic-red",
            },
            {
              icon: "🔗",
              label: "Clash Flagged",
              value: drawings.filter((d) => d.has_clash).length,
              sub: "Drawings with open clashes",
              ic: "ic-amber",
            },
            {
              icon: "✅",
              label: "Overall MEP",
              value: `${overallAll}%`,
              sub: "Across all disciplines",
              ic: "ic-green",
            },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon-wrap ${s.ic}`}>{s.icon}</div>
              <div className="stat-info">
                <span className="stat-label">{s.label}</span>
                <span className="stat-value">{s.value}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MILESTONE TRACKER + RIGHT COLUMN ── */}
      <div className="grid-3" style={{ alignItems: "start" }}>
        {/* Milestone Tracker spans 2 columns */}
        <div className="mep-card" style={{ gridColumn: "1 / 3" }}>
          <div className="mep-card-head">
            <span className="card-title">
              🏗️ Installation Milestone Tracker
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(DISC_META).map((k) => (
                <button
                  key={k}
                  className={`filter-chip${openDisc === k ? " active" : ""}`}
                  style={{ padding: "3px 12px", fontSize: 11 }}
                  onClick={() => setOpenDisc(k)}
                >
                  {DISC_META[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mep-card-body">
            {/* Overall summary row — 3 mini bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { key: "M", val: overallM, barCls: "prog-blue" },
                { key: "E", val: overallE, barCls: "prog-purple" },
                { key: "P", val: overallP, barCls: "prog-green" },
              ].map((d) => (
                <div
                  key={d.key}
                  style={{
                    background: "var(--bg-light)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>
                      {DISC_META[d.key].label}
                    </span>
                    <span
                      style={{
                        fontFamily: "Monaco,monospace",
                        color: "var(--primary-blue)",
                      }}
                    >
                      {d.val}%
                    </span>
                  </div>
                  <div className="prog-track">
                    <div
                      className={`prog-fill ${d.barCls}`}
                      style={{ width: `${d.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Per-floor detail for selected discipline */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: 8,
              }}
            >
              {DISC_META[openDisc].label} — Floor by Floor
            </div>

            <div className="milestone-floors">
              {milestones[openDisc].map((row) => (
                <div className="milestone-floor-row" key={row.floor}>
                  <span className="mf-floor">{row.floor}</span>
                  <div className="mf-bar-wrap">
                    <div
                      className={`mf-bar ${DISC_META[openDisc].barCls}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span
                    className="mf-pct"
                    style={{
                      color:
                        row.pct === 100
                          ? "var(--success)"
                          : "var(--primary-blue)",
                    }}
                  >
                    {row.pct}%
                  </span>
                  <span
                    className={STATUS_CLS[row.status]}
                    style={{
                      width: 88,
                      textAlign: "right",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {row.pct === 100 ? "✓ " : ""}
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
              ))}
            </div>

            <div className="alert alert-blue" style={{ marginTop: 14 }}>
              <span className="alert-icon">💡</span>
              <span>
                Progress is calculated from daily log submissions. Each
                completed zone logged by the MEP team updates these figures
                automatically.
              </span>
            </div>

            {/* ── Drawing Activity Chart ── */}
            <div
              style={{
                marginTop: 18,
                borderTop: "1px solid var(--border-color)",
                paddingTop: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  📈 Drawing Upload Activity — Last 6 Months
                </span>
              </div>

              {(() => {
                const now = new Date();
                const months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(
                    now.getFullYear(),
                    now.getMonth() - (5 - i),
                    1,
                  );
                  return {
                    key: `${d.getFullYear()}-${d.getMonth()}`,
                    label: d.toLocaleDateString("en-IN", { month: "short" }),
                    total: 0,
                    M: 0,
                    E: 0,
                    P: 0,
                  };
                });
                drawings.forEach((d) => {
                  const date = new Date(d.uploaded_at);
                  const key = `${date.getFullYear()}-${date.getMonth()}`;
                  const bucket = months.find((m) => m.key === key);
                  if (!bucket) return;
                  bucket.total++;
                  if (d.sub_discipline === "Mechanical") bucket.M++;
                  else if (d.sub_discipline === "Electrical") bucket.E++;
                  else if (d.sub_discipline === "Plumbing") bucket.P++;
                });

                const maxVal = Math.max(...months.map((m) => m.total), 1);
                const W = 600,
                  H = 110,
                  PAD = 20;
                const pts = months.map((m, i) => ({
                  x: PAD + (i / (months.length - 1)) * (W - PAD * 2),
                  y: H - PAD - (m.total / maxVal) * (H - PAD * 2),
                  ...m,
                }));
                const pathD = pts
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ");
                const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`;

                return (
                  <div>
                    {/* Summary chips */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      {[
                        {
                          label: "Mechanical",
                          val: drawings.filter(
                            (d) => d.sub_discipline === "Mechanical",
                          ).length,
                          color: "#1e5a96",
                          bg: "#e0f0fb",
                        },
                        {
                          label: "Electrical",
                          val: drawings.filter(
                            (d) => d.sub_discipline === "Electrical",
                          ).length,
                          color: "#6d28d9",
                          bg: "#ede9fe",
                        },
                        {
                          label: "Plumbing",
                          val: drawings.filter(
                            (d) => d.sub_discipline === "Plumbing",
                          ).length,
                          color: "#059669",
                          bg: "#ecfdf5",
                        },
                        {
                          label: "Total",
                          val: drawings.length,
                          color: "#854f0b",
                          bg: "#faeeda",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          style={{
                            background: s.bg,
                            borderRadius: 8,
                            padding: "8px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flex: 1,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: s.color,
                              fontFamily: "Monaco,monospace",
                              lineHeight: 1,
                            }}
                          >
                            {s.val}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: s.color,
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* SVG chart */}
                    <svg
                      viewBox={`0 0 ${W} ${H + 20}`}
                      width="100%"
                      style={{ display: "block", overflow: "visible" }}
                    >
                      <defs>
                        <linearGradient
                          id="areaGradFull"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#1e5a96"
                            stopOpacity="0.2"
                          />
                          <stop
                            offset="100%"
                            stopColor="#1e5a96"
                            stopOpacity="0.02"
                          />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0, 0.33, 0.66, 1].map((v, i) => (
                        <line
                          key={i}
                          x1={PAD}
                          y1={PAD + v * (H - PAD * 2)}
                          x2={W - PAD}
                          y2={PAD + v * (H - PAD * 2)}
                          stroke="#e6e8ec"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      ))}
                      {/* Y axis value hints */}
                      {[0, 0.5, 1].map((v, i) => (
                        <text
                          key={i}
                          x={PAD - 4}
                          y={PAD + v * (H - PAD * 2) + 3}
                          textAnchor="end"
                          fontSize="8"
                          fill="#b0b0c0"
                          fontFamily="Monaco,monospace"
                        >
                          {Math.round((1 - v) * maxVal)}
                        </text>
                      ))}
                      {/* Area */}
                      <path d={areaD} fill="url(#areaGradFull)" />
                      {/* Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#1e5a96"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Dots + labels */}
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="white"
                            stroke="#1e5a96"
                            strokeWidth="2.5"
                          />
                          {p.total > 0 && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="700"
                              fill="#1e5a96"
                              fontFamily="Monaco,monospace"
                            >
                              {p.total}
                            </text>
                          )}
                          <text
                            x={p.x}
                            y={H + 4}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="700"
                            fill="#7a7a8a"
                          >
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Quick Actions */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">⚡ Quick Actions</span>
            </div>
            <div className="mep-card-body">
              <div className="quick-grid">
                {QUICK.map((q) => (
                  <a href={q.href} className="quick-btn" key={q.label}>
                    <span className="quick-btn-icon">{q.icon}</span>
                    {q.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">📅 Today's Status</span>
            </div>
            <div
              className="mep-card-body"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            >
              {[
                {
                  icon: "📋",
                  label: "Daily Log",
                  pill: "pill-open",
                  pillLabel: "Pending",
                },
                {
                  icon: "📐",
                  label: "Drawing Upload",
                  pill: "pill-submitted",
                  pillLabel: drawings.length > 0 ? "Done" : "Pending",
                },
                {
                  icon: "⚠️",
                  label: "Incidents Checked",
                  pill:
                    openIncidents.length > 0 ? "pill-open" : "pill-submitted",
                  pillLabel:
                    openIncidents.length > 0
                      ? `${openIncidents.length} Open`
                      : "Clear",
                },
                {
                  icon: "🔗",
                  label: "Coord. Update",
                  pill: "pill-inprog",
                  pillLabel: "Due",
                },
                {
                  icon: "🗂️",
                  label: "Version Review",
                  pill: "pill-submitted",
                  pillLabel: "Done",
                },
              ].map((s) => (
                <div className="status-row" key={s.label}>
                  <span className="status-icon">{s.icon}</span>
                  <span className="status-label">{s.label}</span>
                  <span className={`status-pill ${s.pill}`}>{s.pillLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── OPEN INCIDENTS (Enhanced Responsive Table) ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">⚠️ Open Incidents</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-red">
              {openIncidents.length} Active
            </span>
            <a
              href="/mep/incidents"
              className="btn-outline"
              style={{ padding: "5px 12px", fontSize: 11 }}
            >
              View All
            </a>
          </div>
        </div>
        <div className="mep-table-wrap">
          <table className="mep-table incidents-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Team</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {openIncidents.slice(0, 5).map((inc) => (
                <tr key={inc.id}>
                  <td data-label="#">
                    <span
                      style={{
                        fontFamily: "Monaco,Courier New,monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {inc.incident_no}
                    </span>
                  </td>
                  <td
                    data-label="Title"
                    style={{ fontWeight: 600, fontSize: 12 }}
                  >
                    {inc.title}
                  </td>
                  <td data-label="Assigned To">
                    <span style={{ fontSize: 11 }}>
                      {inc.assigned_to_name || "—"}
                    </span>
                  </td>
                  <td data-label="Priority">
                    <span
                      className={`badge ${inc.priority === "P1" ? "badge-red" : inc.priority === "P2" ? "badge-amber" : "badge-grey"}`}
                    >
                      {inc.priority}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status-pill ${inc.status === "In Progress" ? "pill-inprog" : inc.status === "Resolved" ? "pill-resolved" : "pill-open"}`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td
                    data-label="Raised"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {new Date(inc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {openIncidents.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: 20,
                      color: "var(--text-secondary)",
                      fontSize: 12,
                    }}
                  >
                    No open incidents
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIVITY + ALERTS ── */}
      <div className="grid-2">
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">🕐 Recent Activity</span>
          </div>
          <div className="mep-card-body">
            <div className="activity-list">
              {drawings.slice(0, 5).map((d, i) => (
                <div className="act-item" key={i}>
                  <div className="act-dot ad-blue" />
                  <div>
                    <div className="act-text">
                      <strong>{d.name}</strong> — {d.revision_number || "Rev-1"}{" "}
                      uploaded
                    </div>
                    <div className="act-time">
                      {d.uploaded_at
                        ? new Date(d.uploaded_at).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              ))}
              {drawings.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    padding: "8px 0",
                  }}
                >
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">📢 Coordination Alerts</span>
          </div>
          <div className="mep-card-body">
            <div className="activity-list">
              {openIncidents.slice(0, 4).map((inc, i) => (
                <div className="act-item" key={i}>
                  <div
                    className={`act-dot ${inc.priority === "P1" ? "ad-red" : inc.priority === "P2" ? "ad-amber" : "ad-blue"}`}
                  />
                  <div>
                    <div className="act-text">
                      <strong>{inc.incident_no}</strong> —{" "}
                      {inc.title?.substring(0, 50)}
                      {inc.title?.length > 50 ? "…" : ""}
                    </div>
                    <div className="act-time">
                      {inc.status} ·{" "}
                      {new Date(inc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {openIncidents.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    padding: "8px 0",
                  }}
                >
                  No coordination alerts
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
