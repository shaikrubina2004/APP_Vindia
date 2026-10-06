// ===== FILE: APP_Vindia/backend/migrations/addFinanceWbsColumns.js =====
// Run once: node migrations/addFinanceWbsColumns.js
//
// Makes Finance WBS-aware by adding a single canonical `wbs_id` column
// (referencing the EXISTING `wbs` table — no new hierarchy, no second
// milestone table) to every project-level finance table:
//
//   expenses, invoices, payments, budgets, journal_entries,
//   petty_cash_transactions, tax_register
//
// wbs_id may point at a top-level milestone row (wbs.parent_id IS NULL)
// or a child activity/subtask row — both are valid, per the existing
// WBS architecture. The parent milestone for a child row is derived at
// query time from wbs.parent_id, not duplicated into these tables.
//
// INTEGRITY (Section 5 / 22):
//   1. A plain FK (wbs_id -> wbs.id) ensures wbs_id, if set, always
//      points at a real WBS row.
//   2. A CHECK constraint (wbs_id IS NULL OR project_id IS NOT NULL)
//      makes it impossible to attach a WBS to a row with no project —
//      an "orphaned" WBS classification. This is deliberately NOT done
//      via the composite FK's MATCH FULL mode: MATCH FULL requires a
//      row's wbs_id and project_id to be both null or both non-null,
//      which would also reject wbs_id = NULL, project_id = <set> — the
//      "WBS not assigned" state every historical row is in. That was
//      tried and reverted; kept as CHECK + MATCH SIMPLE, per an
//      explicit later instruction NOT to change this back to MATCH
//      FULL.
//   3. A COMPOSITE FK (wbs_id, project_id) -> wbs(id, project_id),
//      left at the default MATCH SIMPLE, makes it a DATABASE-LEVEL
//      invariant that a WBS can never be attached to a finance record
//      for a different project than the one the WBS itself belongs to
//      — "Project A + WBS belonging to Project B" is rejected by
//      Postgres itself, not just app code. MATCH SIMPLE is safe here
//      specifically because the CHECK constraint above already ruled
//      out the one NULL combination (wbs_id set, project_id NULL) that
//      MATCH SIMPLE alone would have silently let through.
//   4. wbs_id is left NULLABLE everywhere. Historical rows keep
//      project_id with wbs_id = NULL ("WBS not assigned") — nothing is
//      backfilled or guessed. Whether a NEW row requires wbs_id is
//      enforced in the controllers, not in the schema, because some
//      genuinely company-level rows (no project) must remain WBS-free.
//
// ── DEPENDENCY ORDER (fixed) ─────────────────────────────────────────
// A real run against Supabase failed with:
//   "cannot drop constraint uq_wbs_id_project on table wbs because
//    other objects depend on it"
// because the OLD version of this file dropped/recreated
// wbs's own `uq_wbs_id_project` UNIQUE(id, project_id) constraint
// BEFORE dropping the per-table composite FKs
// (fk_<table>_wbs_project) that reference it — and Postgres will never
// let you drop a UNIQUE constraint while a FOREIGN KEY still depends
// on it. This matters on any database where those composite FKs
// already exist (a full or partial prior run, or one created by hand).
//
// The fix reorders the whole migration into four global passes across
// ALL tables, instead of doing everything for one table before moving
// to the next:
//   Phase 1 — ensure every table's wbs_id column exists (no
//             dependency concerns at all: ADD COLUMN IF NOT EXISTS
//             never conflicts with anything).
//   Phase 2 — DROP every finance table's composite FK
//             (fk_<table>_wbs_project) FIRST, since those are
//             precisely the "other objects" that would otherwise block
//             touching wbs's own uniqueness. The plain FK
//             (fk_<table>_wbs) and the CHECK constraint are NOT
//             touched here — neither one references
//             uq_wbs_id_project, so neither one can block it.
//   Phase 3 — NOW safe to drop + recreate wbs's own
//             UNIQUE(id, project_id) (uq_wbs_id_project). Every
//             object that could have depended on it was already
//             cleared in Phase 2.
//   Phase 4 — recreate everything per table: the plain FK, the CHECK
//             constraint, the composite FK (safe again now that
//             uq_wbs_id_project exists), and the index. Order among
//             these three constraint types doesn't matter — none of
//             them depend on each other — only their position AFTER
//             Phase 3 matters, since the composite FK needs
//             uq_wbs_id_project to already exist.
//
// Idempotent in every state this needs to survive: a fresh database; a
// database from before this migration ever ran; one where wbs_id
// columns already exist; one where the finance composite FKs already
// exist; one where uq_wbs_id_project already exists; one with some but
// not all of the above; and one where a previous run of this exact
// script failed and rolled back (which leaves the database exactly as
// it was — any of the other states apply next time). Every DROP uses
// IF EXISTS and every ADD follows a DROP IF EXISTS of the same name,
// so re-running this script is always safe.
//
// NOTE ON LIVE VERIFICATION: the query text itself was written and
// checked against the exact schema visible in this repository's
// models/controllers (expenseModel.js, invoiceModel.js,
// paymentModel.js, budgetModel.js, journalEntryModel.js,
// pettyCashModel.js, taxRegisterModel.js — all of which confirm a
// `project_id` column on their table) and against the specific error
// message and constraint names reported from a real failed run against
// Supabase. This environment still has no network path to that
// database (outside its egress allowlist), so this corrected version
// has been syntax-checked (`node --check`) but NOT executed against
// Supabase from here — run it from a machine that can actually reach
// your database, and read its per-phase log output before trusting it
// against production data.

