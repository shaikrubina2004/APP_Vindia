import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getArchitectProjects } from "../../services/architectprojectService";
import { getDailyLog } from "../../services/architectDailyLogService";
import { API } from "../../services/authService";
import { getDrawings } from "../../services/architectDesignService";
import "./ArchitectDashboard.css";

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);

const longDate = () =>
  new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
} 

function normaliseTask(t) {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    incidentPriority: t.incident_priority ?? t.incidentPriority ?? "P2",
    status: t.status,
    assignedName: t.assignee_name ?? t.assignedName ?? "",
    updatedAt: new Date(t.updated_at ?? t.updatedAt),
  };
}

function normaliseIncident(inc) {
  return {
    id: inc.id,
    incidentNo: inc.incident_no,
    title: inc.title,
    priority: inc.priority,
    status: inc.status,
    assignedName: inc.assigned_to_name ?? "",
    createdAt: new Date(inc.created_at),
    updatedAt: new Date(inc.updated_at),
    deadlineAt: inc.deadline_at ? new Date(inc.deadline_at) : null,
    taskCount: Number(inc.task_count ?? 0),
    tasks: (inc.tasks ?? []).map(normaliseTask),
  };
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase().replace(/\s/g, "-");
  return <span className={`acd-status-badge acd-status-${s}`}>{status}</span>;
}


// ─── CHECK IN / OUT BUTTON ────────────────────────────────────────────────────
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTodayAttendance();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("");
    }
  }, [attendance]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/attendance/today?employee_id=${employeeId}`
      );
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const dateStr = now.toISOString().slice(0, 10);
      const res = await axios.post("http://localhost:5000/api/attendance", {
        employee_id: employeeId,
        date: dateStr,
        check_in: timeStr,
        shift: "morning",
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      alert("Check-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const res = await axios.put(
        `http://localhost:5000/api/attendance/${attendance.id}`,
        { check_out: timeStr }
      );
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert("Check-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isCheckedIn  = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  if (loading) {
    return (
      <button disabled className="acd-checkin-btn acd-checkin-loading">
        <span className="acd-checkin-dot" /> Loading…
      </button>
    );
  }

  if (isCheckedOut) {
    return (
      <div className="acd-checkin-wrap">
        <button disabled className="acd-checkin-btn acd-checkin-done">
          <span className="acd-checkin-dot acd-checkin-dot-green" /> ✓ Done for Today
        </button>
        <span className="acd-checkin-sub">
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="acd-checkin-wrap">
        <button onClick={handleCheckOut} disabled={busy} className="acd-checkin-btn acd-checkin-out">
          <span className="acd-checkin-dot acd-checkin-dot-pulse" />
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span className="acd-checkin-sub">
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong style={{ color: "#7BBDE8" }}>{elapsed}</strong></>}
        </span>
      </div>
    );
  }

  return (
    <button onClick={handleCheckIn} disabled={busy} className="acd-checkin-btn acd-checkin-in">
      <span className="acd-checkin-dot" />
      {busy ? "Saving…" : "Check In"}
    </button>
  );
};

// ─── HERO CARD ────────────────────────────────────────────────────────────────
function HeroCard({ userName, employeeId }) {
  return (
    <div className="acd-hero-card">
      <div className="acd-hero-circle acd-hero-circle-1" aria-hidden="true" />
      <div className="acd-hero-circle acd-hero-circle-2" aria-hidden="true" />
      <div className="acd-hero-circle acd-hero-circle-3" aria-hidden="true" />
      <div className="acd-hero-body">
        <p className="acd-hero-greeting">{getGreeting()},</p>
        <h1 className="acd-hero-name">{userName}</h1>
        <p className="acd-hero-date">{longDate()}</p>
      </div>
      {employeeId && (
        <div className="acd-hero-checkin">
          <CheckInButton employeeId={employeeId} />
        </div>
      )}
    </div>
  );
}

