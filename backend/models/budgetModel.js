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
    if (filters.wbs_id === "unassigned") {
      where += ` AND b.wbs_id IS NULL`;
    } else if (filters.wbs_id) {
      values.push(filters.wbs_id);
      where += ` AND b.wbs_id = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name,
              CASE WHEN b.allocated_amount > 0
                   THEN ROUND((b.spent_amount / b.allocated_amount) * 100, 1)
                   ELSE 0 END AS "utilizationPct"
       FROM budgets b
       LEFT JOIN projects p ON p.id = b.project_id
       LEFT JOIN wbs w ON w.id = b.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       ${where}
       ORDER BY b.created_at DESC`,
      values
    );
    return result.rows;
  },

  getByProject: async (projectId) => {
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM budgets b
       LEFT JOIN projects p ON p.id = b.project_id
       LEFT JOIN wbs w ON w.id = b.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       WHERE b.project_id = $1 ORDER BY b.created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT b.*, w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM budgets b
       LEFT JOIN wbs w ON w.id = b.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const { project_id, category, allocated_amount, fiscal_year, notes, created_by, wbs_id = null } = data;
    const result = await pool.query(
      `INSERT INTO budgets (project_id, category, allocated_amount, fiscal_year, notes, created_by, wbs_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, category, allocated_amount, fiscal_year, notes, created_by, wbs_id]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { category, allocated_amount, fiscal_year, notes } = data;
    const applyWbs = Object.prototype.hasOwnProperty.call(data, "wbs_id");
    const wbsValue = applyWbs ? (data.wbs_id === "" ? null : data.wbs_id) : null;
    const result = await pool.query(
      `UPDATE budgets SET
         category = COALESCE($1, category),
         allocated_amount = COALESCE($2, allocated_amount),
         fiscal_year = COALESCE($3, fiscal_year),
         notes = COALESCE($4, notes),
         wbs_id = CASE WHEN $5 THEN $6 ELSE wbs_id END,
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [category, allocated_amount, fiscal_year, notes, applyWbs, wbsValue, id]
    );
    return result.rows[0];
  },

  // Recalculates spent_amount for every budget in this project+category
  // from actual approved/paid expenses. Call after expense
  // create/update/delete.
  //
  // A budget with no wbs_id keeps its pre-existing, unchanged meaning:
  // "all spend in this project+category, regardless of WBS" (nothing
  // about existing budget calculations regresses). A budget that HAS
  // been given a wbs_id is now scoped tighter — only expenses tagged
  // with that exact WBS count toward it, refining rather than
  // replacing the original figure.
  recalcSpent: async (projectId, category) => {
    await pool.query(
      `UPDATE budgets b
       SET spent_amount = COALESCE((
             SELECT SUM(e.amount) FROM expenses e
             WHERE e.project_id = b.project_id
               AND e.category = b.category
               AND e.status IN ('approved','paid')
               AND (b.wbs_id IS NULL OR e.wbs_id = b.wbs_id)
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