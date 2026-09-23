// backend/migrations/createThreeDNotificationsTable.js
// Run once: node migrations/createThreeDNotificationsTable.js
// Mirrors the architect_notifications table shape (user_id scoped, is_seen flag)
// so the 3D Visualizer bell can use the exact same read/list/mark-read pattern.
require("dotenv").config();
const pool = require("../config/db");

async function run() {
  try {
    console.log("Creating three_d_notifications table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS three_d_notifications (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type          VARCHAR(60) NOT NULL,
        title         VARCHAR(255) NOT NULL,
        description   TEXT,
        link          VARCHAR(255),
        severity      VARCHAR(20) DEFAULT 'info',
        reference_id  INTEGER,
        is_seen       BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("three_d_notifications ready");

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dnotif_user ON three_d_notifications(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dnotif_created ON three_d_notifications(created_at DESC);`);

    console.log("✅ three_d_notifications table ready.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

run();