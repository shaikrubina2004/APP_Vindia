// Checks that the Team Management update is fully installed: code files, routes, and database columns.
//   node scripts/checkTeamSetup.js            -> checks only
//   node scripts/checkTeamSetup.js 123        -> also runs "My Project Team" for user id 123 and prints the result
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let problems = 0;
const ok = (msg) => console.log("  ✅ " + msg);
const bad = (msg, fix) => { problems++; console.log("  ❌ " + msg + (fix ? "\n       → " + fix : "")); };

(async () => {
  console.log("\n1) Code files");
  for (const [file, fix] of [
    ["utils/teamNotifications.js", "copy backend/utils/teamNotifications.js from the zip (new file)"],
    ["routes/teamRoutes.js", "copy backend/routes/teamRoutes.js from the zip"],
    ["controllers/teamController.js", "copy backend/controllers/teamController.js from the zip"],
  ]) fs.existsSync(path.join(root, file)) ? ok(file) : bad(`${file} is missing`, fix);

  console.log("\n2) Routes registered");
  try {
    const router = require(path.join(root, "routes/teamRoutes.js"));
    const have = new Set(router.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`));
    for (const r of ["GET /my-projects", "GET /activity", "POST /activity/seen", "GET /overview", "GET /roster", "POST /import"])
      have.has(r) ? ok(r) : bad(`${r} is not registered`, "your routes/teamRoutes.js is an old version: copy the one from the zip");
  } catch (e) { bad("could not load routes/teamRoutes.js: " + e.message); }

  console.log("\n3) Controller functions");
  try {
    const c = require(path.join(root, "controllers/teamController.js"));
    for (const f of ["getMyProjectTeams", "getTeamActivity", "markTeamActivitySeen", "getRoster", "importToTeam", "getTeamOverview"])
      typeof c[f] === "function" ? ok(f) : bad(`${f} is missing`, "copy controllers/teamController.js from the zip");
    const inc = require(path.join(root, "controllers/IncidentController.js"));
    typeof inc.notifyByRole === "function" ? ok("IncidentController exports notifyByRole")
      : bad("IncidentController does not export notifyByRole", "add this line above `exports.getRoles`:  exports.notifyByRole = notifyByRole;  (or copy the file from the zip)");
  } catch (e) { bad("could not load a controller: " + e.message); }

  console.log("\n4) Database columns");
  const pool = require(path.join(root, "config/db.js"));
  const need = {
    "team_incidents": [["status", "workflow"], ["due_date", "workflow"], ["created_by_user_id", "workflow"], ["resolved_at", "workflow"]],
    "team_tasks": [["status", "workflow"], ["completed_at", "workflow"], ["updated_at", "workflow"], ["created_by_user_id", "workflow"]],
    "team_members": [["hours", "fixes"], ["worker_id", "roster"], ["employee_id", "roster"]],
    "workers": [["full_name"], ["trade"], ["contractor_name"], ["daily_wage"], ["project_id"], ["status"], ["is_deleted"]],
    "employees": [["user_id"], ["name"], ["designation"], ["status"]],
    "projects": [["manager_id"], ["site_engineer_id"], ["coordinator_id"], ["architect_id"]],
    "timesheets": [["employee_id"]],
    "timesheet_entries": [["timesheet_id"], ["project_id"], ["work_date"], ["regular_hours"], ["overtime_hours"]],
    "roles": [["name"], ["is_active"], ["code"]],
    "users": [["role_id"]],
    "team_activity": [["user_id", "activity"], ["kind", "activity"], ["title", "activity"], ["description", "activity"], ["severity", "activity"], ["is_seen", "activity"], ["created_at", "activity"], ["project_id", "activity"]],
  };
  const MIG = { workflow: "team_management_workflow.sql", fixes: "team_management_fixes.sql", roster: "team_management_roster.sql", activity: "team_management_activity.sql" };
  try {
    const r = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [Object.keys(need)],
    );
    const have = new Set(r.rows.map((x) => `${x.table_name}.${x.column_name}`));
    for (const [table, cols] of Object.entries(need)) {
      const missing = cols.filter(([c]) => !have.has(`${table}.${c}`));
      if (!missing.length) { ok(`${table} (${cols.length} columns)`); continue; }
      const migs = [...new Set(missing.map(([, m]) => m).filter(Boolean))];
      const anyCol = [...have].some((k) => k.startsWith(table + "."));
      bad(`${table}: ${anyCol ? "missing " + missing.map(([c]) => c).join(", ") : "table not found"}`,
        migs.length ? "run: node scripts/runSqlMigration.js migrations/" + migs.map((m) => MIG[m]).join(" , then migrations/")
                    : "this comes from your existing database. Send me this line and I will adjust the query to your column names");
    }
  } catch (e) { bad("could not read the database: " + e.message, "check DATABASE_URL in backend/.env"); }

  const uid = process.argv[2];
  if (uid) {
    console.log(`\n5) Running "My Project Team" for user id ${uid}`);
    try {
      const c = require(path.join(root, "controllers/teamController.js"));
      const res = { code: 200, status(n) { this.code = n; return this; }, json(b) { this.body = b; return this; } };
      await c.getMyProjectTeams({ user: { id: Number(uid), role: "employee" } }, res);
      if (res.code !== 200) bad(`HTTP ${res.code}: ${JSON.stringify(res.body)}`);
      else {
        ok(`works: ${res.body.length} project(s)`);
        for (const p of res.body)
          console.log(`       - ${p.project_name} (PM: ${p.project_manager || "none"}): ${p.people.filter((x) => x.type === "Staff").length} staff, ${p.people.filter((x) => x.type === "Labour").length} labour`);
        if (!res.body.length) console.log("       (this user is not assigned to, or on the team of, any project yet. That is normal for a new user)");
      }
    } catch (e) { bad("failed: " + e.message); }
  }

  console.log(problems ? `\n❌ ${problems} problem(s) found. Fix the items above, then run this again.\n` : "\n✅ Everything is installed correctly.\n");
  await pool.end().catch(() => {});
  process.exit(problems ? 1 : 0);
})();
