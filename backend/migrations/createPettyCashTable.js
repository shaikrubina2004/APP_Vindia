// ===== FILE: APP_Vindia/backend/migrations/createPettyCashTable.js =====
// Run once: node migrations/createPettyCashTable.js
//
// Confirmed before writing: no existing table anywhere in the repo
// (finance_settings, budgets, expenses, payments) represents a petty-cash
// float or petty-cash transaction — this is genuinely new.
//
// Wrapped in a single BEGIN/COMMIT transaction, same reasoning as the
// other migrations.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_transactions (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ petty_cash_transactions table ensured");

    const columns = [
      `ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)`,
      `ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) NOT NULL DEFAULT 'outflow'`,
      `ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS category VARCHAR(50)`,
      `ADD COLUMN IF NOT EXISTS description TEXT`,
      `ADD COLUMN IF NOT EXISTS receipt_url TEXT`,
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'`,
      `ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of columns) {
      await client.query(`ALTER TABLE petty_cash_transactions ${clause}`);
    }
    console.log("✅ petty_cash_transactions columns ensured");

    await client.query(`
      ALTER TABLE petty_cash_transactions DROP CONSTRAINT IF EXISTS chk_petty_cash_type
    `);
    await client.query(`
      ALTER TABLE petty_cash_transactions ADD CONSTRAINT chk_petty_cash_type
      CHECK (transaction_type IN ('inflow','outflow'))
    `);

    await client.query(`
      ALTER TABLE petty_cash_transactions DROP CONSTRAINT IF EXISTS chk_petty_cash_status
    `);
    await client.query(`
      ALTER TABLE petty_cash_transactions ADD CONSTRAINT chk_petty_cash_status
      CHECK (status IN ('pending','approved','rejected'))
    `);
    console.log("✅ petty_cash_transactions CHECK constraints ensured");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_petty_cash_status
      ON petty_cash_transactions (status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_petty_cash_project
      ON petty_cash_transactions (project_id)
    `);
    console.log("✅ Indexes ensured");

    await client.query("COMMIT");
    console.log("🎉 petty_cash_transactions migration complete (committed)");
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
