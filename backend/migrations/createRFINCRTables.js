// backend/migrations/createRFINCRTables.js
require("dotenv").config();
const pool = require("../config/db");

async function createTables() {
  try {
    console.log("Creating RFI and NCR tables...");
    
    // RFI table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rfi (
        id SERIAL PRIMARY KEY,
        raised_by INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        zone VARCHAR(255),
        discipline VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to INTEGER,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ RFI table created");

    // NCR table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ncr (
        id SERIAL PRIMARY KEY,
        raised_by INTEGER,
        description TEXT NOT NULL,
        zone VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        "holdPlaced" BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ NCR table created");

    // Attendance table (for labour count)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER,
        date DATE NOT NULL,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Attendance table created");

    // Create indexes for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rfi_status ON rfi(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ncr_status ON ncr(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
    console.log("✅ Indexes created");

  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
  } finally {
    await pool.end();
  }
}

createTables();