import { createUpdate, getUpdates, updateUpdate } 
from "../../services/pcDailyUpdateService";
import React, { useState, useEffect } from "react";
import "./DailyUpdates.css";

const today     = new Date();
const todayStr  = today.toISOString().split("T")[0];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayDay  = DAY_NAMES[today.getDay()];

const SEVERITY_OPTIONS = [
  { value: "none",     label: "None",     color: "#10b981", bg: "#d1fae5" },
  { value: "minor",    label: "Minor",    color: "#f59e0b", bg: "#fff3cd" },
  { value: "moderate", label: "Moderate", color: "#ef8c1a", bg: "#ffe4b5" },
  { value: "critical", label: "Critical", color: "#ef4444", bg: "#fee2e2" },
];
const EMPTY_FORM = {
  work: "",
  progress: "",
  workers: "",
  absent: "",
  cementUsed: "",
  steelUsed: "",
  materialShort: "",
  issues: "",
  severity: "none",
  delayHours: "",
  delayImpact: "",
  pending: "",
  next: "",
  safety: "",
  approvals: "",
};

const STATUS_CFG = {
  approved: { label: "Approved",       bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  pending:  { label: "Pending Review", bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  rejected: { label: "Rejected",       bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

const Section = ({ number, title, color = "#2563eb", children }) => (
  <div className="du-section">
    <div className="du-section__head" style={{ borderLeftColor: color }}>
      <span className="du-section__num" style={{ color }}>{number}</span>
      <h3 className="du-section__title">{title}</h3>
    </div>
    <div className="du-section__body">{children}</div>
  </div>
);

const FieldRow = ({ children }) => <div className="du-field-row">{children}</div>;

const Field = ({ label, required, children }) => (
  <div className="du-field">
    <label className="du-label">{label}{required && <span className="du-required"> *</span>}</label>
    {children}
  </div>
);

const DetailBlock = ({ label, val }) => (
  <div className="du-detail-block">
    <p className="du-detail-label">{label}</p>
    <p className="du-detail-val">{val || "—"}</p>
  </div>
);

export default function DailyUpdates() {
  const [logs, setLogs] = useState([]);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [editId, setEditId]       = useState(null);
  const [toast, setToast]         = useState(null);
  const [expandedId, setExpanded] = useState(null);
  const [submitting, setSubmit]   = useState(false);
  const [activeTab, setActiveTab] = useState("form");
    useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
  try {
    const res = await getUpdates(101);

    const mappedData = res.data.map(log => ({
      ...log,

      cementUsed: log.cement_used,
      steelUsed: log.steel_used,
      materialShort: log.material_short,

      delayHours: log.delay_hours,
      delayImpact: log.delay_impact,
    }));

    setLogs(mappedData);

  } catch (err) {
    console.error(err);
  }
};

  const todayLog = logs.find(l => l.date === todayStr && l.id !== editId);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (type, msg) => {
  setToast({ type, msg });
  setTimeout(() => setToast(null), 4000);
};

  const handleSubmit = async () => {
  if (!form.work.trim()) {
    showToast("error", "Please fill in Work Done Today.");
    return;
  }

  if (!form.progress) {
    showToast("error", "Please enter today's progress %.");
    return;
  }

  setSubmit(true);

  try {
    const payload = {
      ...form,
      project_id: 1,
      coordinator_id: 101,
      date: todayStr,
      day: todayDay
    };

    if (editId) {
      const res = await updateUpdate(editId, payload);

      const updated = {
        ...res.data,

        cementUsed: res.data.cement_used,
        steelUsed: res.data.steel_used,
        materialShort: res.data.material_short,

        delayHours: res.data.delay_hours,
        delayImpact: res.data.delay_impact,
      };

      setLogs(prev =>
        prev.map(l => (l.id === editId ? updated : l))
      );

      setEditId(null);
      showToast("success", "Updated & re-submitted to Project Manager.");

    } else {
      const res = await createUpdate(payload);

      const created = {
        ...res.data,

        cementUsed: res.data.cement_used,
        steelUsed: res.data.steel_used,
        materialShort: res.data.material_short,

        delayHours: res.data.delay_hours,
        delayImpact: res.data.delay_impact,
      };

      setLogs(prev => [created, ...prev]);

      showToast("success", "Daily update submitted to Project Manager.");
    }

    setForm({ ...EMPTY_FORM });
    setActiveTab("history");

  } catch (err) {
    console.error(err);
    showToast("error", "Server error");
  }

  setSubmit(false);
};

  const handleEdit = (log) => {
  setEditId(log.id);

  setForm({
    work: log.work || "",
    progress: log.progress || "",
    workers: log.workers || "",
    absent: log.absent || "",

    cementUsed: log.cementUsed || log.cement_used || "",
    steelUsed: log.steelUsed || log.steel_used || "",
    materialShort: log.materialShort || log.material_short || "",

    issues: log.issues || "",
    severity: log.severity || "none",

    delayHours: log.delayHours || log.delay_hours || "",
    delayImpact: log.delayImpact || log.delay_impact || "",

    pending: log.pending || "",
    next: log.next || "",
    safety: log.safety || "",
    approvals: log.approvals || "",
  });

  setActiveTab("form");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const cancelEdit = () => { setEditId(null); setForm({ ...EMPTY_FORM }); };

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
          <h1 className="du-title">Daily Site Updates</h1>
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
          {editId ? "Edit Update" : "New Update"}
        </button>
        <button className={`du-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}>
          Weekly History
          <span className="du-tab__badge">{logs.length}</span>
        </button>
      </div>

      {/* TAB: FORM */}
      {activeTab === "form" && (
        <div className="du-form-card">
          <div className="du-form-card__header">
            <div>
              <h2 className="du-form-card__title">
                {editId ? "Edit Submitted Update" : "Today's Site Update"}
              </h2>
              <p className="du-form-card__sub">
                {editId
                  ? "Editing your update — it will be re-sent to the Project Manager for review."
                  : "Complete all sections and submit to your Project Manager."}
              </p>
            </div>
            {editId && <button className="du-btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>

          {todayLog && !editId && (
            <div className="du-banner-info">
              <span>Today's update has been submitted.</span>
              <button className="du-link" onClick={() => handleEdit(todayLog)}>Edit it</button>
              <span className="du-banner-status"
                style={{
                  background: STATUS_CFG[todayLog.status]?.bg,
                  color: STATUS_CFG[todayLog.status]?.color,
                  border: `1px solid ${STATUS_CFG[todayLog.status]?.border}`
                }}>
                {STATUS_CFG[todayLog.status]?.label}
              </span>
            </div>
          )}

          {(!todayLog || editId) && (<>

            <Section number="01" title="Work Done Today" color="#2563eb">
              <Field label="Describe the work completed on site today" required>
                <textarea className="du-textarea" rows={3}
                  placeholder="e.g. Foundation completed for Block A. Concrete pouring done."
                  value={form.work} onChange={e => set("work", e.target.value)} />
              </Field>
            </Section>

            <Section number="02" title="Progress Status" color="#2563eb">
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
            </Section>

            <Section number="03" title="Workforce Details" color="#7c3aed">
              <FieldRow>
                <Field label="Workers Present">
                  <input className="du-input" type="number" placeholder="e.g. 35"
                    value={form.workers} onChange={e => set("workers", e.target.value)} />
                </Field>
                <Field label="Absentees">
                  <input className="du-input" type="number" placeholder="e.g. 5"
                    value={form.absent} onChange={e => set("absent", e.target.value)} />
                </Field>
              </FieldRow>
            </Section>

            <Section number="04" title="Material Status" color="#0891b2">
              <FieldRow>
                <Field label="Cement Used">
                  <input className="du-input" placeholder="e.g. 40 bags"
                    value={form.cementUsed} onChange={e => set("cementUsed", e.target.value)} />
                </Field>
                <Field label="Steel Used">
                  <input className="du-input" placeholder="e.g. 1.5 tons"
                    value={form.steelUsed} onChange={e => set("steelUsed", e.target.value)} />
                </Field>
              </FieldRow>
              <Field label="Material Shortage">
                <input className="du-input" placeholder="e.g. Sand shortage — ordered. Or: None"
                  value={form.materialShort} onChange={e => set("materialShort", e.target.value)} />
              </Field>
            </Section>

            <Section number="05 – 06" title="Issues & Impact" color="#f59e0b">
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
              <Field label="Issues / Problems Faced">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. Rain delay, material shortage, equipment breakdown. Or: None"
                  value={form.issues} onChange={e => set("issues", e.target.value)} />
              </Field>
              {form.severity !== "none" && (
                <FieldRow>
                  <Field label="Delay (Hours)">
                    <input className="du-input" type="number" placeholder="e.g. 3"
                      value={form.delayHours} onChange={e => set("delayHours", e.target.value)} />
                  </Field>
                  <Field label="Impact of Delay">
                    <input className="du-input" placeholder="e.g. Concrete pouring postponed"
                      value={form.delayImpact} onChange={e => set("delayImpact", e.target.value)} />
                  </Field>
                </FieldRow>
              )}
            </Section>

            <Section number="07 – 08" title="Pending Work & Tomorrow's Plan" color="#6366f1">
              <Field label="Pending Work">
                <textarea className="du-textarea" rows={2}
                  placeholder="Work not completed today, still in progress..."
                  value={form.pending} onChange={e => set("pending", e.target.value)} />
              </Field>
              <Field label="Tomorrow's Plan">
                <textarea className="du-textarea" rows={2}
                  placeholder="What is planned for tomorrow on site..."
                  value={form.next} onChange={e => set("next", e.target.value)} />
              </Field>
            </Section>

            <Section number="09" title="Safety Observations" color="#16a34a">
              <Field label="Safety status on site">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. All workers wearing PPE. No unsafe conditions. Or: Workers not wearing helmets."
                  value={form.safety} onChange={e => set("safety", e.target.value)} />
              </Field>
            </Section>

            <Section number="10" title="Dependencies / Approvals Required" color="#dc2626">
              <Field label="What is blocking progress or needs PM action?">
                <textarea className="du-textarea" rows={2}
                  placeholder="e.g. Waiting for PM approval for Block C start. Or: None"
                  value={form.approvals} onChange={e => set("approvals", e.target.value)} />
              </Field>
            </Section>

            <div className="du-form-footer">
              <p className="du-form-footer__note">
                This update will be sent to<strong>Project Manager</strong> for review and approval.
              </p>
              <button
                className={`du-btn-submit ${submitting ? "loading" : ""}`}
                onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><span className="du-spinner" /> Submitting...</>
                  : editId ? "Re-submit to Project Manager" : "Submit to Project Manager"}
              </button>
            </div>

          </>)}
        </div>
      )}

      {/* TAB: HISTORY */}
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
              return (
                <div key={log.id} className={`du-log-item ${isOpen ? "open" : ""}`}>

                  <div className="du-log-item__header"
                    onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <div className="du-log-item__left">
                      <div className="du-log-item__dot" style={{ background: sc.border }} />
                      <div>
                        <p className="du-log-item__day">
                          {log.day}
                          <span className="du-log-item__date"> · {log.date}</span>
                        </p>
                        <p className="du-log-item__preview">
                          {log.work?.length > 70 ? log.work.slice(0, 70) + "…" : log.work}
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
                      <div className="du-log-grid">
                        <DetailBlock label="Work Done"         val={log.work} />
                        <DetailBlock label="Progress"          val={`${log.progress}%`} />
                        <DetailBlock label="Workforce"         val={`${log.workers} present · ${log.absent} absent`} />
                        <DetailBlock label="Cement Used"       val={log.cementUsed || "—"}/>
                        <DetailBlock label="Steel Used"        val={log.steelUsed} />
                        <DetailBlock label="Material Shortage" val={log.materialShort} />
                        <DetailBlock label="Issues"            val={log.issues} />
                        {log.severity !== "none" && <>
                          <DetailBlock label="Delay"           val={log.delayHours ? `${log.delayHours} hrs` : "—"} />
                          <DetailBlock label="Impact"          val={log.delayImpact} />
                        </>}
                        <DetailBlock label="Pending Work"      val={log.pending} />
                        <DetailBlock label="Tomorrow's Plan"   val={log.next} />
                        <DetailBlock label="Safety"            val={log.safety} />
                        <DetailBlock label="Approvals Needed"  val={log.approvals} />
                      </div>

                      <div className="du-log-item__actions">
                        <span className="du-log-time">
                          Submitted at {new Date(`1970-01-01T${log.submitted_at}`).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {log.status !== "approved" && (
                            <button className="du-btn-edit" onClick={() => handleEdit(log)}>
                              Edit & Resubmit
                            </button>
                          )}
                          {log.status === "approved" && (
                            <span className="du-approved-tag">Approved by PM</span>
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