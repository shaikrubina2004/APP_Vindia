// ===== FILE: APP_Vindia/backend/migrations/createJournalEntriesTables.js =====
// Run once: node migrations/createJournalEntriesTables.js
//
// Repair-safe. Depends on chart_of_accounts and projects/users already
// existing — run createChartOfAccountsTable.js first.
//
// Wrapped in a single BEGIN/COMMIT transaction: PostgreSQL DDL is
// transactional (unlike MySQL), so every CREATE/ALTER/UPDATE below either
// all commits together or all rolls back together — no risk of a
// partially-created schema if one statement fails partway through.
//
// created_by safety: this script NEVER assigns a fake/invented user to
// an existing row. If any journal_entries row already has created_by
// IS NULL when this runs, the migration reports the exact count, rolls
// back everything, and exits non-zero — those rows require manual
// resolution by a human before NOT NULL can be safely enforced.

require("dotenv").config();
const pool = require("../config/db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Sequence used to generate entry_number BEFORE each insert, so the
    // column can be NOT NULL from row creation.
    await client.query(`CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq`);
    console.log("✅ journal_entry_number_seq ensured");

    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ journal_entries table ensured");

    // entry_number and created_by are added nullable first (repair-safe
    // on a table that might already have rows), then NOT NULL is applied
    // separately below — entry_number always safely (it's backfilled
    // from the row's own id, not invented data), created_by only if no
    // existing row would be silently given a false owner.
    const headerColumns = [
      `ADD COLUMN IF NOT EXISTS entry_number VARCHAR(30)`,
      `ADD COLUMN IF NOT EXISTS entry_date DATE NOT NULL DEFAULT CURRENT_DATE`,
      `ADD COLUMN IF NOT EXISTS description TEXT`,
      `ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)`,
      // draft -> submitted -> approved -> posted -> reversed  (Decision 3 workflow)
      `ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'`,
      `ADD COLUMN IF NOT EXISTS total_debit NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS total_credit NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS posted_by INTEGER REFERENCES users(id)`,
      `ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS reversed_entry_id INTEGER REFERENCES journal_entries(id)`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of headerColumns) {
      await client.query(`ALTER TABLE journal_entries ${clause}`);
    }
    console.log("✅ journal_entries columns ensured");

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_entry_number
      ON journal_entries (entry_number)
      WHERE entry_number IS NOT NULL
    `);

    // entry_number backfill is safe to auto-assign: it's derived from the
    // row's own id, not attributing the row to any person.
    await client.query(`
      UPDATE journal_entries
      SET entry_number = 'JE-' || LPAD(id::text, 6, '0')
      WHERE entry_number IS NULL
    `);
    await client.query(`ALTER TABLE journal_entries ALTER COLUMN entry_number SET NOT NULL`);
    console.log("✅ entry_number NOT NULL enforced (safe: derived from id, not invented)");

    // created_by: check first, never invent an owner.
    const nullCreatedBy = await client.query(
      `SELECT COUNT(*)::int AS count FROM journal_entries WHERE created_by IS NULL`
    );
    const nullCount = nullCreatedBy.rows[0].count;
    if (nullCount > 0) {
      throw new Error(
        `Cannot enforce NOT NULL on journal_entries.created_by: ${nullCount} existing row(s) ` +
        `have created_by IS NULL. This migration will NOT invent an owner for them. ` +
        `Resolve manually — identify and set the correct created_by for these ${nullCount} ` +
        `row(s) (e.g. via audit logs or manual review), then re-run this migration. ` +
        `The entire migration has been rolled back; no other change in this script was applied.`
      );
    }
    await client.query(`ALTER TABLE journal_entries ALTER COLUMN created_by SET NOT NULL`);
    console.log("✅ created_by NOT NULL enforced (verified: zero existing NULL rows)");

    await client.query(`
      ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_entries_status
    `);
    await client.query(`
      ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_entries_status
      CHECK (status IN ('draft','submitted','approved','posted','reversed'))
    `);
    console.log("✅ journal_entries.status CHECK constraint ensured");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_status
      ON journal_entries (status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_project
      ON journal_entries (project_id)
    `);
    console.log("✅ journal_entries indexes ensured");

    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id SERIAL PRIMARY KEY
      )
    `);
    console.log("✅ journal_entry_lines table ensured");

    const lineColumns = [
      `ADD COLUMN IF NOT EXISTS journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE`,
      `ADD COLUMN IF NOT EXISTS account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id)`,
      `ADD COLUMN IF NOT EXISTS debit NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS credit NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS description TEXT`,
      `ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
    ];
    for (const clause of lineColumns) {
      await client.query(`ALTER TABLE journal_entry_lines ${clause}`);
    }
    console.log("✅ journal_entry_lines columns ensured");

    await client.query(`
      ALTER TABLE journal_entry_lines
      DROP CONSTRAINT IF EXISTS chk_journal_entry_lines_non_negative
    `);
    await client.query(`
      ALTER TABLE journal_entry_lines
      ADD CONSTRAINT chk_journal_entry_lines_non_negative
      CHECK (debit >= 0 AND credit >= 0)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry
      ON journal_entry_lines (journal_entry_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account
      ON journal_entry_lines (account_id)
    `);
    console.log("✅ journal_entry_lines indexes ensured");

    await client.query("COMMIT");
    console.log("🎉 journal entries migration complete (committed)");
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Migration FAILED and was rolled back:", error.message);
    process.exitCode = 1; // non-zero exit so calling scripts/CI can detect failure
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
