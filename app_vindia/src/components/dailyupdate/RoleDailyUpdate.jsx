// Role-aware "Daily Update → submit to CEO" page.
// Same look & flow as the Finance Manager daily update (reuses its fdu-* styles);
// the fields shown come from utils/dailyReportConfig.js, so BDA, Operations Manager
// (and later HR) each get their own set of questions.

import { useState, useEffect, useCallback } from "react";
import { ceoReportService } from "../../services/ceoHubService";
import {
  REPORT_TYPES, STATUS_OPTIONS, STATUS_LABEL, REVIEW_LABEL, formatValue,
} from "../../utils/dailyReportConfig";
import "../../pages/Finance/FinanceDailyUpdate.css";
import "./RoleDailyUpdate.css";

const todayStr = () => new Date().toISOString().slice(0, 10);

const buildEmpty = (fields) => {
  const f = { overall_status: "on-track", summary: "" };
  fields.forEach((x) => { f[x.key] = ""; });
  return f;
};

export default function RoleDailyUpdate({ reportType, title = "Daily Update" }) {
  const cfg = REPORT_TYPES[reportType];
  const [form, setForm] = useState(() => buildEmpty(cfg.fields));
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, h] = await Promise.all([
        ceoReportService.today(reportType),
        ceoReportService.mine(reportType),
      ]);
      const row = t.data.data;
      setToday(row);
      setHistory(h.data.data || []);
      if (row) {
        const next = buildEmpty(cfg.fields);
        cfg.fields.forEach((x) => { next[x.key] = row.payload?.[x.key] ?? ""; });
        next.overall_status = row.overall_status || "on-track";
        next.summary = row.summary || "";
        setForm(next);
      }
    } catch (err) {
      console.error("Failed to load daily update:", err);
      setError(err?.response?.data?.message || "Couldn't load your daily update.");
    } finally {
      setLoading(false);
    }
  }, [reportType, cfg]);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      cfg.fields.forEach((x) => {
        payload[x.key] = x.kind === "text" ? form[x.key] : Number(form[x.key]) || 0;
      });
      await ceoReportService.submit({
        report_type: reportType,
        date: todayStr(),
        overall_status: form.overall_status,
        summary: form.summary,
        payload,
      });
      setToast(today ? "Update resubmitted for CEO review." : "Daily update submitted to the CEO.");
      setTimeout(() => setToast(null), 3500);
      load();
    } catch (err) {
      console.error("Failed to submit daily update:", err);
      setError(err?.response?.data?.message || "Couldn't submit your update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fdu-root">
        <div className="fdu-state">Loading today's update…</div>
      </div>
    );
  }

  const review = today ? REVIEW_LABEL[today.status] : null;
  const histCols = cfg.fields.filter((f) => f.kind !== "text").slice(0, 3);

  return (
    <div className="fdu-root">
      <header className="fdu-header">
        <div>
          <p className="fdu-eyebrow">{cfg.eyebrow || cfg.label}</p>
          <h1 className="fdu-title">{title}</h1>
          <p className="fdu-sub">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        {review && <span className={`fdu-badge ${review.cls}`}>{review.text}</span>}
      </header>

      {toast && <div className="fdu-toast">{toast}</div>}
      {error && <div className="fdu-error">{error}</div>}

      {today?.status === "approved" && (
        <div className="fdu-note fdu-note-approved">
          ✓ Approved by {today.reviewed_by_name || "CEO"}
          {today.reviewed_at && <> on {new Date(today.reviewed_at).toLocaleString("en-IN")}</>}.
          {today.review_note && <> — "{today.review_note}"</>}
        </div>
      )}
      {today?.status === "rejected" && (
        <div className="fdu-note fdu-note-rejected">
          ✗ Sent back by the CEO
          {today.review_note && <> — "{today.review_note}"</>}. Update the figures below and resubmit.
        </div>
      )}

      <form className="fdu-form" onSubmit={handleSubmit}>
        <section className="fdu-grid">
          {cfg.fields.map((f) => (
            <label key={f.key} className={`fdu-field${f.wide ? " fdu-field--full" : ""}`}>
              <span>{f.label}</span>
              {f.kind === "text" ? (
                <input
                  type="text"
                  value={form[f.key]}
                  placeholder={f.placeholder || ""}
                  onChange={set(f.key)}
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  max={f.kind === "percent" ? 100 : undefined}
                  step={f.kind === "money" ? "0.01" : "1"}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  required={!!f.required}
                />
              )}
            </label>
          ))}
        </section>

        <section className="fdu-status-row">
          <span className="fdu-status-label">Overall Status</span>
          <div className="fdu-status-options">
            {STATUS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`fdu-status-pill ${form.overall_status === opt.value ? "fdu-status-pill--active" : ""}`}
                style={{ "--pill-color": opt.color }}
                onClick={() => setForm((f) => ({ ...f, overall_status: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <label className="fdu-field fdu-field--full">
          <span>{cfg.summaryLabel || "Summary / Notes for CEO"}</span>
          {cfg.summaryHint && <small className="rdu-hint">{cfg.summaryHint}</small>}
          <textarea rows={4} value={form.summary} onChange={set("summary")} />
        </label>

        <button type="submit" className="fdu-submit-btn" disabled={saving}>
          {saving ? "Submitting…" : today ? "Resubmit for Review" : "Submit to CEO"}
        </button>
      </form>

      <section className="fdu-history">
        <h2>Your Submission History</h2>
        {history.length === 0 ? (
          <p className="fdu-history-empty">No previous submissions yet.</p>
        ) : (
          <table className="fdu-history-table">
            <thead>
              <tr>
                <th>Date</th>
                {histCols.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.report_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  {histCols.map((c) => (
                    <td key={c.key}>{formatValue(c.kind, h.payload?.[c.key])}</td>
                  ))}
                  <td>
                    <span className={`fdu-chip fdu-chip--${h.overall_status}`}>
                      {STATUS_LABEL[h.overall_status] || h.overall_status}
                    </span>
                  </td>
                  <td>
                    <span className={`fdu-badge ${REVIEW_LABEL[h.status]?.cls || ""}`}>
                      {REVIEW_LABEL[h.status]?.text || h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}