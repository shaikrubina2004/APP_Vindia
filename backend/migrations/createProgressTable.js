// backend/migrations/createProgressTable.js
require("dotenv").config();
const pool = require("../config/db");

async function createProgressTable() {
  try {
    console.log("Creating progress table...");
    const query = `
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        zone VARCHAR(255) NOT NULL,
        activity TEXT,
        percent_complete INTEGER DEFAULT 0,
        labour_skilled INTEGER DEFAULT 0,
        labour_unskilled INTEGER DEFAULT 0,
        remarks TEXT,
        photos JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await pool.query(query);
    console.log("✅ Progress table created successfully");
    
    // Create index for better query performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_progress_zone ON progress(zone)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_progress_date ON progress(date)`);
    console.log("✅ Indexes created successfully");
    
  } catch (error) {
    console.error("❌ Error creating progress table:", error.message);
  } finally {
    await pool.end();
  }
}

createProgressTable();