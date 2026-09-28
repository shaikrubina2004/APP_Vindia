// ===== FILE: APP_Vindia/backend/models/operationsDailyUpdateModel.js =====
const pool = require("../config/db");

const SELECT_WITH_NAMES = `
  SELECT u.*,
         to_char(u.date, 'YYYY-MM-DD') AS date_str,
         sub.name AS submitter_name,
         rev.name AS reviewer_name
  FROM operations_daily_updates u
  LEFT JOIN users sub ON sub.id = u.submitted_by
  LEFT JOIN users rev ON rev.id = u.reviewed_by
`;

const OperationsDailyUpdate = {
  // Create today's update, or overwrite it if already submitted today.
  // A re-submit goes back to "pending" so the manager sees the latest.
  upsert: async (submittedBy, roleCode, data) => {
    const { date, work, overall_status, issues, pending, next_plan } = data;

    const result = await pool.query(
      `INSERT INTO operations_daily_updates
        (submitted_by, role_code, date, work, overall_status,
         issues, pending, next_plan, status, submitted_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',NOW(),NOW())
       ON CONFLICT (submitted_by, date) DO UPDATE SET
         role_code      = EXCLUDED.role_code,
         work           = EXCLUDED.work,
         overall_status = EXCLUDED.overall_status,
         issues         = EXCLUDED.issues,
         pending        = EXCLUDED.pending,
         next_plan      = EXCLUDED.next_plan,
         status         = 'pending',
         reviewed_by    = NULL,
         reviewed_at    = NULL,
         review_note    = NULL,
         submitted_at   = NOW(),
         updated_at     = NOW()
       RETURNING *`,
      [
        submittedBy,
        roleCode,
        date,
        work || "",
        overall_status || "on-track",
        issues || "",
        pending || "",
        next_plan || "",
      ]
    );
    return result.rows[0];
  },

  getBySubmitter: async (submittedBy) => {
    const result = await pool.query(
      `${SELECT_WITH_NAMES}
       WHERE u.submitted_by = $1
       ORDER BY u.date DESC, u.updated_at DESC
       LIMIT 30`,
      [submittedBy]
    );
    return result.rows;
  },

  getTodayBySubmitter: async (submittedBy, today) => {
    const result = await pool.query(
      `${SELECT_WITH_NAMES}
       WHERE u.submitted_by = $1 AND u.date = $2`,
      [submittedBy, today]
    );
    return result.rows[0] || null;
  },

  // Operations Manager inbox
  getAll: async ({ status, role_code } = {}) => {
    const where = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      where.push(`u.status = $${params.length}`);
    }
    if (role_code && role_code !== "all") {
      params.push(role_code);
      where.push(`u.role_code = $${params.length}`);
    }

    const result = await pool.query(
      `${SELECT_WITH_NAMES}
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY u.date DESC, u.updated_at DESC
       LIMIT 200`,
      params
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(`${SELECT_WITH_NAMES} WHERE u.id = $1`, [id]);
    return result.rows[0] || null;
  },

  review: async (id, reviewerId, status, note) => {
    const result = await pool.query(
      `UPDATE operations_daily_updates
       SET status = $2, reviewed_by = $3, reviewed_at = NOW(),
           review_note = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, reviewerId, note || null]
    );
    return result.rows[0] || null;
  },
};

module.exports = OperationsDailyUpdate;