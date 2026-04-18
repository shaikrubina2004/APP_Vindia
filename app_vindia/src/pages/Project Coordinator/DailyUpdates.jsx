import React, { useState } from "react";
import "./DailyUpdates.css";

/* ── Mock: last 7 days of submitted logs ── */
const INITIAL_LOGS = [
  {
    id: 1,
    date: "2025-06-09",
    day: "Monday",
    work: "Foundation work completed for Block A. Concrete pouring done.",
    issues: "Minor delay due to rain in the morning.",
    pending: "Block B shuttering work.",
    next: "Start Block B foundation work.",
    status: "approved",
    submittedAt: "06:45 PM",
  },
  {
    id: 2,
    date: "2025-06-10",
    day: "Tuesday",
    work: "Block B shuttering completed. Steel reinforcement started.",
    issues: "None",
    pending: "Steel reinforcement completion.",
    next: "Complete steel reinforcement for Block B.",
    status: "approved",
    submittedAt: "07:10 PM",
  },
  {
    id: 3,
    date: "2025-06-11",
    day: "Wednesday",
    work: "Steel reinforcement completed. Concrete mix prepared.",
    issues: "Shortage of sand — ordered extra stock.",
    pending: "Concrete pouring for Block B.",
    next: "Complete concrete pouring.",
    status: "pending",
    submittedAt: "06:55 PM",
  },
];

