// ===== FILE: APP_Vindia/app_vindia/src/pages/hr/recruitment/CandidateDetail.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruitmentService from "../../../services/recruitmentService";
import { getEmployees } from "../../../services/employeeService";
import "./CandidateDetail.css";

// The aptitude test is taken on the separate aptitude portal, which emails the
// candidate its own invitation. Change the address with VITE_APTITUDE_PORTAL_URL.
const APTITUDE_PORTAL_URL =
  import.meta.env?.VITE_APTITUDE_PORTAL_URL ||
  "https://aptitude.vindiainfrasec.com/admin/invite";

const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Intern"];
const MANAGER_WORDS = ["manager", "ceo", "design lead", "bdm"];

const EMPTY_OFFER = {
  offered_role: "",
  offered_salary: "",
  joining_date: "",
  offered_location: "",
  offered_employment_type: "",
  offered_manager_id: "",
  offer_letter_url: "",
};

const EMPTY_ROUND = {
  round_number: 1,
  date: "",
  time: "",
  mode: "online",
  location_or_link: "",
  interviewer_name: "",
};

// What each row in the History table is called.
const HISTORY_LABELS = {
  qualified: "Qualified email",
  rejected: "Rejection email",
  aptitude_test: "Aptitude test email (old)",
  aptitude_score: "Aptitude score",
  aptitude_decision: "Aptitude decision",
  interview_scheduled: "Interview scheduled",
  bgv_request: "BGV request email",
  offer_release: "Offer email",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  login_credentials: "Login credentials",
};
const historyLabel = (t) =>
  HISTORY_LABELS[t] || String(t || "").replace(/_/g, " ");

const stageLabel = (s) =>
  ({ aptitude_test: "Aptitude Test", bgv: "BGV" })[s] ||
  String(s || "").replace(/_/g, " ");

