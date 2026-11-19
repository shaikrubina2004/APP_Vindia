// Run once: node migrations/createBdaDailyUpdatesTable.js
// Safe to re-run (IF NOT EXISTS everywhere).
require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bda_daily_updates (
        id SERIAL PRIMARY KEY,
        submitted_by INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL DEFAULT CURRENT_DATE,

        -- LEADS (auto-calculated by the server)
        leads_added      INTEGER DEFAULT 0,
        leads_qualified  INTEGER DEFAULT 0,
        leads_converted  INTEGER DEFAULT 0,
        leads_deleted    INTEGER DEFAULT 0,

        -- OUTREACH (manual)
        calls_made       INTEGER DEFAULT 0,
        emails_sent      INTEGER DEFAULT 0,
        meetings_held    INTEGER DEFAULT 0,
        proposals_sent   INTEGER DEFAULT 0,

        -- FOLLOW-UPS (auto-calculated by the server)
        followups_done          INTEGER DEFAULT 0,
        followups_due_tomorrow  INTEGER DEFAULT 0,
        followups_overdue       INTEGER DEFAULT 0,

        -- PIPELINE (manual)
        pipeline_value   NUMERIC(14,2) DEFAULT 0,
        key_opportunity  TEXT,

        overall_status   VARCHAR(20) DEFAULT 'on-track',
        summary          TEXT NOT NULL,
        highlights       TEXT,
        issues           TEXT,
        plan_tomorrow    TEXT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_bda_daily_updates_user_date
      ON bda_daily_updates (submitted_by, date)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bda_other_reports (
        id SERIAL PRIMARY KEY,
        submitted_by INTEGER NOT NULL REFERENCES users(id),
        title   VARCHAR(200) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("🎉 bda_daily_updates + bda_other_reports ready");
  } catch (e) {
    console.error("❌ Migration error:", e.message);
  } finally {
    await pool.end();
  }
}
migrate();