const pool = require('../config/db');

const Invoice = {
  create: async (data) => {
    const { project_id, invoice_number, amount, status, due_date } = data;
    const result = await pool.query(
      `INSERT INTO invoices (project_id, invoice_number, amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_id, invoice_number, amount, status, due_date]
    );
    return result.rows[0];
  },

  getAll: async (filters = {}) => {
    let query = `SELECT * FROM invoices WHERE 1=1`;
    const values = [];
    if (filters.project_id) {
      values.push(filters.project_id);
      query += ` AND project_id = $${values.length}`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  },

  updateStatus: async (id, status) => {
    const result = await pool.query(
      `UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query(`DELETE FROM invoices WHERE id = $1`, [id]);
  }
};

module.exports = Invoice;