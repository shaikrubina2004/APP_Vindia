import { useState, useEffect } from "react";
import { API } from "../../services/authService";
import "./SEDailyUpdates.css";

// ─── Helpers ─────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_STATUS = { present: "Present", absent: "Absent", halfday: "Half Day", leave: "On Leave" };

function getWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const EMPTY_LOG = {
  date: today(),
  checkIn: "", checkOut: "",
  projectName: "", location: "", weather: "Clear", weatherTemp: "",
  overallStatus: "on-track",
  morningBriefing: "",
  workDone: [{ task: "", qty: "", unit: "", status: "completed", remark: "" }],
  issues: [{ issue: "", action: "", priority: "medium" }],
  safetyPoints: "",
  tomorrowPlan: "",
  seRemarks: "",
  photoNames: [], approved: false,
};

const STATUS_COLORS = {
  "on-track": { label: "On Track",  dot: "#10b981", badge: "#dcfce7", text: "#166534" },
  "delayed":  { label: "Delayed",   dot: "#f59e0b", badge: "#fef9c3", text: "#854d0e" },
  "critical": { label: "Critical",  dot: "#ef4444", badge: "#fee2e2", text: "#991b1b" },
  "ahead":    { label: "Ahead",     dot: "#3b82f6", badge: "#dbeafe", text: "#1e40af" },
};

