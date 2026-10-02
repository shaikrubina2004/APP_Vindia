// ===== FILE: APP_Vindia/backend/controllers/recruitmentController.js =====
const Recruitment = require("../models/recruitmentModel");
const {
  sendMail,
  qualifiedEmailTemplate,
  rejectedEmailTemplate,
  aptitudeTestEmailTemplate,
  offerReleaseEmailTemplate,
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

exports.updateOfferDetails = async (req, res) => {
  try {
    const { offered_role, offered_salary, joining_date, offer_letter_url } = req.body;

    if (!offered_role || !offered_salary || !joining_date) {
      return res.status(400).json({
        error: "offered_role, offered_salary, and joining_date are required",
      });
    }

    const candidate = await Recruitment.updateOfferDetails(req.params.id, {
      offered_role, offered_salary, joining_date, offer_letter_url,
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.status(200).json(candidate);
  } catch (err) {
    console.error("UPDATE OFFER DETAILS ERROR:", err.message);
    res.status(500).json({ error: "Failed to save offer details" });
  }
};

// Called AFTER HR has actually submitted AddEmployee.jsx for this
// candidate — the frontend passes the new employees.id it got back.
exports.markHired = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const candidate = await Recruitment.markHired(req.params.id, employeeId);
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.status(200).json(candidate);
  } catch (err) {
    console.error("MARK HIRED ERROR:", err.message);
    res.status(500).json({ error: "Failed to mark candidate as hired" });
  }
};

/* ═══════════════════════════════════════
   INTERVIEW ROUNDS
═══════════════════════════════════════ */

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
═══════════════════════════════════════ */

// POST /api/recruitment/candidates/:id/aptitude-test/send
// Body: { test_link }
exports.sendAptitudeTestLink = async (req, res) => {
  try {
    const { test_link } = req.body;
    if (!test_link) return res.status(400).json({ error: "test_link is required" });

    const existing = await Recruitment.getCandidateById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    const candidate = await Recruitment.sendAptitudeTest(req.params.id, test_link);

    const template = aptitudeTestEmailTemplate(candidate.name, existing.job_title, test_link);
    const mailResult = candidate.email
      ? await sendMail({ to: candidate.email, ...template })
      : { success: false, error: "Candidate has no email on file" };

    await Recruitment.logCandidateEmail(req.params.id, {
      email_type: "aptitude_test",
      subject: template.subject,
      sent_to: candidate.email,
      status: mailResult.success ? "sent" : "failed",
      error_message: mailResult.error,
    });

    res.status(200).json({ ...candidate, emailSent: mailResult.success });
  } catch (err) {
    console.error("SEND APTITUDE TEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to send aptitude test" });
  }
};

// PATCH /api/recruitment/candidates/:id/aptitude-test/complete
// Body: { score }
exports.completeAptitudeTest = async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined || score === null) {
      return res.status(400).json({ error: "score is required" });
    }

    const candidate = await Recruitment.completeAptitudeTest(req.params.id, Number(score));
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("COMPLETE APTITUDE TEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to record aptitude test score" });
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
   OFFER RELEASE
   POST /api/recruitment/candidates/:id/offer/release
   Sends the offer email using the offer fields already saved via
   PATCH /candidates/:id/offer — doesn't change stage.
═══════════════════════════════════════ */

exports.releaseOffer = async (req, res) => {
  try {
    const candidate = await Recruitment.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    if (!candidate.offered_role || !candidate.offered_salary || !candidate.joining_date) {
      return res.status(400).json({ error: "Save offer details before releasing the offer" });
    }

    const template = offerReleaseEmailTemplate(
      candidate.name,
      candidate.job_title,
      candidate.offered_role,
      candidate.offered_salary,
      candidate.joining_date
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

    res.status(200).json({ emailSent: mailResult.success });
  } catch (err) {
    console.error("RELEASE OFFER ERROR:", err.message);
    res.status(500).json({ error: "Failed to release offer" });
  }
};