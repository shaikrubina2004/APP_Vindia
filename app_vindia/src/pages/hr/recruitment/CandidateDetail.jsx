// ===== FILE: APP_Vindia/app_vindia/src/pages/hr/recruitment/CandidateDetail.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruitmentService from "../../../services/recruitmentService";
import "./CandidateDetail.css";

const EMPTY_OFFER = { offered_role: "", offered_salary: "", joining_date: "", offer_letter_url: "" };
const EMPTY_ROUND = { round_number: 1, interviewer_name: "", interview_date: "", feedback: "", rating: "" };

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundForm, setRoundForm] = useState(EMPTY_ROUND);

  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recruitmentService.getCandidateById(id);
      setCandidate(res.data);
      setOfferForm({
        offered_role: res.data.offered_role || "",
        offered_salary: res.data.offered_salary || "",
        joining_date: res.data.joining_date ? res.data.joining_date.split("T")[0] : "",
        offer_letter_url: res.data.offer_letter_url || "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load this candidate");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
      : "—";

  /* ── Stage actions ────────────────────────────────────── */

  const moveToScreening = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await recruitmentService.updateCandidateStage(id, { stage: "screening" });
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to update stage");
    } finally {
      setBusy(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await recruitmentService.updateCandidateStage(id, {
        stage: "rejected",
        rejection_reason: rejectionReason.trim() || null,
      });
      setShowRejectModal(false);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to reject candidate");
    } finally {
      setBusy(false);
    }
  };

  /* ── Interview rounds ─────────────────────────────────── */

  const openRoundModal = () => {
    const nextRound = (candidate.interviews?.length || 0) + 1;
    setRoundForm({ ...EMPTY_ROUND, round_number: nextRound });
    setShowRoundModal(true);
  };

  const handleAddRound = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await recruitmentService.addInterviewRound(id, {
        round_number: Number(roundForm.round_number),
        interviewer_name: roundForm.interviewer_name.trim() || null,
        interview_date: roundForm.interview_date || null,
        feedback: roundForm.feedback.trim() || null,
        rating: roundForm.rating ? Number(roundForm.rating) : null,
      });
      setShowRoundModal(false);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to add interview round");
    } finally {
      setBusy(false);
    }
  };

  /* ── Offer ─────────────────────────────────────────────── */

  const handleOfferChange = (e) => {
    const { name, value } = e.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveOffer = async () => {
    setActionError(null);

    if (!offerForm.offered_role.trim() || !offerForm.offered_salary || !offerForm.joining_date) {
      setActionError("Role, salary, and joining date are all required to save an offer.");
      return;
    }

    setBusy(true);
    try {
      await recruitmentService.updateOfferDetails(id, {
        offered_role: offerForm.offered_role.trim(),
        offered_salary: Number(offerForm.offered_salary),
        joining_date: offerForm.joining_date,
        offer_letter_url: offerForm.offer_letter_url.trim() || null,
      });
      setShowOfferForm(false);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to save offer details");
    } finally {
      setBusy(false);
    }
  };

  /* ── Convert to Employee ──────────────────────────────── */

  const handleConvertToEmployee = () => {
    navigate("/hr/add-employee", {
      state: {
        // No `id` here on purpose — AddEmployee.jsx treats state as
        // "editing an existing employee" only when it has an id.
        name: candidate.name,
        email: candidate.email || "",
        phone: candidate.phone || "",
        department: candidate.department || "",
        designation: candidate.offered_role || "",
        join_date: candidate.joining_date || "",
        salary: candidate.offered_salary || "",
        // Marker AddEmployee.jsx uses to know this came from Recruitment,
        // so it can call markHired() after the employee is actually created.
        _fromCandidateId: candidate.id,
      },
    });
  };

  if (loading) return <div className="cd-state">Loading…</div>;

  if (error && !candidate) {
    return (
      <div className="cd-state cd-state--error">
        {error}
        <button onClick={() => navigate("/hr/recruitment/job-openings")}>
          Back to Job Openings
        </button>
      </div>
    );
  }

  const canReject = !["hired", "rejected"].includes(candidate.stage);
  const canAddRound = ["interview", "offer"].includes(candidate.stage) || candidate.interviews.length > 0;
  const canMakeOffer = candidate.interviews.length > 0 && !["offer", "hired", "rejected"].includes(candidate.stage);
  const hasOfferDetails = candidate.offered_role && candidate.offered_salary && candidate.joining_date;

  return (
    <div className="cd-page">
      <button className="cd-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="cd-header">
        <div>
          <h1>{candidate.name}</h1>
          <p className="cd-subtitle">
            Applying for <strong>{candidate.job_title || "—"}</strong>
            {candidate.department ? ` · ${candidate.department}` : ""}
          </p>
        </div>
        <span className={`cd-stage-badge cd-stage-badge--${candidate.stage}`}>{candidate.stage}</span>
      </div>

      <div className="cd-meta">
        <div className="cd-meta-item">
          <span className="cd-meta-label">Email</span>
          <span className="cd-meta-value">{candidate.email || "—"}</span>
        </div>
        <div className="cd-meta-item">
          <span className="cd-meta-label">Phone</span>
          <span className="cd-meta-value">{candidate.phone || "—"}</span>
        </div>
        <div className="cd-meta-item">
          <span className="cd-meta-label">Source</span>
          <span className="cd-meta-value">{candidate.source || "—"}</span>
        </div>
        <div className="cd-meta-item">
          <span className="cd-meta-label">Applied</span>
          <span className="cd-meta-value">{formatDate(candidate.created_at)}</span>
        </div>
      </div>

      {candidate.stage === "rejected" && candidate.rejection_reason && (
        <div className="cd-rejected-note">Rejected: {candidate.rejection_reason}</div>
      )}

      {candidate.stage === "hired" && (
        <div className="cd-hired-note">
          Hired{candidate.hired_employee_id ? ` — Employee #${candidate.hired_employee_id}` : ""}
        </div>
      )}

      {actionError && <p className="cd-inline-error">{actionError}</p>}

      <div className="cd-actions">
        {candidate.stage === "applied" && (
          <button className="cd-action-btn" disabled={busy} onClick={moveToScreening}>
            Start Screening
          </button>
        )}
        {canAddRound && candidate.stage !== "hired" && candidate.stage !== "rejected" && (
          <button className="cd-action-btn" disabled={busy} onClick={openRoundModal}>
            + Add Interview Round
          </button>
        )}
        {canMakeOffer && (
          <button className="cd-action-btn" disabled={busy} onClick={() => setShowOfferForm(true)}>
            Make Offer
          </button>
        )}
        {candidate.stage === "offer" && !showOfferForm && (
          <button className="cd-action-btn" disabled={busy} onClick={() => setShowOfferForm(true)}>
            Edit Offer
          </button>
        )}
        {candidate.stage === "offer" && hasOfferDetails && (
          <button className="cd-primary-btn" disabled={busy} onClick={handleConvertToEmployee}>
            Convert to Employee →
          </button>
        )}
        {canReject && (
          <button className="cd-reject-btn" disabled={busy} onClick={openRejectModal}>
            Reject
          </button>
        )}
      </div>

      {showOfferForm && (
        <div className="cd-section">
          <h2>Offer Details</h2>
          <div className="cd-field-row">
            <label className="cd-field">
              Offered Role *
              <input
                name="offered_role"
                value={offerForm.offered_role}
                onChange={handleOfferChange}
              />
            </label>
            <label className="cd-field">
              Offered Salary *
              <input
                type="number"
                name="offered_salary"
                value={offerForm.offered_salary}
                onChange={handleOfferChange}
              />
            </label>
          </div>
          <div className="cd-field-row">
            <label className="cd-field">
              Joining Date *
              <input
                type="date"
                name="joining_date"
                value={offerForm.joining_date}
                onChange={handleOfferChange}
              />
            </label>
            <label className="cd-field">
              Offer Letter URL
              <input
                name="offer_letter_url"
                value={offerForm.offer_letter_url}
                onChange={handleOfferChange}
                placeholder="Optional link"
              />
            </label>
          </div>
          <div className="cd-modal-actions">
            <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowOfferForm(false)}>
              Cancel
            </button>
            <button className="cd-primary-btn" disabled={busy} onClick={handleSaveOffer}>
              {busy ? "Saving…" : "Save Offer"}
            </button>
          </div>
        </div>
      )}

      <div className="cd-section">
        <h2>Interview Rounds</h2>
        {candidate.interviews.length === 0 ? (
          <p className="cd-empty">No interview rounds logged yet.</p>
        ) : (
          <table className="cd-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Interviewer</th>
                <th>Date</th>
                <th>Rating</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {candidate.interviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.round_number}</td>
                  <td>{r.interviewer_name || "—"}</td>
                  <td>{formatDate(r.interview_date)}</td>
                  <td>{r.rating ? `${r.rating} / 5` : "—"}</td>
                  <td>{r.feedback || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRejectModal && (
        <div className="cd-modal-backdrop" onClick={() => !busy && setShowRejectModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject Candidate</h2>
            <label className="cd-field">
              Reason (optional)
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </label>
            <div className="cd-modal-actions">
              <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="cd-reject-btn" disabled={busy} onClick={handleReject}>
                {busy ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoundModal && (
        <div className="cd-modal-backdrop" onClick={() => !busy && setShowRoundModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Interview Round</h2>
            <div className="cd-field-row">
              <label className="cd-field">
                Round #
                <input
                  type="number"
                  min="1"
                  value={roundForm.round_number}
                  onChange={(e) => setRoundForm((p) => ({ ...p, round_number: e.target.value }))}
                />
              </label>
              <label className="cd-field">
                Date
                <input
                  type="date"
                  value={roundForm.interview_date}
                  onChange={(e) => setRoundForm((p) => ({ ...p, interview_date: e.target.value }))}
                />
              </label>
            </div>
            <label className="cd-field">
              Interviewer
              <input
                value={roundForm.interviewer_name}
                onChange={(e) => setRoundForm((p) => ({ ...p, interviewer_name: e.target.value }))}
              />
            </label>
            <label className="cd-field">
              Rating
              <select
                value={roundForm.rating}
                onChange={(e) => setRoundForm((p) => ({ ...p, rating: e.target.value }))}
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} / 5</option>
                ))}
              </select>
            </label>
            <label className="cd-field">
              Feedback
              <textarea
                rows={3}
                value={roundForm.feedback}
                onChange={(e) => setRoundForm((p) => ({ ...p, feedback: e.target.value }))}
              />
            </label>
            <div className="cd-modal-actions">
              <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowRoundModal(false)}>
                Cancel
              </button>
              <button className="cd-primary-btn" disabled={busy} onClick={handleAddRound}>
                {busy ? "Saving…" : "Add Round"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;