// ─── P1 INCIDENTS COUNT CARD ──────────────────────────────────────────────────
function P1Card({ p1Count, totalCount, loading, onClick }) {
  return (
    <div className="acd-p1-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="acd-p1-label"> Critical Incidents</div>
      {loading ? (
        <div className="acd-skeleton" style={{ height: 44, width: 80, marginTop: 8 }} />
      ) : (
        <>
          <div className="acd-p1-number">{p1Count}</div>
          <div className={`acd-p1-sub${p1Count === 0 ? " acd-p1-clear" : ""}`}>
            {p1Count > 0 ? "Needs immediate attention" : "All clear — no critical issues"}
          </div>
          {p1Count > 0 && <span className="acd-p1-badge">{p1Count} critical open</span>}
        </>
      )}
      <div className="acd-p1-total">Total incidents: {totalCount}</div>
    </div>
  );
}

// ─── P1 TASKS COUNT CARD ────────────────────────────────────────────────────
function P1TasksCard({ p1TaskCount, totalTaskCount, pendingCount, loading, onClick }) {
  return (
    <div className="acd-p1tasks-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="acd-p1-label">Critical Tasks</div>
      {loading ? (
        <div className="acd-skeleton" style={{ height: 44, width: 80, marginTop: 8 }} />
      ) : (
        <>
          <div className="acd-p1tasks-number">{p1TaskCount}</div>
          <div className={`acd-p1-sub${p1TaskCount === 0 ? " acd-p1-clear" : ""}`}>
            {p1TaskCount > 0 ? `${pendingCount} pending · needs action` : "No P1 tasks assigned"}
          </div>
          {p1TaskCount > 0 && (
            <span className="acd-p1tasks-badge">{pendingCount} not done</span>
          )}
        </>
      )}
      <div className="acd-p1-total">Total tasks: {totalTaskCount}</div>
    </div>
  );
}

