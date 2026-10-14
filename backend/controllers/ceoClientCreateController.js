// backend/controllers/ceoClientCreateController.js
// ─────────────────────────────────────────────────────────────────────────────
// CEO "Create Client" — POST /api/ceo/clients
//
// DATA MODEL (same as ceoClientController — no new tables):
//   A client is a `users` row whose role (roles.code) is 'client'.
//   Projects link to it through projects.client_user_id → users.id.
//
// CREDENTIALS
//   The repo has no invitation / password-setup-token flow, only a mailer and
//   POST /api/settings/change-password (which clients are allowed to call). So:
//     • a random one-time password is generated (crypto.randomInt, never a
//       shared default such as the employee flow's "Vindia@123");
//     • only its bcrypt hash is stored — the plain value is never persisted
//       or logged;
//     • it is e-mailed to the client through utils/mailer;
//     • ONLY if that e-mail fails is the one-time password returned once in the
//       API response so the CEO can hand it over securely. It is not
//       recoverable afterwards.
//
// ATOMICITY
//   Duplicate check + role lookup + insert run in ONE transaction, serialised
//   per e-mail by an advisory lock, so two simultaneous requests for the same
//   e-mail cannot both succeed, and a failure never leaves a partial record.
//   The e-mail is only sent AFTER the commit.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { sendMail } = require("../utils/mailer");

/* ── limits & patterns ───────────────────────────────────────────────────── */
const LIMITS = {
  name: 150,
  contact_person: 100,
  company_name: 150,
  address: 500,
  notes: 1000,
  email: 254,
};
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// Columns written besides the five core ones. Names are fixed literals —
// they are never taken from the request.
const PROFILE_COLUMNS = ["contact_person", "company_name", "address", "gstin", "notes"];
const PHONE_COLUMN_CANDIDATES = ["phone", "mobile", "phone_number"]; // same order as ceoClientController

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/* ── validation / normalisation ──────────────────────────────────────────── */
const clean = (v) => {
  if (v === undefined || v === null) return { text: "", bad: false };
  if (typeof v !== "string" && typeof v !== "number") return { text: "", bad: true };
  const text = String(v).replace(/\s+/g, " ").trim();
  return { text, bad: CONTROL_CHARS_RE.test(text) };
};

/** 10-digit Indian mobile (optional +91 / 91 / 0 prefix) or +<8-15 digits>. */
const normalisePhone = (raw) => {
  const compact = String(raw).replace(/[\s\-().]/g, "");
  const indian = compact.match(/^(?:\+?91|0)?([6-9][0-9]{9})$/);
  if (indian) return indian[1];
  if (/^\+[1-9][0-9]{7,14}$/.test(compact)) return compact;
  return null;
};

const validateClientInput = (body = {}) => {
  const errors = {};
  const v = {};

  const take = (key, label, { required = false, max } = {}) => {
    const { text, bad } = clean(body[key]);
    if (bad) {
      errors[key] = `${label} contains invalid characters.`;
    } else if (!text) {
      if (required) errors[key] = `${label} is required.`;
    } else if (max && text.length > max) {
      errors[key] = `${label} must be at most ${max} characters.`;
    }
    v[key] = text;
  };

  take("name", "Client / company name", { required: true, max: LIMITS.name });
  if (!errors.name && v.name.length < 2)
    errors.name = "Client / company name must be at least 2 characters.";

  take("contact_person", "Contact person name", { required: true, max: LIMITS.contact_person });
  if (!errors.contact_person && v.contact_person.length < 2)
    errors.contact_person = "Contact person name must be at least 2 characters.";

  take("email", "Email address", { required: true, max: LIMITS.email });
  v.email = v.email.toLowerCase();
  if (!errors.email && !EMAIL_RE.test(v.email)) errors.email = "Enter a valid email address.";

  take("phone", "Phone number", { required: true });
  if (!errors.phone) {
    const phone = normalisePhone(v.phone);
    if (!phone) errors.phone = "Enter a valid phone number (10-digit mobile, or +country code).";
    else v.phone = phone;
  }

  take("company_name", "Company / business name", { max: LIMITS.company_name });
  take("address", "Company address", { max: LIMITS.address });
  take("notes", "Notes", { max: LIMITS.notes });

  const gst = clean(body.gstin);
  if (gst.bad) errors.gstin = "GSTIN contains invalid characters.";
  v.gstin = gst.text.replace(/\s+/g, "").toUpperCase();
  if (!errors.gstin && v.gstin && !GSTIN_RE.test(v.gstin))
    errors.gstin = "Enter a valid 15-character GSTIN.";

  return { errors, value: v };
};

/* ── credentials ─────────────────────────────────────────────────────────── */
const generateTemporaryPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!?";
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const welcomeEmail = ({ contactPerson, companyName, email, password }) => {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "";
  return {
    subject: "Your VIndia Infrasec client portal account",
    html: `
      <p>Hi ${escapeHtml(contactPerson)},</p>
      <p>A client portal account has been created for <strong>${escapeHtml(companyName)}</strong>.</p>
      <ul>
        <li><strong>Login email:</strong> ${escapeHtml(email)}</li>
        <li><strong>One-time password:</strong> <code>${escapeHtml(password)}</code></li>
      </ul>
      ${appUrl ? `<p>Sign in at <a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a>.</p>` : ""}
      <p>For your security, please change this password right after your first sign-in
      (Settings &rarr; Change password).</p>
      <p>Best regards,<br/>VIndia Infrasec</p>
    `,
  };
};

