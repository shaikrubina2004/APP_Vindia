// ===== FILE: APP_Vindia/backend/scripts/preflight-wbs-migration.js =====
//
// READ-ONLY preflight check for migrations/addFinanceWbsColumns.js.
//
// SAFETY GUARANTEES:
//   1. Every statement this script issues is a SELECT against
//      information_schema / pg_catalog / the application's own tables.
//      There is no CREATE, ALTER, INSERT, UPDATE, or DELETE anywhere
//      in this file.
//   2. Beyond that, the entire session runs inside a single
//      `BEGIN TRANSACTION READ ONLY`. If any statement here somehow
//      attempted a write, Postgres itself would reject it
//      ("cannot execute ... in a read-only transaction") rather than
//      relying solely on this script's own discipline. The transaction
//      is always rolled back at the end (a read-only transaction has
//      nothing to commit).
//   3. No connection string, password, or key is ever printed. See
//      mask() below — every value that reaches console output that
//      could plausibly be sensitive is redacted first.
//
// USAGE:
//   cd backend
//   node scripts/preflight-wbs-migration.js
//
// This script only READS your database and prints a report. It does
// not run migrations/addFinanceWbsColumns.js, and does not ask you to
// confirm running it — that remains a separate, explicit, manual step.

require("dotenv").config();
const { Pool } = require("pg");

const FINANCE_TABLES = [
  "expenses",
  "invoices",
  "payments",
  "budgets",
  "journal_entries",
  "petty_cash_transactions",
  "tax_register",
];
const REQUIRED_TABLES = ["wbs", ...FINANCE_TABLES];

// ── Output helpers ──────────────────────────────────────────────────

const results = []; // { section, label, status: PASS|WARNING|BLOCKER, detail }
function record(section, label, status, detail) {
  results.push({ section, label, status, detail });
  const icon = status === "PASS" ? "✅" : status === "WARNING" ? "⚠️ " : "🛑";
  console.log(`${icon} [${status}] ${label}${detail ? " — " + detail : ""}`);
}

