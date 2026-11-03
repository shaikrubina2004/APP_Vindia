// backend/scripts/flagDefaultPasswordUsers.js
//
// One-time helper. Accounts created BEFORE the new login-email feature were
// all given the same password ("Vindia@123"), and nobody was ever asked to
// change it. This finds every account that still uses it and, when you run it
// with --apply, marks them "must change password" so the first-login pop-up
// appears the next time they sign in.
//
//   See who is affected (changes nothing):   node scripts/flagDefaultPasswordUsers.js
//   Flag them:                               node scripts/flagDefaultPasswordUsers.js --apply
//
// Run it from the backend folder.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const DEFAULT_PASSWORD = "Vindia@123";

(async () => {
  const apply = process.argv.includes("--apply");

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password, u.must_change_password, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.id`
  );

  const stillDefault = [];
  for (const u of rows) {
    if (u.password && (await bcrypt.compare(DEFAULT_PASSWORD, u.password))) {
      stillDefault.push(u);
    }
  }

  console.log(
    `\n${stillDefault.length} of ${rows.length} accounts still use the default password:\n`
  );
  stillDefault.forEach((u) =>
    console.log(
      `  #${u.id}  ${u.email}  (${u.role || "no role"})${
        u.must_change_password ? "   [already flagged]" : ""
      }`
    )
  );

  if (!apply) {
    console.log("\nDry run only — nothing was changed. Run again with --apply to flag them.\n");
  } else {
    const ids = stillDefault.filter((u) => !u.must_change_password).map((u) => u.id);
    if (ids.length > 0) {
      await pool.query(
        "UPDATE users SET must_change_password = TRUE WHERE id = ANY($1::int[])",
        [ids]
      );
    }
    console.log(`\nFlagged ${ids.length} account(s). They will be invited to set their own password at next sign-in.\n`);
  }

  await pool.end();
})().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});