/* ── response shaping ────────────────────────────────────────────────────── */
const toClientRecord = (row, phoneCol, hasCreatedAt) => ({
  id: row.id,
  client_code: `CL-${String(row.id).padStart(4, "0")}`,
  name: row.name,
  contact_person: row.contact_person || null,
  company_name: row.company_name || null,
  email: row.email,
  phone: row[phoneCol] || null,
  address: row.address || null,
  gstin: row.gstin || null,
  notes: row.notes || null,
  status: row.status || null,
  created_at: hasCreatedAt ? row.created_at || null : null,
  total_projects: 0,
  active_projects: 0,
  completed_projects: 0,
  total_budget: 0,
});

/* ═════════════════════════════════════════════════════════════════════════
   POST /api/ceo/clients        (router already enforces JWT + CEO role)
   ═════════════════════════════════════════════════════════════════════════ */
exports.createClient = async (req, res) => {
  const { errors, value } = validateClientInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({
      success: false,
      message: "Please correct the highlighted fields.",
      errors,
    });
  }

  // Hash BEFORE opening the transaction (bcrypt is slow; don't hold a lock for it).
  const temporaryPassword = generateTemporaryPassword();
  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(temporaryPassword, 10);
  } catch (err) {
    console.error("ceoClient.createClient: hash failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to create client." });
  }

  let db;
  let record;
  try {
    db = await pool.connect();
    await db.query("BEGIN");

    // Serialise concurrent creations of the same e-mail (works even if the
    // users table has no UNIQUE(email) constraint).
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`client-email:${value.email}`]);

    // 1. schema check — never assume columns exist
    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'users'`,
    );
    const cols = new Set(colRes.rows.map((r) => r.column_name));
    const phoneCol = PHONE_COLUMN_CANDIDATES.find((c) => cols.has(c));
    const missing = PROFILE_COLUMNS.filter((c) => !cols.has(c));
    if (!phoneCol) missing.unshift("phone");
    if (missing.length) {
      throw new HttpError(
        500,
        "Client profile columns are missing in the database. Apply " +
          "migrations/add_client_profile_columns_to_users.sql and restart the server.",
        { missing_columns: missing },
      );
    }

    // 2. duplicate e-mail (any role, case-insensitive)
    const dup = await db.query("SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1", [value.email]);
    if (dup.rows.length) {
      throw new HttpError(409, "An account with this email address already exists.", {
        errors: { email: "An account with this email address already exists." },
      });
    }

    // 3. existing CLIENT role — never invent or modify roles
    const roleRes = await db.query(
      "SELECT id FROM roles WHERE LOWER(code) = 'client' ORDER BY id LIMIT 1",
    );
    if (!roleRes.rows.length) {
      throw new HttpError(500, "The Client role is not configured in the roles table.");
    }

    // 4. insert (column names are fixed literals; values are parameters)
    const insertCols = ["name", "email", "password", "role_id", "status", phoneCol, ...PROFILE_COLUMNS];
    const insertVals = [
      value.name,
      value.email,
      passwordHash,
      roleRes.rows[0].id,
      "active",
      value.phone,
      value.contact_person,
      value.company_name || null,
      value.address || null,
      value.gstin || null,
      value.notes || null,
    ];
    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(", ");
    const hasCreatedAt = cols.has("created_at");
    const returning = ["id", "name", "email", "status", phoneCol, ...PROFILE_COLUMNS]
      .concat(hasCreatedAt ? ["created_at"] : [])
      .join(", ");

    const ins = await db.query(
      `INSERT INTO users (${insertCols.join(", ")}) VALUES (${placeholders}) RETURNING ${returning}`,
      insertVals,
    );
    record = toClientRecord(ins.rows[0], phoneCol, hasCreatedAt);

    await db.query("COMMIT");
  } catch (err) {
    if (db) {
      try {
        await db.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("ceoClient.createClient: rollback failed:", rollbackErr.message);
      }
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ success: false, message: err.message, ...err.extra });
    }
    if (err && err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
        errors: { email: "An account with this email address already exists." },
      });
    }
    console.error("ceoClient.createClient:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create client. No changes were saved." });
  } finally {
    if (db) db.release();
  }

  // Committed. Notify the client; a mail failure must NOT undo the account.
  const mail = await sendMail({
    to: record.email,
    ...welcomeEmail({
      contactPerson: value.contact_person,
      companyName: value.company_name || value.name,
      email: record.email,
      password: temporaryPassword,
    }),
  });

  const data = { client: record, email_sent: Boolean(mail && mail.success) };
  if (!data.email_sent) {
    // Shown to the CEO once so they can pass it on; only the hash is stored.
    data.temporary_password = temporaryPassword;
    res.set("Cache-Control", "no-store");
  }

  return res.status(201).json({
    success: true,
    message: data.email_sent
      ? "Client created. Login details were emailed to the client."
      : "Client created, but the email could not be sent. Share the one-time password shown with the client.",
    data,
  });
};

// exported for unit tests
exports._internals = { validateClientInput, normalisePhone, generateTemporaryPassword };