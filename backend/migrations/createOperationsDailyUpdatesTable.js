// ===== FILE: APP_Vindia/backend/migrations/createOperationsDailyUpdatesTable.js =====
// Run once from the backend folder:
//   node migrations/createOperationsDailyUpdatesTable.js
// Safe to re-run.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS operations_daily_updates (
        id SERIAL PRIMARY KEY
      )
    `);

    const columns = [
      `ADD COLUMN IF NOT EXISTS submitted_by INTEGER NOT NULL REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) NOT NULL DEFAULT ''`,
      `ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE`,
      `ADD COLUMN IF NOT EXISTS work TEXT`,
      `ADD COLUMN IF NOT EXISTS overall_status VARCHAR(20) DEFAULT 'on-track'`,
      `ADD COLUMN IF NOT EXISTS issues TEXT`,
      `ADD COLUMN IF NOT EXISTS pending TEXT`,
      `ADD COLUMN IF NOT EXISTS next_plan TEXT`,
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
      `ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS review_note TEXT`,
      `ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];

    for (const clause of columns) {
      await pool.query(`ALTER TABLE operations_daily_updates ${clause}`);
    }
    console.log("✅ operations_daily_updates columns ensured");

    // One update per person per day (re-submitting overwrites it)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_daily_updates_submitter_date
      ON operations_daily_updates (submitted_by, date)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ops_daily_updates_status
      ON operations_daily_updates (status)
    `);

    console.log("🎉 operations_daily_updates migration complete");
  } catch (error) {
    console.error("❌ Migration error:", error.message);
  } finally {
    await pool.end();
  }
}

migrate();