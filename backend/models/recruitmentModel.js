// ===== FILE: APP_Vindia/backend/models/recruitmentModel.js =====
const pool = require("../config/db");

const Recruitment = {
  /* ═══════════════════════════════════════
     JOB OPENINGS
  ═══════════════════════════════════════ */

  createJobOpening: async ({
    title,
    department,
    project_id,
    vacancies,
    description,
    created_by,
  }) => {
    const result = await pool.query(
      `INSERT INTO job_openings (title, department, project_id, vacancies, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        department || null,
        project_id || null,
        vacancies || 1,
        description || null,
        created_by,
      ],
    );
    return result.rows[0];
  },

  getAllJobOpenings: async ({ status } = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (status) {
      values.push(status);
      where += ` AND jo.status = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
         jo.*,
         p.name AS project_name,
         COALESCE(
           (SELECT COUNT(*) FROM candidates c
            WHERE c.job_opening_id = jo.id AND c.stage NOT IN ('rejected', 'hired')),
           0
         ) AS active_candidate_count
       FROM job_openings jo
       LEFT JOIN projects p ON p.id = jo.project_id
       ${where}
       ORDER BY jo.created_at DESC`,
      values,
    );
    return result.rows;
  },

  getJobOpeningById: async (id) => {
    const result = await pool.query(
      `SELECT jo.*, p.name AS project_name
       FROM job_openings jo
       LEFT JOIN projects p ON p.id = jo.project_id
       WHERE jo.id = $1`,
      [id],
    );
    return result.rows[0];
  },

  updateJobOpeningStatus: async (id, status) => {
    const result = await pool.query(
      `UPDATE job_openings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     CANDIDATES
  ═══════════════════════════════════════ */

  createCandidate: async ({
    job_opening_id,
    name,
    email,
    phone,
    resume_url,
    source,
    created_by,
  }) => {
    const result = await pool.query(
      `INSERT INTO candidates (job_opening_id, name, email, phone, resume_url, source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        job_opening_id,
        name,
        email || null,
        phone || null,
        resume_url || null,
        source || null,
        created_by,
      ],
    );
    return result.rows[0];
  },

  getCandidatesByJobOpening: async (jobOpeningId) => {
    const result = await pool.query(
      `SELECT * FROM candidates
       WHERE job_opening_id = $1
       ORDER BY created_at DESC`,
      [jobOpeningId],
    );
    return result.rows;
  },

  // All candidates, optionally filtered by stage — powers a cross-opening
  // pipeline view (e.g. "everyone currently at Interview").
  getAllCandidates: async ({ stage } = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (stage) {
      values.push(stage);
      where += ` AND c.stage = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT c.*, jo.title AS job_title
       FROM candidates c
       LEFT JOIN job_openings jo ON jo.id = c.job_opening_id
       ${where}
       ORDER BY c.updated_at DESC`,
      values,
    );
    return result.rows;
  },

  getCandidateById: async (id) => {
        const candidateResult = await pool.query(
      `SELECT c.*, jo.title AS job_title, jo.department, jo.project_id,
              m.name AS offered_manager_name,
              c.joining_date::text AS joining_date_text,
              c.bgv_deadline::text AS bgv_deadline_text
       FROM candidates c
       LEFT JOIN job_openings jo ON jo.id = c.job_opening_id
       LEFT JOIN employees m ON m.id = c.offered_manager_id
       WHERE c.id = $1`,
      [id],
    );

    if (candidateResult.rows.length === 0) return null;

    // scheduled_at is read back as text so the date and time are shown exactly
    // as HR typed them (no time-zone shifting).
    const interviewsResult = await pool.query(
      `SELECT *, scheduled_at::text AS scheduled_at_text
       FROM candidate_interviews
       WHERE candidate_id = $1
       ORDER BY round_number ASC, id ASC`,
      [id],
    );

    const interviews = interviewsResult.rows.map((r) => ({
      ...r,
      scheduled_at_local: r.scheduled_at_text
        ? r.scheduled_at_text.replace(" ", "T").slice(0, 16)
        : null,
    }));

    return { ...candidateResult.rows[0], interviews };
  },

  // Generic stage move: screening, interview, offer, rejected.
  // "hired" is handled separately by markHired, since it also stores
  // the linked employee id once AddEmployee.jsx has actually been used.
  updateCandidateStage: async (id, { stage, rejection_reason }) => {
    const result = await pool.query(
      `UPDATE candidates
       SET stage = $1,
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [stage, stage === "rejected" ? rejection_reason || null : null, id],
    );
    return result.rows[0];
  },

  // Saving offer details (re)opens the offer: the reply status is cleared, so a
  // changed offer must be released again. (The controller refuses to edit an
  // offer that has already been accepted.)
  updateOfferDetails: async (
    id,
    {
      offered_role,
      offered_salary,
      joining_date,
      offer_letter_url,
      offered_location,
      offered_employment_type,
      offered_manager_id,
    },
  ) => {
    const result = await pool.query(
      `UPDATE candidates
       SET offered_role = $1,
           offered_salary = $2,
           joining_date = $3,
           offer_letter_url = $4,
           offered_location = $5,
           offered_employment_type = $6,
           offered_manager_id = $7,
           offer_status = NULL,
           stage = 'offer',
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        offered_role,
        offered_salary,
        joining_date || null,
        offer_letter_url || null,
        offered_location || null,
        offered_employment_type || null,
        offered_manager_id || null,
        id,
      ],
    );
    return result.rows[0];
  },

  // The offer email went out.
  markOfferSent: async (id) => {
    const result = await pool.query(
      `UPDATE candidates
       SET offer_status = 'sent',
           offer_sent_at = NOW(),
           offer_responded_at = NULL,
           offer_response_note = NULL,
           offer_response_by = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return result.rows[0];
  },

  // HR records the candidate's reply (read from the info@ mailbox).
  // 'declined' also closes the candidate's process.
  recordOfferResponse: async (id, { response, note, userId }) => {
    const declineReason =
      "Offer declined by candidate" + (note ? `: ${note}` : "");
    const result = await pool.query(
      `UPDATE candidates
       SET offer_status = $1,
           offer_responded_at = NOW(),
           offer_response_note = $2,
           offer_response_by = $3,
           stage = CASE WHEN $1 = 'declined' THEN 'rejected' ELSE stage END,
           rejection_reason = CASE WHEN $1 = 'declined' THEN $4 ELSE rejection_reason END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [response, note || null, userId || null, declineReason, id],
    );
    return result.rows[0];
  },

  // Called once HR has actually completed AddEmployee.jsx for this
  // candidate — links the two records and closes out the pipeline.
  markHired: async (id, employeeId) => {
    const result = await pool.query(
      `UPDATE candidates
       SET stage = 'hired',
           hired_employee_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [employeeId, id],
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     INTERVIEW ROUNDS
  ═══════════════════════════════════════ */

  // Legacy: log a round that already happened (kept so nothing else breaks).
  addInterviewRound: async (
    candidateId,
    { round_number, interviewer_name, interview_date, feedback, rating },
  ) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const roundResult = await client.query(
        `INSERT INTO candidate_interviews
           (candidate_id, round_number, interviewer_name, interview_date, feedback, rating, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed')
         RETURNING *`,
        [
          candidateId,
          round_number,
          interviewer_name || null,
          interview_date || null,
          feedback || null,
          rating || null,
        ],
      );

      // Moving a candidate to "interview" the first time a round is logged,
      // but only if they haven't progressed past it already.
      await client.query(
        `UPDATE candidates
         SET stage = 'interview', updated_at = NOW()
         WHERE id = $1 AND stage IN ('applied', 'screening')`,
        [candidateId],
      );

      await client.query("COMMIT");
      return roundResult.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // Schedule a round: date + time, online / in person, link or place.
  // scheduled_at is "YYYY-MM-DDTHH:mm" exactly as typed by HR.
  scheduleInterviewRound: async (
    candidateId,
    { round_number, interviewer_name, scheduled_at, mode, location_or_link },
  ) => {
    const result = await pool.query(
      `INSERT INTO candidate_interviews
         (candidate_id, round_number, interviewer_name, interview_date,
          scheduled_at, mode, location_or_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *`,
      [
        candidateId,
        round_number,
        interviewer_name || null,
        scheduled_at.slice(0, 10), // the date part, for older screens
        scheduled_at,
        mode,
        location_or_link,
      ],
    );
    return result.rows[0];
  },

  // After the interview: record rating + feedback and mark the round done.
  completeInterviewRound: async (candidateId, roundId, { feedback, rating }) => {
    const result = await pool.query(
      `UPDATE candidate_interviews
       SET feedback = $1, rating = $2, status = 'completed'
       WHERE id = $3 AND candidate_id = $4
       RETURNING *`,
      [feedback || null, rating || null, roundId, candidateId],
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     SCREENING
  ═══════════════════════════════════════ */

  // decision: 'qualify' -> stage becomes aptitude_test
  //           'reject'  -> stage becomes rejected
  recordScreeningDecision: async (id, { screening_notes, decision, rejection_reason }) => {
    const nextStage = decision === "qualify" ? "aptitude_test" : "rejected";
    const result = await pool.query(
      `UPDATE candidates
       SET screening_notes = $1,
           stage = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [screening_notes || null, nextStage, decision === "reject" ? rejection_reason || null : null, id]
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     APTITUDE TEST
     The test itself runs on the separate aptitude portal, which emails the
     candidate on its own. The ERP only records the score and the decision.
  ═══════════════════════════════════════ */

  // Legacy (no longer used by the page): saved a test link.
  sendAptitudeTest: async (id, testLink) => {
    const result = await pool.query(
      `UPDATE candidates
       SET aptitude_test_link = $1,
           aptitude_test_status = 'sent',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [testLink, id]
    );
    return result.rows[0];
  },

  // Record the score. The candidate STAYS at the aptitude stage until HR
  // decides (see decideAptitude).
  completeAptitudeTest: async (id, score, max) => {
    const result = await pool.query(
      `UPDATE candidates
       SET aptitude_test_status = 'completed',
           aptitude_test_score = $1,
           aptitude_test_max = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [score, max ?? null, id]
    );
    return result.rows[0];
  },

  // HR's call after seeing the score.
  // 'qualify' -> interview, 'reject' -> rejected
  decideAptitude: async (id, { decision, rejection_reason }) => {
    const nextStage = decision === "qualify" ? "interview" : "rejected";
    const result = await pool.query(
      `UPDATE candidates
       SET stage = $1,
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nextStage, decision === "reject" ? rejection_reason || null : null, id]
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     INTERNAL APPROVAL
  ═══════════════════════════════════════ */

  // Call once interviews are done, to move a candidate from "interview"
  // into the approval queue without changing any other field.
  moveToApproval: async (id) => {
    const result = await pool.query(
      `UPDATE candidates SET stage = 'approval', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // decision: 'approved' -> stage becomes bgv
  //           'rejected' -> stage becomes rejected
  recordApproval: async (id, { decision, approverId }) => {
    const nextStage = decision === "approved" ? "bgv" : "rejected";
    const result = await pool.query(
      `UPDATE candidates
       SET approval_status = $1,
           approved_by = $2,
           approved_at = NOW(),
           stage = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [decision, approverId, nextStage, id]
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     BGV (BACKGROUND VERIFICATION)
  ═══════════════════════════════════════ */

  // Called after the BGV request email has really gone out: stores the link
  // that was sent and starts (or restarts) the verification.
  sendBgvRequest: async (id, { drive_link, deadline }) => {
    const result = await pool.query(
      `UPDATE candidates
       SET bgv_drive_link = $1,
           bgv_requested_at = NOW(),
           bgv_deadline = $2,
           bgv_status = 'in_progress',
           bgv_reviewed_by = NULL,
           bgv_reviewed_at = NULL,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [drive_link, deadline || null, id]
    );
    return result.rows[0];
  },

  // bgv_status 'cleared' auto-advances to the offer stage; 'flagged' or
  // 'in_progress' just records status — HR decides manually from there,
  // same universal Reject action covers a failed BGV.
  // Fields that are not sent keep their current value (notes, report link).
  // 'cleared' / 'flagged' also record who reviewed it and when.
  updateBGV: async (id, { bgv_status, bgv_document_url, bgv_notes, reviewerId }) => {
    const nextStage = bgv_status === "cleared" ? "offer" : null;
    const decided = bgv_status === "cleared" || bgv_status === "flagged";
    const result = await pool.query(
      `UPDATE candidates
       SET bgv_status = $1,
           bgv_document_url = COALESCE($2, bgv_document_url),
           bgv_notes = COALESCE($3, bgv_notes),
           bgv_reviewed_by = CASE WHEN $4::boolean THEN $5::integer ELSE bgv_reviewed_by END,
           bgv_reviewed_at = CASE WHEN $4::boolean THEN NOW() ELSE bgv_reviewed_at END,
           stage = COALESCE($6, stage),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        bgv_status,
        bgv_document_url || null,
        bgv_notes || null,
        decided,
        reviewerId || null,
        nextStage,
        id,
      ]
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     HISTORY (emails AND recorded decisions)
     Rows with status 'sent' / 'failed' are emails; rows with status
     'recorded' are decisions HR logged (aptitude score, offer reply...).
  ═══════════════════════════════════════ */

  logCandidateEmail: async (candidateId, { email_type, subject, sent_to, status, error_message }) => {
    const result = await pool.query(
      `INSERT INTO candidate_emails (candidate_id, email_type, subject, sent_to, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [candidateId, email_type, subject || null, sent_to || null, status, error_message || null]
    );
    return result.rows[0];
  },

  getCandidateEmails: async (candidateId) => {
    const result = await pool.query(
      `SELECT * FROM candidate_emails WHERE candidate_id = $1 ORDER BY sent_at DESC, id DESC`,
      [candidateId]
    );
    return result.rows;
  },
};

module.exports = Recruitment;