// Redacts anything that looks like a connection string, JWT, or
// key/secret-shaped token from a string before it is ever logged.
function mask(input) {
  if (input === null || input === undefined) return input;
  let s = String(input);
  s = s.replace(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s'"]*:[^\s'"]*@[^\s'"]*/g, "[REDACTED_CONNECTION_STRING]");
  s = s.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[REDACTED_JWT]");
  s = s.replace(/\b(password|passwd|pwd|secret|service_role|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
  return s;
}

function section(title) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "🛑 DATABASE_URL is not set in the environment. Nothing to connect to — " +
      "this preflight cannot run without it. (Not printing whether a value " +
      "exists beyond this boolean check.)"
    );
    process.exit(2);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 1,
  });

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("🛑 Could not connect to the database:", mask(err.message));
    console.error(
      "This is expected if this script is run somewhere without network " +
      "access to your database host (for example, a sandboxed environment " +
      "with an egress allowlist). Run it from a machine/network that can " +
      "actually reach your Postgres/Supabase instance."
    );
    await pool.end().catch(() => {});
    process.exit(2);
  }

  try {
    // Hard safety net: the whole session is read-only at the database
    // level, not just "we only wrote SELECTs".
    await client.query("BEGIN TRANSACTION READ ONLY");

    section("1. REQUIRED TABLES");
    const tableExistence = {};
    for (const table of REQUIRED_TABLES) {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const exists = rows.length > 0;
      tableExistence[table] = exists;
      record("tables", `${table} exists`, exists ? "PASS" : "BLOCKER", exists ? "found" : "NOT FOUND");
    }

    section("2. REQUIRED COLUMNS");
    async function columnExists(table, column) {
      if (!tableExistence[table]) return false;
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column]
      );
      return rows.length > 0;
    }
    const projectIdPresence = {};
    for (const table of FINANCE_TABLES) {
      const has = await columnExists(table, "project_id");
      projectIdPresence[table] = has;
      if (!tableExistence[table]) {
        record("columns", `${table}.project_id`, "BLOCKER", "table does not exist, cannot check");
      } else {
        record(
          "columns", `${table}.project_id`, has ? "PASS" : "BLOCKER",
          has ? "present" : "MISSING — migration expects this table to have project_id"
        );
      }
    }
    const wbsColumns = ["id", "project_id", "code", "name", "parent_id"];
    const wbsColumnPresence = {};
    for (const col of wbsColumns) {
      const has = await columnExists("wbs", col);
      wbsColumnPresence[col] = has;
      record("columns", `wbs.${col}`, has ? "PASS" : "BLOCKER", has ? "present" : "MISSING");
    }

    section("3. WBS DATA INTEGRITY");
    let wbsIntegrityClean = true;
    if (tableExistence.wbs && wbsColumnPresence.project_id) {
      const hasProjectsTable = await client
        .query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projects'`)
        .then((r) => r.rows.length > 0);

      if (hasProjectsTable) {
        const { rows: orphanProject } = await client.query(`
          SELECT w.id, w.project_id FROM wbs w
          LEFT JOIN projects p ON p.id = w.project_id
          WHERE p.id IS NULL
          LIMIT 20
        `);
        const { rows: orphanProjectCount } = await client.query(`
          SELECT COUNT(*)::int AS n FROM wbs w
          LEFT JOIN projects p ON p.id = w.project_id
          WHERE p.id IS NULL
        `);
        const nA = orphanProjectCount[0].n;
        if (nA > 0) wbsIntegrityClean = false;
        record(
          "wbs-integrity", "A. wbs.project_id references an existing project",
          nA === 0 ? "PASS" : "BLOCKER",
          nA === 0 ? "0 orphaned rows" : `${nA} orphaned row(s), sample ids: ${orphanProject.map((r) => r.id).join(", ")}`
        );
      } else {
        record("wbs-integrity", "A. wbs.project_id references an existing project", "WARNING", "no 'projects' table found to check against — skipped");
      }

      const { rows: orphanParent } = await client.query(`
        SELECT w.id, w.parent_id FROM wbs w
        LEFT JOIN wbs p2 ON p2.id = w.parent_id
        WHERE w.parent_id IS NOT NULL AND p2.id IS NULL
        LIMIT 20
      `);
      const { rows: orphanParentCount } = await client.query(`
        SELECT COUNT(*)::int AS n FROM wbs w
        LEFT JOIN wbs p2 ON p2.id = w.parent_id
        WHERE w.parent_id IS NOT NULL AND p2.id IS NULL
      `);
      const nB = orphanParentCount[0].n;
      if (nB > 0) wbsIntegrityClean = false;
      record(
        "wbs-integrity", "B. wbs.parent_id points to an existing wbs row",
        nB === 0 ? "PASS" : "BLOCKER",
        nB === 0 ? "0 dangling rows" : `${nB} dangling row(s), sample ids: ${orphanParent.map((r) => r.id).join(", ")}`
      );

      const { rows: crossProject } = await client.query(`
        SELECT w.id, w.project_id, w.parent_id, parent.project_id AS parent_project_id
        FROM wbs w
        JOIN wbs parent ON parent.id = w.parent_id
        WHERE w.parent_id IS NOT NULL AND parent.project_id IS DISTINCT FROM w.project_id
        LIMIT 20
      `);
      const { rows: crossProjectCount } = await client.query(`
        SELECT COUNT(*)::int AS n
        FROM wbs w
        JOIN wbs parent ON parent.id = w.parent_id
        WHERE w.parent_id IS NOT NULL AND parent.project_id IS DISTINCT FROM w.project_id
      `);
      const nC = crossProjectCount[0].n;
      if (nC > 0) wbsIntegrityClean = false;
      record(
        "wbs-integrity", "C. wbs.parent_id belongs to the SAME project as the child",
        nC === 0 ? "PASS" : "BLOCKER",
        nC === 0
          ? "0 cross-project parent/child pairs"
          : `${nC} cross-project pair(s), sample: ${crossProject
              .map((r) => `wbs#${r.id}(proj ${r.project_id}) -> parent wbs#${r.parent_id}(proj ${r.parent_project_id})`)
              .join("; ")}`
      );
    } else {
      wbsIntegrityClean = false;
      record("wbs-integrity", "WBS integrity checks", "BLOCKER", "wbs table or wbs.project_id missing — cannot check");
    }

    section("4. EXISTING FINANCE DATA");
    const financeDataSummary = {};
    for (const table of FINANCE_TABLES) {
      if (!tableExistence[table]) {
        record("finance-data", table, "BLOCKER", "table missing");
        continue;
      }
      const { rows: totalRows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      const total = totalRows[0].n;

      let projNull = null, projNotNull = null;
      if (projectIdPresence[table]) {
        const { rows } = await client.query(
          `SELECT COUNT(*) FILTER (WHERE project_id IS NULL)::int AS null_count,
                  COUNT(*) FILTER (WHERE project_id IS NOT NULL)::int AS not_null_count
           FROM ${table}`
        );
        projNull = rows[0].null_count;
        projNotNull = rows[0].not_null_count;
      }

      const hasWbsIdAlready = await columnExists(table, "wbs_id");
      let wbsPopulated = null, wbsNull = null;
      if (hasWbsIdAlready) {
        const { rows } = await client.query(
          `SELECT COUNT(*) FILTER (WHERE wbs_id IS NOT NULL)::int AS populated,
                  COUNT(*) FILTER (WHERE wbs_id IS NULL)::int AS null_count
           FROM ${table}`
        );
        wbsPopulated = rows[0].populated;
        wbsNull = rows[0].null_count;
      }

      financeDataSummary[table] = { total, projNull, projNotNull, hasWbsIdAlready, wbsPopulated, wbsNull };
      record(
        "finance-data", `${table}: rows`, "PASS",
        `total=${total}, project_id NULL=${projNull ?? "n/a (no column)"}, project_id NOT NULL=${projNotNull ?? "n/a"}, ` +
        `wbs_id column already exists=${hasWbsIdAlready}` +
        (hasWbsIdAlready ? `, wbs_id populated=${wbsPopulated}, wbs_id NULL=${wbsNull}` : "")
      );
    }

    section("5. EXISTING WBS COLUMNS / CONSTRAINTS (rerun-safety)");
    // wbs(id, project_id) unique constraint/index
    const { rows: uqRows } = await client.query(`
      SELECT c.conname FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE t.relname = 'wbs' AND n.nspname = 'public' AND c.contype = 'u'
    `);
    record(
      "constraints", "wbs unique constraint(s) present",
      "PASS", // informational, not a blocker either way — migration uses DROP-then-ADD
      uqRows.length ? `found: ${uqRows.map((r) => r.conname).join(", ")}` : "none found yet (migration will create uq_wbs_id_project)"
    );

    for (const table of FINANCE_TABLES) {
      if (!tableExistence[table]) continue;
      const { rows: fks } = await client.query(
        `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE t.relname = $1 AND n.nspname = 'public' AND c.contype = 'f'`,
        [table]
      );
      const { rows: checks } = await client.query(
        `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE t.relname = $1 AND n.nspname = 'public' AND c.contype = 'c'`,
        [table]
      );
      const wbsFks = fks.filter((r) => /wbs/i.test(r.def));
      const wbsChecks = checks.filter((r) => /wbs_id/i.test(r.def));
      record(
        "constraints", `${table}: existing WBS-related FKs/CHECKs`,
        "PASS",
        `FKs: ${wbsFks.map((r) => r.conname).join(", ") || "none"}; CHECKs: ${wbsChecks.map((r) => r.conname).join(", ") || "none"}`
      );
    }

    section("6. BUDGET SCOPE AUDIT");
    if (tableExistence.budgets) {
      const { rows: dupScopes } = await client.query(`
        SELECT project_id, category, wbs_id, fiscal_year, COUNT(*)::int AS n
        FROM budgets
        GROUP BY project_id, category, wbs_id, fiscal_year
        HAVING COUNT(*) > 1
        LIMIT 20
      `);
      record(
        "budget-audit", "Exact-duplicate budget scopes (same project+category+wbs_id+fiscal_year)",
        dupScopes.length === 0 ? "PASS" : "WARNING",
        dupScopes.length === 0
          ? "none found"
          : `${dupScopes.length} duplicate scope(s): ${JSON.stringify(dupScopes)}`
      );

      const overlapQuery = tableExistence.budgets
        ? await client.query(`
            SELECT b1.project_id, b1.category, b1.fiscal_year,
                   SUM(CASE WHEN b1.wbs_id IS NULL THEN 1 ELSE 0 END)::int AS general_count,
                   SUM(CASE WHEN b1.wbs_id IS NOT NULL THEN 1 ELSE 0 END)::int AS specific_count
            FROM budgets b1
            GROUP BY b1.project_id, b1.category, b1.fiscal_year
            HAVING SUM(CASE WHEN b1.wbs_id IS NULL THEN 1 ELSE 0 END) > 0
               AND SUM(CASE WHEN b1.wbs_id IS NOT NULL THEN 1 ELSE 0 END) > 0
            LIMIT 20
          `)
        : { rows: [] };
      record(
        "budget-audit", "Project+category+fiscal_year with BOTH a general (wbs_id NULL) AND WBS-specific budget rows",
        overlapQuery.rows.length === 0 ? "PASS" : "WARNING",
        overlapQuery.rows.length === 0
          ? "none found"
          : `${overlapQuery.rows.length} combo(s) — business decision needed, NOT auto-resolved: ${JSON.stringify(overlapQuery.rows)}`
      );
    } else {
      record("budget-audit", "Budget scope audit", "BLOCKER", "budgets table missing");
    }

    section("7. CURRENT PAYMENTS");
    if (tableExistence.payments) {
      const hasInvoiceId = await columnExists("payments", "invoice_id");
      const hasExpenseId = await columnExists("payments", "expense_id");
      record("payments", "payments.invoice_id exists", hasInvoiceId ? "PASS" : "WARNING", hasInvoiceId ? "present" : "not found");
      record(
        "payments", "payments.expense_id",
        hasExpenseId ? "WARNING" : "PASS",
        hasExpenseId
          ? "an expense_id column DOES exist — the Finance implementation assumed no such link; this should be re-reviewed, not assumed away"
          : "confirmed absent, as assumed by the Finance implementation (no expense-linked payment concept)"
      );
      const hasWbsIdAlready = await columnExists("payments", "wbs_id");
      const { rows } = await client.query(
        `SELECT COUNT(*) FILTER (WHERE invoice_id IS NOT NULL)::int AS with_invoice,
                COUNT(*) FILTER (WHERE project_id IS NOT NULL)::int AS with_project
                ${hasWbsIdAlready ? ", COUNT(*) FILTER (WHERE wbs_id IS NOT NULL)::int AS with_wbs" : ""}
         FROM payments`
      );
      record(
        "payments", "payment row composition",
        "PASS",
        `with invoice_id=${rows[0].with_invoice}, with project_id=${rows[0].with_project}` +
        (hasWbsIdAlready ? `, with wbs_id=${rows[0].with_wbs}` : ", wbs_id column not present yet")
      );
    } else {
      record("payments", "Payments checks", "BLOCKER", "payments table missing");
    }

    section("8. TAX REGISTER");
    if (tableExistence.tax_register) {
      const hasProjectId = projectIdPresence.tax_register;
      record("tax-register", "tax_register.project_id exists", hasProjectId ? "PASS" : "BLOCKER", hasProjectId ? "present" : "MISSING");
      const hasWbsIdAlready = await columnExists("tax_register", "wbs_id");
      const { rows: bySource } = await client.query(`
        SELECT source_type, COUNT(*)::int AS n FROM tax_register GROUP BY source_type
      `);
      const { rows: projStats } = hasProjectId
        ? await client.query(`
            SELECT COUNT(*) FILTER (WHERE project_id IS NULL)::int AS null_count,
                   COUNT(*) FILTER (WHERE project_id IS NOT NULL)::int AS not_null_count
            FROM tax_register`)
        : { rows: [{ null_count: null, not_null_count: null }] };
      record(
        "tax-register", "tax_register row composition",
        "PASS",
        `by source_type: ${JSON.stringify(bySource)}; project_id NULL=${projStats[0].null_count}, NOT NULL=${projStats[0].not_null_count}` +
        (hasWbsIdAlready ? "; wbs_id column already present" : "; wbs_id column not present yet")
      );
    } else {
      record("tax-register", "Tax register checks", "BLOCKER", "tax_register table missing");
    }

    section("9. JOURNAL STRUCTURE");
    if (tableExistence.journal_entries) {
      const hasProjectId = projectIdPresence.journal_entries;
      const hasWbsIdAlready = await columnExists("journal_entries", "wbs_id");
      record(
        "journal", "journal_entries.project_id / wbs_id",
        hasProjectId ? "PASS" : "BLOCKER",
        `project_id present=${hasProjectId}; wbs_id already present=${hasWbsIdAlready}`
      );

      const { rows: linesTableExists } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_entry_lines'`
      );
      if (linesTableExists.length) {
        const linesHasProjectId = await columnExists("journal_entry_lines", "project_id");
        const linesHasWbsId = await columnExists("journal_entry_lines", "wbs_id");
        record(
          "journal", "journal_entry_lines does NOT carry its own project_id/wbs_id (header-level WBS assumption)",
          !linesHasProjectId && !linesHasWbsId ? "PASS" : "WARNING",
          !linesHasProjectId && !linesHasWbsId
            ? "confirmed — WBS correctly stays header-level, per the existing Finance implementation's design"
            : `journal_entry_lines HAS project_id=${linesHasProjectId}, wbs_id=${linesHasWbsId} — the header-level WBS assumption should be re-reviewed against this, not assumed away`
        );
      } else {
        record("journal", "journal_entry_lines table", "WARNING", "table not found — cannot confirm header-only WBS assumption");
      }
    } else {
      record("journal", "Journal structure checks", "BLOCKER", "journal_entries table missing");
    }

    section("10. MIGRATION READINESS SYNTHESIS");
    const blockers = results.filter((r) => r.status === "BLOCKER");
    const warnings = results.filter((r) => r.status === "WARNING");
    console.log(`\nTotal checks: ${results.length}  |  BLOCKERS: ${blockers.length}  |  WARNINGS: ${warnings.length}`);

    await client.query("ROLLBACK"); // nothing was ever written; this just closes the read-only transaction cleanly

    console.log(`\n${"=".repeat(60)}\nMIGRATION READY: ${blockers.length === 0 ? "YES" : "NO"}\n${"=".repeat(60)}`);
    if (blockers.length > 0) {
      console.log("\nBlockers to resolve before running the migration:");
      blockers.forEach((b, i) => console.log(`  ${i + 1}. [${b.section}] ${b.label} — ${b.detail}`));
    } else {
      console.log("\nNo blockers found by this preflight. Exact command (NOT executed by this script):");
      console.log("  cd backend && node migrations/addFinanceWbsColumns.js");
      if (warnings.length > 0) {
        console.log(`\n${warnings.length} warning(s) found — not blockers, but worth reading before proceeding:`);
        warnings.forEach((w, i) => console.log(`  ${i + 1}. [${w.section}] ${w.label} — ${w.detail}`));
      }
    }

    process.exit(blockers.length === 0 ? 0 : 1);
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("🛑 Preflight crashed:", mask(err.message));
    process.exit(2);
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

main();