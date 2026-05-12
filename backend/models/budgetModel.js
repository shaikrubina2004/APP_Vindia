const pool = require('../config/db');

const Budget = {
  create: async (data) => {
    const { project_id, category, allocated_amount, fiscal_year } = data;
    const result = await pool.query(
      `INSERT INTO budgets (project_id, category, allocated_amount, fiscal_year)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, category, allocated_amount, fiscal_year]
    );
    return result.rows[0];
  },

  getByProject: async (projectId) => {
    const result = await pool.query(
      `SELECT * FROM budgets WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  }
};

module.exports = Budget;