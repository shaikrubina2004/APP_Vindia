// ===== FILE: APP_Vindia/backend/models/hiringRequestModel.js =====
const pool = require("../config/db");

const SELECT_BASE = `
  SELECT hr.*,
         to_char(hr.expected_joining_date, 'YYYY-MM-DD') AS expected_joining_date,
         ru.name  AS requester_name,
         ru.email AS requester_email,
         p.name   AS project_name,
         fu.name  AS finance_reviewer_name,
         hu.name  AS hr_reviewer_name
  FROM hiring_requests hr
  JOIN users ru            ON ru.id = hr.requested_by
  LEFT JOIN projects p     ON p.id  = hr.project_id
  LEFT JOIN users fu       ON fu.id = hr.finance_reviewed_by
  LEFT JOIN users hu       ON hu.id = hr.hr_reviewed_by
`;

const HiringRequest = {
  /* Create a request + its first history row in one transaction */
  create: async (data, actor, initialStatus, historyAction) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ins = await client.query(
        `INSERT INTO hiring_requests
           (requested_by, requester_role, position_title, department, project_id,
            vacancies, employment_type, justification, job_description,
            salary_min, salary_max, urgency, expected_joining_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          actor.id,
          actor.role,
          data.position_title,
          data.department || null,
          data.project_id || null,
          data.vacancies,
          data.employment_type,
          data.justification,
          data.job_description || null,
          data.salary_min,
          data.salary_max,
          data.urgency,
          data.expected_joining_date || null,
          initialStatus,
        ],
      );
      const id = ins.rows[0].id;

      await client.query(
        `UPDATE hiring_requests SET request_code = $1 WHERE id = $2`,
        [`HRQ-${String(id).padStart(4, "0")}`, id],
      );

      await client.query(
        `INSERT INTO hiring_request_history (hiring_request_id, action, actor_id, actor_role, remark)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, historyAction, actor.id, actor.role, null],
      );

      await client.query("COMMIT");
      return id;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  getById: async (id) => {
    const r = await pool.query(`${SELECT_BASE} WHERE hr.id = $1`, [id]);
    return r.rows[0] || null;
  },

  getHistory: async (id) => {
    const r = await pool.query(
      `SELECT h.*, u.name AS actor_name
       FROM hiring_request_history h
       LEFT JOIN users u ON u.id = h.actor_id
       WHERE h.hiring_request_id = $1
       ORDER BY h.created_at ASC, h.id ASC`,
      [id],
    );
    return r.rows;
  },

  getMine: async (userId) => {
    const r = await pool.query(
      `${SELECT_BASE} WHERE hr.requested_by = $1 ORDER BY hr.created_at DESC`,
      [userId],
    );
    return r.rows;
  },

  /* Finance queue: waiting for Finance, or already reviewed by Finance */
  getFinanceQueue: async () => {
    const r = await pool.query(
      `${SELECT_BASE}
       WHERE hr.status = 'pending_finance' OR hr.finance_reviewed_by IS NOT NULL
       ORDER BY (hr.status = 'pending_finance') DESC, hr.created_at DESC`,
    );
    return r.rows;
  },

  /* HR queue: waiting for HR, or already reviewed by HR */
  getHrQueue: async () => {
    const r = await pool.query(
      `${SELECT_BASE}
       WHERE hr.status = 'pending_hr' OR hr.hr_reviewed_by IS NOT NULL
       ORDER BY (hr.status = 'pending_hr') DESC, hr.created_at DESC`,
    );
    return r.rows;
  },

  /* Owner edits a REJECTED request and resubmits it */
  resubmit: async (id, data, actor, newStatus, historyAction) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const upd = await client.query(
        `UPDATE hiring_requests SET
           position_title = $1, department = $2, project_id = $3, vacancies = $4,
           employment_type = $5, justification = $6, job_description = $7,
           salary_min = $8, salary_max = $9, urgency = $10, expected_joining_date = $11,
           status = $12,
           finance_reviewed_by = NULL, finance_reviewed_at = NULL, finance_remark = NULL,
           hr_reviewed_by = NULL, hr_reviewed_at = NULL, hr_remark = NULL,
           updated_at = NOW()
         WHERE id = $13 AND requested_by = $14 AND status = 'rejected'
         RETURNING id`,
        [
          data.position_title,
          data.department || null,
          data.project_id || null,
          data.vacancies,
          data.employment_type,
          data.justification,
          data.job_description || null,
          data.salary_min,
          data.salary_max,
          data.urgency,
          data.expected_joining_date || null,
          newStatus,
          id,
          actor.id,
        ],
      );
      if (!upd.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `INSERT INTO hiring_request_history (hiring_request_id, action, actor_id, actor_role)
         VALUES ($1,$2,$3,$4)`,
        [id, historyAction, actor.id, actor.role],
      );

      await client.query("COMMIT");
      return id;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* Owner withdraws a request that is still pending or was rejected */
  cancel: async (id, actor) => {
    const r = await pool.query(
      `UPDATE hiring_requests SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND requested_by = $2
         AND status IN ('pending_finance','pending_hr','rejected')
       RETURNING id`,
      [id, actor.id],
    );
    if (!r.rows.length) return null;
    await pool.query(
      `INSERT INTO hiring_request_history (hiring_request_id, action, actor_id, actor_role)
       VALUES ($1,'cancelled',$2,$3)`,
      [id, actor.id, actor.role],
    );
    return id;
  },

  /* Finance approves / rejects. Guarded on status so it cannot run twice. */
  financeDecision: async (id, approve, remark, actor) => {
    const newStatus = approve ? "pending_hr" : "rejected";
    const r = await pool.query(
      `UPDATE hiring_requests SET
         status = $1, finance_reviewed_by = $2, finance_reviewed_at = NOW(),
         finance_remark = $3, updated_at = NOW()
       WHERE id = $4 AND status = 'pending_finance'
       RETURNING id`,
      [newStatus, actor.id, remark || null, id],
    );
    if (!r.rows.length) return null;
    await pool.query(
      `INSERT INTO hiring_request_history (hiring_request_id, action, actor_id, actor_role, remark)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        id,
        approve ? "finance_approved" : "finance_rejected",
        actor.id,
        actor.role,
        remark || null,
      ],
    );
    return id;
  },

  /* HR approves (and auto-creates the Job Opening) / rejects, in one transaction */
  hrDecision: async (id, approve, remark, actor) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const cur = await client.query(
        `SELECT * FROM hiring_requests WHERE id = $1 AND status = 'pending_hr' FOR UPDATE`,
        [id],
      );
      if (!cur.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }
      const req = cur.rows[0];

      let jobOpeningId = null;
      if (approve) {
        const jo = await client.query(
          `INSERT INTO job_openings
             (title, department, project_id, vacancies, description, created_by, hiring_request_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id`,
          [
            req.position_title,
            req.department,
            req.project_id,
            req.vacancies,
            req.job_description || req.justification,
            actor.id,
            req.id,
          ],
        );
        jobOpeningId = jo.rows[0].id;
      }

      await client.query(
        `UPDATE hiring_requests SET
           status = $1, hr_reviewed_by = $2, hr_reviewed_at = NOW(),
           hr_remark = $3, job_opening_id = $4, updated_at = NOW()
         WHERE id = $5`,
        [approve ? "approved" : "rejected", actor.id, remark || null, jobOpeningId, id],
      );

      await client.query(
        `INSERT INTO hiring_request_history (hiring_request_id, action, actor_id, actor_role, remark)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, approve ? "hr_approved" : "hr_rejected", actor.id, actor.role, remark || null],
      );

      await client.query("COMMIT");
      return { id, jobOpeningId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = HiringRequest;