require("dotenv").config();
const pool = require("../config/db");

const FINANCE_TABLES = [
  "expenses",
  "invoices",
  "payments",
  "budgets",
  "journal_entries",
  "petty_cash_transactions",
  "tax_register",
];

async function tableExists(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // ── 0. wbs table must exist — this migration REUSES it, never replaces it ──
    if (!(await tableExists(client, "wbs"))) {
      throw new Error(
        "wbs table not found — this migration only adds finance columns " +
        "referencing the EXISTING wbs table and refuses to invent one."
      );
    }

    // ── Gather per-table state up front, once, reused by every phase ──
    // (so Phase 2's decision on whether a table ever had a composite FK
    // and Phase 4's decision on whether to recreate one are guaranteed
    // to agree — computed from the same read, not re-derived twice.)
    const tableInfo = [];
    for (const table of FINANCE_TABLES) {
      const exists = await tableExists(client, table);
      if (!exists) {
        console.log(`⚠️  Skipped ${table} — table not found in this database`);
        continue;
      }
      const hasProjectId = await columnExists(client, table, "project_id");
      if (!hasProjectId) {
        console.log(
          `⚠️  ${table} has no project_id column — will only get a plain wbs_id FK (no composite project check possible)`
        );
      }
      tableInfo.push({ table, hasProjectId });
    }

    // ── PHASE 1 — ensure wbs_id columns exist ──────────────────────
    for (const { table } of tableInfo) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS wbs_id INTEGER`);
    }
    console.log("✅ Phase 1: wbs_id column ensured on every present finance table");

    // ── PHASE 2 — drop dependent composite FKs BEFORE touching wbs's
    //             own uniqueness. This is the actual fix: these FKs are
    //             the "other objects" a real run reported as blocking
    //             the DROP CONSTRAINT on uq_wbs_id_project. ──────────
    for (const { table, hasProjectId } of tableInfo) {
      if (!hasProjectId) continue; // this table never had this FK to begin with
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS fk_${table}_wbs_project`);
    }
    console.log("✅ Phase 2: pre-existing finance composite FKs (if any) dropped ahead of the wbs unique constraint");

    // ── PHASE 3 — NOW safe: wbs(id, project_id) uniqueness ─────────
    // wbs.id is already unique (primary key); this just adds project_id
    // alongside it so a composite FK can enforce "this WBS belongs to
    // this project" at the database level. Safe to (re)run — Phase 2
    // has already cleared every object that could have depended on it.
    await client.query(`ALTER TABLE wbs DROP CONSTRAINT IF EXISTS uq_wbs_id_project`);
    await client.query(`ALTER TABLE wbs ADD CONSTRAINT uq_wbs_id_project UNIQUE (id, project_id)`);
    console.log("✅ Phase 3: wbs(id, project_id) uniqueness ensured");

    // ── PHASE 4 — recreate per-table: plain FK, CHECK, composite FK, index ──
    for (const { table, hasProjectId } of tableInfo) {
      // Plain FK: wbs_id, if set, must reference a real WBS row.
      // Independent of uq_wbs_id_project — references wbs's PRIMARY
      // KEY on id alone, so it was never part of the dependency
      // problem and could just as well have stayed in Phase 1/2.
      // Kept here so all constraint work for a table reads together.
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS fk_${table}_wbs`);
      await client.query(`
        ALTER TABLE ${table}
        ADD CONSTRAINT fk_${table}_wbs
        FOREIGN KEY (wbs_id) REFERENCES wbs(id)
      `);

      // CHECK constraint: a WBS can never be attached to a row with no
      // project context. This is the asymmetric half of the rule that
      // no single FK MATCH mode can express on its own:
      //   - MATCH SIMPLE (the default, used below) silently ACCEPTS
      //     wbs_id = 5, project_id = NULL — the exact "orphaned WBS"
      //     state that must be impossible.
      //   - MATCH FULL was tried instead (as commonly suggested for a
      //     nullable composite FK), but it requires ALL of the FK's
      //     columns to be null together or non-null together — which
      //     also rejects wbs_id = NULL, project_id = <something>. That
      //     is precisely the "WBS not assigned" state every historical
      //     row is in (and every new row where a WBS isn't required),
      //     so MATCH FULL made this very migration fail its own
      //     ALTER TABLE validation step against any table with
      //     existing project-scoped rows, and would have permanently
      //     forbidden the "unassigned" state Section 6/7 require. It
      //     stays reverted — CHECK + MATCH SIMPLE — per explicit
      //     instruction not to change this back.
      // This CHECK instead allows wbs_id to be NULL regardless of
      // project_id (covers both "unassigned" and "company-level"), and
      // only requires project_id when wbs_id is actually set. It does
      // not reference uq_wbs_id_project at all, so it was never part
      // of the dependency problem either.
      if (hasProjectId) {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS chk_${table}_wbs_needs_project`);
        await client.query(`
          ALTER TABLE ${table}
          ADD CONSTRAINT chk_${table}_wbs_needs_project
          CHECK (wbs_id IS NULL OR project_id IS NOT NULL)
        `);
      }

      // Composite FK: if BOTH wbs_id and project_id are set, the WBS
      // must belong to that exact project — "Project A + WBS
      // belonging to Project B" is rejected by Postgres itself, not
      // just app code. Deliberately left at the default MATCH SIMPLE:
      // MATCH SIMPLE skips this check whenever either column is NULL,
      // but the CHECK constraint just above has already eliminated the
      // one NULL combination that would have been dangerous to skip
      // (wbs_id set, project_id NULL) — so by the time a row reaches
      // this FK, it is either "wbs_id NULL" (nothing to compare, safe
      // to skip) or "both set" (checked against the real relationship).
      // This is the exact constraint Phase 2 dropped ahead of time for
      // every table here — re-adding it now is guaranteed to find
      // uq_wbs_id_project already in place (Phase 3) and no leftover
      // same-named constraint in the way (Phase 2). The DROP IF EXISTS
      // immediately below is technically redundant given that
      // ordering, but is kept so this ADD is self-contained and safe
      // even if a future edit changes the phase order upstream.
      if (hasProjectId) {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS fk_${table}_wbs_project`);
        await client.query(`
          ALTER TABLE ${table}
          ADD CONSTRAINT fk_${table}_wbs_project
          FOREIGN KEY (wbs_id, project_id) REFERENCES wbs(id, project_id)
        `);
      }

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_wbs_id ON ${table}(wbs_id)
      `);

      console.log(`✅ Phase 4: ${table}.wbs_id fully ensured (FK${hasProjectId ? " + CHECK + composite project FK" : ""} + index)`);
    }

    await client.query("COMMIT");
    console.log("🎉 Finance WBS migration complete (committed)");
    console.log(
      "ℹ️  No historical rows were modified. Existing finance records keep " +
      "wbs_id = NULL ('WBS not assigned') until someone classifies them."
    );
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