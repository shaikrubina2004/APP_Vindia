// Finds out why the backend cannot reach the database.   Run from the backend folder:  node scripts/pingDb.js
// It never prints your password.
require("dotenv").config();
const dns = require("dns").promises;
const net = require("net");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("❌ DATABASE_URL is not set. Check backend/.env");
  process.exit(1);
}

let u;
try {
  u = new URL(url);
} catch {
  console.log("❌ DATABASE_URL is not a valid address. Check backend/.env");
  process.exit(1);
}
const host = u.hostname,
  port = Number(u.port) || 5432;
const local = /^(localhost|127\.0\.0\.1)$/.test(host);
const kind = /^db\..+\.supabase\.co$/.test(host)
  ? "DIRECT connection"
  : /pooler\.supabase\.com$/.test(host)
    ? "POOLER connection"
    : "other";
const ms = (t) => `${Date.now() - t} ms`;

(async () => {
  console.log(
    `\nTarget: ${host}:${port}  (${kind}, user ${decodeURIComponent(u.username)})`,
  );

  console.log("\n1) Can this computer find the server's address?");
  let addrs = [];
  try {
    const t = Date.now();
    addrs = await dns.lookup(host, { all: true });
    console.log(
      "  ✅ found in " +
        ms(t) +
        ": " +
        addrs.map((a) => `IPv${a.family} ${a.address}`).join(", "),
    );
  } catch (e) {
    console.log(
      "  ❌ " +
        e.code +
        " - no internet, VPN/DNS problem, or the host name is wrong",
    );
  }
  const v4 = addrs.some((a) => a.family === 4);
  if (addrs.length && !v4 && !local)
    console.log(
      '  ⚠️  This host has ONLY an IPv6 address. Many home/office networks cannot reach IPv6, which causes exactly this timeout.\n       → In Supabase: Connect → copy the "Session pooler" connection string (it has an IPv4 address) into DATABASE_URL.',
    );

  console.log("\n2) Can it open a connection to that address?");
  const tcp = (a) =>
    new Promise((res) => {
      const t = Date.now();
      const s = net.connect({
        host: a.address,
        port,
        family: a.family,
        timeout: 8000,
      });
      s.once("connect", () => {
        s.destroy();
        res(`✅ ${a.address} reachable in ${ms(t)}`);
      });
      s.once("timeout", () => {
        s.destroy();
        res(
          `❌ ${a.address} no answer after 8 s (blocked, paused project, or no route)`,
        );
      });
      s.once("error", (e) => res(`❌ ${a.address} ${e.code}`));
    });
  for (const a of addrs) console.log("  " + (await tcp(a)));

  console.log("\n3) Can it log in and run a query? (waits up to 30 s)");
  const c = new Client({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  const t = Date.now();
  try {
    await c.connect();
    const r = await c.query(
      "select now() as now, current_setting('max_connections') as max, (select count(*) from pg_stat_activity) as in_use",
    );
    const took = Date.now() - t;
    console.log(`  ✅ connected and answered in ${took} ms`);
    console.log(
      `     connections in use: ${r.rows[0].in_use} of ${r.rows[0].max}`,
    );
    if (took > 8000)
      console.log(
        "  ⚠️  Slow: your backend gives up after 10 s (connectionTimeoutMillis in config/db.js). Raise it to 30000.",
      );
    if (Number(r.rows[0].in_use) >= Number(r.rows[0].max) - 3)
      console.log(
        "  ⚠️  The database is nearly out of connections. Close every terminal running the backend, wait a minute, start it once.",
      );
  } catch (e) {
    console.log(`  ❌ ${e.message} (after ${ms(t)})`);
    if (/password|authentication/i.test(e.message))
      console.log(
        "     → wrong password in DATABASE_URL. Reset it in Supabase and update .env",
      );
    if (/timeout|terminated/i.test(e.message))
      console.log(
        "     → Same timeout. See steps 1 and 2 above; also check that the Supabase project is not PAUSED (dashboard shows a Restore button).",
      );
    if (/too many|remaining connection slots/i.test(e.message))
      console.log(
        "     → out of connections: close all terminals running the backend, wait a minute, start once.",
      );
  } finally {
    await c.end().catch(() => {});
  }
  console.log("");
})();
