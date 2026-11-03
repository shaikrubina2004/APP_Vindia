// ===== FILE: APP_Vindia/backend/controllers/recruitmentController.js =====
const Recruitment = require("../models/recruitmentModel");
const {
  sendMail,
  qualifiedEmailTemplate,
  rejectedEmailTemplate,
  offerReleaseEmailTemplate,
  interviewScheduledEmailTemplate,
} = require("../utils/mailer");

/* ═══════════════════════════════════════
   JOB OPENINGS
═══════════════════════════════════════ */

exports.createJobOpening = async (req, res) => {
  try {
    const { title, department, project_id, vacancies, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const jobOpening = await Recruitment.createJobOpening({
      title, department, project_id, vacancies, description,
      created_by: userId,
    });

    res.status(201).json(jobOpening);
  } catch (err) {
    console.error("CREATE JOB OPENING ERROR:", err.message);
    res.status(500).json({ error: "Failed to create job opening" });
  }
};

exports.getAllJobOpenings = async (req, res) => {
  try {
    const { status } = req.query;
    const jobOpenings = await Recruitment.getAllJobOpenings({ status });
    res.status(200).json(jobOpenings);
  } catch (err) {
    console.error("GET JOB OPENINGS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch job openings" });
  }
};

exports.getJobOpeningById = async (req, res) => {
  try {
    const jobOpening = await Recruitment.getJobOpeningById(req.params.id);
    if (!jobOpening) {
      return res.status(404).json({ error: "Job opening not found" });
    }
    res.status(200).json(jobOpening);
  } catch (err) {
    console.error("GET JOB OPENING BY ID ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch job opening" });
  }
};

exports.updateJobOpeningStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ error: "status must be 'open' or 'closed'" });
    }
    const jobOpening = await Recruitment.updateJobOpeningStatus(req.params.id, status);
    if (!jobOpening) {
      return res.status(404).json({ error: "Job opening not found" });
    }
    res.status(200).json(jobOpening);
  } catch (err) {
    console.error("UPDATE JOB OPENING STATUS ERROR:", err.message);
    res.status(500).json({ error: "Failed to update job opening status" });
  }
};

/* ═══════════════════════════════════════
   CANDIDATES
═══════════════════════════════════════ */

