import React, { useState, useEffect } from "react";
import { createUpdate, getUpdates, updateUpdate } 
from "../../services/pcDailyUpdateService";
import { getProjects } from "../../services/projectService"; // ✅ ADD HERE
import "./DailyUpdates.css";

const today    = new Date();
const todayStr = today.toISOString().split("T")[0];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayDay  = DAY_NAMES[today.getDay()];

const SEVERITY_OPTIONS = [
  { value: "none",     label: "None",     color: "#10b981", bg: "#d1fae5" },
  { value: "minor",    label: "Minor",    color: "#f59e0b", bg: "#fff3cd" },
  { value: "moderate", label: "Moderate", color: "#ef8c1a", bg: "#ffe4b5" },
  { value: "critical", label: "Critical", color: "#ef4444", bg: "#fee2e2" },
];

const TASK_STATUS_OPTIONS = [
  { value: "completed",   label: "Completed",   color: "#10b981", bg: "#d1fae5", icon: "✓" },
  { value: "in-progress", label: "In Progress", color: "#2563eb", bg: "#dbeafe", icon: "⟳" },
  { value: "delayed",     label: "Delayed",     color: "#ef4444", bg: "#fee2e2", icon: "!" },
  { value: "on-hold",     label: "On Hold",     color: "#f59e0b", bg: "#fff3cd", icon: "⏸" },
];

const MEETING_TYPES = ["Client", "Architect", "Contractor", "Consultant", "Internal", "Vendor"];

const EMPTY_FORM = {
  projectId:       "",
  work:            "",
  progress:        "",
  milestoneStatus: "in-progress",   // on-track | delayed | completed
  taskUpdates:     [],               // [{ task, status, note }]
  issues:          "",
  severity:        "none",
  delayHours:      "",
  delayImpact:     "",
  meetings:        [],               // [{ type, with, decision }]
  coordNotes:      "",               // general coordination notes
  pending:         "",
  approvalFrom:    "",               // PM | Client | Consultant
  next:            "",
  safety:          "",
  alerts:          "",
};

