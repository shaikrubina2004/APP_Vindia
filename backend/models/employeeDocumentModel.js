// ===== FILE: APP_Vindia/backend/models/employeeDocumentModel.js =====
const pool = require("../config/db");

const EmployeeDocument = {
  create: async ({ employee_id, title, category, file_url, file_type, file_size_bytes, uploaded_by }) => {
    const result = await pool.query(
      `INSERT INTO employee_documents (employee_id, title, category, file_url, file_type, file_size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employee_id, title, category || null, file_url, file_type || null, file_size_bytes || null, uploaded_by]
    );
    return result.rows[0];
  },

  getByEmployeeId: async (employeeId) => {
    const result = await pool.query(
      `SELECT d.*, u.name AS uploaded_by_name
       FROM employee_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.employee_id = $1
       ORDER BY d.created_at DESC`,
      [employeeId]
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM employee_documents WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await pool.query(
      `DELETE FROM employee_documents WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = EmployeeDocument;