const STATUS_CONFIG = {
  approved: { label: "Approved",  bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  pending:  { label: "Pending",   bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  rejected: { label: "Rejected",  bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

const FIELDS = [
  { key: "work",    label: "Work Done Today",       icon: "🏗️", placeholder: "Describe the work completed on site today..." },
  { key: "issues",  label: "Issues / Incidents",    icon: "⚠️", placeholder: "Any problems, delays or incidents encountered..." },
  { key: "pending", label: "Pending Work",          icon: "⏳", placeholder: "Work that is still in progress or not started..." },
  { key: "next",    label: "Tomorrow's Plan",       icon: "📋", placeholder: "What is planned for tomorrow on site..." },
];

const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayDay = dayNames[today.getDay()];

export default function DailyUpdates() {
  const [logs, setLogs]           = useState(INITIAL_LOGS);
  const [form, setForm]           = useState({ work: "", issues: "", pending: "", next: "" });
  const [editId, setEditId]       = useState(null);
  const [notification, setNotif]  = useState(null); // { type, msg }
  const [expandedId, setExpanded] = useState(null);
  const [submitting, setSubmit]   = useState(false);

  const todayAlreadySubmitted = logs.find(l => l.date === todayStr && l.id !== editId);

  /* ── show notification then auto-dismiss ── */
  const showNotif = (type, msg) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  };

  /* ── handle submit / update ── */
  const handleSubmit = () => {
    if (!form.work.trim()) { showNotif("error", "Please fill in Work Done Today."); return; }

    setSubmit(true);
    setTimeout(() => {
      if (editId) {
        setLogs(prev => prev.map(l =>
          l.id === editId ? { ...l, ...form, status: "pending" } : l
        ));
        setEditId(null);
        showNotif("success", "Update edited and re-submitted to Project Manager ✅");
      } else {
        const newLog = {
          id: Date.now(),
          date: todayStr,
          day: todayDay,
          ...form,
          status: "pending",
          submittedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        };
        setLogs(prev => [newLog, ...prev]);
        showNotif("success", "Daily update submitted to Project Manager ✅");
      }
      setForm({ work: "", issues: "", pending: "", next: "" });
      setSubmit(false);
    }, 1200);
  };

  /* ── start editing a log ── */
  const handleEdit = (log) => {
    setEditId(log.id);
    setForm({ work: log.work, issues: log.issues, pending: log.pending, next: log.next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ work: "", issues: "", pending: "", next: "" });
  };

  const recent7 = logs.slice(0, 7);

  return (
    <div className="du-page">

      {/* ══ NOTIFICATION TOAST ══ */}
      {notification && (
        <div className={`du-toast du-toast--${notification.type}`}>
          <span className="du-toast__icon">
            {notification.type === "success" ? "✅" : "❌"}
          </span>
          <span>{notification.msg}</span>
          <button className="du-toast__close" onClick={() => setNotif(null)}>✕</button>
        </div>
      )}

      {/* ══ PAGE HEADER ══ */}
      <div className="du-header">
        <div>
          <p className="du-breadcrumb">Project Coordinator / Daily Updates</p>
          <h1 className="du-title">Daily Updates</h1>
        </div>
        <div className="du-date-badge">
          <span className="du-date-badge__day">{todayDay}</span>
          <span className="du-date-badge__date">
            {today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="du-layout">

        {/* ══ LEFT: FORM ══ */}
        <div className="du-form-col">
          <div className={`du-form-card ${editId ? "editing" : ""}`}>

            <div className="du-form-card__header">
              <div>
                <h2 className="du-form-card__title">
                  {editId ? "✏️ Edit Update" : "📝 Today's Site Update"}
                </h2>
                <p className="du-form-card__sub">
                  {editId
                    ? "Editing your submitted update — it will be re-sent to the Project Manager."
                    : "Fill in the details below and submit to your Project Manager."}
                </p>
              </div>
              {editId && (
                <button className="du-btn-ghost" onClick={cancelEdit}>✕ Cancel</button>
              )}
            </div>

            {todayAlreadySubmitted && !editId && (
              <div className="du-already-submitted">
                <span>✅</span>
                <span>You've already submitted today's update.
                  <button className="du-link" onClick={() => handleEdit(todayAlreadySubmitted)}>
                    Edit it
                  </button>
                </span>
              </div>
            )}

            {(!todayAlreadySubmitted || editId) && (
              <>
                {FIELDS.map(f => (
                  <div className="du-field" key={f.key}>
                    <label className="du-label">
                      <span className="du-label__icon">{f.icon}</span>
                      {f.label}
                    </label>
                    <textarea
                      className="du-textarea"
                      rows={3}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  </div>
                ))}

                <div className="du-form-footer">
                  <p className="du-form-footer__note">
                    📨 This update will be sent directly to your <strong>Project Manager</strong> for review.
                  </p>
                  <button
                    className={`du-btn-submit ${submitting ? "loading" : ""}`}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><span className="du-spinner" /> Submitting...</>
                      : editId
                        ? "🔄 Re-submit Update"
                        : "📤 Submit to Project Manager"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT: WEEKLY LOG ══ */}
        <div className="du-log-col">
          <div className="du-log-card">
            <div className="du-log-card__header">
              <h2 className="du-log-card__title">📅 This Week's Updates</h2>
              <span className="du-log-count">{recent7.length} entries</span>
            </div>

            {recent7.length === 0 && (
              <p className="du-empty">No updates submitted this week yet.</p>
            )}

            <div className="du-log-list">
              {recent7.map(log => {
                const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                const isOpen = expandedId === log.id;
                return (
                  <div key={log.id} className={`du-log-item ${isOpen ? "open" : ""}`}>

                    {/* ── row header ── */}
                    <div className="du-log-item__header" onClick={() =>
                      setExpanded(isOpen ? null : log.id)}>
                      <div className="du-log-item__left">
                        <div className="du-log-item__dot"
                          style={{ background: sc.border }} />
                        <div>
                          <p className="du-log-item__day">{log.day}
                            <span className="du-log-item__date"> · {log.date}</span>
                          </p>
                          <p className="du-log-item__preview">
                            {log.work.length > 55 ? log.work.slice(0, 55) + "…" : log.work}
                          </p>
                        </div>
                      </div>
                      <div className="du-log-item__right">
                        <span className="du-status-pill"
                          style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                        <span className="du-chevron">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* ── expanded detail ── */}
                    {isOpen && (
                      <div className="du-log-item__body">
                        {FIELDS.map(f => (
                          <div className="du-log-detail" key={f.key}>
                            <p className="du-log-detail__label">{f.icon} {f.label}</p>
                            <p className="du-log-detail__val">{log[f.key] || "—"}</p>
                          </div>
                        ))}
                        <div className="du-log-item__actions">
                          <span className="du-log-time">🕐 Submitted at {log.submittedAt}</span>
                          {log.status !== "approved" && (
                            <button className="du-btn-edit" onClick={() => handleEdit(log)}>
                              ✏️ Edit & Resubmit
                            </button>
                          )}
                          {log.status === "approved" && (
                            <span className="du-approved-tag">✅ Approved by PM</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}