exports.createCandidate = async (req, res) => {
  try {
    const { job_opening_id, name, email, phone, resume_url, source } = req.body;

    if (!job_opening_id || !name) {
      return res.status(400).json({ error: "job_opening_id and name are required" });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const candidate = await Recruitment.createCandidate({
      job_opening_id, name, email, phone, resume_url, source,
      created_by: userId,
    });

    res.status(201).json(candidate);
  } catch (err) {
    console.error("CREATE CANDIDATE ERROR:", err.message);
    res.status(500).json({ error: "Failed to add candidate" });
  }
};

exports.getCandidatesByJobOpening = async (req, res) => {
  try {
    const candidates = await Recruitment.getCandidatesByJobOpening(req.params.id);
    res.status(200).json(candidates);
  } catch (err) {
    console.error("GET CANDIDATES BY JOB OPENING ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};

exports.getAllCandidates = async (req, res) => {
  try {
    const { stage } = req.query;
    const candidates = await Recruitment.getAllCandidates({ stage });
    res.status(200).json(candidates);
  } catch (err) {
    console.error("GET ALL CANDIDATES ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Recruitment.getCandidateById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const emails = await Recruitment.getCandidateEmails(req.params.id);
    res.status(200).json({ ...candidate, emails });
  } catch (err) {
    console.error("GET CANDIDATE BY ID ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
};

exports.updateCandidateStage = async (req, res) => {
  try {
    const { stage, rejection_reason } = req.body;
    const validStages = ["applied", "screening", "interview", "rejected"];

    if (!validStages.includes(stage)) {
      return res.status(400).json({
        error: `stage must be one of: ${validStages.join(", ")}. Use the dedicated endpoints for screening/aptitude/approval/bgv/offer.`,
      });
    }

    const candidate = await Recruitment.updateCandidateStage(req.params.id, { stage, rejection_reason });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.status(200).json(candidate);
  } catch (err) {
    console.error("UPDATE CANDIDATE STAGE ERROR:", err.message);
    res.status(500).json({ error: "Failed to update candidate stage" });
  }
};

// Save offer details (role, salary, joining date, location, type, manager).
// An accepted offer is final and cannot be edited; editing a sent offer clears
// its status, so it has to be released again.
exports.updateOfferDetails = async (req, res) => {
  try {
    const {
      offered_role, offered_salary, joining_date, offer_letter_url,
      offered_location, offered_employment_type, offered_manager_id,
    } = req.body;

    if (!offered_role || !offered_salary || !joining_date) {
      return res.status(400).json({
        error: "offered_role, offered_salary, and joining_date are required",
      });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (existing.offer_status === "accepted") {
      return res.status(409).json({ error: "This offer was already accepted and can no longer be edited" });
    }

    const candidate = await Recruitment.updateOfferDetails(req.params.id, {
      offered_role, offered_salary, joining_date, offer_letter_url,
      offered_location, offered_employment_type, offered_manager_id,
    });
    res.status(200).json(candidate);
  } catch (err) {
    console.error("UPDATE OFFER DETAILS ERROR:", err.message);
    res.status(500).json({ error: "Failed to save offer details" });
  }
};

// Called AFTER HR has actually submitted AddEmployee.jsx for this
// candidate — the frontend passes the new employees.id it got back.
// Only an accepted offer can be turned into a hire.
exports.markHired = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (existing.offer_status !== "accepted") {
      return res.status(409).json({ error: "The offer must be accepted before the candidate can be hired" });
    }

    const candidate = await Recruitment.markHired(req.params.id, employeeId);
    res.status(200).json(candidate);
  } catch (err) {
    console.error("MARK HIRED ERROR:", err.message);
    res.status(500).json({ error: "Failed to mark candidate as hired" });
  }
};

/* ═══════════════════════════════════════
   INTERVIEW ROUNDS
═══════════════════════════════════════ */

// Legacy: log a round that has already happened.
exports.addInterviewRound = async (req, res) => {
  try {
    const { round_number, interviewer_name, interview_date, feedback, rating } = req.body;

    if (!round_number) {
      return res.status(400).json({ error: "round_number is required" });
    }

    const round = await Recruitment.addInterviewRound(req.params.id, {
      round_number, interviewer_name, interview_date, feedback, rating,
    });

    res.status(201).json(round);
  } catch (err) {
    console.error("ADD INTERVIEW ROUND ERROR:", err.message);
    res.status(500).json({ error: "Failed to add interview round" });
  }
};

// POST /api/recruitment/candidates/:id/interviews/schedule
// Body: { round_number?, scheduled_at: "YYYY-MM-DDTHH:mm", mode: 'online'|'in_person',
//         location_or_link, interviewer_name? }
// Saves the round AND emails the candidate the date, time, mode and place.
exports.scheduleInterview = async (req, res) => {
  try {
    const { round_number, scheduled_at, mode, location_or_link, interviewer_name } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scheduled_at || "")) {
      return res.status(400).json({ error: "scheduled_at (date and time) is required" });
    }
    if (!["online", "in_person"].includes(mode)) {
      return res.status(400).json({ error: "mode must be 'online' or 'in_person'" });
    }
    if (!location_or_link || !String(location_or_link).trim()) {
      return res.status(400).json({
        error: mode === "online" ? "A meeting link is required" : "A venue is required",
      });
    }

    const candidate = await Recruitment.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    if (candidate.stage !== "interview") {
      return res.status(409).json({ error: "Interviews can only be scheduled while the candidate is at the interview stage" });
    }

    const roundNumber = Number(round_number) || candidate.interviews.length + 1;

    const round = await Recruitment.scheduleInterviewRound(req.params.id, {
      round_number: roundNumber,
      interviewer_name: interviewer_name?.trim() || null,
      scheduled_at,
      mode,
      location_or_link: String(location_or_link).trim(),
    });

    const template = interviewScheduledEmailTemplate({
      candidateName: candidate.name,
      jobTitle: candidate.job_title || "the position",
      roundNumber,
      scheduledAt: scheduled_at,
      mode,
      locationOrLink: String(location_or_link).trim(),
      interviewerName: interviewer_name?.trim() || null,
    });

    const mailResult = candidate.email
      ? await sendMail({ to: candidate.email, ...template })
      : { success: false, error: "Candidate has no email on file" };

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "interview_scheduled",
      subject: template.subject,
      sent_to: candidate.email,
      status: mailResult.success ? "sent" : "failed",
      error_message: mailResult.error,
    });

    res.status(201).json({ round, emailSent: mailResult.success });
  } catch (err) {
    console.error("SCHEDULE INTERVIEW ERROR:", err.message);
    res.status(500).json({ error: "Failed to schedule the interview" });
  }
};

// PATCH /api/recruitment/candidates/:id/interviews/:roundId/feedback
// Body: { feedback, rating }  — after the interview has happened.
exports.submitInterviewFeedback = async (req, res) => {
  try {
    const { feedback, rating } = req.body;
    const roundId = parseInt(req.params.roundId, 10);
    if (isNaN(roundId)) return res.status(400).json({ error: "Invalid round id" });
    if (rating !== undefined && rating !== null && rating !== "" && !(Number(rating) >= 1 && Number(rating) <= 5)) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const round = await Recruitment.completeInterviewRound(req.params.id, roundId, {
      feedback: feedback?.trim() || null,
      rating: rating ? Number(rating) : null,
    });
    if (!round) return res.status(404).json({ error: "Interview round not found" });

    res.status(200).json(round);
  } catch (err) {
    console.error("INTERVIEW FEEDBACK ERROR:", err.message);
    res.status(500).json({ error: "Failed to save the interview feedback" });
  }
};

/* ═══════════════════════════════════════
   SCREENING
   POST /api/recruitment/candidates/:id/screening
   Body: { screening_notes, decision: 'qualify'|'reject', rejection_reason }
═══════════════════════════════════════ */

exports.submitScreening = async (req, res) => {
  try {
    const { screening_notes, decision, rejection_reason } = req.body;

    if (!["qualify", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'qualify' or 'reject'" });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    const candidate = await Recruitment.recordScreeningDecision(req.params.id, {
      screening_notes, decision, rejection_reason,
    });

    // Send the matching email, then log the attempt either way.
    const template = decision === "qualify"
      ? qualifiedEmailTemplate(candidate.name, existing.job_title)
      : rejectedEmailTemplate(candidate.name, existing.job_title, rejection_reason);

    const mailResult = candidate.email
      ? await sendMail({ to: candidate.email, ...template })
      : { success: false, error: "Candidate has no email on file" };

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: decision === "qualify" ? "qualified" : "rejected",
      subject: template.subject,
      sent_to: candidate.email,
      status: mailResult.success ? "sent" : "failed",
      error_message: mailResult.error,
    });

    res.status(200).json({ ...candidate, emailSent: mailResult.success });
  } catch (err) {
    console.error("SUBMIT SCREENING ERROR:", err.message);
    res.status(500).json({ error: "Failed to submit screening decision" });
  }
};

