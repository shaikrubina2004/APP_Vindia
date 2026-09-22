// ===== FILE: APP_Vindia/backend/migrations/createTaxRegisterTable.js =====
// Run once: node migrations/createTaxRegisterTable.js
//
// Neither invoices nor expenses currently store tax_type, rate, or filing
// period (only invoices.tax_amount exists — a single flat number, confirmed
// by reading invoiceModel.js). That's not enough to build a real tax
// register, so a dedicated table is genuinely required.
//
// source_id is intentionally NOT a hard FK: source_type decides whether it
// points at invoices.id or expenses.id, and Postgres has no native
// polymorphic FK. Enforced at the application layer in the model/controller.
//
// Wrapped in a single BEGIN/COMMIT transaction, same reasoning as the
// other migrations.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_register (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ tax_register table ensured");

    const columns = [
      `ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'invoice'`,
      `ADD COLUMN IF NOT EXISTS source_id INTEGER NOT NULL`,
      `ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) NOT NULL DEFAULT 'gst'`,
      `ADD COLUMN IF NOT EXISTS rate NUMERIC(5,2)`,
      `ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS filing_period VARCHAR(10)`,
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'`,
      `ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)`,
      `ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of columns) {
      await client.query(`ALTER TABLE tax_register ${clause}`);
    }
    console.log("✅ tax_register columns ensured");

    await client.query(`
      ALTER TABLE tax_register DROP CONSTRAINT IF EXISTS chk_tax_register_source_type
    `);
    await client.query(`
      ALTER TABLE tax_register ADD CONSTRAINT chk_tax_register_source_type
      CHECK (source_type IN ('invoice','expense'))
    `);

    await client.query(`
      ALTER TABLE tax_register DROP CONSTRAINT IF EXISTS chk_tax_register_status
    `);
    await client.query(`
      ALTER TABLE tax_register ADD CONSTRAINT chk_tax_register_status
      CHECK (status IN ('pending','filed'))
    `);
    console.log("✅ tax_register CHECK constraints ensured");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tax_register_source
      ON tax_register (source_type, source_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tax_register_period
      ON tax_register (filing_period)
    `);
    console.log("✅ Indexes ensured");

    await client.query("COMMIT");
    console.log("🎉 tax_register migration complete (committed)");
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Migration FAILED and was rolled back:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
