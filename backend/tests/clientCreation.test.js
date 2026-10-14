// backend/tests/clientCreation.test.js
// No database needed:  node --test tests/
// (The SQL itself is exercised by clientCreation.integration.test.js.)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const http = require("http");

process.env.JWT_SECRET = "unit-test-secret";
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");

const root = path.join(__dirname, "..");
const stub = (rel, exports_) => {
  const resolved = require.resolve(path.join(root, rel));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exports_ };
};

/* ── a tiny fake pg pool that records every statement ─────────────────────── */
const fake = {
  log: [],
  released: 0,
  duplicate: false,
  failOn: null, // substring of a statement that should throw
  mail: { sent: [], ok: true },
  reset() {
    this.log = [];
    this.released = 0;
    this.duplicate = false;
    this.failOn = null;
    this.mail = { sent: [], ok: true };
  },
};
const USERS_COLS = ["id", "name", "email", "password", "role_id", "status", "created_at", "phone", "contact_person", "company_name", "address", "gstin", "notes"];
const fakeClient = {
  async query(sql, params) {
    const s = String(sql).replace(/\s+/g, " ").trim();
    fake.log.push({ sql: s, params });
    if (fake.failOn && s.includes(fake.failOn)) throw new Error("boom");
    if (s.startsWith("SELECT column_name")) return { rows: USERS_COLS.map((column_name) => ({ column_name })) };
    if (s.startsWith("SELECT 1 FROM users")) return { rows: fake.duplicate ? [{}] : [] };
    if (s.startsWith("SELECT id FROM roles")) return { rows: [{ id: 7 }] };
    if (s.startsWith("INSERT INTO users")) {
      const cols = s.match(/\(([^)]+)\) VALUES/)[1].split(",").map((c) => c.trim());
      const row = { id: 42 };
      cols.forEach((c, i) => (row[c] = params[i]));
      row.created_at = "2026-01-01T00:00:00Z";
      return { rows: [row] };
    }
    return { rows: [] };
  },
  release() {
    fake.released += 1;
  },
};
stub("config/db.js", { connect: async () => fakeClient, query: async () => ({ rows: [] }) });
stub("utils/mailer.js", {
  sendMail: async (m) => {
    if (!fake.mail.ok) return { success: false, error: "smtp" };
    fake.mail.sent.push(m);
    return { success: true };
  },
});

const ceoClientRoutes = require(path.join(root, "routes/ceoClientRoutes"));
const { _internals } = require(path.join(root, "controllers/ceoClientCreateController"));
const { validateClientInput, normalisePhone, generateTemporaryPassword } = _internals;

