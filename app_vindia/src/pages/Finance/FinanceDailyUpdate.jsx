// ===== FILE: APP_Vindia/app_vindia/src/pages/Finance/FinanceDailyUpdate.jsx =====

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import financeDailyUpdateService from "../../services/financeDailyUpdateService";
import "./FinanceDailyUpdate.css";

/* ── Helpers ─────────────────────────────────────────────── */

const todayStr = () =>
  new Date().toISOString().slice(0, 10);

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
  {
    value: "on-track",
    label: "On Track",
    color: "var(--fdu-ok)",
  },
  {
    value: "attention",
    label: "Needs Attention",
    color: "var(--fdu-warn)",
  },
  {
    value: "critical",
    label: "Critical",
    color: "var(--fdu-critical)",
  },
];

const REVIEW_LABEL_ACCOUNTANT = {
  pending: {
    text: "Pending Finance Manager review",
    cls: "fdu-badge-pending",
  },
  approved: {
    text: "Approved by Finance Manager",
    cls: "fdu-badge-approved",
  },
  rejected: {
    text: "Rejected — resubmit below",
    cls: "fdu-badge-rejected",
  },
};

const REVIEW_LABEL_FINANCE_MANAGER = {
  pending: {
    text: "Pending CEO review",
    cls: "fdu-badge-pending",
  },
  approved: {
    text: "Approved",
    cls: "fdu-badge-approved",
  },
  rejected: {
    text: "Rejected — resubmit below",
    cls: "fdu-badge-rejected",
  },
};

/* ════════════════════════════════════════════════════════════
   DAILY UPDATE SUBMISSION PAGE

   Workflow:

   Accountant
       ↓
   Finance Manager review

   Finance Manager
       ↓
   CEO

   The Finance Manager review inbox is handled separately
   by FinanceDailyUpdateReview.jsx.
════════════════════════════════════════════════════════════ */

