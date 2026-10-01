// Run once:  node migrations/createCeoReportingTables.js
// Safe to re-run (IF NOT EXISTS everywhere).
//
// Creates:
//   ceo_daily_reports  – every manager's daily update that is submitted to the CEO
//                        (Project Manager, BDA, Operations Manager, HR ...).
//                        Finance keeps using its own finance_daily_updates table.
//   ceo_notifications  – the CEO's notification inbox (one row per CEO user).

// Load .env BEFORE the db config is required (server.js does this too).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found. Check backend/.env");
  process.exit(1);
}

const pool = require("../config/db");

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ceo_daily_reports (
        id            SERIAL PRIMARY KEY,
        submitted_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role          VARCHAR(60)  NOT NULL,
        report_type   VARCHAR(20)  NOT NULL,           -- pm | bda | ops | hr
        report_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
        project_name  VARCHAR(200),
        overall_status VARCHAR(20) DEFAULT 'on-track', -- on-track | attention | critical | delayed | ahead
        summary       TEXT,
        payload       JSONB        NOT NULL DEFAULT '{}'::jsonb,   -- role-specific fields
        status        VARCHAR(20)  NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
        reviewed_by   INTEGER REFERENCES users(id),
        reviewed_at   TIMESTAMP,
        review_note   TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ceo_daily_reports_user_date_type_project
      ON ceo_daily_reports (submitted_by, report_date, report_type, (COALESCE(project_name, '')))
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ceo_daily_reports_status ON ceo_daily_reports (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ceo_daily_reports_date ON ceo_daily_reports (report_date)`);
    console.log("✅ ceo_daily_reports ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ceo_notifications (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        VARCHAR(30)  NOT NULL DEFAULT 'system',   -- report | approval | user | system
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        link        VARCHAR(255),
        severity    VARCHAR(12)  NOT NULL DEFAULT 'info',     -- info | ok | warn | critical
        is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
        dedupe_key  VARCHAR(120),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ceo_notifications_dedupe
      ON ceo_notifications (user_id, dedupe_key)
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ceo_notifications_user ON ceo_notifications (user_id, is_read)`);
    console.log("✅ ceo_notifications ready");

    console.log("🎉 CEO reporting migration complete");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();