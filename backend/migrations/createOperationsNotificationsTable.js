// backend/migrations/createOperationsNotificationsTable.js
//
// Creates the table that powers the Logistics Coordinator and
// Inventory Controller notification bells.
//
// This table was referenced by operationsNotificationsController.js but was
// never actually created, which is why those two roles saw an empty bell
// while every other role worked.
//
// Run once:  node migrations/createOperationsNotificationsTable.js
// Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

require("dotenv").config();
const pool = require("../config/db");

async function createOperationsNotificationsTable() {
  try {
    console.log("Creating operations_notifications table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS operations_notifications (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_code   VARCHAR(50),        -- logistics_coordinator | inventory_controller
        type        VARCHAR(50) NOT NULL,
        title       TEXT        NOT NULL,
        description TEXT,
        link        TEXT,
        severity    VARCHAR(20) DEFAULT 'info',   -- critical | warn | info | ok
        project_id  INTEGER,
        reference_id INTEGER,
        is_read     BOOLEAN     DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // For databases that already had an older partial version of the table
    await pool.query(`
      ALTER TABLE operations_notifications
        ADD COLUMN IF NOT EXISTS role_code    VARCHAR(50),
        ADD COLUMN IF NOT EXISTS link         TEXT,
        ADD COLUMN IF NOT EXISTS description  TEXT,
        ADD COLUMN IF NOT EXISTS severity     VARCHAR(20) DEFAULT 'info',
        ADD COLUMN IF NOT EXISTS project_id   INTEGER,
        ADD COLUMN IF NOT EXISTS reference_id INTEGER,
        ADD COLUMN IF NOT EXISTS is_read      BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ops_notifs_user_unread
        ON operations_notifications (user_id, is_read, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ops_notifs_role
        ON operations_notifications (role_code, created_at DESC);
    `);

    console.log("✅ operations_notifications table ready");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

createOperationsNotificationsTable();