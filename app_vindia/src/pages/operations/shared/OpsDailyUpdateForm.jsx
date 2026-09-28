// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/shared/OpsDailyUpdateForm.jsx =====
// Daily update for Inventory Controller and Logistics Coordinator.
// Submitted to the Operations Manager.

import React, { useEffect, useState } from "react";
import opsDailyUpdateService from "../../../services/opsDailyUpdateService";
import {
  ROLE_CONFIG,
  OVERALL_STATUS,
  REVIEW_STATUS,
  emptyForm,
  rowToForm,
  formToPayload,
} from "./opsDailyUpdateConfig";
import "../../Project Coordinator/DailyUpdates.css";
import "./OpsDailyUpdate.css";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today = new Date();
const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

// Read "YYYY-MM-DD" as a local date so it never shifts by a day
const parseDay = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const Field = ({ label, required, children }) => (
  <div className="du-field">
    <label className="du-label">
      {label}{required && <span className="du-required"> *</span>}
    </label>
    {children}
  </div>
);

const DetailBlock = ({ label, val }) => (
  <div className="du-detail-block">
    <p className="du-detail-label">{label}</p>
    <p className="du-detail-val">{val || "—"}</p>
  </div>
);

export default function OpsDailyUpdateForm({ roleKey }) {
  const cfg = ROLE_CONFIG[roleKey];

  const [form, setForm] = useState(emptyForm());
  const [logs, setLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [editing, setEditing] = useState(false);
  const [expandedId, setExpanded] = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("form");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    try {
      const [mine, todayRes] = await Promise.all([
        opsDailyUpdateService.getMyUpdates(),
        opsDailyUpdateService.getTodayMine(),
      ]);
      setLogs(mine.data?.data || []);
      setTodayLog(todayRes.data?.data || null);
    } catch (err) {
      console.error("LOAD DAILY UPDATES ERROR:", err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleEdit = (row) => {
    setForm(rowToForm(row));
    setEditing(true);
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(emptyForm());
  };

  const handleSubmit = async () => {
    if (todayLog && !editing) {
      showToast("error", "Today's update is already submitted. Please edit it instead.");
      return;
    }
    if (!form.work.trim()) {
      showToast("error", "Please describe the work done today.");
      return;
    }

    setSubmit(true);
    try {
      await opsDailyUpdateService.submitUpdate(formToPayload(form));
      await loadAll();
      showToast(
        "success",
        editing
          ? "Updated & re-submitted to Operations Manager."
          : "Daily update submitted to Operations Manager."
      );
      setEditing(false);
      setForm(emptyForm());
      setActiveTab("history");
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || "Server error — please try again.");
    }
    setSubmit(false);
  };

  const statusCfg = (s) => REVIEW_STATUS[s] || REVIEW_STATUS.pending;

  return (
    <div className="du-page">
      {toast && (
        <div className={`du-toast du-toast--${toast.type}`}>
          <span className="du-toast__msg">{toast.msg}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* HEADER */}
      <div className="du-header">
        <div>
          <h1 className="du-title">Daily Update</h1>
          <p className="du-subtitle">{cfg.roleLabel}</p>
        </div>
        <div className="du-date-badge">
          <span className="du-date-badge__day">{DAY_NAMES[today.getDay()]}</span>
          <span className="du-date-badge__date">
            {today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* TABS */}
      <div className="du-tabs">
        <button className={`du-tab ${activeTab === "form" ? "active" : ""}`} onClick={() => setActiveTab("form")}>
          {editing ? "✏ Edit Update" : "+ New Update"}
        </button>
        <button className={`du-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          My History
          <span className="du-tab__badge">{logs.length}</span>
        </button>
      </div>

      {/* ══════════ FORM ══════════ */}
      {activeTab === "form" && (
        <div className="du-form-card">
          <div className="du-form-card__header">
            <div>
              <h2 className="du-form-card__title">
                {editing ? "Edit Submitted Update" : "Today's Update"}
              </h2>
              <p className="du-form-card__sub">
                {editing
                  ? "It will be re-sent to the Operations Manager for review."
                  : "Send a quick update to your Operations Manager."}
              </p>
            </div>
            {editing && <button className="du-btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>

          {todayLog && !editing && (
            <div className="du-banner-info">
              <span>Today's update has been submitted.</span>
              <button className="du-link" onClick={() => handleEdit(todayLog)}>Edit it</button>
              <span
                className="du-banner-status"
                style={{
                  background: statusCfg(todayLog.status).bg,
                  color: statusCfg(todayLog.status).color,
                  border: `1px solid ${statusCfg(todayLog.status).border}`,
                }}
              >
                {statusCfg(todayLog.status).label}
              </span>
            </div>
          )}

          {todayLog?.status === "rejected" && todayLog.review_note && !editing && (
            <div className="ops-review-note ops-review-note--rejected">
              <strong>Manager's note:</strong> {todayLog.review_note}
            </div>
          )}

          <div className="du-section">
            <div className="du-section__body">
              <Field label="Work done today" required>
                <textarea
                  className="du-textarea"
                  rows={4}
                  placeholder={cfg.workPlaceholder}
                  value={form.work}
                  onChange={(e) => set("work", e.target.value)}
                />
              </Field>

              <Field label="Overall status">
                <div className="du-milestone-status-row">
                  {OVERALL_STATUS.map((s) => (
                    <button
                      key={s.val}
                      className={`du-ms-btn ${form.overallStatus === s.val ? "active" : ""}`}
                      style={
                        form.overallStatus === s.val
                          ? { background: s.bg, border: `2px solid ${s.color}`, color: s.color }
                          : {}
                      }
                      onClick={() => set("overallStatus", s.val)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Issues (if any)">
                <textarea
                  className="du-textarea"
                  rows={2}
                  placeholder={cfg.issuesPlaceholder}
                  value={form.issues}
                  onChange={(e) => set("issues", e.target.value)}
                />
              </Field>

              <Field label="Pending / need from Operations Manager">
                <input
                  className="du-input"
                  placeholder="e.g. Approval for additional vehicle hire"
                  value={form.pending}
                  onChange={(e) => set("pending", e.target.value)}
                />
              </Field>

              <Field label="Tomorrow's plan">
                <textarea
                  className="du-textarea"
                  rows={2}
                  placeholder={cfg.nextPlaceholder}
                  value={form.nextPlan}
                  onChange={(e) => set("nextPlan", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="du-form-footer">
            <p className="du-form-footer__note">
              This update will be sent to the <strong>Operations Manager</strong>.
            </p>
            <button
              className={`du-btn-submit ${submitting ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="du-spinner" /> Submitting...</>
              ) : editing ? (
                "Re-submit to Operations Manager"
              ) : (
                "Submit to Operations Manager"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ HISTORY ══════════ */}
      {activeTab === "history" && (
        <div className="du-history">
          <div className="du-history__head">
            <h2 className="du-history__title">My Recent Updates</h2>
            <span className="du-log-count">{logs.length} entries</span>
          </div>

          {logs.length === 0 && (
            <div className="du-empty"><p>No updates submitted yet.</p></div>
          )}

          <div className="du-log-list">
            {logs.map((log) => {
              const sc = statusCfg(log.status);
              const isOpen = expandedId === log.id;
              const d = parseDay(log.date_str || log.date);
              const isToday = (log.date_str || "") === todayStr;

              return (
                <div key={log.id} className={`du-log-item ${isOpen ? "open" : ""}`}>
                  <div className="du-log-item__header" onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <div className="du-log-item__left">
                      <div className="du-log-item__dot" style={{ background: sc.border }} />
                      <div>
                        <p className="du-log-item__day">
                          {DAY_NAMES[d.getDay()]}
                          <span className="du-log-item__date">
                            {" · "}
                            {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </p>
                        <p className="du-log-item__preview">
                          {log.work?.length > 80 ? log.work.slice(0, 80) + "…" : log.work}
                        </p>
                      </div>
                    </div>
                    <div className="du-log-item__right">
                      <span
                        className="du-status-pill"
                        style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}
                      >
                        {sc.label}
                      </span>
                      <span className="du-chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="du-log-item__body">
                      <div className="du-log-grid">
                        <DetailBlock label="Work Done" val={log.work} />
                        <DetailBlock label="Status" val={log.overall_status} />
                        <DetailBlock label="Issues" val={log.issues} />
                        <DetailBlock label="Pending / Need" val={log.pending} />
                        <DetailBlock label="Tomorrow's Plan" val={log.next_plan} />
                        {log.review_note && <DetailBlock label="Manager's Note" val={log.review_note} />}
                      </div>

                      <div className="du-log-item__actions">
                        <span className="du-log-time">
                          Submitted at{" "}
                          {new Date(log.submitted_at || log.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {log.status === "approved" ? (
                          <span className="du-approved-tag">✓ Approved</span>
                        ) : (
                          isToday && (
                            <button className="du-btn-edit" onClick={() => handleEdit(log)}>
                              Edit & Resubmit
                            </button>
                          )
                        )}
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