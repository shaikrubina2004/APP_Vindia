// ===== FILE: APP_Vindia/app_vindia/src/pages/Finance/FinanceDailyUpdate.jsx =====
import { useState, useEffect, useCallback } from "react";
import financeDailyUpdateService from "../../services/financeDailyUpdateService";
import "./FinanceDailyUpdate.css";

const todayStr = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  cash_position: "",
  todays_collections: "",
  todays_expenses: "",
  invoices_raised: "",
  payments_made: "",
  pending_approvals: "",
  overall_status: "on-track",
  summary: "",
};

const STATUS_OPTIONS = [
  { value: "on-track", label: "On Track", color: "var(--fdu-ok)" },
  { value: "attention", label: "Needs Attention", color: "var(--fdu-warn)" },
  { value: "critical", label: "Critical", color: "var(--fdu-critical)" },
];

const REVIEW_LABEL = {
  pending: { text: "Pending CEO review", cls: "fdu-badge-pending" },
  approved: { text: "Approved", cls: "fdu-badge-approved" },
  rejected: { text: "Rejected — resubmit below", cls: "fdu-badge-rejected" },
};

export default function FinanceDailyUpdate() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [today, setToday] = useState(null); // existing record for today, if any
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, historyRes] = await Promise.all([
        financeDailyUpdateService.getTodayMine(),
        financeDailyUpdateService.getMyUpdates(),
      ]);

      const todayData = todayRes.data.data;
      setToday(todayData);
      setHistory(historyRes.data.data || []);

      if (todayData) {
        setForm({
          cash_position: todayData.cash_position ?? "",
          todays_collections: todayData.todays_collections ?? "",
          todays_expenses: todayData.todays_expenses ?? "",
          invoices_raised: todayData.invoices_raised ?? "",
          payments_made: todayData.payments_made ?? "",
          pending_approvals: todayData.pending_approvals ?? "",
          overall_status: todayData.overall_status || "on-track",
          summary: todayData.summary || "",
        });
      }
    } catch (err) {
      console.error("Failed to load finance daily update:", err);
      setError(
        err?.response?.data?.message || "Couldn't load your daily update."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await financeDailyUpdateService.submitUpdate({
        date: todayStr(),
        cash_position: Number(form.cash_position) || 0,
        todays_collections: Number(form.todays_collections) || 0,
        todays_expenses: Number(form.todays_expenses) || 0,
        invoices_raised: Number(form.invoices_raised) || 0,
        payments_made: Number(form.payments_made) || 0,
        pending_approvals: Number(form.pending_approvals) || 0,
        overall_status: form.overall_status,
        summary: form.summary,
      });
      setToday(res.data.data);
      setToast(today ? "Update resubmitted for CEO review." : "Daily update submitted to the CEO.");
      setTimeout(() => setToast(null), 3500);
      load();
    } catch (err) {
      console.error("Failed to submit daily update:", err);
      setError(
        err?.response?.data?.message || "Couldn't submit your update. Please try again."
      );
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

  const reviewInfo = today ? REVIEW_LABEL[today.status] : null;

  return (
    <div className="fdu-root">
      <header className="fdu-header">
        <div>
          <p className="fdu-eyebrow">Finance Overview</p>
          <h1 className="fdu-title">Daily Update</h1>
          <p className="fdu-sub">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        {reviewInfo && (
          <span className={`fdu-badge ${reviewInfo.cls}`}>{reviewInfo.text}</span>
        )}
      </header>

      {toast && <div className="fdu-toast">{toast}</div>}
      {error && <div className="fdu-error">{error}</div>}

      {today?.status === "approved" && (
        <div className="fdu-note fdu-note-approved">
          ✓ Approved by {today.reviewed_by_name || "CEO"} on{" "}
          {new Date(today.reviewed_at).toLocaleString("en-IN")}.
          {today.review_note && <> — "{today.review_note}"</>}
        </div>
      )}
      {today?.status === "rejected" && (
        <div className="fdu-note fdu-note-rejected">
          ✗ Sent back by {today.reviewed_by_name || "CEO"}
          {today.review_note && <> — "{today.review_note}"</>}. Update the figures below and resubmit.
        </div>
      )}

      <form className="fdu-form" onSubmit={handleSubmit}>
        <section className="fdu-grid">
          <label className="fdu-field">
            <span>Cash / Bank Position (₹)</span>
            <input
              type="number" step="0.01" min="0"
              value={form.cash_position}
              onChange={handleChange("cash_position")}
              required
            />
          </label>

          <label className="fdu-field">
            <span>Today's Collections (₹)</span>
            <input
              type="number" step="0.01" min="0"
              value={form.todays_collections}
              onChange={handleChange("todays_collections")}
              required
            />
          </label>

          <label className="fdu-field">
            <span>Today's Expenses (₹)</span>
            <input
              type="number" step="0.01" min="0"
              value={form.todays_expenses}
              onChange={handleChange("todays_expenses")}
              required
            />
          </label>

          <label className="fdu-field">
            <span>Invoices Raised Today</span>
            <input
              type="number" min="0"
              value={form.invoices_raised}
              onChange={handleChange("invoices_raised")}
            />
          </label>

          <label className="fdu-field">
            <span>Payments Made Today</span>
            <input
              type="number" min="0"
              value={form.payments_made}
              onChange={handleChange("payments_made")}
            />
          </label>

          <label className="fdu-field">
            <span>Pending Approvals</span>
            <input
              type="number" min="0"
              value={form.pending_approvals}
              onChange={handleChange("pending_approvals")}
            />
          </label>
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
          <span>Summary / Notes for CEO</span>
          <textarea
            rows={4}
            placeholder="Anything the CEO should know — blockers, large payments, cash flow risk, etc."
            value={form.summary}
            onChange={handleChange("summary")}
          />
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
                <th>Collections</th>
                <th>Expenses</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>₹{Number(h.todays_collections).toLocaleString("en-IN")}</td>
                  <td>₹{Number(h.todays_expenses).toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`fdu-chip fdu-chip--${h.overall_status}`}>
                      {STATUS_OPTIONS.find((o) => o.value === h.overall_status)?.label || h.overall_status}
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