// small coloured pill used for statuses (inline so no CSS file change is needed)
const PILL_COLORS = {
  sent: ["#dcfce7", "#166534"],
  failed: ["#fee2e2", "#991b1b"],
  recorded: ["#e0e7ff", "#3730a3"],
  scheduled: ["#dbeafe", "#1e40af"],
  completed: ["#dcfce7", "#166534"],
  accepted: ["#dcfce7", "#166534"],
  declined: ["#fee2e2", "#991b1b"],
  waiting: ["#fef3c7", "#92400e"],
};
const Pill = ({ kind, children }) => {
  const [bg, fg] = PILL_COLORS[kind] || ["#f1f5f9", "#475569"];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState([]);

  // reject modal: 'generic' (any stage) | 'screening' (emails) | 'aptitude' (emails)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMode, setRejectMode] = useState("generic");
  const [rejectionReason, setRejectionReason] = useState("");

  // screening
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [screeningNotes, setScreeningNotes] = useState("");

  // aptitude: the score is typed here; the test itself is on the portal
  const [scoreForm, setScoreForm] = useState({ score: "", max: "" });
  const [editingScore, setEditingScore] = useState(false);

  // interviews
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundForm, setRoundForm] = useState(EMPTY_ROUND);
  const [feedbackRound, setFeedbackRound] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: "",
    feedback: "",
  });

  // bgv
  const [bgvDefaultLink, setBgvDefaultLink] = useState(null); // from backend/.env
  const [showBgvSendForm, setShowBgvSendForm] = useState(false); // resend / change link
  const [bgvSend, setBgvSend] = useState({
    link_source: "custom", // 'default' | 'custom'
    drive_link: "",
    deadline: "",
    note: "",
  });
  const [bgvNotes, setBgvNotes] = useState("");
  const [bgvError, setBgvError] = useState(null); // shown inside the BGV panel

  // offer
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);
  const [responseModal, setResponseModal] = useState(null); // 'accepted' | 'declined' | null
  const [responseNote, setResponseNote] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await recruitmentService.getCandidateById(id);
        const c = res.data;
        setCandidate(c);
        setOfferForm({
          offered_role: c.offered_role || c.job_title || "",
          offered_salary: c.offered_salary || "",
          joining_date: (c.joining_date_text || "").slice(0, 10),
          offered_location: c.offered_location || "",
          offered_employment_type: c.offered_employment_type || "",
          offered_manager_id: c.offered_manager_id || "",
          offer_letter_url: c.offer_letter_url || "",
        });
        setBgvNotes(c.bgv_notes || "");
        setScoreForm({
          score: c.aptitude_test_score ?? "",
          max: c.aptitude_test_max ?? "",
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load this candidate");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  // is a default BGV drive link configured on the server?
  useEffect(() => {
    recruitmentService
      .getBgvConfig()
      .then((res) => {
        const link = res.data?.defaultDriveLink || null;
        setBgvDefaultLink(link);
        if (link) setBgvSend((prev) => ({ ...prev, link_source: "default" }));
      })
      .catch(() => {});
  }, []);

  // people who can be named as the reporting manager in the offer
  useEffect(() => {
    (async () => {
      try {
        const res = await getEmployees();
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch {
        setEmployees([]);
      }
    })();
  }, []);

  const managers = employees.filter((e) => {
    const d = (e.designation || "").toLowerCase();
    return MANAGER_WORDS.some((w) => d.includes(w));
  });

  /* ── formatting helpers ──────────────────────────────── */

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  // "YYYY-MM-DDTHH:mm" as typed by HR -> readable, with no time-zone shifting
  const formatLocal = (value) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || "");
    if (!m) return "—";
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const clearMsgs = () => {
    setActionError(null);
    setActionMsg(null);
  };

  /* ── Reject ──────────────────────────────────────────── */

  const openRejectModal = (mode = "generic") => {
    setRejectMode(mode);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    setBusy(true);
    clearMsgs();
    const reason = rejectionReason.trim() || null;
    try {
      if (rejectMode === "aptitude") {
        const res = await recruitmentService.decideAptitude(id, {
          decision: "reject",
          rejection_reason: reason,
        });
        setActionMsg(
          res.data.emailSent
            ? "Candidate rejected — email sent."
            : "Candidate rejected, but the email could not be sent (check SMTP settings).",
        );
      } else if (rejectMode === "screening") {
        const res = await recruitmentService.submitScreening(id, {
          screening_notes: screeningNotes.trim() || null,
          decision: "reject",
          rejection_reason: reason,
        });
        setActionMsg(
          res.data.emailSent
            ? "Candidate rejected — email sent."
            : "Candidate rejected, but the email could not be sent (check SMTP settings).",
        );
      } else {
        await recruitmentService.updateCandidateStage(id, {
          stage: "rejected",
          rejection_reason: reason,
        });
      }
      setShowRejectModal(false);
      setShowScreeningForm(false);
      await load(true);
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to reject candidate");
    } finally {
      setBusy(false);
    }
  };

  /* ── Screening ───────────────────────────────────────── */

  const handleScreeningQualify = async () => {
    setBusy(true);
    clearMsgs();
    try {
      const res = await recruitmentService.submitScreening(id, {
        screening_notes: screeningNotes.trim() || null,
        decision: "qualify",
        rejection_reason: null,
      });
      setShowScreeningForm(false);
      setActionMsg(
        res.data.emailSent
          ? "Candidate qualified — email sent."
          : "Saved, but the email could not be sent (check the candidate has an email on file, or check SMTP settings).",
      );
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to submit screening decision",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── Aptitude test (score only — no link is sent from here) ── */

  const handleSaveScore = async () => {
    clearMsgs();
    const { score, max } = scoreForm;
    if (score === "" || isNaN(Number(score))) {
      setActionError("Enter the aptitude score as a number.");
      return;
    }
    if (max !== "" && !(Number(max) > 0)) {
      setActionError("'Out of' must be a number above zero.");
      return;
    }
    if (max !== "" && Number(score) > Number(max)) {
      setActionError("The score cannot be higher than the total marks.");
      return;
    }
    setBusy(true);
    try {
      await recruitmentService.completeAptitudeTest(
        id,
        Number(score),
        max === "" ? null : Number(max),
      );
      setEditingScore(false);
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to record the aptitude score",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAptitudeQualify = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.decideAptitude(id, { decision: "qualify" });
      setActionMsg("Qualified — you can now schedule the interview rounds.");
      await load(true);
    } catch (err) {
      console.error("DECISION ERROR:", err); // <-- add this

      setActionError(
        err.response?.data?.error || "Failed to save the decision",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── Interview rounds ────────────────────────────────── */

  const openRoundModal = () => {
    clearMsgs();
    setRoundForm({
      ...EMPTY_ROUND,
      round_number: (candidate.interviews?.length || 0) + 1,
    });
    setShowRoundModal(true);
  };

  const handleScheduleRound = async () => {
    clearMsgs();
    const f = roundForm;
    if (!f.date || !f.time) {
      setActionError("Choose the interview date and time.");
      return;
    }
    if (!f.location_or_link.trim()) {
      setActionError(
        f.mode === "online" ? "Add the meeting link." : "Add the venue.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await recruitmentService.scheduleInterview(id, {
        round_number: Number(f.round_number),
        scheduled_at: `${f.date}T${f.time}`,
        mode: f.mode,
        location_or_link: f.location_or_link.trim(),
        interviewer_name: f.interviewer_name.trim() || null,
      });
      setShowRoundModal(false);
      setActionMsg(
        res.data.emailSent
          ? "Interview scheduled — email sent to the candidate."
          : "Interview scheduled, but the email could not be sent (check SMTP settings).",
      );
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to schedule the interview",
      );
    } finally {
      setBusy(false);
    }
  };

  const openFeedback = (round) => {
    clearMsgs();
    setFeedbackRound(round);
    setFeedbackForm({
      rating: round.rating || "",
      feedback: round.feedback || "",
    });
  };

  const handleSaveFeedback = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.submitInterviewFeedback(id, feedbackRound.id, {
        rating: feedbackForm.rating ? Number(feedbackForm.rating) : null,
        feedback: feedbackForm.feedback.trim() || null,
      });
      setFeedbackRound(null);
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to save the feedback",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── Internal approval ───────────────────────────────── */

  const handleMoveToApproval = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.moveToApproval(id);
      await load(true);
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
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to record approval decision",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── BGV ─────────────────────────────────────────────── */

  const handleBgvSendChange = (e) => {
    const { name, value } = e.target;
    setBgvSend((prev) => ({ ...prev, [name]: value }));
    setBgvError(null);
  };

  // "drive.google.com/x" -> "https://drive.google.com/x"; returns null if it
  // still does not look like a real web address (e.g. just "link").
  const normalizeDriveLink = (raw) => {
    const text = String(raw || "").trim();
    if (!text) return null;
    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    try {
      const u = new URL(withProtocol);
      return u.hostname.includes(".") ? u.href : null;
    } catch {
      return null;
    }
  };

  // Email the candidate the drive link (default or pasted by HR).
  const handleSendBgvRequest = async () => {
    clearMsgs();
    setBgvError(null);

    let customLink;
    if (bgvSend.link_source === "custom") {
      customLink = normalizeDriveLink(bgvSend.drive_link);
      if (!customLink) {
        setBgvError(
          "Enter a valid drive link, for example https://drive.google.com/drive/folders/...",
        );
        return;
      }
    }

    setBusy(true);
    try {
      const res = await recruitmentService.sendBgvRequest(id, {
        link_source: bgvSend.link_source,
        drive_link: customLink,
        deadline: bgvSend.deadline || undefined,
        note: bgvSend.note.trim() || undefined,
      });
      if (res.data?.emailSent) {
        setActionMsg(
          "BGV request emailed. Review the documents in the drive once the candidate uploads them, then approve.",
        );
        setShowBgvSendForm(false);
        setBgvSend((prev) => ({ ...prev, drive_link: "", deadline: "", note: "" }));
        await load(true);
      } else {
        setBgvError(
          `Could not send the BGV email${res.data?.error ? `: ${res.data.error}` : " — check SMTP settings."}`,
        );
      }
    } catch (err) {
      setBgvError(err.response?.data?.error || "Failed to send the BGV request");
    } finally {
      setBusy(false);
    }
  };

  // HR's review after looking at the uploaded documents.
  const handleBgvDecision = async (status) => {
    clearMsgs();
    setBgvError(null);
    if (status === "flagged" && !bgvNotes.trim()) {
      setBgvError("Add a note explaining why this verification is flagged.");
      return;
    }
    if (
      status === "cleared" &&
      !window.confirm("Approve this background verification? The candidate will move to the Offer stage.")
    ) {
      return;
    }
    setBusy(true);
    try {
      await recruitmentService.updateBGV(id, {
        bgv_status: status,
        bgv_notes: bgvNotes.trim() || undefined,
      });
      setActionMsg(
        status === "cleared"
          ? "BGV approved. The candidate is now at the Offer stage."
          : "BGV flagged.",
      );
      await load(true);
    } catch (err) {
      setBgvError(err.response?.data?.error || "Failed to save BGV status");
    } finally {
      setBusy(false);
    }
  };

  /* ── Offer ───────────────────────────────────────────── */

  const handleOfferChange = (e) => {
    const { name, value } = e.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveOffer = async () => {
    clearMsgs();
    if (
      !offerForm.offered_role.trim() ||
      !offerForm.offered_salary ||
      !offerForm.joining_date
    ) {
      setActionError(
        "Role, salary and joining date are required to save an offer.",
      );
      return;
    }
    setBusy(true);
    try {
      await recruitmentService.updateOfferDetails(id, {
        offered_role: offerForm.offered_role.trim(),
        offered_salary: Number(offerForm.offered_salary),
        joining_date: offerForm.joining_date,
        offer_letter_url: offerForm.offer_letter_url.trim() || null,
        offered_location: offerForm.offered_location.trim() || null,
        offered_employment_type: offerForm.offered_employment_type || null,
        offered_manager_id: offerForm.offered_manager_id
          ? Number(offerForm.offered_manager_id)
          : null,
      });
      setShowOfferForm(false);
      setActionMsg(
        "Offer details saved. Release the offer to email it to the candidate.",
      );
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to save offer details",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReleaseOffer = async () => {
    setBusy(true);
    clearMsgs();
    try {
      const res = await recruitmentService.releaseOffer(id);
      setActionMsg(
        res.data.emailSent
          ? "Offer emailed to the candidate. Record their reply here once it arrives."
          : "Could not send the offer email — check SMTP settings.",
      );
      await load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to release the offer",
      );
    } finally {
      setBusy(false);
    }
  };

  const openResponseModal = (kind) => {
    clearMsgs();
    setResponseNote("");
    setResponseModal(kind);
  };

  const handleRecordResponse = async () => {
    setBusy(true);
    clearMsgs();
    try {
      await recruitmentService.recordOfferResponse(id, {
        response: responseModal,
        note: responseNote.trim() || null,
      });
      setActionMsg(
        responseModal === "accepted"
          ? "Offer marked as accepted. You can now convert the candidate to an employee."
          : "Offer marked as declined.",
      );
      setResponseModal(null);
      await load(true);
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to record the reply");
    } finally {
      setBusy(false);
    }
  };

  /* ── Convert to employee (only after the offer is accepted) ── */

  const handleConvertToEmployee = () => {
    navigate("/hr/add-employee", {
      state: {
        name: candidate.name,
        email: candidate.email || "",
        phone: candidate.phone || "",
        department: candidate.department || "",
        designation: candidate.offered_role || "",
        join_date: candidate.joining_date_text || "",
        // the offer is an ANNUAL figure; Add Employee asks for MONTHLY CTC
        salary: candidate.offered_salary
          ? Math.round(Number(candidate.offered_salary) / 12)
          : "",
        work_location: candidate.offered_location || "",
        employment_type: candidate.offered_employment_type || "",
        manager_id: candidate.offered_manager_id || "",
        _fromCandidateId: candidate.id,
      },
    });
  };

  /* ═════════════════════════ RENDER ═════════════════════════ */

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
  const interviews = candidate.interviews || [];
  const canReject = !["hired", "rejected"].includes(stage);
  const hasOfferDetails =
    candidate.offered_role &&
    candidate.offered_salary &&
    candidate.joining_date_text;
  const offerStatus = candidate.offer_status || null; // null | sent | accepted | declined
  const canMoveToApproval =
    stage === "interview" && interviews.some((r) => r.status === "completed");
  const scoreSaved = candidate.aptitude_test_status === "completed";
  const showInterviewSection =
    stage === "interview" ||
    (interviews.length > 0 && !["applied", "aptitude_test"].includes(stage));

  const inlineBtnLink = {
    display: "inline-block",
    textDecoration: "none",
  };

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
        <span className={`cd-stage-badge cd-stage-badge--${stage}`}>
          {stageLabel(stage)}
        </span>
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
          <span className="cd-meta-value">
            {formatDate(candidate.created_at)}
          </span>
        </div>
      </div>

      {candidate.resume_url && (
        <a
          className="cd-resume-link"
          href={candidate.resume_url}
          target="_blank"
          rel="noreferrer"
        >
          View Resume ↗
        </a>
      )}

      {stage === "rejected" && candidate.rejection_reason && (
        <div className="cd-rejected-note">
          Rejected: {candidate.rejection_reason}
        </div>
      )}

      {stage === "hired" && (
        <div className="cd-hired-note">
          Hired
          {candidate.hired_employee_id
            ? ` — Employee #${candidate.hired_employee_id}`
            : ""}
        </div>
      )}

      {actionMsg && <p className="cd-inline-success">{actionMsg}</p>}
      {actionError && <p className="cd-inline-error">{actionError}</p>}

      {/* ═══ 1. SCREENING ═══ */}
      {stage === "applied" && (
        <div className="cd-section">
          <h2>Screening</h2>
          {!showScreeningForm ? (
            <button
              className="cd-action-btn"
              disabled={busy}
              onClick={() => setShowScreeningForm(true)}
            >
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
                <button
                  className="cd-cancel-btn"
                  disabled={busy}
                  onClick={() => setShowScreeningForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="cd-reject-btn"
                  disabled={busy}
                  onClick={() => openRejectModal("screening")}
                >
                  Reject
                </button>
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleScreeningQualify}
                >
                  {busy ? "Saving…" : "Qualify →"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ 2. APTITUDE TEST — score only ═══ */}
      {stage === "aptitude_test" && (
        <div className="cd-section">
          <h2>Aptitude Test</h2>
          {candidate.screening_notes && (
            <p className="cd-note">
              <strong>Screening notes:</strong> {candidate.screening_notes}
            </p>
          )}

          <p className="cd-note">
            The aptitude test is taken on the aptitude portal, which emails the
            candidate its own invitation. Invite the candidate there, then type
            the score here.
          </p>
          <p style={{ margin: "0 0 0.9rem" }}>
            <a
              className="cd-action-btn"
              style={inlineBtnLink}
              href={APTITUDE_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open aptitude portal ↗
            </a>
          </p>

          {(!scoreSaved || editingScore) && (
            <>
              <div className="cd-field-row">
                <label className="cd-field">
                  Score *
                  <input
                    type="number"
                    value={scoreForm.score}
                    onChange={(e) =>
                      setScoreForm((p) => ({ ...p, score: e.target.value }))
                    }
                  />
                </label>
                <label className="cd-field">
                  Out of (optional)
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={scoreForm.max}
                    onChange={(e) =>
                      setScoreForm((p) => ({ ...p, max: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="cd-modal-actions">
                {editingScore && (
                  <button
                    className="cd-cancel-btn"
                    disabled={busy}
                    onClick={() => setEditingScore(false)}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleSaveScore}
                >
                  {busy ? "Saving…" : "Save score"}
                </button>
              </div>
            </>
          )}

          {scoreSaved && !editingScore && (
            <>
              <p className="cd-note">
                Score recorded:{" "}
                <strong>
                  {candidate.aptitude_test_score}
                  {candidate.aptitude_test_max
                    ? ` / ${candidate.aptitude_test_max}`
                    : ""}
                </strong>{" "}
                <button
                  type="button"
                  onClick={() => setEditingScore(true)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  Edit score
                </button>
              </p>
              <p className="cd-note">
                Based on the score, decide whether the candidate goes on to the
                interviews.
              </p>
              <div className="cd-modal-actions">
                <button
                  className="cd-reject-btn"
                  disabled={busy}
                  onClick={() => openRejectModal("aptitude")}
                >
                  Reject
                </button>
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleAptitudeQualify}
                >
                  {busy ? "Saving…" : "Qualify for interview →"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ 3. INTERVIEW ROUNDS — scheduled by email ═══ */}
      {showInterviewSection && (
        <div className="cd-section">
          <h2>Interview Rounds</h2>
          {interviews.length === 0 ? (
            <p className="cd-empty">
              No rounds yet. Schedule the first round — the candidate is emailed
              the date, time and place.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>When</th>
                    <th>Mode</th>
                    <th>Where / link</th>
                    <th>Interviewer</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((r) => (
                    <tr key={r.id}>
                      <td>{r.round_number}</td>
                      <td>
                        {r.scheduled_at_local
                          ? formatLocal(r.scheduled_at_local)
                          : formatDate(r.interview_date)}
                      </td>
                      <td>
                        {r.mode === "online"
                          ? "Online"
                          : r.mode === "in_person"
                            ? "In person"
                            : "—"}
                      </td>
                      <td>
                        {/^https?:\/\//i.test(r.location_or_link || "") ? (
                          <a
                            href={r.location_or_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Join link ↗
                          </a>
                        ) : (
                          r.location_or_link || "—"
                        )}
                      </td>
                      <td>{r.interviewer_name || "—"}</td>
                      <td>
                        <Pill
                          kind={
                            r.status === "completed" ? "completed" : "scheduled"
                          }
                        >
                          {r.status === "completed" ? "Done" : "Scheduled"}
                        </Pill>
                      </td>
                      <td>{r.rating ? `${r.rating} / 5` : "—"}</td>
                      <td>{r.feedback || "—"}</td>
                      <td>
                        {stage === "interview" && r.status !== "completed" && (
                          <button
                            className="cd-action-btn"
                            disabled={busy}
                            onClick={() => openFeedback(r)}
                          >
                            Add feedback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {stage === "interview" && (
            <div className="cd-actions" style={{ marginTop: "0.9rem" }}>
              <button
                className="cd-action-btn"
                disabled={busy}
                onClick={openRoundModal}
              >
                + Schedule Interview Round
              </button>
              {canMoveToApproval && (
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleMoveToApproval}
                >
                  Move to Approval →
                </button>
              )}
            </div>
          )}
          {stage === "interview" &&
            interviews.length > 0 &&
            !canMoveToApproval && (
              <p className="cd-note" style={{ marginTop: "0.6rem" }}>
                Add feedback to at least one finished round to move on to
                approval.
              </p>
            )}
        </div>
      )}

      {/* ═══ 4. INTERNAL APPROVAL ═══ */}
      {stage === "approval" && (
        <div className="cd-section">
          <h2>Internal Approval</h2>
          <p className="cd-note">
            Review the candidate's profile and interview feedback above, then
            approve or reject.
          </p>
          <div className="cd-modal-actions">
            <button
              className="cd-reject-btn"
              disabled={busy}
              onClick={() => handleApprovalDecision("rejected")}
            >
              Reject
            </button>
            <button
              className="cd-primary-btn"
              disabled={busy}
              onClick={() => handleApprovalDecision("approved")}
            >
              {busy ? "Saving…" : "Approve →"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ 5. BACKGROUND VERIFICATION ═══ */}
      {stage === "bgv" && (
        <div className="cd-section">
          <h2>Background Verification</h2>

          {candidate.bgv_requested_at && (
            <p className="cd-note">
              Status:{" "}
              <span
                className={`cd-stage-badge cd-stage-badge--${candidate.bgv_status || "not_started"}`}
              >
                {(candidate.bgv_status || "not_started").replace("_", " ")}
              </span>
            </p>
          )}

          {!candidate.bgv_requested_at || showBgvSendForm ? (
            <>
              <p className="cd-note">
                Email the candidate a drive link where they upload their
                documents. After you review them, approve the verification to
                move on to the offer.
              </p>

              <label className="cd-field">
                Drive link
                <select
                  name="link_source"
                  value={bgvSend.link_source}
                  onChange={handleBgvSendChange}
                >
                  <option value="default" disabled={!bgvDefaultLink}>
                    Default company drive link
                    {!bgvDefaultLink ? " (not configured)" : ""}
                  </option>
                  <option value="custom">Paste a different link</option>
                </select>
              </label>

              {bgvSend.link_source === "default" ? (
                <p className="cd-note">
                  Will send:{" "}
                  <a href={bgvDefaultLink} target="_blank" rel="noreferrer">
                    {bgvDefaultLink}
                  </a>
                </p>
              ) : (
                <label className="cd-field">
                  Link to send
                  <input
                    name="drive_link"
                    value={bgvSend.drive_link}
                    onChange={handleBgvSendChange}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </label>
              )}

              <label className="cd-field">
                Upload deadline (optional)
                <input
                  type="date"
                  name="deadline"
                  value={bgvSend.deadline}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={handleBgvSendChange}
                />
              </label>

              <label className="cd-field">
                Message to the candidate (optional)
                <textarea
                  rows={2}
                  name="note"
                  value={bgvSend.note}
                  onChange={handleBgvSendChange}
                  placeholder="Anything extra you want to tell them"
                />
              </label>

              {bgvError && <p className="cd-inline-error">{bgvError}</p>}
              <div className="cd-modal-actions">
                {candidate.bgv_requested_at && (
                  <button
                    className="cd-cancel-btn"
                    disabled={busy}
                    onClick={() => setShowBgvSendForm(false)}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleSendBgvRequest}
                >
                  {busy
                    ? "Sending…"
                    : candidate.bgv_requested_at
                      ? "Resend BGV request"
                      : "Send BGV request"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="cd-note">
                Request emailed on {formatDateTime(candidate.bgv_requested_at)}
                {candidate.bgv_deadline_text
                  ? ` — documents due by ${formatDate(candidate.bgv_deadline_text)}`
                  : ""}
                .
              </p>
              <p className="cd-note">
                Drive link sent:{" "}
                <a href={candidate.bgv_drive_link} target="_blank" rel="noreferrer">
                  {candidate.bgv_drive_link}
                </a>
              </p>
              {candidate.bgv_document_url && (
                <p className="cd-note">
                  Verification report:{" "}
                  <a href={candidate.bgv_document_url} target="_blank" rel="noreferrer">
                    {candidate.bgv_document_url}
                  </a>
                </p>
              )}

              <label className="cd-field">
                Review notes
                <textarea
                  rows={3}
                  value={bgvNotes}
                  onChange={(e) => setBgvNotes(e.target.value)}
                  placeholder="What you checked, or why something is flagged"
                />
              </label>

              {bgvError && <p className="cd-inline-error">{bgvError}</p>}
              <div className="cd-actions">
                <button
                  className="cd-action-btn"
                  disabled={busy}
                  onClick={() => setShowBgvSendForm(true)}
                >
                  Resend / change link
                </button>
                <button
                  className="cd-reject-btn"
                  disabled={busy}
                  onClick={() => handleBgvDecision("flagged")}
                >
                  Flag an issue
                </button>
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={() => handleBgvDecision("cleared")}
                >
                  Approve — move to Offer
                </button>
              </div>
              <p className="cd-note">
                If the verification fails, use the Reject action to close the
                candidate's process.
              </p>
            </>
          )}
        </div>
      )}

      {/* ═══ 6. OFFER → the candidate's reply → convert ═══ */}
      {stage === "offer" && (
        <div className="cd-section">
          <h2>Offer</h2>

          {!hasOfferDetails || showOfferForm ? (
            <>
              <p className="cd-note">
                Fill in the candidate's job details. They appear in the offer
                email.
              </p>
              <div className="cd-field-row">
                <label className="cd-field">
                  Position / Role *
                  <input
                    name="offered_role"
                    value={offerForm.offered_role}
                    onChange={handleOfferChange}
                  />
                </label>
                <label className="cd-field">
                  Annual salary (₹) *
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
                  Joining date *
                  <input
                    type="date"
                    name="joining_date"
                    value={offerForm.joining_date}
                    onChange={handleOfferChange}
                  />
                </label>
                <label className="cd-field">
                  Work location
                  <input
                    name="offered_location"
                    value={offerForm.offered_location}
                    onChange={handleOfferChange}
                    placeholder="e.g. Mysuru office"
                  />
                </label>
              </div>
              <div className="cd-field-row">
                <label className="cd-field">
                  Employment type
                  <select
                    name="offered_employment_type"
                    value={offerForm.offered_employment_type}
                    onChange={handleOfferChange}
                  >
                    <option value="">Select…</option>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cd-field">
                  Reporting manager
                  <select
                    name="offered_manager_id"
                    value={offerForm.offered_manager_id}
                    onChange={handleOfferChange}
                  >
                    <option value="">Select…</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.designation})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="cd-field">
                Offer letter URL (optional)
                <input
                  name="offer_letter_url"
                  value={offerForm.offer_letter_url}
                  onChange={handleOfferChange}
                  placeholder="Optional link"
                />
              </label>
              <div className="cd-modal-actions">
                {hasOfferDetails && (
                  <button
                    className="cd-cancel-btn"
                    disabled={busy}
                    onClick={() => setShowOfferForm(false)}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="cd-primary-btn"
                  disabled={busy}
                  onClick={handleSaveOffer}
                >
                  {busy ? "Saving…" : "Save offer"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cd-meta" style={{ marginBottom: "0.9rem" }}>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Position</span>
                  <span className="cd-meta-value">
                    {candidate.offered_role}
                  </span>
                </div>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Annual salary</span>
                  <span className="cd-meta-value">
                    ₹{Number(candidate.offered_salary).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Joining date</span>
                  <span className="cd-meta-value">
                    {formatDate(candidate.joining_date_text)}
                  </span>
                </div>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Location</span>
                  <span className="cd-meta-value">
                    {candidate.offered_location || "—"}
                  </span>
                </div>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Employment type</span>
                  <span className="cd-meta-value">
                    {candidate.offered_employment_type || "—"}
                  </span>
                </div>
                <div className="cd-meta-item">
                  <span className="cd-meta-label">Reporting to</span>
                  <span className="cd-meta-value">
                    {candidate.offered_manager_name || "—"}
                  </span>
                </div>
              </div>

              {/* where the offer stands */}
              <p className="cd-note">
                {offerStatus === null && (
                  <Pill kind="waiting">Not sent yet</Pill>
                )}
                {offerStatus === "sent" && (
                  <>
                    <Pill kind="waiting">
                      Waiting for the candidate's reply
                    </Pill>{" "}
                    Offer emailed on {formatDateTime(candidate.offer_sent_at)}.
                    The reply arrives in the info@ mailbox.
                  </>
                )}
                {offerStatus === "accepted" && (
                  <>
                    <Pill kind="accepted">Offer accepted</Pill> on{" "}
                    {formatDateTime(candidate.offer_responded_at)}
                    {candidate.offer_response_note
                      ? ` — ${candidate.offer_response_note}`
                      : ""}
                  </>
                )}
              </p>

              <div className="cd-actions">
                {offerStatus !== "accepted" && (
                  <button
                    className="cd-action-btn"
                    disabled={busy}
                    onClick={() => setShowOfferForm(true)}
                  >
                    Edit Offer
                  </button>
                )}
                {offerStatus === null && (
                  <button
                    className="cd-primary-btn"
                    disabled={busy}
                    onClick={handleReleaseOffer}
                  >
                    {busy ? "Sending…" : "Release Offer (Email)"}
                  </button>
                )}
                {offerStatus === "sent" && (
                  <>
                    <button
                      className="cd-action-btn"
                      disabled={busy}
                      onClick={handleReleaseOffer}
                    >
                      {busy ? "Sending…" : "Resend offer email"}
                    </button>
                    <button
                      className="cd-reject-btn"
                      disabled={busy}
                      onClick={() => openResponseModal("declined")}
                    >
                      Mark declined
                    </button>
                    <button
                      className="cd-primary-btn"
                      disabled={busy}
                      onClick={() => openResponseModal("accepted")}
                    >
                      Mark accepted
                    </button>
                  </>
                )}
                {offerStatus === "accepted" && (
                  <button
                    className="cd-primary-btn"
                    disabled={busy}
                    onClick={handleConvertToEmployee}
                  >
                    Convert to Employee →
                  </button>
                )}
              </div>
              {offerStatus === "accepted" && (
                <p className="cd-note" style={{ marginTop: "0.6rem" }}>
                  Converting creates the employee's login and emails them their
                  login details.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ HISTORY: emails and recorded decisions ═══ */}
      <div className="cd-section">
        <h2>History</h2>
        {!candidate.emails || candidate.emails.length === 0 ? (
          <p className="cd-empty">Nothing recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Sent To</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {candidate.emails.map((e) => (
                  <tr key={e.id}>
                    <td>{historyLabel(e.email_type)}</td>
                    <td>{e.subject || "—"}</td>
                    <td>{e.sent_to || "—"}</td>
                    <td>
                      <Pill kind={e.status}>
                        {e.status === "recorded" ? "Recorded" : e.status}
                      </Pill>
                    </td>
                    <td>{formatDateTime(e.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canReject && (
        <div className="cd-actions">
          <button
            className="cd-reject-btn"
            disabled={busy}
            onClick={() => openRejectModal("generic")}
          >
            Reject Candidate
          </button>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {showRejectModal && (
        <div
          className="cd-modal-backdrop"
          onClick={() => !busy && setShowRejectModal(false)}
        >
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject Candidate</h2>
            {rejectMode !== "generic" && (
              <p className="cd-note">
                The candidate will be emailed that they were not selected.
              </p>
            )}
            <label className="cd-field">
              Reason (optional)
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </label>
            <div className="cd-modal-actions">
              <button
                className="cd-cancel-btn"
                disabled={busy}
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="cd-reject-btn"
                disabled={busy}
                onClick={handleReject}
              >
                {busy ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoundModal && (
        <div
          className="cd-modal-backdrop"
          onClick={() => !busy && setShowRoundModal(false)}
        >
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Interview Round</h2>
            <p className="cd-note">
              The candidate is emailed the date, time and place.
            </p>
            <div className="cd-field-row">
              <label className="cd-field">
                Round #
                <input
                  type="number"
                  min="1"
                  value={roundForm.round_number}
                  onChange={(e) =>
                    setRoundForm((p) => ({
                      ...p,
                      round_number: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="cd-field">
                Mode
                <select
                  value={roundForm.mode}
                  onChange={(e) =>
                    setRoundForm((p) => ({ ...p, mode: e.target.value }))
                  }
                >
                  <option value="online">Online</option>
                  <option value="in_person">In person</option>
                </select>
              </label>
            </div>
            <div className="cd-field-row">
              <label className="cd-field">
                Date *
                <input
                  type="date"
                  value={roundForm.date}
                  onChange={(e) =>
                    setRoundForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </label>
              <label className="cd-field">
                Time *
                <input
                  type="time"
                  value={roundForm.time}
                  onChange={(e) =>
                    setRoundForm((p) => ({ ...p, time: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="cd-field">
              {roundForm.mode === "online" ? "Meeting link *" : "Venue *"}
              <input
                value={roundForm.location_or_link}
                onChange={(e) =>
                  setRoundForm((p) => ({
                    ...p,
                    location_or_link: e.target.value,
                  }))
                }
                placeholder={
                  roundForm.mode === "online"
                    ? "https://meet.google.com/…"
                    : "Office address / room"
                }
              />
            </label>
            <label className="cd-field">
              Interviewer
              <input
                value={roundForm.interviewer_name}
                onChange={(e) =>
                  setRoundForm((p) => ({
                    ...p,
                    interviewer_name: e.target.value,
                  }))
                }
              />
            </label>
            <div className="cd-modal-actions">
              <button
                className="cd-cancel-btn"
                disabled={busy}
                onClick={() => setShowRoundModal(false)}
              >
                Cancel
              </button>
              <button
                className="cd-primary-btn"
                disabled={busy}
                onClick={handleScheduleRound}
              >
                {busy ? "Scheduling…" : "Schedule & email candidate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackRound && (
        <div
          className="cd-modal-backdrop"
          onClick={() => !busy && setFeedbackRound(null)}
        >
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Round {feedbackRound.round_number} — Feedback</h2>
            <label className="cd-field">
              Rating
              <select
                value={feedbackForm.rating}
                onChange={(e) =>
                  setFeedbackForm((p) => ({ ...p, rating: e.target.value }))
                }
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <label className="cd-field">
              Feedback
              <textarea
                rows={3}
                value={feedbackForm.feedback}
                onChange={(e) =>
                  setFeedbackForm((p) => ({ ...p, feedback: e.target.value }))
                }
              />
            </label>
            <div className="cd-modal-actions">
              <button
                className="cd-cancel-btn"
                disabled={busy}
                onClick={() => setFeedbackRound(null)}
              >
                Cancel
              </button>
              <button
                className="cd-primary-btn"
                disabled={busy}
                onClick={handleSaveFeedback}
              >
                {busy ? "Saving…" : "Save feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {responseModal && (
        <div
          className="cd-modal-backdrop"
          onClick={() => !busy && setResponseModal(null)}
        >
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {responseModal === "accepted"
                ? "Mark offer as accepted"
                : "Mark offer as declined"}
            </h2>
            <p className="cd-note">
              {responseModal === "accepted"
                ? "Use this after the candidate has replied to accept the offer."
                : "This closes the candidate's process."}
            </p>
            <label className="cd-field">
              Note (optional)
              <textarea
                rows={3}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder="e.g. accepted by email on 1 Nov"
              />
            </label>
            <div className="cd-modal-actions">
              <button
                className="cd-cancel-btn"
                disabled={busy}
                onClick={() => setResponseModal(null)}
              >
                Cancel
              </button>
              <button
                className={
                  responseModal === "accepted"
                    ? "cd-primary-btn"
                    : "cd-reject-btn"
                }
                disabled={busy}
                onClick={handleRecordResponse}
              >
                {busy
                  ? "Saving…"
                  : responseModal === "accepted"
                    ? "Confirm accepted"
                    : "Confirm declined"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;