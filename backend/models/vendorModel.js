// ===== FILE: APP_Vindia/backend/models/vendorModel.js =====
const pool = require("../config/db");

const Vendor = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND v.status = $${values.length}`;
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      where += ` AND (v.name ILIKE $${values.length} OR v.category ILIKE $${values.length})`;
    }

    const result = await pool.query(
      `SELECT
         v.*,
         COALESCE(COUNT(e.id), 0)::int          AS invoices,
         COALESCE(SUM(e.amount), 0)::numeric     AS "totalSpent"
       FROM vendors v
       LEFT JOIN expenses e ON e.vendor_id = v.id
       ${where}
       GROUP BY v.id
       ORDER BY v.name ASC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT
         v.*,
         COALESCE(COUNT(e.id), 0)::int          AS invoices,
         COALESCE(SUM(e.amount), 0)::numeric     AS "totalSpent"
       FROM vendors v
       LEFT JOIN expenses e ON e.vendor_id = v.id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const { name, category, payment_terms, rating, contact_email, contact_phone } = data;
    const result = await pool.query(
      `INSERT INTO vendors (name, category, payment_terms, rating, contact_email, contact_phone)
       VALUES ($1, $2, $3, COALESCE($4, 4.5), $5, $6) RETURNING *`,
      [name, category, payment_terms, rating, contact_email, contact_phone]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { name, category, payment_terms, rating, contact_email, contact_phone } = data;
    const result = await pool.query(
      `UPDATE vendors SET
         name = COALESCE($1, name),
         category = COALESCE($2, category),
         payment_terms = COALESCE($3, payment_terms),
         rating = COALESCE($4, rating),
         contact_email = COALESCE($5, contact_email),
         contact_phone = COALESCE($6, contact_phone),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, category, payment_terms, rating, contact_email, contact_phone, id]
    );
    return result.rows[0];
  },

  toggleStatus: async (id) => {
    const result = await pool.query(
      `UPDATE vendors
       SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  remove: async (id) => {
    await pool.query(`DELETE FROM vendors WHERE id = $1`, [id]);
  },

  getMetrics: async () => {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS "totalVendors",
         COUNT(*) FILTER (WHERE status = 'active')::int AS "activeVendors",
         COALESCE(ROUND(AVG(rating), 1), 0) AS "avgRating"
       FROM vendors`
    );
    const spend = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE vendor_id IS NOT NULL`);
    return { ...result.rows[0], totalSpent: Number(spend.rows[0].total) };
  },
};

module.exports = Vendor;