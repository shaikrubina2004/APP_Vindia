// ===== FILE: APP_Vindia/backend/models/financeSettingsModel.js =====
const pool = require("../config/db");

const FinanceSettings = {
  get: async () => {
    const settings = await pool.query(`SELECT * FROM finance_settings WHERE id = 1`);
    const gateways = await pool.query(`SELECT * FROM finance_payment_gateways ORDER BY gateway`);
    const banks = await pool.query(`SELECT * FROM finance_bank_accounts ORDER BY is_primary DESC, created_at ASC`);
    return {
      ...settings.rows[0],
      gateways: gateways.rows,
      bankAccounts: banks.rows,
    };
  },

  updateGeneral: async (data) => {
    const { company_name, gstin, pan, currency, fiscal_year_start, date_format } = data;
    const result = await pool.query(
      `UPDATE finance_settings SET
         company_name = COALESCE($1, company_name),
         gstin = COALESCE($2, gstin),
         pan = COALESCE($3, pan),
         currency = COALESCE($4, currency),
         fiscal_year_start = COALESCE($5, fiscal_year_start),
         date_format = COALESCE($6, date_format),
         updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [company_name, gstin, pan, currency, fiscal_year_start, date_format]
    );
    return result.rows[0];
  },

  updateTax: async (data) => {
    const { gst_enabled, gst_rate, tds_enabled, tds_rate } = data;
    const result = await pool.query(
      `UPDATE finance_settings SET
         gst_enabled = COALESCE($1, gst_enabled),
         gst_rate = COALESCE($2, gst_rate),
         tds_enabled = COALESCE($3, tds_enabled),
         tds_rate = COALESCE($4, tds_rate),
         updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [gst_enabled, gst_rate, tds_enabled, tds_rate]
    );
    return result.rows[0];
  },

  updateInvoicePrefs: async (data) => {
    const { invoice_prefix, invoice_terms, invoice_footer, auto_send_invoice, due_date_reminder, show_logo, show_signature } = data;
    const result = await pool.query(
      `UPDATE finance_settings SET
         invoice_prefix = COALESCE($1, invoice_prefix),
         invoice_terms = COALESCE($2, invoice_terms),
         invoice_footer = COALESCE($3, invoice_footer),
         auto_send_invoice = COALESCE($4, auto_send_invoice),
         due_date_reminder = COALESCE($5, due_date_reminder),
         show_logo = COALESCE($6, show_logo),
         show_signature = COALESCE($7, show_signature),
         updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [invoice_prefix, invoice_terms, invoice_footer, auto_send_invoice, due_date_reminder, show_logo, show_signature]
    );
    return result.rows[0];
  },

  updateGateway: async (gateway, data) => {
    const { enabled, config } = data;
    const result = await pool.query(
      `UPDATE finance_payment_gateways SET
         enabled = COALESCE($1, enabled),
         config = COALESCE($2, config),
         updated_at = NOW()
       WHERE gateway = $3 RETURNING *`,
      [enabled, config, gateway]
    );
    return result.rows[0];
  },

  addBankAccount: async (data) => {
    const { bank_name, account_holder, account_number, ifsc, is_primary = false } = data;
    if (is_primary) {
      await pool.query(`UPDATE finance_bank_accounts SET is_primary = FALSE`);
    }
    const result = await pool.query(
      `INSERT INTO finance_bank_accounts (bank_name, account_holder, account_number, ifsc, is_primary)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [bank_name, account_holder, account_number, ifsc, is_primary]
    );
    return result.rows[0];
  },

  deleteBankAccount: async (id) => {
    await pool.query(`DELETE FROM finance_bank_accounts WHERE id = $1`, [id]);
  },
};

module.exports = FinanceSettings;