const STATUS_CFG = {
  approved: { label: "Approved",       bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  pending:  { label: "Pending Review", bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  rejected: { label: "Rejected",       bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

/* ── small layout helpers ── */
const Section = ({ number, title, color = "#2563eb", badge, children }) => (
  <div className="du-section">
    <div className="du-section__head" style={{ borderLeftColor: color }}>
      <span className="du-section__num" style={{ color }}>{number}</span>
      <h3 className="du-section__title">{title}</h3>
      {badge && <span className="du-section__badge" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>}
    </div>
    <div className="du-section__body">{children}</div>
  </div>
);

const FieldRow = ({ children, cols = 2 }) => (
  <div className="du-field-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{children}</div>
);

const Field = ({ label, required, hint, children }) => (
  <div className="du-field">
    <label className="du-label">
      {label}{required && <span className="du-required"> *</span>}
    </label>
    {hint && <p className="du-field-hint">{hint}</p>}
    {children}
  </div>
);

const DetailBlock = ({ label, val }) => (
  <div className="du-detail-block">
    <p className="du-detail-label">{label}</p>
    <p className="du-detail-val">{val || "—"}</p>
  </div>
);

/* ─────────────────────────────────────────
   TASK UPDATE ROW  (add/remove inline)
───────────────────────────────────────── */
const TaskUpdateRow = ({ item, onChange, onRemove }) => (
  <div className="du-task-row">
    <input className="du-input du-input--flex" placeholder="Task / Milestone name"
      value={item.task} onChange={e => onChange({ ...item, task: e.target.value })} />
    <select className="du-select" value={item.status}
      onChange={e => onChange({ ...item, status: e.target.value })}>
      {TASK_STATUS_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <input className="du-input du-input--flex" placeholder="Short note (optional)"
      value={item.note} onChange={e => onChange({ ...item, note: e.target.value })} />
    <button className="du-row-del" onClick={onRemove} title="Remove">✕</button>
  </div>
);

/* ─────────────────────────────────────────
   MEETING ROW
───────────────────────────────────────── */
const MeetingRow = ({ item, onChange, onRemove }) => (
  <div className="du-meeting-row">
    <select className="du-select du-select--sm" value={item.type}
      onChange={e => onChange({ ...item, type: e.target.value })}>
      {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
    <input className="du-input du-input--flex" placeholder="With whom (name / company)"
      value={item.with} onChange={e => onChange({ ...item, with: e.target.value })} />
    <input className="du-input du-input--flex" placeholder="Decision / outcome"
      value={item.decision} onChange={e => onChange({ ...item, decision: e.target.value })} />
    <button className="du-row-del" onClick={onRemove} title="Remove">✕</button>
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function DailyUpdates() {

  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [projects, setProjects] = useState([]); // ✅ CORRECT PLACE

  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpanded] = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
    // ✅ LOAD PROJECTS ON PAGE LOAD
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
  if (form.projectId) {
    fetchLogs(form.projectId);
  }
}, [form.projectId]);

const fetchLogs = async (projectId) => {
  try {
    const res = await getUpdates(projectId);

    console.log("API RESPONSE:", res.data); // 👈 keep this

    const mapped = res.data.map(log => ({
      ...log,
      taskUpdates: log.task_updates ? JSON.parse(log.task_updates) : [],
      meetings: log.meetings ? JSON.parse(log.meetings) : [],
      delayHours: log.delay_hours,
      delayImpact: log.delay_impact,
    }));

    setLogs(mapped);

  } catch (err) {
    console.error("FETCH LOGS ERROR:", err);
  }
};

// ✅ FETCH DAILY UPDATES (VERY IMPORTANT)
const fetchProjects = async () => {
  try {
    const res = await getProjects();

    const projectList = res.data; // adjust if needed

    console.log("PROJECT API:", projectList);

    setProjects(projectList);

   if (projectList.length > 0) {
    const firstProject = projectList[0];

    setForm(prev => ({
      ...prev,
      projectId: firstProject.id
    }));
  }

  } catch (err) {
    console.error("PROJECT FETCH ERROR:", err);
  }
};

  const todayLog = logs.find(
  l =>
    new Date(l.date).toISOString().split("T")[0] === todayStr &&
    Number(l.project_id) === Number(form.projectId)
);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── task update helpers ── */
  const addTaskRow    = () => set("taskUpdates", [...form.taskUpdates, { task: "", status: "in-progress", note: "" }]);
  const updateTaskRow = (i, val) => set("taskUpdates", form.taskUpdates.map((r, idx) => idx === i ? val : r));
  const removeTaskRow = (i) => set("taskUpdates", form.taskUpdates.filter((_, idx) => idx !== i));

  /* ── meeting helpers ── */
  const addMeeting    = () => set("meetings", [...form.meetings, { type: "Client", with: "", decision: "" }]);
  const updateMeeting = (i, val) => set("meetings", form.meetings.map((r, idx) => idx === i ? val : r));
  const removeMeeting = (i) => set("meetings", form.meetings.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.projectId) { showToast("error", "Please select a project."); return; }
    if (!form.work.trim()) { showToast("error", "Please fill in Work Progress Summary."); return; }
    if (!form.progress)    { showToast("error", "Please enter today's progress %."); return; }

    setSubmit(true);
    try {
      const payload = {
  ...form,
  project_id: Number(form.projectId),
  coordinator_id: 101,
  date: todayStr,
  day: todayDay,

  task_updates: JSON.stringify(form.taskUpdates),
  meetings: JSON.stringify(form.meetings),

  coord_notes: form.coordNotes,
  milestone_status: form.milestoneStatus,
  alerts: form.alerts,
  approval_from: form.approvalFrom,
};

      if (editId) {
      const res = await updateUpdate(editId, payload);
      await fetchLogs(form.projectId); // ✅ ADD THIS
      setEditId(null);
      showToast("success", "Updated & re-submitted to Project Manager.");
    } else {
      await createUpdate(payload);
      await fetchLogs(form.projectId); // ✅ ADD THIS
      showToast("success", "Daily update submitted to Project Manager.");
    }

      setForm(prev => ({
      ...EMPTY_FORM,
      projectId: prev.projectId // keep selected project
    }));
      setActiveTab("history");
    } catch (err) {
      console.error(err);
      showToast("error", "Server error — please try again.");
    }
    setSubmit(false);
  };

  const mapLog = (d) => ({
    ...d,
    taskUpdates: d.task_updates  ? JSON.parse(d.task_updates)  : [],
    meetings:    d.meetings      ? JSON.parse(d.meetings)       : [],
    delayHours:  d.delay_hours,
    delayImpact: d.delay_impact,
  });

  const handleEdit = (log) => {
    setEditId(log.id);
    setForm({
      projectId:       log.project_id    || "",
      work:            log.work          || "",
      progress:        log.progress      || "",
      milestoneStatus: log.milestone_status || "in-progress",
      taskUpdates:     log.taskUpdates   || [],
      issues:          log.issues        || "",
      severity:        log.severity      || "none",
      delayHours:      log.delayHours    || log.delay_hours  || "",
      delayImpact:     log.delayImpact   || log.delay_impact || "",
      meetings:        log.meetings      || [],
      coordNotes:      log.coord_notes   || log.coordNotes   || "",
      pending:         log.pending       || "",
      approvalFrom:    log.approval_from || log.approvalFrom || "",
      next:            log.next          || "",
      safety:          log.safety        || "",
      alerts:          log.alerts        || "",
    });
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setForm({ ...EMPTY_FORM }); };

  const selectedProject = projects.find(p => p.id === Number(form.projectId));

  return (
    <div className="du-page">

      {/* TOAST */}
      {toast && (
        <div className={`du-toast du-toast--${toast.type}`}>
          <span className="du-toast__msg">{toast.msg}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* HEADER */}
      <div className="du-header">
        <div>
          <h1 className="du-title">Daily Updates</h1>
          <p className="du-subtitle">Project Coordinator Report</p>
        </div>
        <div className="du-date-badge">
          <span className="du-date-badge__day">{todayDay}</span>
          <span className="du-date-badge__date">
            {today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* TABS */}
      <div className="du-tabs">
        <button className={`du-tab ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}>
          {editId ? "✏ Edit Update" : "+ New Update"}
        </button>
        <button className={`du-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}>
          Weekly History
          <span className="du-tab__badge">{logs.length}</span>
        </button>
      </div>

      {/* ════════════════════════
          FORM TAB
          ════════════════════════ */}
      {activeTab === "form" && (
        <div className="du-form-card">
          <div className="du-form-card__header">
            <div>
              <h2 className="du-form-card__title">
                {editId ? "Edit Submitted Update" : "Today's Coordinator Update"}
              </h2>
              <p className="du-form-card__sub">
                {editId
                  ? "Editing your update — it will be re-sent to the Project Manager for review."
                  : "Report project status, coordination activities, and key decisions to your Project Manager."}
              </p>
            </div>
            {editId && <button className="du-btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>

          {/* already submitted banner */}
          {todayLog && !editId && (
            <div className="du-banner-info">
              <span>
                Today's update for <strong>{selectedProject?.name}</strong> has been submitted.
              </span>

              <button className="du-link" onClick={() => handleEdit(todayLog)}>
                Edit it
              </button>

              <span
                className="du-banner-status"
                style={{
                  background: STATUS_CFG[todayLog.status]?.bg,
                  color: STATUS_CFG[todayLog.status]?.color,
                  border: `1px solid ${STATUS_CFG[todayLog.status]?.border}`,
                }}
              >
                {STATUS_CFG[todayLog.status]?.label}
              </span>
            </div>
          )}

          <>

            {/* ═══════════════════════════════════════
                PROJECT SELECTOR  (top of form)
                ═══════════════════════════════════════ */}
            <div className="du-project-selector">
              <div className="du-project-selector__label">
                <span>Select Project for this Update</span>
                <span className="du-required"> *</span>
              </div>
              <select
              className="du-select du-project-select"
              value={form.projectId}
              onChange={e => {
              const id = e.target.value;

              setForm(prev => ({
                ...EMPTY_FORM,
                projectId: id
              }));

              if (id) fetchLogs(id);
            }}
            >
              <option value="">— Choose a project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            </div>

            {/* ═══════════════════════════════════════
                01 — WORK PROGRESS SUMMARY
                ═══════════════════════════════════════ */}
            <Section number="01" title="Work Progress Summary" color="#2563eb">
              <Field label="What was accomplished on site today?" required
                hint="High-level summary — what milestones or tasks moved forward?">
                <textarea className="du-textarea" rows={3}
                  placeholder="e.g. Foundation work for Block A completed. Structural frame columns at 60% for Block B."
                  value={form.work} onChange={e => set("work", e.target.value)} />
              </Field>
            </Section>

            {/* ═══════════════════════════════════════
                02 — PROGRESS STATUS
                ═══════════════════════════════════════ */}
            <Section number="02" title="Progress Status" color="#2563eb">
              <FieldRow cols={2}>
                <Field label="Overall project progress (%)" required>
                  <div className="du-progress-input-wrap">
                    <input className="du-input du-input--short" type="number" min="0" max="100"
                      placeholder="0–100"
                      value={form.progress} onChange={e => set("progress", e.target.value)} />
                    <div className="du-progress-bar-preview">
                      <div className="du-progress-bar-fill"
                        style={{ width: `${Math.min(form.progress || 0, 100)}%` }} />
                    </div>
                    <span className="du-progress-pct">{form.progress || 0}%</span>
                  </div>
                </Field>
                <Field label="Overall milestone status">
                  <div className="du-milestone-status-row">
                    {[
                      { val: "on-track",  label: "On Track",  color: "#10b981", bg: "#d1fae5" },
                      { val: "delayed",   label: "Delayed",   color: "#ef4444", bg: "#fee2e2" },
                      { val: "completed", label: "Completed", color: "#2563eb", bg: "#dbeafe" },
                    ].map(s => (
                      <button key={s.val}
                        className={`du-ms-btn ${form.milestoneStatus === s.val ? "active" : ""}`}
                        style={form.milestoneStatus === s.val
                          ? { background: s.bg, border: `2px solid ${s.color}`, color: s.color }
                          : {}}
                        onClick={() => set("milestoneStatus", s.val)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </FieldRow>
            </Section>

            {/* ═══════════════════════════════════════
                03 — TASK / MILESTONE TRACKING
                ═══════════════════════════════════════ */}
            <Section number="03" title="Task / Milestone Tracking" color="#7c3aed">
              <p className="du-section-desc">
                Log the status of each task or milestone you tracked today.
              </p>

              {form.taskUpdates.length > 0 && (
                <div className="du-task-table">
                  <div className="du-task-table__head">
                    <span>Task / Milestone</span>
                    <span>Status</span>
                    <span>Note</span>
                    <span></span>
                  </div>
                  {form.taskUpdates.map((item, i) => (
                    <TaskUpdateRow key={i} item={item}
                      onChange={val => updateTaskRow(i, val)}
                      onRemove={() => removeTaskRow(i)} />
                  ))}
                </div>
              )}

              <button className="du-add-row-btn" onClick={addTaskRow}>
                + Add Task / Milestone
              </button>
            </Section>

            {/* ═══════════════════════════════════════
                04 — ISSUES & RISKS
                ═══════════════════════════════════════ */}
            <Section number="04" title="Issues & Risks" color="#f59e0b">
              <Field label="Issue Severity">
                <div className="du-severity-row">
                  {SEVERITY_OPTIONS.map(s => (
                    <button key={s.value}
                      className={`du-severity-btn ${form.severity === s.value ? "active" : ""}`}
                      style={form.severity === s.value
                        ? { background: s.bg, border: `2px solid ${s.color}`, color: s.color }
                        : {}}
                      onClick={() => set("severity", s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Issues / Risks Identified"
                hint="Design delays, vendor issues, client changes, site access problems, etc.">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. Architect delayed design revision. Vendor not delivering steel on time. Or: None"
                  value={form.issues} onChange={e => set("issues", e.target.value)} />
              </Field>
              {form.severity !== "none" && (
                <FieldRow cols={2}>
                  <Field label="Delay (Hours)">
                    <input className="du-input" type="number" placeholder="e.g. 4"
                      value={form.delayHours} onChange={e => set("delayHours", e.target.value)} />
                  </Field>
                  <Field label="Impact of Delay">
                    <input className="du-input" placeholder="e.g. Block B handover postponed by 2 days"
                      value={form.delayImpact} onChange={e => set("delayImpact", e.target.value)} />
                  </Field>
                </FieldRow>
              )}
            </Section>

            {/* ═══════════════════════════════════════
                05 — COORDINATION UPDATES  (new)
                ═══════════════════════════════════════ */}
            <Section number="05" title="Coordination Updates" color="#0891b2">
              <p className="du-section-desc">
                Record meetings conducted, decisions taken, and key communications made today.
              </p>

              {form.meetings.length > 0 && (
                <div className="du-task-table du-task-table--meetings">
                  <div className="du-task-table__head du-task-table__head--meetings">
                    <span>Meeting Type</span>
                    <span>With</span>
                    <span>Decision / Outcome</span>
                    <span></span>
                  </div>
                  {form.meetings.map((item, i) => (
                    <MeetingRow key={i} item={item}
                      onChange={val => updateMeeting(i, val)}
                      onRemove={() => removeMeeting(i)} />
                  ))}
                </div>
              )}

              <button className="du-add-row-btn du-add-row-btn--teal" onClick={addMeeting}>
                + Add Meeting / Communication
              </button>

              <div style={{ marginTop: 14 }}>
                <Field label="Other Coordination Notes"
                  hint="Any coordination activity not covered above">
                  <textarea className="du-textarea" rows={2}
                    placeholder="e.g. Sent updated schedule to client. Followed up with consultant on structural drawings. Or: None"
                    value={form.coordNotes} onChange={e => set("coordNotes", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* ═══════════════════════════════════════
                06 — PENDING APPROVALS / DEPENDENCIES
                ═══════════════════════════════════════ */}
            <Section number="06" title="Pending Approvals & Dependencies" color="#dc2626">
              <div className="du-approvals-row">
                <div className="du-field du-field--no-mb">
                  <label className="du-label">Approval / Action Awaited From <span className="du-field-hint-inline">— Who is blocking progress?</span></label>
                  <select className="du-select" value={form.approvalFrom}
                    onChange={e => set("approvalFrom", e.target.value)}>
                    <option value="">— Select —</option>
                    {["Project Manager","Client","Consultant","Architect","Contractor","Government"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="du-field du-field--no-mb">
                  <label className="du-label">What is pending / blocking?</label>
                  <input className="du-input" placeholder="e.g. Approval for Block C excavation start"
                    value={form.pending} onChange={e => set("pending", e.target.value)} />
                </div>
              </div>
            </Section>

            {/* ═══════════════════════════════════════
                07 — TOMORROW'S PLAN
                ═══════════════════════════════════════ */}
            <Section number="07" title="Tomorrow's Plan" color="#6366f1">
              <Field label="What is planned for tomorrow?">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. Follow up with architect on structural drawings. Site visit to Block B. Meeting with client at 11am."
                  value={form.next} onChange={e => set("next", e.target.value)} />
              </Field>
            </Section>

            {/* ═══════════════════════════════════════
                08 — SAFETY OBSERVATIONS
                ═══════════════════════════════════════ */}
            <Section number="08" title="Safety Observations" color="#16a34a">
              <Field label="Safety status observed on site today">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. All workers in PPE. No incidents. Or: Workers in Block B not wearing helmets — flagged to site engineer."
                  value={form.safety} onChange={e => set("safety", e.target.value)} />
              </Field>
            </Section>

            {/* ═══════════════════════════════════════
                09 — KEY ALERTS FOR PM
                ═══════════════════════════════════════ */}
            <Section number="09" title="Key Alerts for Project Manager" color="#ef4444"
              badge={{ text: "Urgent", bg: "#fee2e2", color: "#dc2626" }}>
              <Field label="Critical items the PM must know immediately"
                hint="Leave blank if nothing critical today">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. Client threatening to stop payments. Design change will delay handover by 2 weeks. Or: None"
                  value={form.alerts} onChange={e => set("alerts", e.target.value)} />
              </Field>
            </Section>

            {/* FOOTER */}
            <div className="du-form-footer">
              <div className="du-form-footer__project">
                {selectedProject
                  ? <><span className="du-form-footer__proj-label">Submitting for</span> <strong>{selectedProject.name}</strong></>
                  : <span className="du-form-footer__proj-warn">⚠ No project selected</span>
                }
              </div>
              <p className="du-form-footer__note">
                This update will be sent to <strong>Project Manager</strong> for review.
              </p>
              <button
                className={`du-btn-submit ${submitting ? "loading" : ""}`}
                onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><span className="du-spinner" /> Submitting...</>
                  : editId ? "Re-submit to Project Manager" : "Submit to Project Manager"}
              </button>
            </div>

          </>
        </div>
      )}

      {/* ════════════════════════
          HISTORY TAB
          ════════════════════════ */}
      {activeTab === "history" && (
        <div className="du-history">
          <div className="du-history__head">
            <h2 className="du-history__title">This Week's Updates</h2>
            <span className="du-log-count">{logs.length} entries</span>
          </div>

          {logs.length === 0 && (
            <div className="du-empty">
              <p>No updates submitted this week yet.</p>
            </div>
          )}

          <div className="du-log-list">
            {logs.map(log => {
              const sc     = STATUS_CFG[log.status] || STATUS_CFG.pending;
              const isOpen = expandedId === log.id;
              const sev    = SEVERITY_OPTIONS.find(s => s.value === log.severity);
              const proj = projects.find(p => p.id === Number(log.project_id));

              return (
                <div key={log.id} className={`du-log-item ${isOpen ? "open" : ""}`}>

                  <div className="du-log-item__header"
                    onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <div className="du-log-item__left">
                      <div className="du-log-item__dot" style={{ background: sc.border }} />
                      <div>
                        <div className="du-log-item__top-row">
                          <p className="du-log-item__day">
                            {log.day}
                            <span className="du-log-item__date">
                              {" · "}{new Date(log.date).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          </p>
                          {proj && (
                            <span className="du-log-proj-tag">{proj.name}</span>
                          )}
                        </div>
                        <p className="du-log-item__preview">
                          {log.work?.length > 80 ? log.work.slice(0, 80) + "…" : log.work}
                        </p>
                      </div>
                    </div>
                    <div className="du-log-item__right">
                      {sev && sev.value !== "none" && (
                        <span className="du-sev-chip"
                          style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}` }}>
                          {sev.label}
                        </span>
                      )}
                      <span className="du-status-pill"
                        style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                      <span className="du-chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="du-log-item__body">

                      {/* main detail grid */}
                      <div className="du-log-grid">
                        <DetailBlock label="Work Summary"      val={log.work} />
                        <DetailBlock label="Progress"          val={log.progress ? `${log.progress}%` : "—"} />
                        <DetailBlock label="Milestone Status"  val={log.milestone_status || "—"} />
                        <DetailBlock label="Issues"            val={log.issues} />
                        {log.severity !== "none" && <>
                          <DetailBlock label="Delay"           val={log.delayHours ? `${log.delayHours} hrs` : "—"} />
                          <DetailBlock label="Impact"          val={log.delayImpact} />
                        </>}
                        <DetailBlock label="Pending / Blocking" val={log.pending} />
                        <DetailBlock label="Approval From"     val={log.approval_from} />
                        <DetailBlock label="Tomorrow's Plan"   val={log.next} />
                        <DetailBlock label="Safety"            val={log.safety} />
                        {log.alerts && <DetailBlock label="⚠ Key Alert" val={log.alerts} />}
                        {log.coord_notes && <DetailBlock label="Coord Notes" val={log.coord_notes} />}
                      </div>

                      {/* task updates */}
                      {log.taskUpdates?.length > 0 && (
                        <div className="du-log-section">
                          <p className="du-log-section__title">Task / Milestone Updates</p>
                          <div className="du-log-task-list">
                            {log.taskUpdates.map((t, i) => {
                              const cfg = TASK_STATUS_OPTIONS.find(o => o.value === t.status);
                              return (
                                <div key={i} className="du-log-task-row">
                                  <span className="du-log-task-status"
                                    style={{ background: cfg?.bg, color: cfg?.color, borderColor: cfg?.color }}>
                                    {cfg?.icon} {cfg?.label}
                                  </span>
                                  <span className="du-log-task-name">{t.task}</span>
                                  {t.note && <span className="du-log-task-note">{t.note}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* meetings */}
                      {log.meetings?.length > 0 && (
                        <div className="du-log-section">
                          <p className="du-log-section__title">Meetings & Coordination</p>
                          <div className="du-log-task-list">
                            {log.meetings.map((m, i) => (
                              <div key={i} className="du-log-task-row">
                                <span className="du-log-meeting-type">{m.type}</span>
                                <span className="du-log-task-name">{m.with}</span>
                                {m.decision && <span className="du-log-task-note">{m.decision}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="du-log-item__actions">
                        <span className="du-log-time">
                          Submitted at {new Date(`1970-01-01T${log.submitted_at}`).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {log.status !== "approved" && (
                            <button className="du-btn-edit" onClick={() => handleEdit(log)}>
                              Edit & Resubmit
                            </button>
                          )}
                          {log.status === "approved" && (
                            <span className="du-approved-tag">✓ Approved by PM</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}