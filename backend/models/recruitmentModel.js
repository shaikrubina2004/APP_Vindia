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
      `SELECT c.*, jo.title AS job_title, jo.department, jo.project_id
       FROM candidates c
       LEFT JOIN job_openings jo ON jo.id = c.job_opening_id
       WHERE c.id = $1`,
      [id],
    );

    if (candidateResult.rows.length === 0) return null;

    const interviewsResult = await pool.query(
      `SELECT * FROM candidate_interviews
       WHERE candidate_id = $1
       ORDER BY round_number ASC`,
      [id],
    );

    return { ...candidateResult.rows[0], interviews: interviewsResult.rows };
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

  updateOfferDetails: async (
    id,
    { offered_role, offered_salary, joining_date, offer_letter_url },
  ) => {
    const result = await pool.query(
      `UPDATE candidates
       SET offered_role = $1,
           offered_salary = $2,
           joining_date = $3,
           offer_letter_url = $4,
           stage = 'offer',
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        offered_role,
        offered_salary,
        joining_date || null,
        offer_letter_url || null,
        id,
      ],
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

  addInterviewRound: async (
    candidateId,
    { round_number, interviewer_name, interview_date, feedback, rating },
  ) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const roundResult = await client.query(
        `INSERT INTO candidate_interviews
           (candidate_id, round_number, interviewer_name, interview_date, feedback, rating)
         VALUES ($1, $2, $3, $4, $5, $6)
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
  ═══════════════════════════════════════ */

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

  // Recording a score always marks the test completed and advances to
  // interview — a bad score doesn't auto-reject; HR uses the existing
  // universal Reject action if the result isn't good enough.
  completeAptitudeTest: async (id, score) => {
    const result = await pool.query(
      `UPDATE candidates
       SET aptitude_test_status = 'completed',
           aptitude_test_score = $1,
           stage = 'interview',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [score, id]
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

  // bgv_status 'cleared' auto-advances to the offer stage; 'flagged' or
  // 'in_progress' just records status — HR decides manually from there,
  // same universal Reject action covers a failed BGV.
  updateBGV: async (id, { bgv_status, bgv_document_url, bgv_notes }) => {
    const nextStage = bgv_status === "cleared" ? "offer" : null;
    const result = await pool.query(
      `UPDATE candidates
       SET bgv_status = $1,
           bgv_document_url = $2,
           bgv_notes = $3,
           stage = COALESCE($4, stage),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [bgv_status, bgv_document_url || null, bgv_notes || null, nextStage, id]
    );
    return result.rows[0];
  },

  /* ═══════════════════════════════════════
     EMAIL LOG
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
      `SELECT * FROM candidate_emails WHERE candidate_id = $1 ORDER BY sent_at DESC`,
      [candidateId]
    );
    return result.rows;
  },
};

module.exports = Recruitment;