const pool = require('../config/db');

const Finance = {
  getDashboard: async (projectId) => {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(b.allocated_amount), 0) AS total_budget,
        COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
        COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'pending'), 0) AS total_pending
       FROM projects p
       LEFT JOIN budgets b ON b.project_id = p.id
       LEFT JOIN invoices i ON i.project_id = p.id
       WHERE p.id = $1`,
      [projectId]
    );
    return result.rows[0];
  }
};

module.exports = Finance;