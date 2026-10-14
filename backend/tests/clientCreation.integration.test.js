// backend/tests/clientCreation.integration.test.js
//
// Runs the REAL routes, middleware and SQL against a REAL PostgreSQL.
// Skipped unless TEST_DATABASE_URL is set, e.g.
//
//   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/scratch \
//     node --test tests/clientCreation.integration.test.js
//
// SAFETY: everything happens inside a throw-away schema (vindia_test_<random>)
// that is dropped afterwards, and the pool's search_path points only at it, so
// no existing table is touched. Still, point it at a scratch/local database —
// never at production.
//
// What it covers: client creation, duplicate e-mails (incl. a concurrent race),
// role/permission checks, rollback on a commit-time failure, the client
// dropdown endpoint, project <-> client association and client isolation.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");

const DB_URL = process.env.TEST_DATABASE_URL;
if (!DB_URL) {
  test("integration tests (skipped: set TEST_DATABASE_URL)", { skip: true }, () => {});
  return;
}

process.env.JWT_SECRET = "integration-test-secret";
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const { Pool } = require("pg");

const SCHEMA = `vindia_test_${Math.random().toString(36).slice(2, 10)}`;
const root = path.join(__dirname, "..");
const pool = new Pool({
  connectionString: DB_URL,
  max: 8,
  options: `-c search_path=${SCHEMA}`,
});

// ── stub the app's pool + mailer BEFORE any app module is loaded ─────────────
const stub = (rel, exports_) => {
  const resolved = require.resolve(path.join(root, rel));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exports_ };
};
const mailbox = { sent: [], fail: false };
stub("config/db.js", pool);
stub("utils/mailer.js", {
  sendMail: async (msg) => {
    if (mailbox.fail) return { success: false, error: "smtp down" };
    mailbox.sent.push(msg);
    return { success: true, error: null };
  },
});

const clientFence = require(path.join(root, "middleware/clientFence"));
const ceoClientRoutes = require(path.join(root, "routes/ceoClientRoutes"));
const projectRoutes = require(path.join(root, "routes/projectRoutes"));

const BASELINE_SCHEMA = `
  CREATE TABLE roles (id SERIAL PRIMARY KEY, name TEXT NOT NULL, code TEXT, department_id INT, is_active BOOLEAN DEFAULT TRUE);
  CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT, password TEXT, role_id INT REFERENCES roles(id), status TEXT, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE employees (id SERIAL PRIMARY KEY, name TEXT, email TEXT, designation TEXT, user_id INT);
  CREATE TABLE projects (
    id SERIAL PRIMARY KEY, name TEXT, client TEXT, client_user_id INT REFERENCES users(id),
    start_date DATE, end_date DATE, budget NUMERIC, manager_id INT, site_engineer_id INT,
    coordinator_id INT, architect_id INT, location TEXT, description TEXT, building_type TEXT,
    floors TEXT, plot_size TEXT, phone TEXT, status TEXT DEFAULT 'Active', progress NUMERIC DEFAULT 0,
    spent NUMERIC DEFAULT 0, client_paid NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ);
  CREATE TABLE project_floors (id SERIAL PRIMARY KEY, project_id INT, name TEXT, level_no INT, is_active BOOLEAN);
  INSERT INTO roles (name, code) VALUES
    ('CEO','ceo'), ('Project Manager','project_manager'), ('Site Engineer','site_engineer'),
    ('Client','client'), ('Client Relations Manager','client_relations');
`;

let server;
let base;
const tokenFor = (id, role) => jwt.sign({ id, role, name: role, email: `${role}@x.com` }, process.env.JWT_SECRET);
const T = {};

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json, headers: res.headers };
};

