// ===== FILE: APP_Vindia/backend/models/pettyCashModel.js =====
const pool = require("../config/db");

const PettyCash = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND pc.project_id = $${values.length}`;
    }
    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND pc.status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT pc.*, p.name AS project_name
       FROM petty_cash_transactions pc
       LEFT JOIN projects p ON p.id = pc.project_id
       ${where}
       ORDER BY pc.created_at DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(`SELECT * FROM petty_cash_transactions WHERE id = $1`, [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { project_id, transaction_type, amount, category, description, receipt_url, created_by } = data;
    const result = await pool.query(
      `INSERT INTO petty_cash_transactions
         (project_id, transaction_type, amount, category, description, receipt_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id || null, transaction_type, amount, category, description, receipt_url, created_by]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const existing = await pool.query(`SELECT status FROM petty_cash_transactions WHERE id = $1`, [id]);
    if (!existing.rows[0]) return { error: "NOT_FOUND" };
    if (existing.rows[0].status !== "pending") return { error: "NOT_EDITABLE" };

    const { transaction_type, amount, category, description, receipt_url } = data;
    const result = await pool.query(
      `UPDATE petty_cash_transactions SET
         transaction_type = COALESCE($1, transaction_type),
         amount = COALESCE($2, amount),
         category = COALESCE($3, category),
         description = COALESCE($4, description),
         receipt_url = COALESCE($5, receipt_url),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [transaction_type, amount, category, description, receipt_url, id]
    );
    return { entry: result.rows[0] };
  },

  // Finance Manager only — enforced in controller. Row-locked to prevent
  // a concurrent approve+reject (or double-approve) race on the same row.
  approve: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(`SELECT status FROM petty_cash_transactions WHERE id = $1 FOR UPDATE`, [id]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (existing.rows[0].status !== "pending") { await client.query("ROLLBACK"); return { error: "NOT_PENDING" }; }

      const result = await client.query(
        `UPDATE petty_cash_transactions
         SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      await client.query("COMMIT");
      return { entry: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  reject: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(`SELECT status FROM petty_cash_transactions WHERE id = $1 FOR UPDATE`, [id]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (existing.rows[0].status !== "pending") { await client.query("ROLLBACK"); return { error: "NOT_PENDING" }; }

      const result = await client.query(
        `UPDATE petty_cash_transactions
         SET status = 'rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      await client.query("COMMIT");
      return { entry: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  getBalance: async (projectId) => {
    const values = [];
    let where = "WHERE status = 'approved'";
    if (projectId) {
      values.push(projectId);
      where += ` AND project_id = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'inflow' THEN amount ELSE 0 END),0) AS total_inflow,
         COALESCE(SUM(CASE WHEN transaction_type = 'outflow' THEN amount ELSE 0 END),0) AS total_outflow
       FROM petty_cash_transactions ${where}`,
      values
    );
    const row = result.rows[0];
    return {
      totalInflow: Number(row.total_inflow),
      totalOutflow: Number(row.total_outflow),
      balance: Number(row.total_inflow) - Number(row.total_outflow),
    };
  },
};

module.exports = PettyCash;
