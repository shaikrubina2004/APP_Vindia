// ===== FILE: APP_Vindia/backend/models/budgetModel.js =====
const pool = require("../config/db");

const Budget = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND b.project_id = $${values.length}`;
    }
    if (filters.fiscal_year) {
      values.push(filters.fiscal_year);
      where += ` AND b.fiscal_year = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name,
              CASE WHEN b.allocated_amount > 0
                   THEN ROUND((b.spent_amount / b.allocated_amount) * 100, 1)
                   ELSE 0 END AS "utilizationPct"
       FROM budgets b
       LEFT JOIN projects p ON p.id = b.project_id
       ${where}
       ORDER BY b.created_at DESC`,
      values
    );
    return result.rows;
  },

  getByProject: async (projectId) => {
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name
       FROM budgets b
       LEFT JOIN projects p ON p.id = b.project_id
       WHERE b.project_id = $1 ORDER BY b.created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(`SELECT * FROM budgets WHERE id = $1`, [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { project_id, category, allocated_amount, fiscal_year, notes, created_by } = data;
    const result = await pool.query(
      `INSERT INTO budgets (project_id, category, allocated_amount, fiscal_year, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, category, allocated_amount, fiscal_year, notes, created_by]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { category, allocated_amount, fiscal_year, notes } = data;
    const result = await pool.query(
      `UPDATE budgets SET
         category = COALESCE($1, category),
         allocated_amount = COALESCE($2, allocated_amount),
         fiscal_year = COALESCE($3, fiscal_year),
         notes = COALESCE($4, notes),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [category, allocated_amount, fiscal_year, notes, id]
    );
    return result.rows[0];
  },

  // Recalculates spent_amount for a budget from actual approved/paid expenses
  // in the same project + category. Call after expense create/update/delete.
  recalcSpent: async (projectId, category) => {
    await pool.query(
      `UPDATE budgets b
       SET spent_amount = COALESCE((
             SELECT SUM(e.amount) FROM expenses e
             WHERE e.project_id = b.project_id
               AND e.category = b.category
               AND e.status IN ('approved','paid')
           ), 0),
           updated_at = NOW()
       WHERE b.project_id = $1 AND b.category = $2`,
      [projectId, category]
    );
  },

  remove: async (id) => {
    await pool.query(`DELETE FROM budgets WHERE id = $1`, [id]);
  },
};

module.exports = Budget;