// ─── ACTION CHIPS ─────────────────────────────────────────────────────────────
function ActionChips({
  logStatus, loadingLog,
  drawingCount, loadingDrawings,
  projectCount, loadingProjects,
  incidentCount, loadingIncidents,
  onLogClick, onDrawingClick, onProjectClick, onIncidentClick, onSnagClick, // ← added onSnagClick
}) {
  const submitted = logStatus === "Submitted";

  const chips = [
    {
      color: submitted ? "green" : "amber",
      icon: submitted ? "✓" : "○",
      label: "Log Status",
      value: loadingLog ? "…" : submitted ? "Submitted" : "Pending",
      onClick: onLogClick,
    },
    {
      color: "blue",
      icon: "⬜",
      label: "Drawings",
      value: loadingDrawings ? "…" : `${drawingCount ?? 0} total`,
      onClick: onDrawingClick,
    },
    {
      color: "navy",
      icon: "📁",
      label: "Projects",
      value: loadingProjects ? "…" : `${projectCount} assigned`,
      onClick: onProjectClick,
    },
    {
      color: "teal",
      icon: "⚠",
      label: "Incidents",
      value: loadingIncidents ? "…" : `${incidentCount} total`,
      onClick: onIncidentClick,
    },
    // ── NEW: Snag List chip ──
    {
      color: "indigo",
      icon: "📋",
      label: "Snag List",
      value: "View all",
      onClick: onSnagClick,
    },
  ];

  return (
    <div className="acd-chips-row">
      {chips.map((c) => (
        <button key={c.label} className="acd-chip" onClick={c.onClick}>
          <span className={`acd-chip-icon acd-chip-icon-${c.color}`}>{c.icon}</span>
          <span className="acd-chip-text">
            <span className="acd-chip-label">{c.label}</span>
            <span className="acd-chip-val">{c.value}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── P1 INCIDENT ROW ─────────────────────────────────────────────────────────
const AVATAR_BG = ["#BDD8E9", "#7BBDE8", "#6EA2B3", "#4E8EA2", "#49769F"];

function IncidentRow({ inc, index }) {
  const dateLabel = (inc.deadlineAt ?? inc.updatedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short",
  });
  const words = (inc.assignedName || inc.title || "?").trim().split(/\s+/);
  const abbr = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();

  return (
    <div className="acd-inc-row">
      <div className="acd-avatar" style={{ background: AVATAR_BG[index % AVATAR_BG.length], color: "#001D39" }}>
        {abbr}
      </div>
      <div className="acd-inc-info">
        <div className="acd-inc-title">{inc.title}</div>
        <div className="acd-inc-meta">
          #{inc.incidentNo}
          {inc.assignedName ? ` · ${inc.assignedName}` : ""}
          {inc.taskCount > 0 ? ` · ${inc.taskCount} tasks` : ""}
        </div>
      </div>
      <div className="acd-inc-right">
        <div className="acd-inc-date">{dateLabel}</div>
        <span className="acd-p1-chip">P1</span>
      </div>
    </div>
  );
}

// ─── TASK DONUT ───────────────────────────────────────────────────────────────
function TaskDonut({ tasks }) {
  const counts = { Done: 0, "In Progress": 0, "To Do": 0 };
  tasks.forEach((t) => {
    if (t.status === "Done") counts.Done++;
    else if (t.status === "In Progress") counts["In Progress"]++;
    else counts["To Do"]++;
  });

  const total = tasks.length || 1;
  const colors = { Done: "#0A4174", "In Progress": "#4E8EA2", "To Do": "#BDD8E9" };

  const R = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = Object.entries(counts).map(([label, count]) => {
    const dash = (count / total) * circ;
    const s = { label, count, dash, offset, color: colors[label] };
    offset += dash;
    return s;
  });

  const donePct = Math.round((counts.Done / total) * 100);

  return (
    <div className="acd-donut-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label={`${donePct}% tasks done`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e2ecf4" strokeWidth="11" />
        {slices.map((s) => (
          <circle key={s.label} cx={cx} cy={cy} r={R}
            fill="none" stroke={s.color} strokeWidth="11"
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="#001D39">{donePct}%</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#49769F">Done</text>
      </svg>
      <div className="acd-donut-legend">
        {slices.map((s) => (
          <div key={s.label} className="acd-leg-row">
            <span className="acd-leg-dot" style={{ background: s.color }} />
            <span className="acd-leg-label">{s.label}</span>
            <span className="acd-leg-count">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ArchitectDashboard() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  const [projects,  setProjects]  = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [myTasks,   setMyTasks]   = useState([]);
  const [logStatus, setLogStatus] = useState(null);
  const [drawings,  setDrawings]  = useState([]);
  const [loading, setLoading] = useState({
    projects: true, incidents: true, tasks: true, log: true, drawings: true,
  });
  const setLoad = (k, v) => setLoading((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await getArchitectProjects(user.id);
        const list = res?.data || res || [];
        setProjects(list.map((p) => ({
          id: p.project_id || p.id,
          name: p.project_name || p.name || "Unnamed",
          status: p.status || "Active",
        })));
      } catch (e) { console.error(e); } finally { setLoad("projects", false); }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await getArchitectProjects(user.id);
        const list = res?.data || res || [];
        if (!list.length) { setLogStatus("Draft"); return; }
        const pid = String(list[0].project_id || list[0].id);
        const logRes = await getDailyLog(user.id, pid, todayISO());
        setLogStatus(logRes?.data ? "Submitted" : "Draft");
      } catch { setLogStatus("Draft"); } finally { setLoad("log", false); }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await getDrawings(user.id, "architect");
        setDrawings(res?.data || res || []);
      } catch (e) { console.error(e); } finally { setLoad("drawings", false); }
    })();
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/incidents");
        setIncidents((res.data.data || []).map(normaliseIncident));
      } catch (e) { console.error(e); } finally { setLoad("incidents", false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/incidents/tasks");
        setMyTasks((res.data.data || []).map(normaliseTask));
      } catch (e) { console.error(e); } finally { setLoad("tasks", false); }
    })();
  }, []);

  const p1Incidents = incidents.filter((i) => i.priority === "P1");

  const p1Tasks = myTasks.filter(
    (t) => (t.priority || t.incidentPriority) === "P1"
  );
  const pendingP1Tasks = p1Tasks.filter((t) => t.status !== "Done");

  return (
    <div className="acd-dashboard">

      {/* ── ROW 1: Hero + P1 Incidents + P1 Tasks ── */}
      <div className="acd-row-hero">
        <HeroCard userName={user.name || "Architect"} employeeId={user.id ?? null} />
        <P1Card
          p1Count={p1Incidents.length}
          totalCount={incidents.length}
          loading={loading.incidents}
          onClick={() => navigate("/architect/incidents")}
        />
        <P1TasksCard
          p1TaskCount={p1Tasks.length}
          totalTaskCount={myTasks.length}
          pendingCount={pendingP1Tasks.length}
          loading={loading.tasks}
          onClick={() => navigate("/architect/incidents?page=tasks")}
        />
      </div>

      {/* ── ROW 2: Action chips ── */}
      <ActionChips
        logStatus={logStatus}          loadingLog={loading.log}
        drawingCount={drawings.length} loadingDrawings={loading.drawings}
        projectCount={projects.length} loadingProjects={loading.projects}
        incidentCount={incidents.length} loadingIncidents={loading.incidents}
        onLogClick={() => navigate("/architect/logs")}
        onDrawingClick={() => navigate("/architect/designs")}
        onProjectClick={() => navigate("/architect/projects")}
        onIncidentClick={() => navigate("/architect/incidents")}
        onSnagClick={() => navigate("/architect/snags")} 
      />

      {/* ── ROW 3: Narrower incidents list + wider analytics ── */}
      <div className="acd-row-main">

        <div className="acd-card acd-card-incidents">
          <div className="acd-section-head">
            <div className="acd-section-title"> Critical Incidents</div>
            <button className="acd-section-link" onClick={() => navigate("/architect/incidents")}>
              View all →
            </button>
          </div>
          {loading.incidents ? (
            <div className="acd-skeleton-list">
              {[1, 2, 3].map((i) => <div key={i} className="acd-skeleton-row" />)}
            </div>
          ) : p1Incidents.length === 0 ? (
            <div className="acd-empty-state">
              <span className="acd-empty-icon">✓</span>
              <div>No P1 incidents — all clear</div>
            </div>
          ) : (
            <div className="acd-inc-list">
              {p1Incidents.slice(0, 6).map((inc, idx) => (
                <IncidentRow key={inc.id} inc={inc} index={idx} />
              ))}
            </div>
          )}
        </div>

        {/* Wider analytics panel */}
        <div className="acd-card acd-card-analytics">
          <div className="acd-analytics-section">
            <div className="acd-section-title">Task completion</div>
            {loading.tasks ? (
              <div className="acd-skeleton" style={{ height: 120 }} />
            ) : (
              <TaskDonut tasks={myTasks} />
            )}
          </div>

          <div className="acd-card-divider" />

          <div className="acd-analytics-section">
            <div className="acd-section-title">Projects</div>
            {loading.projects ? (
              <div className="acd-skeleton" style={{ height: 80 }} />
            ) : (
              <div className="acd-projects-summary">
                {projects.slice(0, 5).map((p) => (
                  <div key={p.id} className="acd-project-mini-row">
                    <span className="acd-project-mini-name">{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
                {projects.length > 5 && (
                  <button
                    className="acd-section-link"
                    onClick={() => navigate("/architect/projects")}
                    style={{ marginTop: 8 }}
                  >
                    +{projects.length - 5} more →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}