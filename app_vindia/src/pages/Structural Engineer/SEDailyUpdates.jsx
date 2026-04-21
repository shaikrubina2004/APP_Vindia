import { useState, useEffect, useCallback } from "react";
import { API } from "../../services/authService";
import "./SEDailyUpdates.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime  = () => new Date().toTimeString().slice(0, 5);

const DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const EMPTY_LOG = {
  date: todayStr(),
  checkIn: "", checkOut: "",
  projectName: "", location: "",
  weather: "Clear", weatherTemp: "",
  overallStatus: "on-track",
  morningBriefing: "",
  workDone: [{ task: "", qty: "", unit: "", status: "completed", remark: "" }],
  issues: [{ issue: "", action: "", priority: "medium" }],
  safetyPoints: "",
  tomorrowPlan: "",
  seRemarks: "",
  submittedBy: "",
  photoNames: [],
  approved: false,
};

const STATUS_COLORS = {
  "on-track": { label: "On Track", dot: "#10b981", badge: "#dcfce7", text: "#166534" },
  "delayed":  { label: "Delayed",  dot: "#f59e0b", badge: "#fef3c7", text: "#854d0e" },
  "critical": { label: "Critical", dot: "#ef4444", badge: "#fee2e2", text: "#991b1b" },
  "ahead":    { label: "Ahead",    dot: "#3b82f6", badge: "#dbeafe", text: "#1e40af" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SEDailyUpdates() {
  const [view, setView]             = useState("week");
  const [logs, setLogs]             = useState([]);
  const [attendance, setAttendance] = useState({});
  const [form, setForm]             = useState(EMPTY_LOG);
  const [selected, setSelected]     = useState(null);
  const [toast, setToast]           = useState(null);
  const [checkedIn, setCheckedIn]   = useState(false);
  const [loading, setLoading]       = useState(true);

  const weekDates = getWeekDates();

  // ── loadData declared before useEffect ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/se-daily-reports");
      const formatted = res.data.map(r => ({
        ...r.data,
        id: r.id,
        approved: r.approved,
      }));
      setLogs(formatted);

      const att = {};
      formatted.forEach(r => {
        if (r.date) {
          att[r.date] = {
            checkIn:  r.checkIn,
            checkOut: r.checkOut,
            status:   r.checkIn ? "present" : "absent",
          };
        }
      });
      setAttendance(att);

      const todayLog = formatted.find(r => r.date === todayStr());
      if (todayLog?.checkIn) setCheckedIn(true);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Check In ──────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    const time = nowTime();
    try {
      await API.post("/se-daily-reports", {
        project_name:   "Check In",
        date:           todayStr(),
        overall_status: "on-track",
        submitted_by:   "SE",
        data:           { ...EMPTY_LOG, date: todayStr(), checkIn: time },
      });
      setCheckedIn(true);
      setAttendance(a => ({ ...a, [todayStr()]: { checkIn: time, status: "present" } }));
      showToast(`Checked in at ${time}`);
      loadData();
    } catch {
      showToast("Check-in failed — please try again.", "error");
    }
  };

  // ── Save Log ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.projectName.trim()) {
      showToast("Project name is required.", "error");
      return;
    }
    try {
      await API.post("/se-daily-reports", {
        project_name:   form.projectName,
        date:           form.date,
        overall_status: form.overallStatus,
        submitted_by:   form.submittedBy || "Structural Engineer",
        data:           form,
      });
      showToast("Daily log saved successfully");
      await loadData();
      setView("week");
    } catch {
      showToast("Save failed — please try again.", "error");
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setRow = (key, idx, field, val) => {
    const arr = [...form[key]];
    arr[idx] = { ...arr[idx], [field]: val };
    setForm(f => ({ ...f, [key]: arr }));
  };

  const addRow = (key, tmpl) =>
    setForm(f => ({ ...f, [key]: [...f[key], tmpl] }));

  const removeRow = (key, idx) => {
    const arr = form[key].filter((_, i) => i !== idx);
    setForm(f => ({ ...f, [key]: arr.length ? arr : f[key] }));
  };

  const openForm = (date) => {
    const existing = logs.find(l => l.date === date);
    setForm(existing ? { ...EMPTY_LOG, ...existing } : { ...EMPTY_LOG, date });
    setView("form");
  };

  const openView = (log) => { setSelected(log); setView("view"); };

  // ════════════════════════════════════════════════════════════════════════════
  //  WEEK VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "week") {
    const td = todayStr();
    const totalPresent   = weekDates.filter(d => attendance[d]?.status === "present").length;
    const logsThisWeek   = logs.filter(l => weekDates.includes(l.date));
    const issuesThisWeek = logsThisWeek.reduce((a, l) =>
      a + (l.issues || []).filter(i => i.issue).length, 0);
    const approvedCount  = logsThisWeek.filter(l => l.approved).length;

    return (
      <div className="sed-page">
        {toast && (
          <div className={`sed-toast sed-toast--${toast.type}`}>
            <span className="sed-toast-dot" />
            {toast.msg}
          </div>
        )}

        {/* ── Hero Header ── */}
        <div className="sed-hero">
          <div className="sed-hero-bg" />
          <div className="sed-hero-inner">
            <div className="sed-hero-left">
              <p className="sed-eyebrow">— Structural Engineering</p>
              <h1 className="sed-title">Daily Updates</h1>
              <div className="sed-week-chip">
                {new Date(weekDates[0]).getDate()}&nbsp;
                {MONTHS[new Date(weekDates[0]).getMonth()]} —&nbsp;
                {new Date(weekDates[6]).getDate()}&nbsp;
                {MONTHS[new Date(weekDates[6]).getMonth()]}&nbsp;
                {new Date(weekDates[6]).getFullYear()}
              </div>
            </div>

            <div className="sed-hero-right">
              {!checkedIn ? (
                <button className="sed-checkin-btn" onClick={handleCheckIn}>
                  <span className="sed-ci-pulse" />
                  <span className="sed-ci-text">
                    <strong>Check In</strong>
                    <small>Mark attendance for today</small>
                  </span>
                </button>
              ) : (
                <div className="sed-checked-badge">
                  <span className="sed-ci-tick">✓</span>
                  <span className="sed-ci-text">
                    <strong>Checked In</strong>
                    <small>{attendance[td]?.checkIn}</small>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="sed-stats-bar">
          <div className="sed-stat">
            <span className="sed-stat-val" style={{ color: totalPresent > 0 ? "#3b5fd6" : undefined }}>
              {totalPresent}<span className="sed-stat-of">/7</span>
            </span>
            <span className="sed-stat-lbl">Days Present</span>
          </div>
          <div className="sed-stat">
            <span className="sed-stat-val">{logsThisWeek.length}</span>
            <span className="sed-stat-lbl">Logs Filed</span>
          </div>
          <div className="sed-stat">
            <span className="sed-stat-val">{issuesThisWeek}</span>
            <span className="sed-stat-lbl">Issues Raised</span>
          </div>
          <div className="sed-stat">
            <span className="sed-stat-val" style={{ color: approvedCount > 0 ? "#16a34a" : undefined }}>
              {approvedCount}
            </span>
            <span className="sed-stat-lbl">Approved</span>
          </div>
        </div>

        {/* ── Week Grid ── */}
        <div className="sed-grid-wrap">
          {loading ? (
            <div className="sed-loading">
              <span className="sed-spinner" />
              <p>Loading…</p>
            </div>
          ) : (
            <div className="sed-week-grid">
              {weekDates.map((date, idx) => {
                const isToday  = date === td;
                const isFuture = date > td;
                const att      = attendance[date];
                const log      = logs.find(l => l.date === date);
                const sc       = log ? (STATUS_COLORS[log.overallStatus] || STATUS_COLORS["on-track"]) : null;
                const dn       = new Date(date);
                const taskCnt  = (log?.workDone || []).filter(w => w.task).length;

                return (
                  <div
                    key={date}
                    className={[
                      "sed-day-card",
                      isToday  ? "sed-day--today"   : "",
                      isFuture ? "sed-day--future"  : "",
                      idx >= 5 ? "sed-day--weekend" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {/* Card Header */}
                    <div className={`sed-day-hdr ${isToday ? "sed-day-hdr--today" : ""}`}>
                      <div className="sed-day-hdr-left">
                        <span className="sed-day-name">{DAYS[idx]}</span>
                        <span className="sed-day-num">{dn.getDate()}</span>
                        <span className="sed-day-mon">{MONTHS[dn.getMonth()]}</span>
                      </div>
                      {isToday && <span className="sed-today-pill">Today</span>}
                    </div>

                    {/* Attendance */}
                    <div className="sed-day-att">
                      {att?.checkIn ? (
                        <div className="sed-att-row">
                          <span className="sed-att-dot sed-att-dot--in" />
                          <span className="sed-att-time">{att.checkIn}</span>
                          <span className="sed-att-lbl">in</span>
                          {att.checkOut && (
                            <>
                              <span className="sed-att-dot sed-att-dot--out" />
                              <span className="sed-att-time">{att.checkOut}</span>
                              <span className="sed-att-lbl">out</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="sed-att-nil">
                          {isFuture ? "—" : "No check-in"}
                        </span>
                      )}
                    </div>

                    {/* Log summary */}
                    <div className="sed-day-log">
                      {log ? (
                        <>
                          <div className="sed-log-proj">{log.projectName || "—"}</div>
                          {taskCnt > 0 && (
                            <div className="sed-log-tasks">
                              {taskCnt} task{taskCnt !== 1 ? "s" : ""} logged
                            </div>
                          )}
                          {sc && (
                            <span className="sed-status-pill" style={{ background: sc.badge, color: sc.text }}>
                              <span className="sed-status-dot" style={{ background: sc.dot }} />
                              {sc.label}
                            </span>
                          )}
                          {log.approved && <div className="sed-approved-tag">✓ Approved</div>}
                        </>
                      ) : !isFuture ? (
                        <span className="sed-no-log">No log filed</span>
                      ) : null}
                    </div>

                    {/* Actions */}
                    {!isFuture && (
                      <div className="sed-day-actions">
                        {log ? (
                          <>
                            <button className="sed-btn-view" onClick={() => openView(log)}>
                              View →
                            </button>
                            {!log.approved && (
                              <button className="sed-btn-edit" onClick={() => openForm(date)}>
                                Edit
                              </button>
                            )}
                          </>
                        ) : (
                          <button className="sed-btn-file" onClick={() => openForm(date)}>
                            + File Log
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── All Logs List ── */}
        {logs.length > 0 && (
          <div className="sed-all-logs">
            <div className="sed-section-hdr">
              <h2 className="sed-section-title">All Logs</h2>
              <button className="sed-btn-new" onClick={() => openForm(todayStr())}>
                + New Log
              </button>
            </div>
            <div className="sed-log-list">
              {logs.slice().reverse().map(log => {
                const sc = STATUS_COLORS[log.overallStatus] || STATUS_COLORS["on-track"];
                const ld = new Date(log.date);
                return (
                  <div key={String(log.id)} className="sed-log-row" onClick={() => openView(log)}>
                    <div className="sed-lr-date">
                      <span className="sed-lr-day">{DAYS[(ld.getDay() + 6) % 7]}</span>
                      <span className="sed-lr-num">{ld.getDate()}</span>
                      <span className="sed-lr-mon">{MONTHS[ld.getMonth()]}</span>
                    </div>
                    <div className="sed-lr-body">
                      <div className="sed-lr-project">{log.projectName || "Untitled"}</div>
                      <div className="sed-lr-meta">
                        {log.checkIn  && <span>In {log.checkIn}</span>}
                        {log.checkOut && <span>Out {log.checkOut}</span>}
                        {(log.workDone || []).filter(w => w.task).length > 0 && (
                          <span>{(log.workDone || []).filter(w => w.task).length} tasks</span>
                        )}
                      </div>
                    </div>
                    <div className="sed-lr-right">
                      <span className="sed-status-pill" style={{ background: sc.badge, color: sc.text }}>
                        <span className="sed-status-dot" style={{ background: sc.dot }} />
                        {sc.label}
                      </span>
                      {log.approved && <span className="sed-approved-chip">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "form") {
    const fd = new Date(form.date);
    return (
      <div className="sed-form-page">
        {toast && (
          <div className={`sed-toast sed-toast--${toast.type}`}>
            <span className="sed-toast-dot" />
            {toast.msg}
          </div>
        )}

        {/* Top Bar */}
        <div className="sed-form-bar">
          <button className="sed-back-btn" onClick={() => setView("week")}>← Back</button>
          <div className="sed-form-bar-title">
            Daily Field Log — {fd.getDate()} {MONTHS[fd.getMonth()]} {fd.getFullYear()}
          </div>
          <div className="sed-bar-actions">
            <button className="sed-cancel-btn" onClick={() => setView("week")}>Cancel</button>
            <button className="sed-save-btn" onClick={handleSave}>Save Log</button>
          </div>
        </div>

        <div className="sed-form-body">

          {/* ── §1 Attendance & Site Details ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">🕐</span>
              <h3 className="sed-card-title">Attendance & Site Details</h3>
            </div>
            <div className="sed-grid-3">
              <div className="sed-field">
                <label className="sed-lbl">Date</label>
                <input className="sed-inp" type="date" value={form.date}
                  onChange={e => setField("date", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Check-In Time</label>
                <input className="sed-inp" type="time" value={form.checkIn}
                  onChange={e => setField("checkIn", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Check-Out Time</label>
                <input className="sed-inp" type="time" value={form.checkOut}
                  onChange={e => setField("checkOut", e.target.value)} />
              </div>
              <div className="sed-field sed-field--span2">
                <label className="sed-lbl">Project Name <span className="sed-req">*</span></label>
                <input className="sed-inp" placeholder="e.g. Greenfield Tower Block A" value={form.projectName}
                  onChange={e => setField("projectName", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Location / Zone</label>
                <input className="sed-inp" placeholder="Grid C3, Level 4" value={form.location}
                  onChange={e => setField("location", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Weather</label>
                <input className="sed-inp" placeholder="Clear / Rainy" value={form.weather}
                  onChange={e => setField("weather", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Temp (°C)</label>
                <input className="sed-inp" placeholder="34" value={form.weatherTemp}
                  onChange={e => setField("weatherTemp", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Day Status</label>
                <select className="sed-inp sed-select" value={form.overallStatus}
                  onChange={e => setField("overallStatus", e.target.value)}>
                  <option value="on-track">On Track</option>
                  <option value="delayed">Delayed</option>
                  <option value="critical">Critical</option>
                  <option value="ahead">Ahead</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── §2 Morning Briefing ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">☀️</span>
              <h3 className="sed-card-title">Morning Briefing / Plan</h3>
            </div>
            <div className="sed-field">
              <label className="sed-lbl">What was planned for today?</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Column pour at Grid C3–D4, Rebar inspection at Level 3, Concrete cube sampling…"
                value={form.morningBriefing}
                onChange={e => setField("morningBriefing", e.target.value)} />
            </div>
          </div>

          {/* ── §3 Work Done ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">🏗</span>
              <h3 className="sed-card-title">Work Completed Today</h3>
            </div>
            <div className="sed-table-head">
              {["Task / Activity", "Qty", "Unit", "Status", "Remark", ""].map((c, i) => (
                <div key={i} className="sed-th">{c}</div>
              ))}
            </div>
            {form.workDone.map((row, i) => (
              <div key={i} className="sed-table-row">
                <input className="sed-inp sed-td sed-td--3" placeholder="Column casting at C3…" value={row.task}
                  onChange={e => setRow("workDone", i, "task", e.target.value)} />
                <input className="sed-inp sed-td sed-td--1" placeholder="6" value={row.qty}
                  onChange={e => setRow("workDone", i, "qty", e.target.value)} />
                <input className="sed-inp sed-td sed-td--1" placeholder="Nos" value={row.unit}
                  onChange={e => setRow("workDone", i, "unit", e.target.value)} />
                <select className="sed-inp sed-td sed-td--2 sed-select" value={row.status}
                  onChange={e => setRow("workDone", i, "status", e.target.value)}>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="deferred">Deferred</option>
                </select>
                <input className="sed-inp sed-td sed-td--2" placeholder="Notes…" value={row.remark}
                  onChange={e => setRow("workDone", i, "remark", e.target.value)} />
                <button className="sed-rm-btn" title="Remove row" onClick={() => removeRow("workDone", i)}>✕</button>
              </div>
            ))}
            <button className="sed-add-btn"
              onClick={() => addRow("workDone", { task: "", qty: "", unit: "", status: "completed", remark: "" })}>
              + Add Task
            </button>
          </div>

          {/* ── §4 Issues ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">⚠️</span>
              <h3 className="sed-card-title">Issues / Problems Faced</h3>
            </div>
            {form.issues.map((row, i) => (
              <div key={i} className="sed-issue-block">
                <div className="sed-issue-top">
                  <span className="sed-issue-num">#{i + 1}</span>
                  <select
                    className={`sed-priority sed-priority--${row.priority}`}
                    value={row.priority}
                    onChange={e => setRow("issues", i, "priority", e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button className="sed-rm-btn" onClick={() => removeRow("issues", i)}>✕</button>
                </div>
                <div className="sed-two-col">
                  <div className="sed-field">
                    <label className="sed-lbl">Issue Description</label>
                    <input className="sed-inp" placeholder="Describe the issue…" value={row.issue}
                      onChange={e => setRow("issues", i, "issue", e.target.value)} />
                  </div>
                  <div className="sed-field">
                    <label className="sed-lbl">Action Taken</label>
                    <input className="sed-inp" placeholder="Corrective action taken…" value={row.action}
                      onChange={e => setRow("issues", i, "action", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="sed-add-btn"
              onClick={() => addRow("issues", { issue: "", action: "", priority: "medium" })}>
              + Add Issue
            </button>
          </div>

          {/* ── §5 Safety ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">🦺</span>
              <h3 className="sed-card-title">Safety Observations</h3>
            </div>
            <div className="sed-field">
              <label className="sed-lbl">Safety notes (one per line)</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder={"Toolbox talk conducted at 8 AM\nAll workers wearing PPE\nEdge protection checked at slab perimeter"}
                value={form.safetyPoints}
                onChange={e => setField("safetyPoints", e.target.value)} />
            </div>
          </div>

          {/* ── §6 Tomorrow ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">📅</span>
              <h3 className="sed-card-title">Tomorrow's Plan</h3>
            </div>
            <div className="sed-field">
              <label className="sed-lbl">What is planned for tomorrow?</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Continue column pour at Grid D4, Rebar check at Level 4 slab…"
                value={form.tomorrowPlan}
                onChange={e => setField("tomorrowPlan", e.target.value)} />
            </div>
          </div>

          {/* ── §7 Remarks & Submission ── */}
          <div className="sed-card">
            <div className="sed-card-hdr">
              <span className="sed-card-icon">📝</span>
              <h3 className="sed-card-title">Remarks & Submission</h3>
            </div>
            <div className="sed-field">
              <label className="sed-lbl">SE Remarks</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Overall observations, coordination notes, consultant queries…"
                value={form.seRemarks}
                onChange={e => setField("seRemarks", e.target.value)} />
            </div>
            <div className="sed-two-col" style={{ marginTop: 16 }}>
              <div className="sed-field">
                <label className="sed-lbl">Submitted By</label>
                <input className="sed-inp" placeholder="Ravi Kumar, SE" value={form.submittedBy || ""}
                  onChange={e => setField("submittedBy", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Site Photos</label>
                <label className="sed-upload-box">
                  📷 Upload Photos
                  <input type="file" multiple accept="image/*" style={{ display: "none" }}
                    onChange={e =>
                      setField("photoNames", Array.from(e.target.files || []).map(f => f.name))
                    } />
                </label>
                {(form.photoNames?.length || 0) > 0 && (
                  <div className="sed-file-list">
                    {form.photoNames.map((n, i) => <span key={i}>📄 {n}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sed-sticky-footer">
          <span className="sed-footer-label">
            {form.projectName ? `📐 ${form.projectName}` : "New SE Log"} · {form.date || "No date"}
          </span>
          <div className="sed-footer-btns">
            <button className="sed-cancel-btn" onClick={() => setView("week")}>Cancel</button>
            <button className="sed-save-btn" onClick={handleSave}>Save Log</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  VIEW LOG
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "view" && selected) {
    const r  = selected;
    const sc = STATUS_COLORS[r.overallStatus] || STATUS_COLORS["on-track"];
    const rd = new Date(r.date);

    return (
      <div className="sed-form-page">
        {toast && (
          <div className={`sed-toast sed-toast--${toast.type}`}>
            <span className="sed-toast-dot" />
            {toast.msg}
          </div>
        )}

        <div className="sed-form-bar">
          <button className="sed-back-btn" onClick={() => setView("week")}>← Back</button>
          <div className="sed-form-bar-title">
            Field Log — {rd.getDate()} {MONTHS[rd.getMonth()]} {rd.getFullYear()}
          </div>
          <div className="sed-bar-actions">
            <button className="sed-cancel-btn"
              onClick={() => { setForm({ ...EMPTY_LOG, ...r }); setView("form"); }}>
              ✏ Edit
            </button>
            {r.approved ? (
              <span className="sed-approved-big">✓ Approved</span>
            ) : (
              <button className="sed-save-btn" onClick={async () => {
                try {
                  await API.put(`/se-daily-reports/approve/${r.id}`);
                  showToast("Log approved!");
                  await loadData();
                  setView("week");
                } catch {
                  showToast("Approval failed", "error");
                }
              }}>
                ✓ Approve
              </button>
            )}
          </div>
        </div>

        <div className="sed-view-body">

          {/* Hero card */}
          <div className="sed-view-hero">
            <div className="sed-view-hero-left">
              <h2 className="sed-view-project">{r.projectName || "Untitled"}</h2>
              <div className="sed-view-meta">
                {rd.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {r.location && <span> · 📍 {r.location}</span>}
                {r.weather  && <span> · 🌤 {r.weather}{r.weatherTemp ? ` ${r.weatherTemp}°C` : ""}</span>}
              </div>
              <div className="sed-view-times">
                {r.checkIn  && <span className="sed-time-chip sed-time-chip--in">In: {r.checkIn}</span>}
                {r.checkOut && <span className="sed-time-chip sed-time-chip--out">Out: {r.checkOut}</span>}
              </div>
            </div>
            <span className="sed-status-pill sed-status-pill--lg" style={{ background: sc.badge, color: sc.text }}>
              <span className="sed-status-dot" style={{ background: sc.dot }} />
              {sc.label}
            </span>
          </div>

          {r.morningBriefing && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">☀️ Morning Plan</div>
              <p className="sed-vcard-text">{r.morningBriefing}</p>
            </div>
          )}

          <div className="sed-vcard">
            <div className="sed-vcard-title">🏗 Work Completed</div>
            {(r.workDone || []).filter(w => w.task).length === 0 ? (
              <div className="sed-vnil">No tasks logged</div>
            ) : (r.workDone || []).filter(w => w.task).map((w, i) => (
              <div key={i} className="sed-vrow">
                <span className="sed-vrow-main">{w.task}</span>
                {w.qty && <span className="sed-vrow-meta">{w.qty} {w.unit}</span>}
                <span className={`sed-spill sed-spill--${w.status}`}>
                  {w.status.replace("-", " ")}
                </span>
                {w.remark && <span className="sed-vrow-remark">{w.remark}</span>}
              </div>
            ))}
          </div>

          <div className="sed-vcard">
            <div className="sed-vcard-title">⚠️ Issues</div>
            {(r.issues || []).filter(i => i.issue).length === 0 ? (
              <div className="sed-vnil">No issues raised ✓</div>
            ) : (r.issues || []).filter(i => i.issue).map((iss, i) => (
              <div key={i} className="sed-issue-view">
                <div className="sed-issue-view-top">
                  <span className={`sed-priority-badge sed-priority-badge--${iss.priority}`}>
                    {iss.priority}
                  </span>
                  <span className="sed-issue-text">{iss.issue}</span>
                </div>
                {iss.action && <div className="sed-issue-action">→ {iss.action}</div>}
              </div>
            ))}
          </div>

          {r.safetyPoints && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">🦺 Safety Observations</div>
              {r.safetyPoints.split("\n").filter(Boolean).map((l, i) => (
                <div key={i} className="sed-safety-line">{l}</div>
              ))}
            </div>
          )}

          {r.tomorrowPlan && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">📅 Tomorrow's Plan</div>
              <p className="sed-vcard-text">{r.tomorrowPlan}</p>
            </div>
          )}

          {r.seRemarks && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">📝 SE Remarks</div>
              <p className="sed-vcard-text">{r.seRemarks}</p>
            </div>
          )}

          <div className="sed-vfooter">
            Submitted by: <strong>{r.submittedBy || "Structural Engineer"}</strong>
            <span className="sed-vfooter-dist">
              Distribution: Project Manager · Consultant · QC Team
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}