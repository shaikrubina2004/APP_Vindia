import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, MoreVertical, Plus,
  Check, Droplet, Flag, Sparkles, Briefcase, AlertTriangle, ListChecks,
} from "lucide-react";
import { getArchitectProjects } from "../../services/architectprojectService";
import { getDailyLog } from "../../services/architectDailyLogService";
import { API } from "../../services/authService";
import { getDrawings } from "../../services/architectDesignService";
import "./ArchitectDashboard.css";

/* ════════════════════════════════════════════════════════════════════════
   Same data wiring as before. Visual/layout pass: full-bleed layout (no
   centered max-width), removed the project-switcher dropdown and the
   bell / overflow icons from the incidents panel, moved the task
   pipeline out of the hero and into the bottom card (replacing the old
   "task completion" area chart), and restricted every color to the
   fixed brand palette — urgency is now shown via shade depth, not hue.
   ════════════════════════════════════════════════════════════════════════ */

// ─── UTILITY ─────────────────────────────────────────────────────────────
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

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

// Days between now and a deadline (negative = overdue)
const daysUntil = (date) => {
  if (!date) return null;
  const ms = date.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
};

// ─── CHECK IN / OUT (lives inside the hero) ───────────────────────────────
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
      <div className="acd-search-pill">
        <span className="acd-checkin-dot" />
        <span className="acd-checkin-label">Loading…</span>
      </div>
    );
  }

  if (isCheckedOut) {
    return (
      <div className="acd-checkin-wrap">
        <div className="acd-search-pill acd-search-pill-done">
          <span className="acd-checkin-dot acd-checkin-dot-green" />
          <span className="acd-checkin-label">Done for today</span>
        </div>
        <span className="acd-checkin-sub">
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="acd-checkin-wrap">
        <button className="acd-search-pill acd-search-pill-btn acd-search-pill-out" onClick={handleCheckOut} disabled={busy}>
          <span className="acd-checkin-dot acd-checkin-dot-pulse" />
          <span className="acd-checkin-label">{busy ? "Saving…" : "Check out"}</span>
        </button>
        <span className="acd-checkin-sub">
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong>{elapsed}</strong></>}
        </span>
      </div>
    );
  }

  return (
    <button className="acd-search-pill acd-search-pill-btn acd-search-pill-in" onClick={handleCheckIn} disabled={busy}>
      <span className="acd-checkin-dot" />
      <span className="acd-checkin-label">{busy ? "Saving…" : "Check in"}</span>
    </button>
  );
};

