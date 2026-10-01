// backend/scripts/checkCeoNotifications.js
//
// Run:  node scripts/checkCeoNotifications.js
// Checks every link in the CEO notification chain and creates ONE test
// notification. Refresh the CEO page afterwards: the bell should show it.

require("dotenv").config();
const pool = require("../config/db");
const { CEO_MATCH, notifyCEO } = require("../controllers/ceoNotificationsController");

const ok = (m) => console.log("  ✅", m);
const bad = (m) => console.log("  ❌", m);

(async () => {
  try {
    console.log("\n1) operations_notifications table");
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='operations_notifications'`);
    if (!cols.rows.length) bad("table does not exist  →  run: node migrations/createCeoTables.js");
    else {
      const have = cols.rows.map((r) => r.column_name);
      const need = ["user_id", "role_code", "type", "title", "description", "link", "severity", "project_id", "reference_id", "is_read", "created_at"];
      const miss = need.filter((c) => !have.includes(c));
      miss.length ? bad(`missing columns: ${miss.join(", ")}  →  run: node migrations/createCeoTables.js`) : ok("all columns present");
    }

    console.log("\n2) CEO user(s) in the database");
    const ceos = await pool.query(
      `SELECT u.id, u.email, r.name AS role_name, r.code AS role_code
       FROM users u JOIN roles r ON r.id = u.role_id WHERE ${CEO_MATCH}`);
    if (!ceos.rows.length) {
      bad("NO user matched the CEO role. Roles that exist:");
      const all = await pool.query(`SELECT id, name, code FROM roles ORDER BY id`);
      console.table(all.rows);
      console.log("     → the CEO role's name/code must be 'CEO' (or 'ceo').");
    } else { ok(`${ceos.rows.length} CEO user(s) found`); console.table(ceos.rows); }

    console.log("\n3) Sending a test notification");
    await notifyCEO({ type: "alert", title: "Test notification", description: "If you can see this in the bell, notifications work.", link: "/reports?tab=daily" });
    const n = await pool.query(`SELECT COUNT(*)::int AS c FROM operations_notifications WHERE role_code='ceo'`);
    n.rows[0].c ? ok(`${n.rows[0].c} CEO notification row(s) now stored`) : bad("nothing was stored — see the error printed above");

    console.log("\nNext: log in as the CEO and open any page — the bell (top bar) should show the test notification.");
    console.log("If it does NOT, the problem is on the frontend: check that Navbar.jsx contains  ceo: CEONotificationBell  and that the browser console prints  role: ceo.\n");
  } catch (e) { console.error("Check failed:", e.message); }
  finally { await pool.end(); }
})();