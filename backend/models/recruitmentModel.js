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
};

module.exports = Recruitment;