/* ═══════════════════════════════════════
   APTITUDE TEST
   The test runs on the separate aptitude portal, which emails the candidate
   itself. The ERP only records the score and HR's decision.
═══════════════════════════════════════ */

// Legacy endpoint (no longer used by the page, left so nothing breaks):
// POST /api/recruitment/candidates/:id/aptitude-test/send
exports.sendAptitudeTestLink = async (req, res) => {
  try {
    const { test_link } = req.body;
    if (!test_link) return res.status(400).json({ error: "test_link is required" });

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    const candidate = await Recruitment.sendAptitudeTest(req.params.id, test_link);
    res.status(200).json({ ...candidate, emailSent: false });
  } catch (err) {
    console.error("SEND APTITUDE TEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to save the aptitude test link" });
  }
};

// PATCH /api/recruitment/candidates/:id/aptitude-test/complete
// Body: { score, max_score? } — records the score ONLY. The candidate stays at
// the aptitude stage until HR decides (see decideAptitude).
exports.completeAptitudeTest = async (req, res) => {
  try {
    const { score, max_score } = req.body;
    if (score === undefined || score === null || score === "" || isNaN(Number(score))) {
      return res.status(400).json({ error: "A numeric score is required" });
    }
    if (max_score !== undefined && max_score !== null && max_score !== "" && !(Number(max_score) > 0)) {
      return res.status(400).json({ error: "max_score must be a positive number" });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });
    if (existing.stage !== "aptitude_test") {
      return res.status(409).json({ error: "The score can only be entered at the aptitude stage" });
    }

    const max = max_score === undefined || max_score === null || max_score === "" ? null : Number(max_score);
    const candidate = await Recruitment.completeAptitudeTest(req.params.id, Number(score), max);

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "aptitude_score",
      subject: `Aptitude score recorded: ${Number(score)}${max ? ` / ${max}` : ""}`,
      sent_to: null,
      status: "recorded",
      error_message: null,
    });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("COMPLETE APTITUDE TEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to record aptitude test score" });
  }
};

