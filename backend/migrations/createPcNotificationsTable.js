// backend/migrations/createPcNotificationsTable.js
//
// Creates the table behind the Project Coordinator notification bell.
// pcNotificationsController.js inserts into pc_notifications but nothing ever
// created it, so on a fresh database every PC notification failed silently.
//
// Run once:  node migrations/createPcNotificationsTable.js
// Safe to re-run.

require("dotenv").config();
const pool = require("../config/db");

async function createPcNotificationsTable() {
  try {
    console.log("Creating pc_notifications table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pc_notifications (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,       -- project | milestone | incident | task | payment | work
        title       TEXT        NOT NULL,
        description TEXT,
        link        TEXT,
        severity    VARCHAR(20) DEFAULT 'info', -- critical | warn | info | ok
        project_id  INTEGER,
        is_read     BOOLEAN     DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // For databases that already had an older partial version of the table
    await pool.query(`
      ALTER TABLE pc_notifications
        ADD COLUMN IF NOT EXISTS link       TEXT,
        ADD COLUMN IF NOT EXISTS severity   VARCHAR(20) DEFAULT 'info',
        ADD COLUMN IF NOT EXISTS project_id INTEGER,
        ADD COLUMN IF NOT EXISTS is_read    BOOLEAN DEFAULT FALSE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pc_notifications_user
        ON pc_notifications (user_id, is_read, created_at DESC);
    `);

    console.log("pc_notifications table ready.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createPcNotificationsTable();