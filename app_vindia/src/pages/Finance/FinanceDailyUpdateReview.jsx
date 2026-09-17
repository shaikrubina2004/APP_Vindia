// ===== FILE: APP_Vindia/app_vindia/src/pages/Finance/FinanceDailyUpdateReview.jsx =====

import React, { useEffect, useMemo, useState } from "react";
import financeDailyUpdateService from "../../services/financeDailyUpdateService";
import "./FinanceDailyUpdate.css";

const FinanceDailyUpdateReview = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const [note, setNote] = useState("");

  const loadUpdates = async () => {
    try {
      setLoading(true);

      const response = await financeDailyUpdateService.getAllUpdates({
        status: statusFilter,
      });

      setUpdates(response?.data?.data || []);
    } catch (error) {
      console.error("Failed to load finance daily updates:", error);

      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, [statusFilter]);

  const pendingCount = useMemo(
    () =>
      updates.filter(
        (item) => String(item.status || "").toLowerCase() === "pending"
      ).length,
    [updates]
  );

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "approved") return "fdu-badge-approved";
    if (normalized === "rejected") return "fdu-badge-rejected";

    return "fdu-badge-pending";
  };

  const getStatusText = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "approved") {
      return "Approved";
    }

    if (normalized === "rejected") {
      return "Rejected";
    }

    return "Pending Review";
  };

  const openReview = (update) => {
    setSelectedUpdate(update);
    setNote(update.review_note || "");
  };

  const closeReview = () => {
    if (reviewingId) return;

    setSelectedUpdate(null);
    setNote("");
  };

  const submitReview = async (status) => {
    if (!selectedUpdate) return;

    try {
      setReviewingId(selectedUpdate.id);

      await financeDailyUpdateService.reviewUpdate(selectedUpdate.id, {
        status,
        note: note.trim(),
      });

      setSelectedUpdate(null);
      setNote("");

      await loadUpdates();
    } catch (error) {
      console.error("Failed to review daily update:", error);

      alert(
        error?.response?.data?.message ||
          "Failed to update the daily update review."
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="finance-daily-update-page">
      {/* ───────────────── Page Header ───────────────── */}
      <div className="fdu-page-header">
        <div>
          <h1>Daily Update Review</h1>

          <p>
            Review daily financial updates submitted by the Accountant.
          </p>
        </div>

        <div className="fdu-header-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fdu-filter-select"
          >
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All Updates</option>
          </select>

          <button
            type="button"
            className="fdu-secondary-btn"
            onClick={loadUpdates}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ───────────────── KPI Cards ───────────────── */}
      <div className="fdu-kpi-grid">
        <div className="fdu-kpi-card">
          <div className="fdu-kpi-label">Updates Found</div>
          <div className="fdu-kpi-value">{updates.length}</div>
        </div>

        <div className="fdu-kpi-card">
          <div className="fdu-kpi-label">Pending in View</div>
          <div className="fdu-kpi-value">{pendingCount}</div>
        </div>
      </div>

      {/* ───────────────── Updates Table ───────────────── */}
      <div className="fdu-card">
        <div className="fdu-card-header">
          <div>
            <h2>Accountant Submissions</h2>
            <p>Review and approve or reject submitted daily updates.</p>
          </div>
        </div>

        {loading ? (
          <div className="fdu-empty-state">
            Loading daily updates…
          </div>
        ) : updates.length === 0 ? (
          <div className="fdu-empty-state">
            No daily updates found for the selected filter.
          </div>
        ) : (
          <div className="fdu-table-wrapper">
            <table className="fdu-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Submitted By</th>
                  <th>Cash Position</th>
                  <th>Collections</th>
                  <th>Expenses</th>
                  <th>Invoices Raised</th>
                  <th>Payments Made</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {updates.map((update) => (
                  <tr key={update.id}>
                    <td>{formatDate(update.date)}</td>

                    <td>
                      <div className="fdu-user-cell">
                        <strong>
                          {update.submitter_name ||
                            update.submitted_by_name ||
                            update.submitted_by ||
                            "Accountant"}
                        </strong>

                        {update.submitter_email && (
                          <span>{update.submitter_email}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {update.cash_position !== null &&
                      update.cash_position !== undefined &&
                      update.cash_position !== ""
                        ? update.cash_position
                        : "-"}
                    </td>

                    <td>
                      {update.todays_collections !== null &&
                      update.todays_collections !== undefined &&
                      update.todays_collections !== ""
                        ? update.todays_collections
                        : "-"}
                    </td>

                    <td>
                      {update.todays_expenses !== null &&
                      update.todays_expenses !== undefined &&
                      update.todays_expenses !== ""
                        ? update.todays_expenses
                        : "-"}
                    </td>

                    <td>
                      {update.invoices_raised !== null &&
                      update.invoices_raised !== undefined &&
                      update.invoices_raised !== ""
                        ? update.invoices_raised
                        : "-"}
                    </td>

                    <td>
                      {update.payments_made !== null &&
                      update.payments_made !== undefined &&
                      update.payments_made !== ""
                        ? update.payments_made
                        : "-"}
                    </td>

                    <td>
                      <span
                        className={`fdu-badge ${getStatusClass(
                          update.status
                        )}`}
                      >
                        {getStatusText(update.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="fdu-review-btn"
                        onClick={() => openReview(update)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────── Review Modal ───────────────── */}
      {selectedUpdate && (
        <div className="fdu-modal-backdrop" onClick={closeReview}>
          <div
            className="fdu-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fdu-modal-header">
              <div>
                <h2>Review Daily Update</h2>

                <p>
                  {formatDate(selectedUpdate.date)} ·{" "}
                  {selectedUpdate.submitter_name ||
                    selectedUpdate.submitted_by_name ||
                    "Accountant"}
                </p>
              </div>

              <button
                type="button"
                className="fdu-modal-close"
                onClick={closeReview}
                disabled={!!reviewingId}
              >
                ×
              </button>
            </div>

            <div className="fdu-modal-body">
              <div className="fdu-review-grid">
                <div className="fdu-review-field">
                  <span>Cash Position</span>
                  <strong>
                    {selectedUpdate.cash_position ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Today's Collections</span>
                  <strong>
                    {selectedUpdate.todays_collections ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Today's Expenses</span>
                  <strong>
                    {selectedUpdate.todays_expenses ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Invoices Raised</span>
                  <strong>
                    {selectedUpdate.invoices_raised ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Payments Made</span>
                  <strong>
                    {selectedUpdate.payments_made ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Pending Approvals</span>
                  <strong>
                    {selectedUpdate.pending_approvals ?? "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Overall Status</span>
                  <strong>
                    {selectedUpdate.overall_status || "-"}
                  </strong>
                </div>

                <div className="fdu-review-field">
                  <span>Submitted At</span>
                  <strong>
                    {formatDateTime(
                      selectedUpdate.created_at ||
                        selectedUpdate.submitted_at
                    )}
                  </strong>
                </div>
              </div>

              <div className="fdu-summary-preview">
                <div className="fdu-summary-preview-label">
                  Accountant Summary
                </div>

                <div className="fdu-summary-preview-text">
                  {selectedUpdate.summary || "No summary provided."}
                </div>
              </div>

              <div className="fdu-review-note">
                <label htmlFor="review-note">
                  Review Note
                </label>

                <textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter a review note, correction request, or approval comment..."
                  rows={5}
                  disabled={!!reviewingId}
                />
              </div>
            </div>

            <div className="fdu-modal-footer">
              <button
                type="button"
                className="fdu-cancel-btn"
                onClick={closeReview}
                disabled={!!reviewingId}
              >
                Cancel
              </button>

              <button
                type="button"
                className="fdu-reject-btn"
                onClick={() => submitReview("rejected")}
                disabled={!!reviewingId}
              >
                {reviewingId === selectedUpdate.id
                  ? "Saving…"
                  : "Reject"}
              </button>

              <button
                type="button"
                className="fdu-approve-btn"
                onClick={() => submitReview("approved")}
                disabled={!!reviewingId}
              >
                {reviewingId === selectedUpdate.id
                  ? "Saving…"
                  : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDailyUpdateReview;