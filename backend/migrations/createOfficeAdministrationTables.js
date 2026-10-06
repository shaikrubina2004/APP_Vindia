// Run manually with: node backend/migrations/createOfficeAdministrationTables.js
// This migration is intentionally standalone; server.js does not auto-run migrations.
require("dotenv").config();
const pool = require("../config/db");

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS office_requests (
        id SERIAL PRIMARY KEY,
        request_code VARCHAR(30) UNIQUE NOT NULL,
        requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        request_type VARCHAR(40) NOT NULL,
        title VARCHAR(180) NOT NULL,
        description TEXT,
        priority VARCHAR(20) NOT NULL DEFAULT 'normal'
          CHECK (priority IN ('low','normal','high','urgent')),
        status VARCHAR(30) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected','in_progress','completed','cancelled')),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS office_request_history (
        id BIGSERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES office_requests(id) ON DELETE CASCADE,
        old_status VARCHAR(30),
        new_status VARCHAR(30) NOT NULL,
        changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS office_supplies (
        id SERIAL PRIMARY KEY,
        item_code VARCHAR(40) UNIQUE NOT NULL,
        item_name VARCHAR(160) NOT NULL,
        category VARCHAR(80),
        unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
        current_qty NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_qty >= 0),
        minimum_qty NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (minimum_qty >= 0),
        location VARCHAR(120),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active','inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS office_supply_transactions (
        id BIGSERIAL PRIMARY KEY,
        supply_id INTEGER NOT NULL REFERENCES office_supplies(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('restock','issue','adjustment')),
        quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
        employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS office_facility_requests (
        id SERIAL PRIMARY KEY,
        request_code VARCHAR(30) UNIQUE NOT NULL,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        location VARCHAR(160) NOT NULL,
        issue_type VARCHAR(80) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'normal'
          CHECK (priority IN ('low','normal','high','urgent')),
        status VARCHAR(30) NOT NULL DEFAULT 'open'
          CHECK (status IN ('open','assigned','in_progress','resolved','cancelled')),
        assigned_vendor VARCHAR(160),
        due_date DATE,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS office_visitors (
        id SERIAL PRIMARY KEY,
        visitor_name VARCHAR(160) NOT NULL,
        company VARCHAR(160),
        contact VARCHAR(60),
        purpose VARCHAR(180),
        host_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        expected_at TIMESTAMPTZ,
        checked_in_at TIMESTAMPTZ,
        checked_out_at TIMESTAMPTZ,
        status VARCHAR(20) NOT NULL DEFAULT 'expected'
          CHECK (status IN ('expected','checked_in','checked_out','cancelled')),
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS administrative_assets (
        id SERIAL PRIMARY KEY,
        asset_code VARCHAR(50) UNIQUE NOT NULL,
        asset_name VARCHAR(160) NOT NULL,
        category VARCHAR(80),
        serial_number VARCHAR(120),
        location VARCHAR(160),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        purchase_date DATE,
        condition VARCHAR(30) NOT NULL DEFAULT 'good'
          CHECK (condition IN ('new','good','fair','damaged','retired')),
        status VARCHAR(30) NOT NULL DEFAULT 'available'
          CHECK (status IN ('available','assigned','maintenance','retired')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_office_requests_status ON office_requests(status);
      CREATE INDEX IF NOT EXISTS idx_office_requests_created_by ON office_requests(requested_by);
      CREATE INDEX IF NOT EXISTS idx_office_facility_status ON office_facility_requests(status);
      CREATE INDEX IF NOT EXISTS idx_office_visitors_expected_at ON office_visitors(expected_at);
      CREATE INDEX IF NOT EXISTS idx_admin_assets_status ON administrative_assets(status);
    `);

    await client.query("COMMIT");
    console.log("Office Administration tables created/verified successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Office Administration migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
