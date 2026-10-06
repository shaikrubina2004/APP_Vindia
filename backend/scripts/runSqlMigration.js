// Usage: node scripts/runSqlMigration.js migrations/operationsSchema.sql
// Runs a whole .sql file as ONE implicit transaction (all-or-nothing).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

(async () => {
  const rel = process.argv[2];
  if (!rel) {
    console.error("Usage: node scripts/runSqlMigration.js <path-to-sql-file>");
    process.exit(1);
  }
  const file = path.resolve(process.cwd(), rel);
  try {
    await pool.query(fs.readFileSync(file, "utf8"));
    console.log(`✅ ${path.basename(file)} applied`);
  } catch (err) {
    console.error(`❌ ${path.basename(file)} failed (nothing was changed):`, err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