// ─── STAT CARD (top row) ───────────────────────────────────────────────────
function StatCard({ tone, icon: Icon, label, value, sub, loading, onClick }) {
  return (
    <button className="acd-stat-card" onClick={onClick} type="button">
      <span className={`acd-stat-badge acd-tone-${tone}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="acd-stat-blank">
        {loading ? (
          <div className="acd-stat-skel" />
        ) : (
          <>
            <div className="acd-stat-value">{value}</div>
            <div className="acd-stat-sub">{sub}</div>
          </>
        )}
      </div>
      <div className="acd-stat-footer">
        <span className="acd-stat-footer-label">{label}</span>
      </div>
    </button>
  );
}

// ─── INFO ROW (bottom-left) ────────────────────────────────────────────────
function InfoRow({ tone, icon: Icon, label, value, loading, onClick }) {
  return (
    <button className="acd-info-card" onClick={onClick} type="button">
      <span className={`acd-info-icon acd-tone-${tone}-soft`}>
        <Icon size={15} />
      </span>
      <span className="acd-info-text">
        <span className="acd-info-label">{label}</span>
        <span className="acd-info-value">{loading ? "…" : value}</span>
      </span>
    </button>
  );
}

// ─── TASK PIPELINE CARD ─────────────────────────────────────────────────────
// Replaces the old "task completion" area chart. Four labeled bars with the
// count printed above each one, so the value reads correctly even when a
// bar is short — the earlier version relied on bar height alone, which
// looked broken whenever counts were small or uneven.
function TaskPipelineCard({ tasks, p1Count, loading }) {
  const counts = { "To do": 0, "In progress": 0, Done: 0 };
  tasks.forEach((t) => {
    if (t.status === "Done") counts.Done++;
    else if (t.status === "In Progress") counts["In progress"]++;
    else counts["To do"]++;
  });
  const bars = [
    { label: "To do",      value: counts["To do"],      color: "var(--blue-100)" },
    { label: "In progress",value: counts["In progress"],color: "var(--blue-400)" },
    { label: "Done",       value: counts.Done,          color: "var(--blue-600)" },
    { label: "P1",         value: p1Count,               color: "var(--navy-800)" },
  ];
  const barMax = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="acd-chart-card">
      <div className="acd-chart-head">
        <span className="acd-chart-title">Task pipeline</span>
        <span className="acd-chart-pct">{loading ? "…" : `${tasks.length} total`}</span>
      </div>
      {loading ? (
        <div className="acd-stat-skel" style={{ height: 90 }} />
      ) : (
        <div className="acd-pipeline-bars">
          {bars.map((b) => (
            <div className="acd-pipeline-col" key={b.label}>
              <span className="acd-pipeline-count">{b.value}</span>
              <span
                className="acd-pipeline-bar"
                style={{ height: `${10 + (b.value / barMax) * 74}px`, background: b.color }}
              />
              <span className="acd-pipeline-label">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TIMELINE ROW (right panel — critical incidents) ───────────────────────
// Icon tone reflects real urgency (days to deadline) via shade depth only —
// darkest = most urgent — rather than an unrelated icon rotating by index.
function urgencyOf(inc) {
  const d = inc.deadlineAt ? daysUntil(new Date(inc.deadlineAt)) : null;
  if (d === null) return { tone: "sky", label: "No deadline set" };
  if (d < 0) return { tone: "navy", label: `${Math.abs(d)}d overdue` };
  if (d <= 2) return { tone: "navy2", label: d === 0 ? "Due today" : `Due in ${d}d` };
  return { tone: "blue", label: `Due in ${d}d` };
}

function TimelineRow({ inc, onClick }) {
  const urgency = urgencyOf(inc);
  const dateLabel = (inc.deadlineAt ?? inc.updatedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short",
  });

  return (
    <div className="acd-tl-item">
      <span className="acd-tl-node" />
      <div className="acd-tl-row" onClick={onClick} role="button" tabIndex={0}>
        <span className={`acd-tl-icon acd-tone-${urgency.tone}`}>
          <AlertTriangle size={16} />
        </span>
        <span className="acd-tl-info">
          <span className="acd-tl-title">{inc.title}</span>
          <span className="acd-tl-meta">
            #{inc.incidentNo}{inc.assignedName ? ` · ${inc.assignedName}` : ""} · {urgency.label} ({dateLabel})
          </span>
        </span>
        <span className="acd-tl-more"><MoreVertical size={16} /></span>
      </div>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
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
  const [tlPage, setTlPage] = useState(0);
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
  const p1Tasks = myTasks.filter((t) => (t.priority || t.incidentPriority) === "P1");
  const pendingP1Tasks = p1Tasks.filter((t) => t.status !== "Done");
  const submitted = logStatus === "Submitted";

  const topCriticalTask = pendingP1Tasks[0] || p1Tasks[0] || null;
  const moreCriticalTasks = Math.max(0, p1Tasks.length - 1);

  const PAGE_SIZE = 6;
  const tlPages = Math.max(1, Math.ceil(p1Incidents.length / PAGE_SIZE));
  const pageSafe = Math.min(tlPage, tlPages - 1);
  const pageItems = useMemo(
    () => p1Incidents.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE),
    [p1Incidents, pageSafe]
  );

  return (
    <div className="acd-page">
      <div className="acd-layout">

        {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
        <section className="acd-left">

          <div className="acd-hero">
            <div className="acd-hero-greeting-block">
              <p className="acd-hero-greeting">{getGreeting()}</p>
              <h1 className="acd-hero-name">{user.name || "Architect"}</h1>
              <p className="acd-hero-date">{longDate()}</p>
            </div>

            <div className="acd-hero-right">
              {user.id && <CheckInButton employeeId={user.id} />}

              <div className="acd-hero-buttons">
                <button className="acd-btn-dark" onClick={() => navigate("/architect/incidents")}>
                  Incidents
                </button>
                <button className="acd-btn-light" onClick={() => navigate("/architect/incidents?page=tasks")}>
                  Tasks
                </button>
              </div>
            </div>
          </div>

          <div className="acd-stat-row">
            <StatCard
              tone="navy"
              icon={Check}
              label="Log status"
              value={submitted ? "Submitted" : "Pending"}
              sub={loading.log ? "" : (submitted ? "Today's log is in" : "Not submitted yet")}
              loading={loading.log}
              onClick={() => navigate("/architect/logs")}
            />
            <StatCard
              tone="blue"
              icon={Droplet}
              label="Drawings"
              value={drawings.length}
              sub="Total uploaded"
              loading={loading.drawings}
              onClick={() => navigate("/architect/designs")}
            />
            <StatCard
              tone="navy2"
              icon={Flag}
              label="Critical incidents"
              value={p1Incidents.length}
              sub={p1Incidents.length > 0 ? "Needs attention" : "All clear"}
              loading={loading.incidents}
              onClick={() => navigate("/architect/incidents")}
            />
            <StatCard
              tone="teal"
              icon={Sparkles}
              label="Snag list"
              value="Review"
              sub="Open snags to close out"
              loading={false}
              onClick={() => navigate("/architect/snags")}
            />
          </div>

          <div className="acd-bottom-row">
            <div className="acd-info-grid">
              <InfoRow
                tone="blue"
                icon={Briefcase}
                label="Projects"
                value={`${projects.length} assigned`}
                loading={loading.projects}
                onClick={() => navigate("/architect/projects")}
              />
              <InfoRow
                tone="grey"
                icon={AlertTriangle}
                label="Total incidents"
                value={`${incidents.length} total`}
                loading={loading.incidents}
                onClick={() => navigate("/architect/incidents")}
              />
              <InfoRow
                tone="grey"
                icon={Flag}
                label="Critical task"
                value={topCriticalTask ? topCriticalTask.title + (moreCriticalTasks > 0 ? ` (+${moreCriticalTasks} more)` : "") : "None assigned"}
                loading={loading.tasks}
                onClick={() => navigate("/architect/incidents?page=tasks")}
              />
              <InfoRow
                tone="grey"
                icon={ListChecks}
                label="Total tasks"
                value={`${myTasks.length} total`}
                loading={loading.tasks}
                onClick={() => navigate("/architect/incidents?page=tasks")}
              />
            </div>

            <TaskPipelineCard tasks={myTasks} p1Count={p1Incidents.length} loading={loading.tasks} />
          </div>
        </section>

        {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
        <section className="acd-right">

          <div className="acd-right-topbar">
            <span>
              <span className="acd-right-heading">Critical incidents</span>
              <br />
              <span className="acd-right-sub">
                {p1Incidents.length} open · P1
              </span>
            </span>
            <div className="acd-toggle-group">
              <button
                className="acd-chev-btn"
                disabled={pageSafe === 0}
                onClick={() => setTlPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="acd-chev-btn"
                disabled={pageSafe >= tlPages - 1}
                onClick={() => setTlPage((p) => Math.min(tlPages - 1, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="acd-timeline">
            {loading.incidents ? (
              <div className="acd-tl-track">
                {[1, 2, 3, 4].map((i) => <div key={i} className="acd-tl-skel-row" />)}
              </div>
            ) : p1Incidents.length === 0 ? (
              <div className="acd-tl-empty">
                <Check size={26} />
                <div>No P1 incidents — all clear</div>
              </div>
            ) : (
              <div className="acd-tl-track">
                {pageItems.map((inc) => (
                  <TimelineRow key={inc.id} inc={inc} onClick={() => navigate("/architect/incidents")} />
                ))}
              </div>
            )}
          </div>

          <button className="acd-fab" onClick={() => navigate("/architect/incidents")} title="View all incidents">
            <Plus size={22} />
          </button>
        </section>

      </div>
    </div>
  );
}