// POST /api/recruitment/candidates/:id/aptitude-test/decision
// Body: { decision: 'qualify'|'reject', rejection_reason? }
// HR's decision after seeing the score. Reject emails the candidate.
exports.decideAptitude = async (req, res) => {
  try {
    const { decision, rejection_reason } = req.body;
    if (!["qualify", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'qualify' or 'reject'" });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });
    if (existing.stage !== "aptitude_test") {
      return res.status(409).json({ error: "This candidate is not at the aptitude stage" });
    }
    if (existing.aptitude_test_status !== "completed") {
      return res.status(409).json({ error: "Enter the aptitude score first" });
    }

    const candidate = await Recruitment.decideAptitude(req.params.id, { decision, rejection_reason });

    if (decision === "reject") {
      const template = rejectedEmailTemplate(candidate.name, existing.job_title, rejection_reason);
      const mailResult = candidate.email
        ? await sendMail({ to: candidate.email, ...template })
        : { success: false, error: "Candidate has no email on file" };

      await Recruitment.logCandidateEmail(req.params.id, {
        email_type: "rejected",
        subject: template.subject,
        sent_to: candidate.email,
        status: mailResult.success ? "sent" : "failed",
        error_message: mailResult.error,
      });
      return res.status(200).json({ ...candidate, emailSent: mailResult.success });
    }

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "aptitude_decision",
      subject: "Qualified for interviews after the aptitude test",
      sent_to: null,
      status: "recorded",
      error_message: null,
    });
    res.status(200).json(candidate);
  } catch (err) {
    console.error("DECIDE APTITUDE ERROR:", err.message);
    res.status(500).json({ error: "Failed to save the aptitude decision" });
  }
};

/* ═══════════════════════════════════════
   INTERNAL APPROVAL
═══════════════════════════════════════ */

// POST /api/recruitment/candidates/:id/approval/start
exports.moveToApproval = async (req, res) => {
  try {
    const candidate = await Recruitment.moveToApproval(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.status(200).json(candidate);
  } catch (err) {
    console.error("MOVE TO APPROVAL ERROR:", err.message);
    res.status(500).json({ error: "Failed to move candidate to approval" });
  }
};

// PATCH /api/recruitment/candidates/:id/approval
// Body: { decision: 'approved'|'rejected' }
exports.recordApproval = async (req, res) => {
  try {
    const { decision } = req.body;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
    }

    const approverId = req.user?.id;
    if (!approverId) return res.status(401).json({ error: "User not authenticated" });

    const candidate = await Recruitment.recordApproval(req.params.id, { decision, approverId });
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("RECORD APPROVAL ERROR:", err.message);
    res.status(500).json({ error: "Failed to record approval decision" });
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const { round_number, scheduled_at, mode, location_or_link, interviewer_name } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scheduled_at || "")) {
      return res.status(400).json({ error: "scheduled_at (date and time) is required" });
    }
    if (!["online", "in_person"].includes(mode)) {
      return res.status(400).json({ error: "mode must be 'online' or 'in_person'" });
    }
    if (!location_or_link || !String(location_or_link).trim()) {
      return res.status(400).json({
        error: mode === "online" ? "A meeting link is required" : "A venue is required",
      });
    }

    const candidate = await Recruitment.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    if (candidate.stage !== "interview") {
      return res.status(409).json({
        error: "Interviews can only be scheduled while the candidate is at the interview stage",
      });
    }

    const roundNumber = Number(round_number) || candidate.interviews.length + 1;
    const place = String(location_or_link).trim();

    const round = await Recruitment.scheduleInterviewRound(req.params.id, {
      round_number: roundNumber,
      interviewer_name: interviewer_name?.trim() || null,
      scheduled_at,
      mode,
      location_or_link: place,
    });

    // The round is saved. An email problem must never undo or fail that.
    let template = null;
    let mailResult = { success: false, error: "Email not attempted" };
    try {
      template = interviewScheduledEmailTemplate({
        candidateName: candidate.name,
        jobTitle: candidate.job_title || "the position",
        roundNumber,
        scheduledAt: scheduled_at,
        mode,
        locationOrLink: place,
        interviewerName: interviewer_name?.trim() || null,
      });
      mailResult = candidate.email
        ? await sendMail({ to: candidate.email, ...template })
        : { success: false, error: "Candidate has no email on file" };
    } catch (mailErr) {
      console.error("INTERVIEW EMAIL ERROR:", mailErr.message);
      mailResult = { success: false, error: mailErr.message };
    }

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "interview_scheduled",
      subject: template?.subject || "Interview scheduled",
      sent_to: candidate.email,
      status: mailResult.success ? "sent" : "failed",
      error_message: mailResult.error,
    });

    res.status(201).json({ round, emailSent: mailResult.success });
  } catch (err) {
    console.error("SCHEDULE INTERVIEW ERROR:", err.message);
    res.status(500).json({ error: "Failed to schedule the interview" });
  }
};

