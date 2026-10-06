// ===== FILE: APP_Vindia/backend/models/invoiceModel.js =====
const pool = require("../config/db");

const Invoice = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND i.project_id = $${values.length}`;
    }
    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND i.status = $${values.length}`;
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      where += ` AND (i.invoice_number ILIKE $${values.length} OR i.client_name ILIKE $${values.length})`;
    }
    if (filters.wbs_id === "unassigned") {
      where += ` AND i.wbs_id IS NULL`;
    } else if (filters.wbs_id) {
      values.push(filters.wbs_id);
      where += ` AND i.wbs_id = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT i.*, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name,
              CASE WHEN i.status = 'pending' AND i.due_date < CURRENT_DATE
                   THEN 'overdue' ELSE i.status END AS "effectiveStatus"
       FROM invoices i
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN wbs w ON w.id = i.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       ${where}
       ORDER BY i.created_at DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT i.*, p.name AS project_name,
              w.code AS wbs_code, w.name AS wbs_name, w.parent_id AS wbs_parent_id,
              m.code AS milestone_code, m.name AS milestone_name
       FROM invoices i
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN wbs w ON w.id = i.wbs_id
       LEFT JOIN wbs m ON m.id = COALESCE(w.parent_id, w.id)
       WHERE i.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const {
      invoice_number, project_id, client_name, amount, tax_amount = 0,
      status = "pending", issue_date, due_date, notes, wbs_id = null,
    } = data;
    const result = await pool.query(
      `INSERT INTO invoices
         (invoice_number, project_id, client_name, amount, tax_amount, status, issue_date, due_date, notes, wbs_id)
       VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, CURRENT_DATE), $8, $9, $10)
       RETURNING *`,
      [invoice_number, project_id, client_name, amount, tax_amount, status, issue_date, due_date, notes, wbs_id]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { client_name, amount, tax_amount, due_date, notes } = data;
    const applyWbs = Object.prototype.hasOwnProperty.call(data, "wbs_id");
    const wbsValue = applyWbs ? (data.wbs_id === "" ? null : data.wbs_id) : null;
    const result = await pool.query(
      `UPDATE invoices SET
         client_name = COALESCE($1, client_name),
         amount = COALESCE($2, amount),
         tax_amount = COALESCE($3, tax_amount),
         due_date = COALESCE($4, due_date),
         notes = COALESCE($5, notes),
         wbs_id = CASE WHEN $6 THEN $7 ELSE wbs_id END,
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [client_name, amount, tax_amount, due_date, notes, applyWbs, wbsValue, id]
    );
    return result.rows[0];
  },

  updateStatus: async (id, status) => {
    const paidDate = status === "paid" ? "CURRENT_DATE" : "NULL";
    const result = await pool.query(
      `UPDATE invoices SET status = $1, paid_date = ${paidDate}, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query(`DELETE FROM invoices WHERE id = $1`, [id]);
  },

  getNextInvoiceNumber: async () => {
    const settings = await pool.query(
      `SELECT invoice_prefix, invoice_next_number FROM finance_settings WHERE id = 1`
    );
    const { invoice_prefix, invoice_next_number } = settings.rows[0] || { invoice_prefix: "INV-", invoice_next_number: 1001 };
    await pool.query(
      `UPDATE finance_settings SET invoice_next_number = invoice_next_number + 1 WHERE id = 1`
    );
    return `${invoice_prefix}${invoice_next_number}`;
  },
};

module.exports = Invoice;