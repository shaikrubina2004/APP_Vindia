// ===== FILE: APP_Vindia/backend/models/paymentModel.js =====
const pool = require("../config/db");

const Payment = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND pay.project_id = $${values.length}`;
    }

    if (filters.payment_type && filters.payment_type !== "all") {
      values.push(filters.payment_type);
      where += ` AND pay.payment_type = $${values.length}`;
    }

    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND pay.status = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT pay.*, i.invoice_number, v.name AS vendor_name
       FROM payments pay
       LEFT JOIN invoices i ON i.id = pay.invoice_id
       LEFT JOIN vendors v ON v.id = pay.vendor_id
       ${where}
       ORDER BY pay.payment_date DESC, pay.created_at DESC`,
      values
    );

    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  },

  create: async (data) => {
    const {
      invoice_id,
      project_id,
      vendor_id,
      payment_type = "incoming",
      amount,
      payment_method,
      reference_number,
      status = "completed",
      payment_date,
      notes,
    } = data;

    const result = await pool.query(
      `INSERT INTO payments
         (invoice_id, project_id, vendor_id, payment_type, amount, payment_method,
          reference_number, status, payment_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, CURRENT_DATE), $10)
       RETURNING *`,
      [
        invoice_id,
        project_id,
        vendor_id,
        payment_type,
        amount,
        payment_method,
        reference_number,
        status,
        payment_date,
        notes,
      ]
    );

    // Automatically mark the linked invoice as paid when
    // completed incoming payments cover the invoice amount.
    if (
      invoice_id &&
      status === "completed" &&
      payment_type === "incoming"
    ) {
      await pool.query(
        `UPDATE invoices
         SET status = 'paid',
             paid_date = COALESCE(paid_date, CURRENT_DATE),
             updated_at = NOW()
         WHERE id = $1
           AND amount <= (
             SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE invoice_id = $1
               AND status = 'completed'
           )`,
        [invoice_id]
      );
    }

    return result.rows[0];
  },

  update: async (id, data) => {
    const {
      amount,
      payment_method,
      reference_number,
      status,
      payment_date,
      notes,
    } = data;

    const result = await pool.query(
      `UPDATE payments SET
         amount = COALESCE($1, amount),
         payment_method = COALESCE($2, payment_method),
         reference_number = COALESCE($3, reference_number),
         status = COALESCE($4, status),
         payment_date = COALESCE($5, payment_date),
         notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING *`,
      [
        amount,
        payment_method,
        reference_number,
        status,
        payment_date,
        notes,
        id,
      ]
    );

    const payment = result.rows[0];

    // Accountant flow:
    // When a pending incoming payment is marked as completed,
    // automatically reconcile the linked invoice.
    //
    // We use the UPDATED payment record here so that the check
    // reflects the actual status/amount/payment type stored in DB.
    if (
      payment &&
      payment.invoice_id &&
      payment.status === "completed" &&
      payment.payment_type === "incoming"
    ) {
      await pool.query(
        `UPDATE invoices
         SET status = 'paid',
             paid_date = COALESCE(paid_date, CURRENT_DATE),
             updated_at = NOW()
         WHERE id = $1
           AND amount <= (
             SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE invoice_id = $1
               AND status = 'completed'
           )`,
        [payment.invoice_id]
      );
    }

    return payment;
  },

  delete: async (id) => {
    await pool.query(
      `DELETE FROM payments WHERE id = $1`,
      [id]
    );
  },

  getStatusSummary: async (projectId) => {
    const values = [];
    let filter = "";

    if (projectId) {
      values.push(projectId);
      filter = "WHERE project_id = $1";
    }

    const result = await pool.query(
      `SELECT payment_type,
              status,
              COALESCE(SUM(amount),0) AS total,
              COUNT(*)::int AS count
       FROM payments
       ${filter}
       GROUP BY payment_type, status`,
      values
    );

    return result.rows;
  },
};

module.exports = Payment;