let server;
let base;
const tok = (role) => jwt.sign({ id: 1, role }, process.env.JWT_SECRET);
const post = async (body, token) => {
  const r = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
};
const good = (o = {}) => ({ name: "Acme Pvt Ltd", contact_person: "Ravi Kumar", email: "ravi@acme.example", phone: "9876543210", ...o });
const stmts = () => fake.log.map((l) => l.sql.split(" ").slice(0, 2).join(" "));

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/ceo/clients", ceoClientRoutes);
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/api/ceo/clients`;
});
test.after(() => new Promise((r) => server.close(r)));
test.beforeEach(() => fake.reset());

/* ── validation ───────────────────────────────────────────────────────────── */
test("normalisePhone accepts Indian mobiles (with prefixes/separators) and +intl, rejects junk", () => {
  assert.equal(normalisePhone("9876543210"), "9876543210");
  assert.equal(normalisePhone("+91 98765-43210"), "9876543210");
  assert.equal(normalisePhone("09876543210"), "9876543210");
  assert.equal(normalisePhone("+14155552671"), "+14155552671");
  for (const bad of ["12345", "5876543210", "98765432101234", "abcdefghij", "+0123456789"]) assert.equal(normalisePhone(bad), null, bad);
});

test("validateClientInput: required fields, e-mail, GSTIN, normalisation", () => {
  const empty = validateClientInput({});
  assert.deepEqual(Object.keys(empty.errors).sort(), ["contact_person", "email", "name", "phone"]);

  const ok = validateClientInput(good({ email: "  Ravi@ACME.example ", gstin: "29abcde1234f1z5", name: "  Acme   Pvt  Ltd " }));
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.value.email, "ravi@acme.example");
  assert.equal(ok.value.gstin, "29ABCDE1234F1Z5");
  assert.equal(ok.value.name, "Acme Pvt Ltd");

  for (const email of ["x", "a@b", "a@b.", "a b@c.com", "@c.com", "a@@c.com"]) assert.ok(validateClientInput(good({ email })).errors.email, email);
  assert.ok(validateClientInput(good({ gstin: "123" })).errors.gstin);
  assert.ok(validateClientInput(good({ name: ["a"] })).errors.name);
  assert.ok(validateClientInput(good({ notes: "x\u0000y" })).errors.notes);
});

test("generateTemporaryPassword: strong, random, mixed classes", () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    const p = generateTemporaryPassword();
    assert.ok(p.length >= 12 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p));
    seen.add(p);
  }
  assert.equal(seen.size, 50);
});

/* ── permissions ──────────────────────────────────────────────────────────── */
test("only the CEO can POST; everyone else is rejected before any DB work", async () => {
  assert.equal((await post(good())).status, 401);
  for (const role of ["project_manager", "client", "site_engineer", "finance_manager", "hr"]) {
    assert.equal((await post(good(), tok(role))).status, 403, role);
  }
  assert.equal(fake.log.length, 0, "no query ran for unauthorised callers");
  assert.equal((await post(good(), tok("CEO"))).status, 201, "role is normalised like the rest of the app");
});

/* ── transaction behaviour ────────────────────────────────────────────────── */
test("success path: BEGIN → lock → checks → INSERT → COMMIT, hashed password, connection released", async () => {
  const r = await post(good(), tok("ceo"));
  assert.equal(r.status, 201);
  assert.deepEqual(stmts().filter((s) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(s)), ["BEGIN", "COMMIT"]);
  const ins = fake.log.find((l) => l.sql.startsWith("INSERT INTO users"));
  assert.ok(ins.sql.includes("role_id") && ins.params[3] === 7 && ins.params[4] === "active");
  assert.match(ins.params[2], /^\$2[aby]\$/);
  assert.equal(fake.released, 1);
  assert.equal(fake.mail.sent.length, 1);
  const mailed = fake.mail.sent[0].html.match(/<code>([^<]+)<\/code>/)[1].replace(/&amp;/g, "&");
  assert.equal(await bcrypt.compare(mailed, ins.params[2]), true);
  assert.equal(r.json.data.temporary_password, undefined);
});

test("mail failure still returns 201 and hands the one-time password back exactly once", async () => {
  fake.mail.ok = false;
  const r = await post(good(), tok("ceo"));
  assert.equal(r.status, 201);
  assert.equal(r.json.data.email_sent, false);
  const ins = fake.log.find((l) => l.sql.startsWith("INSERT INTO users"));
  assert.equal(await bcrypt.compare(r.json.data.temporary_password, ins.params[2]), true);
});

test("duplicate e-mail → 409, ROLLBACK, nothing inserted, no mail", async () => {
  fake.duplicate = true;
  const r = await post(good(), tok("ceo"));
  assert.equal(r.status, 409);
  assert.ok(r.json.errors.email);
  assert.ok(!fake.log.some((l) => l.sql.startsWith("INSERT")));
  assert.ok(stmts().includes("ROLLBACK") && !stmts().includes("COMMIT"));
  assert.equal(fake.released, 1);
  assert.equal(fake.mail.sent.length, 0);
});

test("database failure mid-transaction → 500, ROLLBACK, connection released, no mail, no password leaked", async () => {
  fake.failOn = "INSERT INTO users";
  const r = await post(good(), tok("ceo"));
  assert.equal(r.status, 500);
  assert.ok(stmts().includes("ROLLBACK") && !stmts().includes("COMMIT"));
  assert.equal(fake.released, 1);
  assert.equal(fake.mail.sent.length, 0);
  assert.ok(!JSON.stringify(r.json).includes("temporary_password"));
});

test("invalid input → 400 with per-field errors and no DB connection at all", async () => {
  const r = await post(good({ email: "nope", phone: "1" }), tok("ceo"));
  assert.equal(r.status, 400);
  assert.ok(r.json.errors.email && r.json.errors.phone);
  assert.equal(fake.log.length, 0);
});