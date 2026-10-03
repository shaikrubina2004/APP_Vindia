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
  const [actionMsg, setActionMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundForm, setRoundForm] = useState(EMPTY_ROUND);

  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);

  // New pipeline-stage UI state
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [screeningNotes, setScreeningNotes] = useState("");

  const [showSendTestForm, setShowSendTestForm] = useState(false);
  const [testLink, setTestLink] = useState("");

  const [showScoreForm, setShowScoreForm] = useState(false);
  const [testScore, setTestScore] = useState("");

  const [showBgvForm, setShowBgvForm] = useState(false);
  const [bgvForm, setBgvForm] = useState({ bgv_status: "in_progress", bgv_document_url: "", bgv_notes: "" });

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
      setBgvForm({
        bgv_status: res.data.bgv_status || "in_progress",
        bgv_document_url: res.data.bgv_document_url || "",
        bgv_notes: res.data.bgv_notes || "",
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

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";

  const clearMsgs = () => {
    setActionError(null);
    setActionMsg(null);
  };

  /* ── Reject (universal, any active stage) ─────────────── */

  const openRejectModal = () => {
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    setBusy(true);
    clearMsgs();
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

  /* ── Screening ─────────────────────────────────────────── */

  const handleScreeningDecision = async (decision) => {
    if (decision === "reject" && !rejectionReason.trim()) {
      setActionError("Add a reason before rejecting.");
      return;
    }
    setBusy(true);
    clearMsgs();
    try {
      const res = await recruitmentService.submitScreening(id, {
        screening_notes: screeningNotes.trim() || null,
        decision,
        rejection_reason: decision === "reject" ? rejectionReason.trim() : null,
      });
      setShowScreeningForm(false);
      setActionMsg(
        res.data.emailSent
          ? `Candidate ${decision === "qualify" ? "qualified" : "rejected"} — email sent.`
          : `Saved, but the email could not be sent (check the candidate has an email on file, or check SMTP settings).`
      );
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to submit screening decision");
    } finally {
      setBusy(false);
    }
  };

  /* ── Aptitude Test ─────────────────────────────────────── */

  const handleSendTest = async () => {
    if (!testLink.trim()) {
      setActionError("Enter a test link first.");
      return;
    }
    setBusy(true);
    clearMsgs();
    try {
      const res = await recruitmentService.sendAptitudeTestLink(id, testLink.trim());
      setShowSendTestForm(false);
      setActionMsg(res.data.emailSent ? "Test link emailed to the candidate." : "Saved, but the email could not be sent.");
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to send the aptitude test");
    } finally {
      setBusy(false);
    }
  };

  const handleRecordScore = async () => {
    if (testScore === "" || isNaN(Number(testScore))) {
      setActionError("Enter a numeric score.");
      return;
    }
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.completeAptitudeTest(id, Number(testScore));
      setShowScoreForm(false);
      setTestScore("");
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to record the test score");
    } finally {
      setBusy(false);
    }
  };

  /* ── Interview Rounds ──────────────────────────────────── */

  const openRoundModal = () => {
    const nextRound = (candidate.interviews?.length || 0) + 1;
    setRoundForm({ ...EMPTY_ROUND, round_number: nextRound });
    setShowRoundModal(true);
  };

  const handleAddRound = async () => {
    setBusy(true);
    clearMsgs();
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

  /* ── Internal Approval ─────────────────────────────────── */

  const handleMoveToApproval = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.moveToApproval(id);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to move to approval");
    } finally {
      setBusy(false);
    }
  };

  const handleApprovalDecision = async (decision) => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.recordApproval(id, decision);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to record approval decision");
    } finally {
      setBusy(false);
    }
  };

  /* ── BGV ───────────────────────────────────────────────── */

  const handleBgvChange = (e) => {
    const { name, value } = e.target;
    setBgvForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBgv = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.updateBGV(id, bgvForm);
      setShowBgvForm(false);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to save BGV status");
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
    clearMsgs();
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

  const handleReleaseOffer = async () => {
    setBusy(true);
    clearMsgs();
    try {
      const res = await recruitmentService.releaseOffer(id);
      setActionMsg(res.data.emailSent ? "Offer emailed to the candidate." : "Could not send the offer email — check SMTP settings.");
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to release the offer");
    } finally {
      setBusy(false);
    }
  };

  /* ── Convert to Employee ──────────────────────────────── */

  const handleConvertToEmployee = () => {
    navigate("/hr/add-employee", {
      state: {
        name: candidate.name,
        email: candidate.email || "",
        phone: candidate.phone || "",
        department: candidate.department || "",
        designation: candidate.offered_role || "",
        join_date: candidate.joining_date || "",
        salary: candidate.offered_salary || "",
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

  const stage = candidate.stage;
  const canReject = !["hired", "rejected"].includes(stage);
  const hasOfferDetails = candidate.offered_role && candidate.offered_salary && candidate.joining_date;
  const canMoveToApproval = stage === "interview" && candidate.interviews.length > 0;

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
        <span className={`cd-stage-badge cd-stage-badge--${stage}`}>{stage.replace("_", " ")}</span>
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

      {candidate.resume_url && (
        <a className="cd-resume-link" href={candidate.resume_url} target="_blank" rel="noreferrer">
          View Resume ↗
        </a>
      )}

      {candidate.stage === "rejected" && candidate.rejection_reason && (
        <div className="cd-rejected-note">Rejected: {candidate.rejection_reason}</div>
      )}

      {candidate.stage === "hired" && (
        <div className="cd-hired-note">
          Hired{candidate.hired_employee_id ? ` — Employee #${candidate.hired_employee_id}` : ""}
        </div>
      )}

      {actionMsg && <p className="cd-inline-success">{actionMsg}</p>}
      {actionError && <p className="cd-inline-error">{actionError}</p>}

      {/* ═══ SCREENING ═══ */}
      {stage === "applied" && (
        <div className="cd-section">
          <h2>Screening</h2>
          {!showScreeningForm ? (
            <button className="cd-action-btn" disabled={busy} onClick={() => setShowScreeningForm(true)}>
              Start Screening
            </button>
          ) : (
            <>
              <label className="cd-field">
                Fit notes vs. job description
                <textarea
                  rows={3}
                  value={screeningNotes}
                  onChange={(e) => setScreeningNotes(e.target.value)}
                  placeholder="How does this resume match the JD?"
                />
              </label>
              <div className="cd-modal-actions">
                <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowScreeningForm(false)}>
                  Cancel
                </button>
                <button
                  className="cd-reject-btn"
                  disabled={busy}
                  onClick={() => {
                    setShowScreeningForm(false);
                    setRejectionReason("");
                    setShowRejectModal(true);
                  }}
                >
                  Reject
                </button>
                <button className="cd-primary-btn" disabled={busy} onClick={() => handleScreeningDecision("qualify")}>
                  {busy ? "Saving…" : "Qualify →"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ APTITUDE TEST ═══ */}
      {stage === "aptitude_test" && (
        <div className="cd-section">
          <h2>Aptitude Test</h2>
          {candidate.screening_notes && (
            <p className="cd-note"><strong>Screening notes:</strong> {candidate.screening_notes}</p>
          )}

          {candidate.aptitude_test_status === "not_sent" && !showSendTestForm && (
            <button className="cd-action-btn" disabled={busy} onClick={() => setShowSendTestForm(true)}>
              Send Aptitude Test
            </button>
          )}

          {showSendTestForm && (
            <>
              <label className="cd-field">
                Test link
                <input value={testLink} onChange={(e) => setTestLink(e.target.value)} placeholder="https://..." />
              </label>
              <div className="cd-modal-actions">
                <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowSendTestForm(false)}>
                  Cancel
                </button>
                <button className="cd-primary-btn" disabled={busy} onClick={handleSendTest}>
                  {busy ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}

          {candidate.aptitude_test_status === "sent" && (
            <>
              <p className="cd-note">
                Test link sent: <a href={candidate.aptitude_test_link} target="_blank" rel="noreferrer">{candidate.aptitude_test_link}</a>
              </p>
              {!showScoreForm ? (
                <button className="cd-action-btn" disabled={busy} onClick={() => setShowScoreForm(true)}>
                  Record Test Score
                </button>
              ) : (
                <>
                  <label className="cd-field">
                    Score
                    <input type="number" value={testScore} onChange={(e) => setTestScore(e.target.value)} />
                  </label>
                  <div className="cd-modal-actions">
                    <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowScoreForm(false)}>
                      Cancel
                    </button>
                    <button className="cd-primary-btn" disabled={busy} onClick={handleRecordScore}>
                      {busy ? "Saving…" : "Save Score & Move to Interview"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {candidate.aptitude_test_status === "completed" && (
            <p className="cd-note">Score recorded: <strong>{candidate.aptitude_test_score}</strong></p>
          )}
        </div>
      )}

      {/* ═══ INTERVIEW ═══ */}
      {(stage === "interview" || candidate.interviews.length > 0) && stage !== "applied" && stage !== "aptitude_test" && (
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
          {stage === "interview" && (
            <div className="cd-actions" style={{ marginTop: "0.9rem" }}>
              <button className="cd-action-btn" disabled={busy} onClick={openRoundModal}>
                + Add Interview Round
              </button>
              {canMoveToApproval && (
                <button className="cd-primary-btn" disabled={busy} onClick={handleMoveToApproval}>
                  Move to Approval →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ INTERNAL APPROVAL ═══ */}
      {stage === "approval" && (
        <div className="cd-section">
          <h2>Internal Approval</h2>
          <p className="cd-note">Review the candidate's profile and interview feedback above, then approve or reject.</p>
          <div className="cd-modal-actions">
            <button className="cd-reject-btn" disabled={busy} onClick={() => handleApprovalDecision("rejected")}>
              Reject
            </button>
            <button className="cd-primary-btn" disabled={busy} onClick={() => handleApprovalDecision("approved")}>
              {busy ? "Saving…" : "Approve →"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ BGV ═══ */}
      {stage === "bgv" && (
        <div className="cd-section">
          <h2>Background Verification</h2>
          {!showBgvForm ? (
            <>
              <p className="cd-note">
                Status: <span className={`cd-stage-badge cd-stage-badge--${candidate.bgv_status}`}>{candidate.bgv_status.replace("_", " ")}</span>
              </p>
              {candidate.bgv_document_url && (
                <p className="cd-note">
                  Document: <a href={candidate.bgv_document_url} target="_blank" rel="noreferrer">{candidate.bgv_document_url}</a>
                </p>
              )}
              {candidate.bgv_notes && <p className="cd-note">{candidate.bgv_notes}</p>}
              <button className="cd-action-btn" disabled={busy} onClick={() => setShowBgvForm(true)}>
                Update BGV
              </button>
            </>
          ) : (
            <>
              <label className="cd-field">
                Status
                <select name="bgv_status" value={bgvForm.bgv_status} onChange={handleBgvChange}>
                  <option value="in_progress">In Progress</option>
                  <option value="cleared">Cleared</option>
                  <option value="flagged">Flagged</option>
                </select>
              </label>
              <label className="cd-field">
                Document link
                <input
                  name="bgv_document_url"
                  value={bgvForm.bgv_document_url}
                  onChange={handleBgvChange}
                  placeholder="Link to BGV report/document"
                />
              </label>
              <label className="cd-field">
                Notes
                <textarea rows={3} name="bgv_notes" value={bgvForm.bgv_notes} onChange={handleBgvChange} />
              </label>
              <div className="cd-modal-actions">
                <button className="cd-cancel-btn" disabled={busy} onClick={() => setShowBgvForm(false)}>
                  Cancel
                </button>
                <button className="cd-primary-btn" disabled={busy} onClick={handleSaveBgv}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
              <p className="cd-note">Marking "Cleared" automatically moves the candidate to the Offer stage.</p>
            </>
          )}
        </div>
      )}

      {/* ═══ OFFER ═══ */}
      {stage === "offer" && (
        <div className="cd-section">
          <h2>Offer</h2>
          {!showOfferForm ? (
            hasOfferDetails ? (
              <>
                <div className="cd-meta" style={{ marginBottom: "0.9rem" }}>
                  <div className="cd-meta-item">
                    <span className="cd-meta-label">Role</span>
                    <span className="cd-meta-value">{candidate.offered_role}</span>
                  </div>
                  <div className="cd-meta-item">
                    <span className="cd-meta-label">Salary</span>
                    <span className="cd-meta-value">₹{Number(candidate.offered_salary).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cd-meta-item">
                    <span className="cd-meta-label">Joining Date</span>
                    <span className="cd-meta-value">{formatDate(candidate.joining_date)}</span>
                  </div>
                </div>
                <div className="cd-actions">
                  <button className="cd-action-btn" disabled={busy} onClick={() => setShowOfferForm(true)}>
                    Edit Offer
                  </button>
                  <button className="cd-action-btn" disabled={busy} onClick={handleReleaseOffer}>
                    {busy ? "Sending…" : "Release Offer (Email)"}
                  </button>
                  <button className="cd-primary-btn" disabled={busy} onClick={handleConvertToEmployee}>
                    Convert to Employee →
                  </button>
                </div>
              </>
            ) : (
              <button className="cd-action-btn" disabled={busy} onClick={() => setShowOfferForm(true)}>
                Add Offer Details
              </button>
            )
          ) : (
            <>
              <div className="cd-field-row">
                <label className="cd-field">
                  Offered Role *
                  <input name="offered_role" value={offerForm.offered_role} onChange={handleOfferChange} />
                </label>
                <label className="cd-field">
                  Offered Salary *
                  <input type="number" name="offered_salary" value={offerForm.offered_salary} onChange={handleOfferChange} />
                </label>
              </div>
              <div className="cd-field-row">
                <label className="cd-field">
                  Joining Date *
                  <input type="date" name="joining_date" value={offerForm.joining_date} onChange={handleOfferChange} />
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
            </>
          )}
        </div>
      )}

      {/* ═══ EMAIL HISTORY ═══ */}
      <div className="cd-section">
        <h2>Email History</h2>
        {!candidate.emails || candidate.emails.length === 0 ? (
          <p className="cd-empty">No emails sent yet.</p>
        ) : (
          <table className="cd-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Sent To</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {candidate.emails.map((e) => (
                <tr key={e.id}>
                  <td style={{ textTransform: "capitalize" }}>{e.email_type.replace("_", " ")}</td>
                  <td>{e.subject || "—"}</td>
                  <td>{e.sent_to || "—"}</td>
                  <td>
                    <span className={`cd-email-status cd-email-status--${e.status}`}>{e.status}</span>
                  </td>
                  <td>{formatDateTime(e.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canReject && (
        <div className="cd-actions">
          <button className="cd-reject-btn" disabled={busy} onClick={openRejectModal}>
            Reject Candidate
          </button>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

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