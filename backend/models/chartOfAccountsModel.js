// ===== FILE: APP_Vindia/backend/models/chartOfAccountsModel.js =====
const pool = require("../config/db");

const ChartOfAccounts = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.account_type && filters.account_type !== "all") {
      values.push(filters.account_type);
      where += ` AND a.account_type = $${values.length}`;
    }
    if (filters.is_active !== undefined) {
      values.push(filters.is_active);
      where += ` AND a.is_active = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT a.*, p.account_name AS parent_account_name
       FROM chart_of_accounts a
       LEFT JOIN chart_of_accounts p ON p.id = a.parent_account_id
       ${where}
       ORDER BY a.account_code ASC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  create: async (data) => {
    const { account_code, account_name, account_type, parent_account_id } = data;
    const result = await pool.query(
      `INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [account_code, account_name, account_type, parent_account_id || null]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { account_name, account_type, parent_account_id, is_active } = data;
    const result = await pool.query(
      `UPDATE chart_of_accounts SET
         account_name = COALESCE($1, account_name),
         account_type = COALESCE($2, account_type),
         parent_account_id = COALESCE($3, parent_account_id),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [account_name, account_type, parent_account_id, is_active, id]
    );
    return result.rows[0];
  },
};

module.exports = ChartOfAccounts;