export default function FinanceDailyUpdate() {
  const { user: authUser } = useAuth();

  /*
   * Prefer the authenticated user from context.
   * Fall back to localStorage for compatibility with the
   * existing authentication implementation.
   */
  const [user] = useState(() => {
    try {
      if (authUser) {
        return authUser;
      }

      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return authUser || {};
    }
  });

  /* ── Normalize role ───────────────────────────────────── */

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const isAccountant =
    normalizedRole === "accountant";

  const isFinanceManager =
    normalizedRole === "finance_manager";

  /*
   * Anything other than Accountant is treated as Finance
   * Manager for this submission page.
   *
   * Routing should already protect this page so that only
   * Accountant and Finance Manager can access it.
   */

  const reviewerLabel = isAccountant
    ? "Finance Manager"
    : "CEO";

  const summaryLabel = isAccountant
    ? "Summary / Notes for Finance Manager"
    : "Summary / Notes for CEO";

  const summaryPlaceholder = isAccountant
    ? "Mention important collections, large expenses, pending payments, cash-flow concerns, or anything requiring Finance Manager attention."
    : "Anything the CEO should know — blockers, large payments, cash flow risk, etc.";

  const reviewLabels = isAccountant
    ? REVIEW_LABEL_ACCOUNTANT
    : REVIEW_LABEL_FINANCE_MANAGER;

  /* ── Page state ───────────────────────────────────────── */

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [today, setToday] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [toast, setToast] =
    useState(null);

  /* ── Load today's update + history ───────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        todayRes,
        historyRes,
      ] = await Promise.all([
        financeDailyUpdateService.getTodayMine(),
        financeDailyUpdateService.getMyUpdates(),
      ]);

      const todayData =
        todayRes?.data?.data || null;

      const historyData =
        historyRes?.data?.data || [];

      setToday(todayData);
      setHistory(historyData);

      /*
       * Populate today's form when an existing update
       * is available.
       */
      if (todayData) {
        setForm({
          cash_position:
            todayData.cash_position ?? "",

          todays_collections:
            todayData.todays_collections ?? "",

          todays_expenses:
            todayData.todays_expenses ?? "",

          invoices_raised:
            todayData.invoices_raised ?? "",

          payments_made:
            todayData.payments_made ?? "",

          pending_approvals:
            todayData.pending_approvals ?? "",

          overall_status:
            todayData.overall_status ||
            "on-track",

          summary:
            todayData.summary || "",
        });
      } else {
        setForm({
          ...EMPTY_FORM,
        });
      }
    } catch (err) {
      console.error(
        "Failed to load finance daily update:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Couldn't load your daily update."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Input handling ───────────────────────────────────── */

  const handleChange =
    (field) =>
    (e) => {
      setForm((current) => ({
        ...current,
        [field]: e.target.value,
      }));
    };

  /* ── Submit / resubmit ────────────────────────────────── */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const res =
        await financeDailyUpdateService.submitUpdate({
          date: todayStr(),

          cash_position:
            Number(form.cash_position) || 0,

          todays_collections:
            Number(form.todays_collections) || 0,

          todays_expenses:
            Number(form.todays_expenses) || 0,

          invoices_raised:
            Number(form.invoices_raised) || 0,

          payments_made:
            Number(form.payments_made) || 0,

          pending_approvals:
            Number(form.pending_approvals) || 0,

          overall_status:
            form.overall_status,

          summary:
            form.summary,
        });

      setToday(
        res?.data?.data || null
      );

      /* Role-specific success message */

      if (today) {
        setToast(
          isAccountant
            ? "Update resubmitted for Finance Manager review."
            : "Update resubmitted for CEO review."
        );
      } else {
        setToast(
          isAccountant
            ? "Daily update submitted to the Finance Manager."
            : "Daily update submitted to the CEO."
        );
      }

      setTimeout(() => {
        setToast(null);
      }, 3500);

      await load();
    } catch (err) {
      console.error(
        "Failed to submit daily update:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Couldn't submit your update. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="fdu-root">
        <div className="fdu-state">
          Loading today's update…
        </div>
      </div>
    );
  }

  /* ── Review status ────────────────────────────────────── */

  const reviewInfo = today
    ? reviewLabels[today.status]
    : null;

  /* ═════════ RENDER ═════════ */

  return (
    <div className="fdu-root">
      {/* ═════════ HEADER ═════════ */}

      <header className="fdu-header">
        <div>
          <p className="fdu-eyebrow">
            {isAccountant
              ? "Accountant • Finance Operations"
              : "Finance Manager • Finance Operations"}
          </p>

          <h1 className="fdu-title">
            Daily Update
          </h1>

          <p className="fdu-sub">
            {new Date().toLocaleDateString(
              "en-IN",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </p>
        </div>

        {reviewInfo && (
          <span
            className={`fdu-badge ${reviewInfo.cls}`}
          >
            {reviewInfo.text}
          </span>
        )}
      </header>

      {/* ═════════ ACCOUNTANT INFORMATION ═════════ */}

      {isAccountant && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          <strong>
            Accountant Daily Reporting
          </strong>

          <br />

          Record today's financial activity
          accurately. Your submission will be
          sent to the{" "}
          <strong>Finance Manager</strong>{" "}
          for review.
        </div>
      )}

      {/* ═════════ FINANCE MANAGER INFORMATION ═════════ */}

      {isFinanceManager && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          <strong>
            Finance Manager Daily Reporting
          </strong>

          <br />

          Record today's finance activity
          accurately. Your daily update is part of
          the finance management reporting flow
          to the <strong>CEO</strong>.
        </div>
      )}

      {/* ═════════ MESSAGES ═════════ */}

      {toast && (
        <div className="fdu-toast">
          {toast}
        </div>
      )}

      {error && (
        <div className="fdu-error">
          {error}
        </div>
      )}

      {/* ═════════ APPROVED MESSAGE ═════════ */}

      {today?.status === "approved" && (
        <div className="fdu-note fdu-note-approved">
          ✓ Approved by{" "}

          {today.reviewed_by_name ||
            reviewerLabel}

          {" "}on{" "}

          {today.reviewed_at
            ? new Date(
                today.reviewed_at
              ).toLocaleString("en-IN")
            : "—"}

          .

          {today.review_note && (
            <>
              {" "}
              — "{today.review_note}"
            </>
          )}
        </div>
      )}

      {/* ═════════ REJECTED MESSAGE ═════════ */}

      {today?.status === "rejected" && (
        <div className="fdu-note fdu-note-rejected">
          ✗ Sent back by{" "}

          {today.reviewed_by_name ||
            reviewerLabel}

          {today.review_note && (
            <>
              {" "}
              — "{today.review_note}"
            </>
          )}

          . Update the figures below
          and resubmit.
        </div>
      )}

      {/* ═════════ DAILY UPDATE FORM ═════════ */}

      <form
        className="fdu-form"
        onSubmit={handleSubmit}
      >
        {/* ── Financial figures ─────────────────────────── */}

        <section className="fdu-grid">

          {/* Cash */}

          <label className="fdu-field">
            <span>
              Cash / Bank Position (₹)
            </span>

            <input
              type="number"
              step="0.01"
              min="0"
              value={
                form.cash_position
              }
              onChange={handleChange(
                "cash_position"
              )}
              required
            />
          </label>

          {/* Collections */}

          <label className="fdu-field">
            <span>
              Today's Collections (₹)
            </span>

            <input
              type="number"
              step="0.01"
              min="0"
              value={
                form.todays_collections
              }
              onChange={handleChange(
                "todays_collections"
              )}
              required
            />
          </label>

          {/* Expenses */}

          <label className="fdu-field">
            <span>
              Today's Expenses (₹)
            </span>

            <input
              type="number"
              step="0.01"
              min="0"
              value={
                form.todays_expenses
              }
              onChange={handleChange(
                "todays_expenses"
              )}
              required
            />
          </label>

          {/* Invoices */}

          <label className="fdu-field">
            <span>
              Invoices Raised Today
            </span>

            <input
              type="number"
              min="0"
              value={
                form.invoices_raised
              }
              onChange={handleChange(
                "invoices_raised"
              )}
            />
          </label>

          {/* Payments */}

          <label className="fdu-field">
            <span>
              Payments Made Today
            </span>

            <input
              type="number"
              min="0"
              value={
                form.payments_made
              }
              onChange={handleChange(
                "payments_made"
              )}
            />
          </label>

          {/* Pending approvals */}

          <label className="fdu-field">
            <span>
              Pending Approvals
            </span>

            <input
              type="number"
              min="0"
              value={
                form.pending_approvals
              }
              onChange={handleChange(
                "pending_approvals"
              )}
            />
          </label>

        </section>

        {/* ── Overall status ────────────────────────────── */}

        <section className="fdu-status-row">

          <span className="fdu-status-label">
            Overall Status
          </span>

          <div className="fdu-status-options">

            {STATUS_OPTIONS.map(
              (opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`fdu-status-pill ${
                    form.overall_status ===
                    opt.value
                      ? "fdu-status-pill--active"
                      : ""
                  }`}
                  style={{
                    "--pill-color":
                      opt.color,
                  }}
                  onClick={() =>
                    setForm(
                      (current) => ({
                        ...current,
                        overall_status:
                          opt.value,
                      })
                    )
                  }
                >
                  {opt.label}
                </button>
              )
            )}

          </div>
        </section>

        {/* ── Summary / Notes ──────────────────────────── */}

        <label className="fdu-field fdu-field--full">

          <span>
            {summaryLabel}
          </span>

          <textarea
            rows={4}
            placeholder={
              summaryPlaceholder
            }
            value={
              form.summary
            }
            onChange={handleChange(
              "summary"
            )}
          />

        </label>

        {/* ── Submit ────────────────────────────────────── */}

        <button
          type="submit"
          className="fdu-submit-btn"
          disabled={saving}
        >
          {saving
            ? "Submitting…"
            : today
            ? "Resubmit for Review"
            : isAccountant
            ? "Submit to Finance Manager"
            : "Submit to CEO"}
        </button>

      </form>

      {/* ═════════ SUBMISSION HISTORY ═════════ */}

      <section className="fdu-history">

        <h2>
          Your Submission History
        </h2>

        {history.length === 0 ? (

          <p className="fdu-history-empty">
            No previous submissions yet.
          </p>

        ) : (

          <table className="fdu-history-table">

            <thead>
              <tr>
                <th>
                  Date
                </th>

                <th>
                  Collections
                </th>

                <th>
                  Expenses
                </th>

                <th>
                  Status
                </th>

                <th>
                  Review
                </th>
              </tr>
            </thead>

            <tbody>

              {history.map(
                (h) => (
                  <tr key={h.id}>

                    {/* Date */}

                    <td>
                      {new Date(
                        h.date
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>

                    {/* Collections */}

                    <td>
                      ₹
                      {Number(
                        h.todays_collections ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    {/* Expenses */}

                    <td>
                      ₹
                      {Number(
                        h.todays_expenses ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    {/* Overall status */}

                    <td>

                      <span
                        className={`fdu-chip fdu-chip--${h.overall_status}`}
                      >
                        {
                          STATUS_OPTIONS.find(
                            (o) =>
                              o.value ===
                              h.overall_status
                          )?.label ||
                            h.overall_status
                        }
                      </span>

                    </td>

                    {/* Review status */}

                    <td>

                      <span
                        className={`fdu-badge ${
                          reviewLabels[
                            h.status
                          ]?.cls || ""
                        }`}
                      >
                        {
                          reviewLabels[
                            h.status
                          ]?.text ||
                            h.status
                        }
                      </span>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        )}

      </section>

    </div>
  );
}