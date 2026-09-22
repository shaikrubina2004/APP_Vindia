// ===== FILE: APP_Vindia/backend/migrations/createChartOfAccountsTable.js =====
// Run once: node migrations/createChartOfAccountsTable.js
//
// Repair-safe: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS,
// matching the existing project convention (see createFinanceDailyUpdatesTable.js).
// Verified before writing: no table named chart_of_accounts exists anywhere
// in the repo's migrations, and no other table stores account_code/account_type.
//
// Wrapped in a single BEGIN/COMMIT transaction — PostgreSQL DDL is
// transactional, so a failure partway through rolls back everything
// rather than leaving a half-created table/constraint set.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ chart_of_accounts table ensured");

    const columns = [
      `ADD COLUMN IF NOT EXISTS account_code VARCHAR(20) NOT NULL DEFAULT ''`,
      `ADD COLUMN IF NOT EXISTS account_name VARCHAR(150) NOT NULL DEFAULT ''`,
      `ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'expense'`,
      `ADD COLUMN IF NOT EXISTS parent_account_id INTEGER REFERENCES chart_of_accounts(id)`,
      `ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of columns) {
      await client.query(`ALTER TABLE chart_of_accounts ${clause}`);
    }
    console.log("✅ chart_of_accounts columns ensured");

    await client.query(`
      ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chk_chart_of_accounts_type
    `);
    await client.query(`
      ALTER TABLE chart_of_accounts ADD CONSTRAINT chk_chart_of_accounts_type
      CHECK (account_type IN ('asset','liability','equity','revenue','expense'))
    `);
    console.log("✅ chart_of_accounts.account_type CHECK constraint ensured");

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_chart_of_accounts_code
      ON chart_of_accounts (account_code)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type
      ON chart_of_accounts (account_type)
    `);
    console.log("✅ Indexes ensured");

    // Seed a minimal, standard starter set ONLY if the table is empty —
    // never overwrites existing data. Safe to re-run.
    const existing = await client.query(`SELECT COUNT(*)::int AS count FROM chart_of_accounts`);
    if (existing.rows[0].count === 0) {
      await client.query(`
        INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES
        ('1000', 'Cash and Bank', 'asset'),
        ('1100', 'Accounts Receivable', 'asset'),
        ('2000', 'Accounts Payable', 'liability'),
        ('3000', 'Owner''s Equity', 'equity'),
        ('4000', 'Revenue', 'revenue'),
        ('5000', 'General Expenses', 'expense')
      `);
      console.log("✅ Starter chart of accounts seeded (6 accounts)");
    } else {
      console.log("ℹ️  chart_of_accounts already has data — seed skipped");
    }

    await client.query("COMMIT");
    console.log("🎉 chart_of_accounts migration complete (committed)");
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
