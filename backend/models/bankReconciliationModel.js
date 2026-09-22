// ===== FILE: APP_Vindia/backend/models/bankReconciliationModel.js =====
const pool = require("../config/db");

const BankReconciliation = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.bank_account_id) {
      values.push(filters.bank_account_id);
      where += ` AND br.bank_account_id = $${values.length}`;
    }
    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND br.status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT br.*, ba.bank_name, ba.account_number
       FROM bank_reconciliations br
       JOIN finance_bank_accounts ba ON ba.id = br.bank_account_id
       ${where}
       ORDER BY br.statement_date DESC, br.id DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT br.*, ba.bank_name, ba.account_number
       FROM bank_reconciliations br
       JOIN finance_bank_accounts ba ON ba.id = br.bank_account_id
       WHERE br.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const { bank_account_id, statement_date, statement_balance, book_balance, notes, created_by } = data;
    const difference = Number(statement_balance) - Number(book_balance);
    const result = await pool.query(
      `INSERT INTO bank_reconciliations
         (bank_account_id, statement_date, statement_balance, book_balance, difference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [bank_account_id, statement_date, statement_balance, book_balance, difference, notes, created_by]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const existing = await pool.query(`SELECT status FROM bank_reconciliations WHERE id = $1`, [id]);
    if (!existing.rows[0]) return { error: "NOT_FOUND" };
    if (existing.rows[0].status !== "in_progress") return { error: "NOT_EDITABLE" };

    const { statement_date, statement_balance, book_balance, notes } = data;
    const difference =
      statement_balance !== undefined && book_balance !== undefined
        ? Number(statement_balance) - Number(book_balance)
        : undefined;

    const result = await pool.query(
      `UPDATE bank_reconciliations SET
         statement_date = COALESCE($1, statement_date),
         statement_balance = COALESCE($2, statement_balance),
         book_balance = COALESCE($3, book_balance),
         difference = COALESCE($4, difference),
         notes = COALESCE($5, notes),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [statement_date, statement_balance, book_balance, difference, notes, id]
    );
    return { entry: result.rows[0] };
  },

  // Finance Manager only — enforced in controller. Row-locked to prevent
  // two concurrent approvals of the same reconciliation.
  approve: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(`SELECT status FROM bank_reconciliations WHERE id = $1 FOR UPDATE`, [id]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (existing.rows[0].status !== "in_progress") { await client.query("ROLLBACK"); return { error: "NOT_IN_PROGRESS" }; }

      const result = await client.query(
        `UPDATE bank_reconciliations
         SET status = 'reconciled', reconciled_by = $1, reconciled_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
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
};

module.exports = BankReconciliation;