const countUsers = async (email) =>
  Number((await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE LOWER(email)=LOWER($1)", [email])).rows[0].n);

const validClient = (over = {}) => ({
  name: "Acme Constructions Pvt Ltd",
  contact_person: "Ravi Kumar",
  email: "Ravi@Acme.example",
  phone: "+91 98765-43210",
  ...over,
});

test.before(async () => {
  await pool.query(`CREATE SCHEMA ${SCHEMA}`);
  await pool.query(BASELINE_SCHEMA);
  // seed internal users (ids are looked up, not assumed)
  const roleId = async (code) => (await pool.query("SELECT id FROM roles WHERE code=$1", [code])).rows[0].id;
  const mk = async (name, email, code, status = "active") =>
    (await pool.query("INSERT INTO users (name,email,password,role_id,status) VALUES ($1,$2,'x',$3,$4) RETURNING id", [
      name, email, await roleId(code), status,
    ])).rows[0].id;
  T.ceoId = await mk("The CEO", "ceo@vindia.example", "ceo");
  T.pmUserId = await mk("PM User", "pm@vindia.example", "project_manager");
  T.seId = await mk("Site Eng", "se@vindia.example", "site_engineer");
  T.relId = await mk("Client Relations Mgr", "rel@vindia.example", "client_relations");
  T.oldClientId = await mk("Legacy Client Ltd", "legacy@client.example", "client");
  T.inactiveClientId = await mk("Inactive Client", "inactive@client.example", "client", "inactive");
  T.baseUsers = Number((await pool.query("SELECT COUNT(*)::int n FROM users")).rows[0].n);
  T.pmEmployeeId = (await pool.query("INSERT INTO employees (name,designation,user_id) VALUES ('PM Emp','Project Manager',$1) RETURNING id", [T.pmUserId])).rows[0].id;

  T.ceo = tokenFor(T.ceoId, "ceo");
  T.pm = tokenFor(T.pmUserId, "project_manager");
  T.se = tokenFor(T.seId, "site_engineer");

  const app = express();
  app.use(express.json());
  app.use("/api", clientFence);
  app.use("/api/ceo/clients", ceoClientRoutes);
  app.use("/api/projects", projectRoutes);
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await pool.end();
});

/* ── 1. schema precondition ─────────────────────────────────────────────── */
test("before the migration: fails cleanly with a clear message and creates nothing", async () => {
  const r = await call("POST", "/ceo/clients", { token: T.ceo, body: validClient() });
  assert.equal(r.status, 500);
  assert.match(r.json.message, /add_client_profile_columns_to_users\.sql/);
  assert.ok(r.json.missing_columns.includes("phone"));
  assert.equal(await countUsers("ravi@acme.example"), 0);
});

test("migration applies, is idempotent, and leaves existing users untouched", async () => {
  const sql = fs.readFileSync(path.join(root, "migrations/add_client_profile_columns_to_users.sql"), "utf8");
  await pool.query(sql);
  await pool.query(sql); // second run must not fail
  const n = Number((await pool.query("SELECT COUNT(*)::int n FROM users")).rows[0].n);
  assert.equal(n, T.baseUsers);
  const cols = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users'", [SCHEMA])).rows.map((r) => r.column_name);
  for (const c of ["phone", "contact_person", "company_name", "address", "gstin", "notes"]) assert.ok(cols.includes(c), c);
});

/* ── 2. creation ────────────────────────────────────────────────────────── */
test("CEO creates a client: CLIENT role, hashed password, normalised fields, mail sent", async () => {
  mailbox.sent.length = 0;
  const r = await call("POST", "/ceo/clients", {
    token: T.ceo,
    body: validClient({ company_name: "Acme Group", address: "12 MG Road, Bengaluru", gstin: "29abcde1234f1z5", notes: "Referred by BDA" }),
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.success, true);
  const c = r.json.data.client;
  T.newClientId = c.id;
  assert.equal(c.email, "ravi@acme.example");
  assert.equal(c.phone, "9876543210");
  assert.equal(c.gstin, "29ABCDE1234F1Z5");
  assert.equal(c.client_code, `CL-${String(c.id).padStart(4, "0")}`);
  assert.equal(c.total_projects, 0);
  assert.equal(r.json.data.email_sent, true);
  assert.equal(r.json.data.temporary_password, undefined, "password must not be returned when the email went out");
  assert.equal("password" in c, false, "the stored hash is never returned");

  const row = (await pool.query("SELECT u.*, r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1", [c.id])).rows[0];
  assert.equal(row.code, "client");
  assert.equal(row.status, "active");
  assert.match(row.password, /^\$2[aby]\$/, "stored as a bcrypt hash");
  assert.equal(row.contact_person, "Ravi Kumar");

  assert.equal(mailbox.sent.length, 1);
  assert.equal(mailbox.sent[0].to, "ravi@acme.example");
  const mailed = mailbox.sent[0].html.match(/<code>([^<]+)<\/code>/)[1].replace(/&amp;/g, "&");
  assert.notEqual(row.password, mailed, "plain text is not what is stored");
  assert.equal(await bcrypt.compare(mailed, row.password), true, "mailed one-time password actually logs in");
});

test("if the email cannot be sent the account still exists and the one-time password is returned once", async () => {
  mailbox.fail = true;
  const r = await call("POST", "/ceo/clients", { token: T.ceo, body: validClient({ email: "nomail@acme.example", name: "NoMail Co" }) });
  mailbox.fail = false;
  assert.equal(r.status, 201);
  assert.equal(r.json.data.email_sent, false);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const pw = r.json.data.temporary_password;
  assert.ok(pw && pw.length >= 12);
  const row = (await pool.query("SELECT password FROM users WHERE id=$1", [r.json.data.client.id])).rows[0];
  assert.equal(await bcrypt.compare(pw, row.password), true);
  assert.notEqual(row.password, pw);
});

test("validation: required fields, e-mail, phone, GSTIN, lengths, wrong types", async () => {
  const before = Number((await pool.query("SELECT COUNT(*)::int n FROM users")).rows[0].n);
  const cases = [
    [{}, ["name", "contact_person", "email", "phone"]],
    [validClient({ email: "not-an-email" }), ["email"]],
    [validClient({ email: "a@b" }), ["email"]],
    [validClient({ phone: "12345" }), ["phone"]],
    [validClient({ phone: "5876543210" }), ["phone"]],
    [validClient({ gstin: "BADGSTIN" }), ["gstin"]],
    [validClient({ name: "x" }), ["name"]],
    [validClient({ notes: "n".repeat(1001) }), ["notes"]],
    [validClient({ name: { $ne: 1 } }), ["name"]],
    [validClient({ contact_person: "   " }), ["contact_person"]],
  ];
  for (const [body, fields] of cases) {
    const r = await call("POST", "/ceo/clients", { token: T.ceo, body });
    assert.equal(r.status, 400, JSON.stringify(body));
    for (const f of fields) assert.ok(r.json.errors[f], `expected error for ${f} in ${JSON.stringify(body)}`);
  }
  const after = Number((await pool.query("SELECT COUNT(*)::int n FROM users")).rows[0].n);
  assert.equal(after, before, "nothing saved for invalid input");
});

/* ── 3. duplicates ──────────────────────────────────────────────────────── */
test("duplicate e-mail is rejected (case-insensitive, and across roles)", async () => {
  let r = await call("POST", "/ceo/clients", { token: T.ceo, body: validClient({ email: "RAVI@ACME.EXAMPLE" }) });
  assert.equal(r.status, 409);
  assert.ok(r.json.errors.email);
  // e-mail already used by an internal (non-client) user
  r = await call("POST", "/ceo/clients", { token: T.ceo, body: validClient({ email: "pm@vindia.example" }) });
  assert.equal(r.status, 409);
  assert.equal(await countUsers("pm@vindia.example"), 1);
});

test("5 simultaneous requests for the same new e-mail create exactly one account", async () => {
  const email = "race@acme.example";
  // Slow the INSERT down so all five requests are inside their transactions at
  // the same time. Without the per-email advisory lock every one of them would
  // pass the duplicate check before the first row exists (verified by mutation).
  await pool.query(`
    CREATE FUNCTION slow_insert() RETURNS trigger AS $$ BEGIN PERFORM pg_sleep(0.4); RETURN NEW; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_slow BEFORE INSERT ON users FOR EACH ROW WHEN (NEW.email = 'race@acme.example') EXECUTE FUNCTION slow_insert();
  `);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => call("POST", "/ceo/clients", { token: T.ceo, body: validClient({ email, name: "Race Co" }) })),
  );
  const codes = results.map((r) => r.status).sort();
  await pool.query("DROP TRIGGER trg_slow ON users; DROP FUNCTION slow_insert();");
  assert.deepEqual(codes, [201, 409, 409, 409, 409]);
  assert.equal(await countUsers(email), 1);
});

/* ── 4. atomicity ───────────────────────────────────────────────────────── */
test("a failure at COMMIT rolls everything back: no row, no email, no password leaked, connection released", async () => {
  await pool.query(`
    CREATE FUNCTION fail_at_commit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'simulated commit failure'; END $$ LANGUAGE plpgsql;
    CREATE CONSTRAINT TRIGGER trg_fail AFTER INSERT ON users DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW WHEN (NEW.email = 'boom@acme.example') EXECUTE FUNCTION fail_at_commit();
  `);
  mailbox.sent.length = 0;
  const r = await call("POST", "/ceo/clients", { token: T.ceo, body: validClient({ email: "boom@acme.example", name: "Boom Co" }) });
  assert.equal(r.status, 500);
  assert.match(r.json.message, /No changes were saved/);
  assert.equal(r.json.data, undefined);
  assert.equal(await countUsers("boom@acme.example"), 0);
  assert.equal(mailbox.sent.length, 0, "no email for an account that was not created");
  assert.equal(pool.totalCount - pool.idleCount, 0, "all pool connections were released");
  await pool.query("DROP TRIGGER trg_fail ON users; DROP FUNCTION fail_at_commit();");
});

/* ── 5. permissions ─────────────────────────────────────────────────────── */
test("only the CEO may create clients (401 / 403 for everyone else, incl. client tokens)", async () => {
  const body = validClient({ email: "perm@acme.example" });
  assert.equal((await call("POST", "/ceo/clients", { body })).status, 401);
  assert.equal((await call("POST", "/ceo/clients", { token: T.pm, body })).status, 403);
  assert.equal((await call("POST", "/ceo/clients", { token: T.se, body })).status, 403);
  assert.equal((await call("POST", "/ceo/clients", { token: tokenFor(T.newClientId, "client"), body })).status, 403);
  assert.equal(await countUsers("perm@acme.example"), 0);
  // PM cannot read the CEO client directory either
  assert.equal((await call("GET", "/ceo/clients", { token: T.pm })).status, 403);
});

/* ── 6. CEO list / summary / search / filter ────────────────────────────── */
test("new client appears in the CEO list, search, filters and summary counts", async () => {
  const all = await call("GET", "/ceo/clients?limit=50", { token: T.ceo });
  assert.equal(all.status, 200, JSON.stringify(all.json));
  const mine = all.json.data.clients.find((c) => c.id === T.newClientId);
  assert.ok(mine);
  assert.equal(mine.company_name, "Acme Group");
  assert.equal(mine.contact_person, "Ravi Kumar");
  assert.equal(mine.phone, "9876543210");
  // legacy + inactive + newly created (acme, nomail, race) all have the client role; the "relations" role must not count
  assert.ok(all.json.data.clients.every((c) => c.id !== T.relId));
  const total = all.json.data.summary.total_clients;
  assert.equal(total, 2 /* legacy+inactive */ + 3 /* acme,nomail,race */);

  for (const q of ["ravi@acme", "Acme Group", "Ravi Kumar", `CL-${String(T.newClientId).padStart(4, "0")}`]) {
    const s = await call("GET", `/ceo/clients?search=${encodeURIComponent(q)}`, { token: T.ceo });
    assert.ok(s.json.data.clients.some((c) => c.id === T.newClientId), `search "${q}" should find the new client`);
  }
  const none = await call("GET", "/ceo/clients?project_filter=no_projects&limit=50", { token: T.ceo });
  assert.ok(none.json.data.clients.some((c) => c.id === T.newClientId));
  assert.equal(none.json.data.summary.clients_without_projects, total);
});

/* ── 7. project dropdown ────────────────────────────────────────────────── */
test("GET /projects/clients returns only real, active client accounts — safe fields only", async () => {
  const r = await call("GET", "/projects/clients", { token: T.pm });
  assert.equal(r.status, 200);
  const ids = r.json.map((c) => c.id);
  assert.ok(ids.includes(T.newClientId) && ids.includes(T.oldClientId));
  assert.ok(!ids.includes(T.relId), "a role merely containing the word 'client' is not a client");
  assert.ok(!ids.includes(T.inactiveClientId), "inactive client accounts are not selectable");
  assert.ok(!ids.includes(T.ceoId) && !ids.includes(T.pmUserId) && !ids.includes(T.seId));
  const acme = r.json.find((c) => c.id === T.newClientId);
  assert.deepEqual(Object.keys(acme).sort(), ["company_name", "contact_person", "email", "id", "name"]);
  assert.equal(acme.company_name, "Acme Group");
  assert.equal(r.json.find((c) => c.id === T.oldClientId).company_name, null);
  assert.equal((await call("GET", "/projects/clients", { token: T.ceo })).status, 200);
  assert.equal((await call("GET", "/projects/clients", { token: T.se })).status, 403);
  assert.equal((await call("GET", "/projects/clients", { token: tokenFor(T.newClientId, "client") })).status, 403);
  assert.equal((await call("GET", "/projects/clients")).status, 401);
});

/* ── 8. project <-> client association ──────────────────────────────────── */
test("Project Manager creates a project linked to the chosen client's real user id", async () => {
  const r = await call("POST", "/projects", {
    token: T.pm,
    body: {
      name: "Acme Tower", client: "SPOOFED NAME", client_user_id: String(T.newClientId), budget: 5000000,
      manager_id: T.pmEmployeeId, site_engineer_id: T.seId, start_date: "2026-01-01", end_date: "2026-12-31",
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  T.projectId = r.json.id;
  assert.equal(r.json.client_user_id, T.newClientId);
  assert.equal(r.json.client_user_name, "Acme Constructions Pvt Ltd");
  assert.equal(r.json.client, "Acme Constructions Pvt Ltd", "label comes from the account, not the request");
  const row = (await pool.query("SELECT client_user_id FROM projects WHERE id=$1", [T.projectId])).rows[0];
  assert.equal(row.client_user_id, T.newClientId);

  // the client's details are returned with the project (so the PM can see who it is linked to)
  const expected = {
    client_user_email: "ravi@acme.example",
    client_company_name: "Acme Group",
    client_contact_person: "Ravi Kumar",
    client_user_phone: "9876543210",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(expected).map((k) => [k, r.json[k]])), expected);
  const list = await call("GET", "/projects", { token: T.pm });
  const fromList = list.json.find((p) => p.id === T.projectId);
  assert.deepEqual(Object.fromEntries(Object.keys(expected).map((k) => [k, fromList[k]])), expected);
  assert.equal("password" in fromList, false);
  assert.equal(Object.keys(fromList).some((k) => /password/i.test(k)), false, "no password-like field leaks");
});

test("project creation rejects non-client, inactive and malformed client ids", async () => {
  const before = Number((await pool.query("SELECT COUNT(*)::int n FROM projects")).rows[0].n);
  const base = { name: "Bad", client: "x", budget: 1, manager_id: T.pmEmployeeId, site_engineer_id: T.seId };
  for (const id of [T.pmUserId, T.relId, T.inactiveClientId, 999999, "abc", -3, 1.5]) {
    const r = await call("POST", "/projects", { token: T.pm, body: { ...base, client_user_id: id } });
    assert.equal(r.status, 400, `client_user_id=${id}`);
  }
  const after = Number((await pool.query("SELECT COUNT(*)::int n FROM projects")).rows[0].n);
  assert.equal(after, before);
});

test("legacy behaviour kept: a project without client_user_id (free-text client) is still accepted", async () => {
  const r = await call("POST", "/projects", { token: T.pm, body: { name: "Legacy", client: "Walk-in", budget: 10, manager_id: T.pmEmployeeId, site_engineer_id: T.seId } });
  assert.equal(r.status, 201);
  assert.equal(r.json.client_user_id, null);
});

test("linked client shows up in CEO Client Management; other clients stay isolated", async () => {
  const detail = await call("GET", "/ceo/clients?search=Acme%20Group", { token: T.ceo });
  const c = detail.json.data.clients.find((x) => x.id === T.newClientId);
  assert.equal(c.total_projects, 1);
  assert.equal(c.total_budget, 5000000);

  const mine = await call("GET", "/projects", { token: tokenFor(T.newClientId, "client") });
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.json.map((p) => p.id), [T.projectId]);
  const other = await call("GET", "/projects", { token: tokenFor(T.oldClientId, "client") });
  assert.deepEqual(other.json, [], "another client sees none of Acme's projects");
  // client tokens are fenced away from the CEO API and the staff directories
  assert.equal((await call("GET", "/ceo/clients", { token: tokenFor(T.oldClientId, "client") })).status, 403);
  assert.equal((await call("GET", "/projects/managers", { token: tokenFor(T.oldClientId, "client") })).status, 403);
});