/* ═══════════════════════════════════════
   BGV
   PATCH /api/recruitment/candidates/:id/bgv
   Body: { bgv_status, bgv_document_url, bgv_notes }
═══════════════════════════════════════ */

exports.updateBGV = async (req, res) => {
  try {
    const { bgv_status, bgv_document_url, bgv_notes } = req.body;
    const validStatuses = ["not_started", "in_progress", "cleared", "flagged"];

    if (!validStatuses.includes(bgv_status)) {
      return res.status(400).json({ error: `bgv_status must be one of: ${validStatuses.join(", ")}` });
    }

    const candidate = await Recruitment.updateBGV(req.params.id, { bgv_status, bgv_document_url, bgv_notes });
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("UPDATE BGV ERROR:", err.message);
    res.status(500).json({ error: "Failed to update BGV status" });
  }
};

/* ═══════════════════════════════════════
   OFFER RELEASE + THE CANDIDATE'S REPLY
═══════════════════════════════════════ */

// POST /api/recruitment/candidates/:id/offer/release
// Emails the offer using the details saved via PATCH /candidates/:id/offer.
// The offer only counts as "sent" if the email really went out.
exports.releaseOffer = async (req, res) => {
  try {
    const candidate = await Recruitment.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    if (candidate.offer_status === "accepted") {
      return res.status(409).json({ error: "This offer was already accepted" });
    }
    if (!candidate.offered_role || !candidate.offered_salary || !candidate.joining_date) {
      return res.status(400).json({ error: "Save offer details before releasing the offer" });
    }

    const template = offerReleaseEmailTemplate(
      candidate.name,
      candidate.job_title,
      candidate.offered_role,
      candidate.offered_salary,
      candidate.joining_date,
      {
        location: candidate.offered_location,
        employmentType: candidate.offered_employment_type,
        managerName: candidate.offered_manager_name,
      }
    );

    const mailResult = candidate.email
      ? await sendMail({ to: candidate.email, ...template })
      : { success: false, error: "Candidate has no email on file" };

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "offer_release",
      subject: template.subject,
      sent_to: candidate.email,
      status: mailResult.success ? "sent" : "failed",
      error_message: mailResult.error,
    });

    if (mailResult.success) {
      await Recruitment.markOfferSent(req.params.id);
    }

    res.status(200).json({
      emailSent: mailResult.success,
      offer_status: mailResult.success ? "sent" : candidate.offer_status || null,
    });
  } catch (err) {
    console.error("RELEASE OFFER ERROR:", err.message);
    res.status(500).json({ error: "Failed to release offer" });
  }
};

// PATCH /api/recruitment/candidates/:id/offer/response
// Body: { response: 'accepted'|'declined', note? }
// HR records the candidate's reply (it arrives in the info@ mailbox).
// 'declined' closes the candidate's process.
exports.recordOfferResponse = async (req, res) => {
  try {
    const { response, note } = req.body;
    if (!["accepted", "declined"].includes(response)) {
      return res.status(400).json({ error: "response must be 'accepted' or 'declined'" });
    }

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });
    if (existing.offer_status !== "sent") {
      return res.status(409).json({
        error: existing.offer_status
          ? "The offer already has a recorded reply"
          : "Release the offer first",
      });
    }

    const candidate = await Recruitment.recordOfferResponse(req.params.id, {
      response,
      note: note?.trim() || null,
      userId: req.user?.id,
    });

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: response === "accepted" ? "offer_accepted" : "offer_declined",
      subject:
        (response === "accepted" ? "Offer accepted by the candidate" : "Offer declined by the candidate") +
        (note?.trim() ? ` — ${note.trim()}` : ""),
      sent_to: null,
      status: "recorded",
      error_message: null,
    });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("RECORD OFFER RESPONSE ERROR:", err.message);
    res.status(500).json({ error: "Failed to record the offer reply" });
  }
};