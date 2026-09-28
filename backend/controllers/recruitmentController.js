// ===== FILE: APP_Vindia/backend/controllers/recruitmentController.js =====
const Recruitment = require("../models/recruitmentModel");

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
    res.status(200).json(candidate);
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
        error: `stage must be one of: ${validStages.join(", ")}. Use /offer for the offer stage and /hire for hiring.`,
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