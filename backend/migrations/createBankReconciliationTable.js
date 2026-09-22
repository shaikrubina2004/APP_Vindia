// ===== FILE: APP_Vindia/backend/migrations/createBankReconciliationTable.js =====
// Run once: node migrations/createBankReconciliationTable.js
//
// Bank-account storage was inspected before writing this file:
// financeSettingsModel.js confirms bank accounts live in a real,
// separate table `finance_bank_accounts` (bank_name, account_holder,
// account_number, ifsc, is_primary) — NOT JSON. bank_account_id below
// is therefore a genuine FK to that existing table, not invented.
//
// Wrapped in a single BEGIN/COMMIT transaction for the same reason as
// the other migrations — no partially-created schema on failure.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_reconciliations (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ bank_reconciliations table ensured");

    const columns = [
      `ADD COLUMN IF NOT EXISTS bank_account_id INTEGER NOT NULL REFERENCES finance_bank_accounts(id)`,
      `ADD COLUMN IF NOT EXISTS statement_date DATE NOT NULL DEFAULT CURRENT_DATE`,
      `ADD COLUMN IF NOT EXISTS statement_balance NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS book_balance NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS difference NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS notes TEXT`,
      // in_progress -> reconciled  (Accountant creates/edits in_progress; Finance Manager approves -> reconciled)
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'in_progress'`,
      `ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS reconciled_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of columns) {
      await client.query(`ALTER TABLE bank_reconciliations ${clause}`);
    }
    console.log("✅ bank_reconciliations columns ensured");

    await client.query(`
      ALTER TABLE bank_reconciliations DROP CONSTRAINT IF EXISTS chk_bank_reconciliations_status
    `);
    await client.query(`
      ALTER TABLE bank_reconciliations ADD CONSTRAINT chk_bank_reconciliations_status
      CHECK (status IN ('in_progress','reconciled'))
    `);
    console.log("✅ bank_reconciliations.status CHECK constraint ensured");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account
      ON bank_reconciliations (bank_account_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_status
      ON bank_reconciliations (status)
    `);
    console.log("✅ Indexes ensured");

    await client.query("COMMIT");
    console.log("🎉 bank_reconciliations migration complete (committed)");
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Migration FAILED and was rolled back:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
