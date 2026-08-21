// ===== FILE: APP_Vindia/backend/migrations/createFinanceDailyUpdatesTable.js =====
// Run once: node migrations/createFinanceDailyUpdatesTable.js
//
// Repair-safe: uses CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
// so it's safe to re-run even if the table already exists in a partial state.

const pool = require("../config/db");

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_daily_updates (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ finance_daily_updates table ensured");

    const columns = [
      `ADD COLUMN IF NOT EXISTS submitted_by INTEGER NOT NULL REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE`,
      `ADD COLUMN IF NOT EXISTS cash_position NUMERIC(14,2) DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS todays_collections NUMERIC(14,2) DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS todays_expenses NUMERIC(14,2) DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS invoices_raised INTEGER DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS payments_made INTEGER DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS pending_approvals INTEGER DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS overall_status VARCHAR(20) DEFAULT 'on-track'`,
      `ADD COLUMN IF NOT EXISTS summary TEXT`,
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
      `ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS review_note TEXT`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];

    for (const clause of columns) {
      await pool.query(`ALTER TABLE finance_daily_updates ${clause}`);
    }
    console.log("✅ finance_daily_updates columns ensured");

    // One submission per finance manager per day
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_daily_updates_submitter_date
      ON finance_daily_updates (submitted_by, date)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_daily_updates_status
      ON finance_daily_updates (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_daily_updates_date
      ON finance_daily_updates (date)
    `);
    console.log("✅ Indexes ensured");

    console.log("🎉 finance_daily_updates migration complete");
  } catch (error) {
    console.error("❌ Migration error:", error.message);
  } finally {
    await pool.end();
  }
}

migrate();