// ===== FILE: APP_Vindia/backend/models/taxRegisterModel.js =====
const pool = require("../config/db");

const TaxRegister = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND t.project_id = $${values.length}`;
    }
    if (filters.filing_period) {
      values.push(filters.filing_period);
      where += ` AND t.filing_period = $${values.length}`;
    }
    if (filters.source_type && filters.source_type !== "all") {
      values.push(filters.source_type);
      where += ` AND t.source_type = $${values.length}`;
    }
    if (filters.wbs_id === "unassigned") {
      where += ` AND t.wbs_id IS NULL AND t.project_id IS NOT NULL`;
    } else if (filters.wbs_id) {
      values.push(filters.wbs_id);
      where += ` AND t.wbs_id = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT t.*, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM tax_register t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN wbs w ON w.id = t.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       ${where}
       ORDER BY t.created_at DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT t.*, w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM tax_register t
       LEFT JOIN wbs w ON w.id = t.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // project_id AND wbs_id are always DERIVED from the source
  // invoice/expense (see deriveWbsFromSource in
  // utils/financeWbsValidation.js) — never taken as a manual field
  // from the request, per Section 15.
  create: async (data) => {
    const {
      source_type, source_id, tax_type, rate,
      taxable_amount, tax_amount, filing_period, project_id, wbs_id, created_by,
    } = data;
    const result = await pool.query(
      `INSERT INTO tax_register
         (source_type, source_id, tax_type, rate, taxable_amount, tax_amount, filing_period, project_id, wbs_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [source_type, source_id, tax_type, rate, taxable_amount, tax_amount, filing_period, project_id || null, wbs_id || null, created_by]
    );
    return result.rows[0];
  },

  // Note: status is intentionally NOT accepted here — only markFiled()
  // below can move status to 'filed' (Finance Manager only, enforced in
  // the controller). This is an editable-fields-only update, matching
  // Accountant's create/edit permission on this module.
  update: async (id, data) => {
    const existing = await pool.query(`SELECT status FROM tax_register WHERE id = $1`, [id]);
    if (!existing.rows[0]) return { error: "NOT_FOUND" };
    if (existing.rows[0].status !== "pending") return { error: "NOT_EDITABLE" };

    const { tax_type, rate, taxable_amount, tax_amount, filing_period } = data;
    const result = await pool.query(
      `UPDATE tax_register SET
         tax_type = COALESCE($1, tax_type),
         rate = COALESCE($2, rate),
         taxable_amount = COALESCE($3, taxable_amount),
         tax_amount = COALESCE($4, tax_amount),
         filing_period = COALESCE($5, filing_period),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [tax_type, rate, taxable_amount, tax_amount, filing_period, id]
    );
    return { entry: result.rows[0] };
  },

  // pending -> filed. Finance Manager only — enforced in controller.
  // Row-locked to prevent a double-file race.
  markFiled: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(`SELECT status FROM tax_register WHERE id = $1 FOR UPDATE`, [id]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (existing.rows[0].status !== "pending") { await client.query("ROLLBACK"); return { error: "NOT_PENDING" }; }
      const result = await client.query(
        `UPDATE tax_register SET status = 'filed', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
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

  getSummaryByPeriod: async () => {
    const result = await pool.query(
      `SELECT filing_period, tax_type,
              COALESCE(SUM(taxable_amount),0) AS taxable_total,
              COALESCE(SUM(tax_amount),0) AS tax_total,
              COUNT(*)::int AS count
       FROM tax_register
       GROUP BY filing_period, tax_type
       ORDER BY filing_period DESC`
    );
    return result.rows;
  },
};

module.exports = TaxRegister;