// ─── Main Component ───────────────────────────────────────────
export default function SEDailyUpdates() {
  const [view, setView]             = useState("week");   // week | log | form | view
  const [logs, setLogs]             = useState([]);
  const [attendance, setAttendance] = useState({});      // { "2025-04-18": { checkIn, checkOut, status } }
  const [form, setForm]             = useState(EMPTY_LOG);
  const [selected, setSelected]     = useState(null);
  const [toast, setToast]           = useState(null);
  const [checkedIn, setCheckedIn]   = useState(false);
  const weekDates = getWeekDates();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await API.get("/se-daily-reports");
      const formatted = res.data.map(r => ({ ...r.data, id: r.id, approved: r.approved }));
      setLogs(formatted);
      // Build attendance map
      const att = {};
      formatted.forEach(r => {
        if (r.date) att[r.date] = { checkIn: r.checkIn, checkOut: r.checkOut, status: r.checkIn ? "present" : "absent" };
      });
      setAttendance(att);
      // Check today
      const todayLog = formatted.find(r => r.date === today());
      if (todayLog?.checkIn) setCheckedIn(true);
    } catch { setLogs([]); }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Check In ──
  const handleCheckIn = async () => {
    const time = nowTime();
    try {
      await API.post("/se-daily-reports", {
        project_name: "Check In", date: today(),
        overall_status: "on-track", submitted_by: "SE",
        data: { ...EMPTY_LOG, date: today(), checkIn: time },
      });
      setCheckedIn(true);
      setAttendance(a => ({ ...a, [today()]: { checkIn: time, status: "present" } }));
      showToast(`Checked in at ${time} ✓`);
      loadData();
    } catch { showToast("Check-in failed", "error"); }
  };

  // ── Save Log ──
  const handleSave = async () => {
    try {
      await API.post("/se-daily-reports", {
        project_name: form.projectName,
        date: form.date,
        overall_status: form.overallStatus,
        submitted_by: form.submittedBy || "Structural Engineer",
        data: form,
      });
      showToast("Daily log saved ✓");
      loadData();
      setView("week");
    } catch { showToast("Save failed", "error"); }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setRow = (key, idx, field, val) => {
    const arr = [...form[key]];
    arr[idx] = { ...arr[idx], [field]: val };
    setForm(f => ({ ...f, [key]: arr }));
  };
  const addRow = (key, tmpl) => setForm(f => ({ ...f, [key]: [...f[key], tmpl] }));
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

  // ════════════════════════════════════
  //  WEEK VIEW
  // ════════════════════════════════════
  if (view === "week") {
    const todayStr = today();
    const totalPresent = weekDates.filter(d => attendance[d]?.status === "present").length;
    const logsThisWeek = logs.filter(l => weekDates.includes(l.date));

    return (
      <div className="sed-page">
        {toast && <div className={`sed-toast sed-toast--${toast.type}`}>{toast.msg}</div>}

        {/* Header */}
        <div className="sed-hero">
          <div className="sed-hero-pattern" />
          <div className="sed-hero-content">
            <div className="sed-hero-left">
              <div className="sed-eyebrow">— STRUCTURAL ENGINEERING</div>
              <h1 className="sed-title">Daily Updates</h1>
              <div className="sed-date-chip">
                Week of {new Date(weekDates[0]).toLocaleDateString("en-IN", { day:"numeric", month:"short" })} – {new Date(weekDates[6]).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
              </div>
            </div>
            <div className="sed-hero-right">
              {!checkedIn ? (
                <button className="sed-checkin-btn" onClick={handleCheckIn}>
                  <span className="sed-checkin-icon">🟢</span>
                  <span>
                    <div className="sed-checkin-label">Check In</div>
                    <div className="sed-checkin-sub">Mark attendance for today</div>
                  </span>
                </button>
              ) : (
                <div className="sed-checked-badge">
                  <span>✓</span>
                  <span>
                    <div className="sed-checkin-label">Checked In</div>
                    <div className="sed-checkin-sub">{attendance[todayStr]?.checkIn}</div>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="sed-stats-row">
          <div className="sed-stat"><div className="sed-stat-n">{totalPresent}/7</div><div className="sed-stat-l">Days Present</div></div>
          <div className="sed-stat"><div className="sed-stat-n">{logsThisWeek.length}</div><div className="sed-stat-l">Logs Filed</div></div>
          <div className="sed-stat"><div className="sed-stat-n">{logsThisWeek.reduce((a, l) => a + (l.issues||[]).filter(i=>i.issue).length, 0)}</div><div className="sed-stat-l">Issues Raised</div></div>
          <div className="sed-stat"><div className="sed-stat-n">{logsThisWeek.filter(l=>l.approved).length}</div><div className="sed-stat-l">Approved</div></div>
        </div>

        {/* Week Grid */}
        <div className="sed-week-grid">
          {weekDates.map((date, idx) => {
            const isToday   = date === todayStr;
            const isPast    = date < todayStr;
            const isFuture  = date > todayStr;
            const att       = attendance[date];
            const log       = logs.find(l => l.date === date);
            const sc        = log ? (STATUS_COLORS[log.overallStatus] || STATUS_COLORS["on-track"]) : null;
            const dn        = new Date(date);
            const dayName   = DAYS[idx];
            const dayNum    = dn.getDate();
            const month     = dn.toLocaleDateString("en-IN", { month:"short" });

            return (
              <div key={date} className={`sed-day-card ${isToday ? "sed-day-today" : ""} ${isFuture ? "sed-day-future" : ""}`}>
                {/* Day header */}
                <div className="sed-day-header">
                  <div className="sed-day-name">{dayName}</div>
                  <div className="sed-day-num">{dayNum}</div>
                  <div className="sed-day-month">{month}</div>
                  {isToday && <div className="sed-today-chip">TODAY</div>}
                </div>

                {/* Attendance strip */}
                <div className="sed-att-strip">
                  {att?.checkIn ? (
                    <>
                      <div className="sed-time-row">
                        <span className="sed-time-icon">🟢</span>
                        <span className="sed-time-val">{att.checkIn}</span>
                        <span className="sed-time-lbl">in</span>
                      </div>
                      {att.checkOut && (
                        <div className="sed-time-row">
                          <span className="sed-time-icon">🔴</span>
                          <span className="sed-time-val">{att.checkOut}</span>
                          <span className="sed-time-lbl">out</span>
                        </div>
                      )}
                    </>
                  ) : isFuture ? (
                    <div className="sed-att-future">—</div>
                  ) : (
                    <div className="sed-att-absent">No check-in</div>
                  )}
                </div>

                {/* Log summary */}
                {log ? (
                  <div className="sed-log-summary">
                    <div className="sed-log-project">{log.projectName || "—"}</div>
                    <div className="sed-log-tasks">
                      {(log.workDone||[]).filter(w=>w.task).length} tasks logged
                    </div>
                    {sc && (
                      <span className="sed-log-status" style={{ background: sc.badge, color: sc.text }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:sc.dot, display:"inline-block", marginRight:4 }}/>
                        {sc.label}
                      </span>
                    )}
                    {log.approved && <div className="sed-log-approved">✓ Approved</div>}
                  </div>
                ) : !isFuture ? (
                  <div className="sed-log-empty">No log filed</div>
                ) : null}

                {/* Actions */}
                <div className="sed-day-actions">
                  {log ? (
                    <button className="sed-btn-view" onClick={() => openView(log)}>View Log →</button>
                  ) : !isFuture ? (
                    <button className="sed-btn-log" onClick={() => openForm(date)}>
                      + File Log
                    </button>
                  ) : isToday ? (
                    <button className="sed-btn-log" onClick={() => openForm(date)}>
                      + File Log
                    </button>
                  ) : null}
                  {log && !log.approved && (
                    <button className="sed-btn-edit" onClick={() => openForm(date)}>Edit</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent logs */}
        {logs.length > 0 && (
          <div className="sed-recent">
            <div className="sed-section-hdr">
              <div className="sed-section-title">All Logs</div>
              <button className="sed-btn-new" onClick={() => openForm(today())}>+ New Log</button>
            </div>
            <div className="sed-log-list">
              {logs.slice().reverse().map(log => {
                const sc = STATUS_COLORS[log.overallStatus] || STATUS_COLORS["on-track"];
                return (
                  <div key={log.id} className="sed-log-row" onClick={() => openView(log)}>
                    <div className="sed-lr-date">
                      <div className="sed-lr-day">{new Date(log.date).toLocaleDateString("en-IN", { weekday:"short" })}</div>
                      <div className="sed-lr-num">{new Date(log.date).getDate()}</div>
                      <div className="sed-lr-mon">{new Date(log.date).toLocaleDateString("en-IN", { month:"short" })}</div>
                    </div>
                    <div className="sed-lr-body">
                      <div className="sed-lr-project">{log.projectName || "Untitled"}</div>
                      <div className="sed-lr-meta">
                        {log.checkIn && <span>🟢 {log.checkIn}</span>}
                        {log.checkOut && <span>🔴 {log.checkOut}</span>}
                        {(log.workDone||[]).filter(w=>w.task).length > 0 &&
                          <span>📋 {(log.workDone||[]).filter(w=>w.task).length} tasks</span>}
                      </div>
                    </div>
                    <div className="sed-lr-right">
                      <span className="sed-log-status" style={{ background:sc.badge, color:sc.text }}>
                        <span style={{ width:5,height:5,borderRadius:"50%",background:sc.dot,display:"inline-block",marginRight:3 }}/>
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

  // ════════════════════════════════════
  //  FORM VIEW
  // ════════════════════════════════════
  if (view === "form") {
    return (
      <div className="sed-form-page">
        {toast && <div className={`sed-toast sed-toast--${toast.type}`}>{toast.msg}</div>}

        <div className="sed-form-bar">
          <button className="sed-back-btn" onClick={() => setView("week")}>← Back</button>
          <div className="sed-form-bar-title">Daily Field Log — {form.date}</div>
          <div className="sed-form-bar-actions">
            <button className="sed-cancel-btn" onClick={() => setView("week")}>Cancel</button>
            <button className="sed-save-btn" onClick={handleSave}>Save Log</button>
          </div>
        </div>

        <div className="sed-form-body">

          {/* ── Section 1: Attendance & Meta ── */}
          <div className="sed-card">
            <div className="sed-card-title">🕐 Attendance & Site Details</div>
            <div className="sed-two-col-3">
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
              <div className="sed-field">
                <label className="sed-lbl">Project Name *</label>
                <input className="sed-inp" placeholder="Greenfield Tower Block A" value={form.projectName}
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
                <select className="sed-inp" value={form.overallStatus}
                  onChange={e => setField("overallStatus", e.target.value)}>
                  <option value="on-track">On Track</option>
                  <option value="delayed">Delayed</option>
                  <option value="critical">Critical</option>
                  <option value="ahead">Ahead</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Section 2: Morning Briefing ── */}
          <div className="sed-card">
            <div className="sed-card-title">☀️ Morning Briefing / Plan</div>
            <div className="sed-field">
              <label className="sed-lbl">What was planned for today?</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Column pour at Grid C3–D4, Rebar inspection at Level 3, Concrete cube sampling..."
                value={form.morningBriefing}
                onChange={e => setField("morningBriefing", e.target.value)} />
            </div>
          </div>

          {/* ── Section 3: Work Done ── */}
          <div className="sed-card">
            <div className="sed-card-title">🏗 Work Completed Today</div>
            <div className="sed-table-head">
              {["Task / Activity","Qty","Unit","Status","Remark",""].map((c,i)=>
                <div key={i} className="sed-th">{c}</div>)}
            </div>
            {form.workDone.map((row, i) => (
              <div key={i} className="sed-table-row">
                <input className="sed-inp sed-td-3" placeholder="Column casting at C3..." value={row.task}
                  onChange={e => setRow("workDone", i, "task", e.target.value)} />
                <input className="sed-inp sed-td-1" placeholder="6" value={row.qty}
                  onChange={e => setRow("workDone", i, "qty", e.target.value)} />
                <input className="sed-inp sed-td-1" placeholder="Nos" value={row.unit}
                  onChange={e => setRow("workDone", i, "unit", e.target.value)} />
                <select className="sed-inp sed-td-2" value={row.status}
                  onChange={e => setRow("workDone", i, "status", e.target.value)}>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="deferred">Deferred</option>
                </select>
                <input className="sed-inp sed-td-2" placeholder="Notes..." value={row.remark}
                  onChange={e => setRow("workDone", i, "remark", e.target.value)} />
                <button className="sed-rm-btn" onClick={() => removeRow("workDone", i)}>✕</button>
              </div>
            ))}
            <button className="sed-add-btn"
              onClick={() => addRow("workDone", { task:"", qty:"", unit:"", status:"completed", remark:"" })}>
              + Add Task
            </button>
          </div>

          {/* ── Section 4: Issues ── */}
          <div className="sed-card">
            <div className="sed-card-title">⚠️ Issues / Problems Faced</div>
            {form.issues.map((row, i) => (
              <div key={i} className="sed-issue-block">
                <div className="sed-issue-header">
                  <span className="sed-issue-num">#{i+1}</span>
                  <select className={`sed-priority sed-priority--${row.priority}`} value={row.priority}
                    onChange={e => setRow("issues", i, "priority", e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button className="sed-rm-btn" onClick={() => removeRow("issues", i)}>✕</button>
                </div>
                <div className="sed-two-col">
                  <div className="sed-field">
                    <label className="sed-lbl">Issue</label>
                    <input className="sed-inp" placeholder="Describe the issue..." value={row.issue}
                      onChange={e => setRow("issues", i, "issue", e.target.value)} />
                  </div>
                  <div className="sed-field">
                    <label className="sed-lbl">Action Taken</label>
                    <input className="sed-inp" placeholder="Corrective action..." value={row.action}
                      onChange={e => setRow("issues", i, "action", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="sed-add-btn"
              onClick={() => addRow("issues", { issue:"", action:"", priority:"medium" })}>
              + Add Issue
            </button>
          </div>

          {/* ── Section 5: Safety ── */}
          <div className="sed-card">
            <div className="sed-card-title">🦺 Safety Observations</div>
            <div className="sed-field">
              <label className="sed-lbl">Safety notes (one per line)</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Toolbox talk conducted at 8 AM&#10;All workers wearing PPE&#10;Edge protection checked at slab perimeter"
                value={form.safetyPoints}
                onChange={e => setField("safetyPoints", e.target.value)} />
            </div>
          </div>

          {/* ── Section 6: Tomorrow ── */}
          <div className="sed-card">
            <div className="sed-card-title">📅 Tomorrow's Plan</div>
            <div className="sed-field">
              <label className="sed-lbl">What is planned for tomorrow?</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Continue column pour at Grid D4, Rebar check at Level 4 slab, Coordinate with QC for cube testing..."
                value={form.tomorrowPlan}
                onChange={e => setField("tomorrowPlan", e.target.value)} />
            </div>
          </div>

          {/* ── Section 7: SE Remarks & Submit ── */}
          <div className="sed-card">
            <div className="sed-card-title">📝 Remarks & Submission</div>
            <div className="sed-field">
              <label className="sed-lbl">SE Remarks</label>
              <textarea className="sed-inp sed-ta" rows={3}
                placeholder="Overall observations, coordination notes, consultant queries..."
                value={form.seRemarks}
                onChange={e => setField("seRemarks", e.target.value)} />
            </div>
            <div className="sed-two-col" style={{ marginTop: 14 }}>
              <div className="sed-field">
                <label className="sed-lbl">Submitted By</label>
                <input className="sed-inp" placeholder="Ravi Kumar, SE" value={form.submittedBy || ""}
                  onChange={e => setField("submittedBy", e.target.value)} />
              </div>
              <div className="sed-field">
                <label className="sed-lbl">Site Photos (names)</label>
                <label className="sed-upload-box">
                  📷 Upload Photos
                  <input type="file" multiple accept="image/*" style={{ display:"none" }}
                    onChange={e => setField("photoNames", Array.from(e.target.files).map(f=>f.name))} />
                </label>
                {form.photoNames?.length > 0 &&
                  <div className="sed-file-list">{form.photoNames.map((n,i)=><span key={i}>📄 {n}</span>)}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sed-sticky-footer">
          <span className="sed-footer-label">
            {form.projectName ? `📐 ${form.projectName}` : "New SE Log"} · {form.date || "No date"}
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <button className="sed-cancel-btn" onClick={() => setView("week")}>Cancel</button>
            <button className="sed-save-btn" onClick={handleSave}>Save Log</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  //  VIEW LOG
  // ════════════════════════════════════
  if (view === "view" && selected) {
    const r = selected;
    const sc = STATUS_COLORS[r.overallStatus] || STATUS_COLORS["on-track"];
    return (
      <div className="sed-form-page">
        {toast && <div className={`sed-toast sed-toast--${toast.type}`}>{toast.msg}</div>}

        <div className="sed-form-bar">
          <button className="sed-back-btn" onClick={() => setView("week")}>← Back</button>
          <div className="sed-form-bar-title">Field Log — {r.date}</div>
          <div className="sed-form-bar-actions">
            <button className="sed-cancel-btn" onClick={() => { setForm({...EMPTY_LOG,...r}); setView("form"); }}>✏ Edit</button>
            {r.approved
              ? <span className="sed-approved-big">✓ Approved</span>
              : <button className="sed-save-btn" onClick={async () => {
                  try { await API.put(`/se-daily-reports/approve/${r.id}`); showToast("Approved!"); loadData(); setView("week"); }
                  catch { showToast("Failed","error"); }
                }}>✓ Approve</button>}
          </div>
        </div>

        <div className="sed-view-body">

          {/* Header card */}
          <div className="sed-view-hero">
            <div>
              <div className="sed-view-project">{r.projectName || "Untitled"}</div>
              <div className="sed-view-meta">
                {new Date(r.date).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                {r.location && <span> · 📍 {r.location}</span>}
                {r.weather && <span> · 🌤 {r.weather}{r.weatherTemp ? ` ${r.weatherTemp}°C`:""}</span>}
              </div>
              <div className="sed-view-times">
                {r.checkIn  && <span className="sed-time-chip sed-time-chip--in">🟢 In: {r.checkIn}</span>}
                {r.checkOut && <span className="sed-time-chip sed-time-chip--out">🔴 Out: {r.checkOut}</span>}
              </div>
            </div>
            <div className="sed-view-status-wrap">
              <span className="sed-log-status" style={{ background:sc.badge, color:sc.text, fontSize:13, padding:"6px 14px" }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:sc.dot,display:"inline-block",marginRight:6 }}/>
                {sc.label}
              </span>
            </div>
          </div>

          {/* Morning plan */}
          {r.morningBriefing && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">☀️ Morning Plan</div>
              <div className="sed-vcard-text">{r.morningBriefing}</div>
            </div>
          )}

          {/* Work done */}
          <div className="sed-vcard">
            <div className="sed-vcard-title">🏗 Work Completed</div>
            {(r.workDone||[]).filter(w=>w.task).length === 0
              ? <div className="sed-vnil">No tasks logged</div>
              : (r.workDone||[]).filter(w=>w.task).map((w,i) => (
                <div key={i} className="sed-vrow">
                  <span className="sed-vrow-main">{w.task}</span>
                  {w.qty && <span className="sed-vrow-meta">{w.qty} {w.unit}</span>}
                  <span className="sed-spill" data-status={w.status}>{w.status}</span>
                  {w.remark && <span className="sed-vrow-remark">{w.remark}</span>}
                </div>
              ))}
          </div>

          {/* Issues */}
          <div className="sed-vcard">
            <div className="sed-vcard-title">⚠️ Issues</div>
            {(r.issues||[]).filter(i=>i.issue).length === 0
              ? <div className="sed-vnil">No issues raised ✓</div>
              : (r.issues||[]).filter(i=>i.issue).map((iss, i) => (
                <div key={i} className="sed-issue-view">
                  <div className="sed-issue-view-top">
                    <span className={`sed-priority-badge sed-priority-badge--${iss.priority}`}>{iss.priority}</span>
                    <span className="sed-issue-text">{iss.issue}</span>
                  </div>
                  {iss.action && <div className="sed-issue-action">→ {iss.action}</div>}
                </div>
              ))}
          </div>

          {/* Safety */}
          {r.safetyPoints && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">🦺 Safety Observations</div>
              {r.safetyPoints.split("\n").filter(Boolean).map((l,i)=>
                <div key={i} className="sed-safety-line">{l}</div>)}
            </div>
          )}

          {/* Tomorrow */}
          {r.tomorrowPlan && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">📅 Tomorrow's Plan</div>
              <div className="sed-vcard-text">{r.tomorrowPlan}</div>
            </div>
          )}

          {/* Remarks */}
          {r.seRemarks && (
            <div className="sed-vcard">
              <div className="sed-vcard-title">📝 SE Remarks</div>
              <div className="sed-vcard-text">{r.seRemarks}</div>
            </div>
          )}

          <div className="sed-vfooter">
            Submitted by: <strong>{r.submittedBy || "Structural Engineer"}</strong>
            <div className="sed-vfooter-dist">Distribution: Project Manager · Consultant · QC Team</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}