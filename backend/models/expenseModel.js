// ===== FILE: APP_Vindia/backend/models/expenseModel.js =====
const pool = require("../config/db");

const Expense = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND e.project_id = $${values.length}`;
    }
    if (filters.expense_type && filters.expense_type !== "all") {
      values.push(filters.expense_type);
      where += ` AND e.expense_type = $${values.length}`;
    }
    if (filters.category && filters.category !== "all") {
      values.push(filters.category);
      where += ` AND e.category = $${values.length}`;
    }
    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND e.status = $${values.length}`;
    }
    // WBS filter: a numeric id filters to that exact WBS row;
    // "unassigned" surfaces historical/未-classified project rows
    // (Section 6 — a report/filter for "WBS Unassigned").
    if (filters.wbs_id === "unassigned") {
      where += ` AND e.wbs_id IS NULL AND e.project_id IS NOT NULL`;
    } else if (filters.wbs_id) {
      values.push(filters.wbs_id);
      where += ` AND e.wbs_id = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT e.*, v.name AS vendor_name, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM expenses e
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN projects p ON p.id = e.project_id
       LEFT JOIN wbs w ON w.id = e.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT e.*, v.name AS vendor_name, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM expenses e
       LEFT JOIN vendors v ON v.id = e.vendor_id
       LEFT JOIN projects p ON p.id = e.project_id
       LEFT JOIN wbs w ON w.id = e.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const {
      project_id, expense_type = "project", category, description, amount,
      vendor_id, expense_date, payment_method, status = "pending", receipt_url, created_by,
      wbs_id = null,
    } = data;
    const result = await pool.query(
      `INSERT INTO expenses
         (project_id, expense_type, category, description, amount, vendor_id,
          expense_date, payment_method, status, receipt_url, created_by, wbs_id)
       VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, CURRENT_DATE), $8,$9,$10,$11,$12)
       RETURNING *`,
      [project_id, expense_type, category, description, amount, vendor_id,
       expense_date, payment_method, status, receipt_url, created_by, wbs_id]
    );
    return result.rows[0];
  },

  // wbs_id is only applied when the caller explicitly passed the key
  // (see expenseController.js) — COALESCE would otherwise make it
  // impossible to ever clear a WBS back to "unassigned".
  update: async (id, data) => {
    const { category, description, amount, vendor_id, expense_date, payment_method, status, receipt_url } = data;
    const applyWbs = Object.prototype.hasOwnProperty.call(data, "wbs_id");
    const wbsValue = applyWbs ? (data.wbs_id === "" ? null : data.wbs_id) : null;
    const result = await pool.query(
      `UPDATE expenses SET
         category = COALESCE($1, category),
         description = COALESCE($2, description),
         amount = COALESCE($3, amount),
         vendor_id = COALESCE($4, vendor_id),
         expense_date = COALESCE($5, expense_date),
         payment_method = COALESCE($6, payment_method),
         status = COALESCE($7, status),
         receipt_url = COALESCE($8, receipt_url),
         wbs_id = CASE WHEN $9 THEN $10 ELSE wbs_id END,
         updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [category, description, amount, vendor_id, expense_date, payment_method, status, receipt_url,
       applyWbs, wbsValue, id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query(`DELETE FROM expenses WHERE id = $1`, [id]);
  },

  getSummary: async (projectId) => {
    const values = [];
    let projectFilter = "";
    if (projectId) {
      values.push(projectId);
      projectFilter = `AND project_id = $1`;
    }
    const byType = await pool.query(
      `SELECT expense_type, COALESCE(SUM(amount),0) AS total
       FROM expenses WHERE 1=1 ${projectFilter} GROUP BY expense_type`,
      values
    );
    const byCategory = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*)::int AS count
       FROM expenses WHERE 1=1 ${projectFilter} GROUP BY category ORDER BY total DESC`,
      values
    );
    return { byType: byType.rows, byCategory: byCategory.rows };
  },
};

module.exports = Expense;