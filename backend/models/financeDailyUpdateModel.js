// ===== FILE: APP_Vindia/backend/models/financeDailyUpdateModel.js =====
const pool = require("../config/db");

const FinanceDailyUpdate = {
  // ── Create / upsert today's update for a Finance Manager ────────────
  // One row per (submitted_by, date) — resubmitting the same day updates
  // the existing row instead of creating a duplicate, and resets it back
  // to "pending" so CEO reviews the latest numbers.
  create: async (submittedBy, data) => {
    const {
      date,
      cash_position,
      todays_collections,
      todays_expenses,
      invoices_raised,
      payments_made,
      pending_approvals,
      overall_status,
      summary,
    } = data;

    const result = await pool.query(
      `INSERT INTO finance_daily_updates
        (submitted_by, date, cash_position, todays_collections, todays_expenses,
         invoices_raised, payments_made, pending_approvals, overall_status, summary,
         status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW())
       ON CONFLICT (submitted_by, date) DO UPDATE SET
         cash_position       = EXCLUDED.cash_position,
         todays_collections  = EXCLUDED.todays_collections,
         todays_expenses     = EXCLUDED.todays_expenses,
         invoices_raised     = EXCLUDED.invoices_raised,
         payments_made       = EXCLUDED.payments_made,
         pending_approvals   = EXCLUDED.pending_approvals,
         overall_status      = EXCLUDED.overall_status,
         summary             = EXCLUDED.summary,
         status              = 'pending',
         reviewed_by         = NULL,
         reviewed_at         = NULL,
         review_note         = NULL,
         updated_at          = NOW()
       RETURNING *`,
      [
        submittedBy,
        date,
        cash_position || 0,
        todays_collections || 0,
        todays_expenses || 0,
        invoices_raised || 0,
        payments_made || 0,
        pending_approvals || 0,
        overall_status || "on-track",
        summary || "",
      ]
    );
    return result.rows[0];
  },

  // ── Get one Finance Manager's own history ────────────────────────────
  getBySubmitter: async (submittedBy) => {
    const result = await pool.query(
      `SELECT fdu.*, u.name AS submitted_by_name
       FROM finance_daily_updates fdu
       JOIN users u ON u.id = fdu.submitted_by
       WHERE fdu.submitted_by = $1
       ORDER BY fdu.date DESC`,
      [submittedBy]
    );
    return result.rows;
  },

  // ── Today's update for one submitter (for the "already submitted?" check) ──
  getTodayBySubmitter: async (submittedBy) => {
    const result = await pool.query(
      `SELECT * FROM finance_daily_updates
       WHERE submitted_by = $1 AND date = CURRENT_DATE
       LIMIT 1`,
      [submittedBy]
    );
    return result.rows[0] || null;
  },

  // ── All updates, for CEO review inbox ────────────────────────────────
  getAll: async (filters = {}) => {
    const { status, from, to } = filters;
    const clauses = [];
    const values = [];

    if (status) {
      values.push(status);
      clauses.push(`fdu.status = $${values.length}`);
    }
    if (from) {
      values.push(from);
      clauses.push(`fdu.date >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      clauses.push(`fdu.date <= $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT fdu.*,
              u.name AS submitted_by_name,
              r.name AS reviewed_by_name
       FROM finance_daily_updates fdu
       JOIN users u ON u.id = fdu.submitted_by
       LEFT JOIN users r ON r.id = fdu.reviewed_by
       ${where}
       ORDER BY fdu.date DESC, fdu.created_at DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT fdu.*, u.name AS submitted_by_name, r.name AS reviewed_by_name
       FROM finance_daily_updates fdu
       JOIN users u ON u.id = fdu.submitted_by
       LEFT JOIN users r ON r.id = fdu.reviewed_by
       WHERE fdu.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── CEO approves or rejects ──────────────────────────────────────────
  review: async (id, reviewerId, status, note) => {
    const result = await pool.query(
      `UPDATE finance_daily_updates
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, reviewerId, note || null, id]
    );
    return result.rows[0] || null;
  },
};

module.exports = FinanceDailyUpdate;