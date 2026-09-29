// backend/migrations/createCeoTables.js
//
// Creates the tables the CEO role depends on that had NO migration anywhere
// in the project:
//   • manager_reports          (Manager → CEO reports, CEO Reports Inbox)
//   • app_settings             (CEO system settings, e.g. lead escalation)
//   • operations_notifications (also powers the new CEO notification bell)
//
// Run once:  node migrations/createCeoTables.js
// Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manager_reports (
        id             SERIAL PRIMARY KEY,
        title          TEXT        NOT NULL,
        report_type    VARCHAR(20) NOT NULL DEFAULT 'other',
        period_label   TEXT,
        summary        TEXT        NOT NULL,
        highlights     TEXT,
        issues         TEXT,
        next_steps     TEXT,
        submitted_by   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        submitter_role VARCHAR(50),
        status         VARCHAR(20) NOT NULL DEFAULT 'submitted',
        ceo_comment    TEXT,
        reviewed_by    INTEGER REFERENCES users(id),
        reviewed_at    TIMESTAMPTZ,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE manager_reports
        ADD COLUMN IF NOT EXISTS period_label   TEXT,
        ADD COLUMN IF NOT EXISTS highlights     TEXT,
        ADD COLUMN IF NOT EXISTS issues         TEXT,
        ADD COLUMN IF NOT EXISTS next_steps     TEXT,
        ADD COLUMN IF NOT EXISTS submitter_role VARCHAR(50),
        ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'submitted',
        ADD COLUMN IF NOT EXISTS ceo_comment    TEXT,
        ADD COLUMN IF NOT EXISTS reviewed_by    INTEGER,
        ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_manager_reports_status
        ON manager_reports (status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_manager_reports_submitter
        ON manager_reports (submitted_by, created_at DESC);
    `);
    console.log("✅ manager_reports ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      TEXT,
        updated_by INTEGER,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ app_settings ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS operations_notifications (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_code    VARCHAR(50),
        type         VARCHAR(50) NOT NULL,
        title        TEXT        NOT NULL,
        description  TEXT,
        link         TEXT,
        severity     VARCHAR(20) DEFAULT 'info',
        project_id   INTEGER,
        reference_id INTEGER,
        is_read      BOOLEAN     DEFAULT FALSE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ops_notifs_user_unread
        ON operations_notifications (user_id, is_read, created_at DESC);
    `);
    console.log("✅ operations_notifications ready (CEO bell uses role_code = 'ceo')");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();