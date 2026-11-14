const pool = require("../config/db");

/* ══════════════════════════════════════════════════════════
   LEAD ASSIGNMENT — shared helpers
   ══════════════════════════════════════════════════════════ */

/* Hours an assigned lead may sit with NO follow-up before it escalates */
const ESCALATION_HOURS = Number(process.env.LEAD_ESCALATION_HOURS) || 24;

/* Days a follow-up date may be missed before the lead escalates */
const OVERDUE_GRACE_DAYS = Number(process.env.LEAD_OVERDUE_GRACE_DAYS ?? 1);

/* Role codes that count as a BDA (CEO is deliberately NOT here) */
const BDA_ROLE_CODES = [
  "bda",
  "bda1",
  "bda2",
  "business_development",
  "business_development_analyst",
];

/* Statuses that are "finished" — never escalated */
const CLOSED_STATUSES = [
  "converted",
  "not interested",
  "junk",
  "junk_requested",
];

/* SQL fragment: lead has nobody assigned.
   Covers NULL, empty string and the legacy literal 'Unassigned'
   that the Meta webhook used to write. */
const UNASSIGNED_SQL = (alias = "") => {
  const c = alias ? `${alias}.assigned_to` : "assigned_to";
  return `(${c} IS NULL OR TRIM(${c}) = '' OR LOWER(TRIM(${c})) = 'unassigned')`;
};

/* SQL fragment: lead belongs to the BDA ($nameParam / $emailParam are
   placeholder strings such as "$1"). Matches by email first, falls back
   to a normalised name match for older rows that only stored a name. */
const ASSIGNED_TO_ME_SQL = (nameParam, emailParam, alias = "") => {
  const p = alias ? `${alias}.` : "";
  // The caller's name comes from the DATABASE (looked up by email) so a stale
  // name cached in the browser can never hide or leak leads.
  const myName = `COALESCE(
      (SELECT u.name FROM users u WHERE LOWER(u.email) = LOWER(${emailParam}) LIMIT 1),
      ${nameParam})`;
  return `(
    (${emailParam} <> '' AND LOWER(${p}assigned_email) = LOWER(${emailParam}))
    OR LOWER(REGEXP_REPLACE(TRIM(COALESCE(${p}assigned_to,'')), '\\s+', ' ', 'g')) =
       LOWER(REGEXP_REPLACE(TRIM(${myName}), '\\s+', ' ', 'g'))
  )`;
};

/* ── Schema: idempotent, runs at server start ── */
async function ensureLeadAssignmentSchema() {
  try {
    await pool.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS assigned_email   TEXT,
        ADD COLUMN IF NOT EXISTS assigned_by      TEXT,
        ADD COLUMN IF NOT EXISTS assigned_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS escalated_at     TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS escalation_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_assignee    TEXT;
    `);

    // Legacy clean-up: Meta webhook wrote the string 'Unassigned'
    await pool.query(`
      UPDATE leads SET assigned_to = NULL
      WHERE assigned_to IS NOT NULL AND LOWER(TRIM(assigned_to)) = 'unassigned'
    `);

    // Existing assigned leads get a start time so the escalation clock is sane
    await pool.query(`
      UPDATE leads SET assigned_at = COALESCE(assigned_at, NOW())
      WHERE assigned_at IS NULL AND ${UNASSIGNED_SQL()} = false
    `);

    // Legacy leads that only stored a name: attach the email when exactly one
    // active BDA has that name.
    await pool.query(
      `UPDATE leads l
          SET assigned_email = (
                SELECT MIN(u.email) FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE REGEXP_REPLACE(LOWER(TRIM(u.name)), '\\s+', ' ', 'g') =
                       REGEXP_REPLACE(LOWER(TRIM(l.assigned_to)), '\\s+', ' ', 'g')
                   AND LOWER(r.code) = ANY($1))
        WHERE l.assigned_email IS NULL
          AND ${UNASSIGNED_SQL("l")} = false
          AND ( SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE REGEXP_REPLACE(LOWER(TRIM(u.name)), '\\s+', ' ', 'g') =
                       REGEXP_REPLACE(LOWER(TRIM(l.assigned_to)), '\\s+', ' ', 'g')
                   AND LOWER(r.code) = ANY($1) ) = 1`,
      [BDA_ROLE_CODES]
    );

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_assigned_email ON leads (LOWER(assigned_email))`
    );

    // Fast "already notified" lookups
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_bda_notif_lead_type ON bda_notifications (lead_id, type)`
    );

    console.log("✅ Lead assignment schema ready");
  } catch (err) {
    console.error("❌ Lead assignment schema error:", err.message);
  }
}

/* ── Users ── */
async function getBdaUsers() {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE ( LOWER(r.code) = ANY($1)
              OR LOWER(REPLACE(TRIM(r.name), ' ', '_')) = ANY($1) )
        AND COALESCE(LOWER(u.status), 'active')
              NOT IN ('inactive','disabled','suspended','terminated','deleted')
      ORDER BY u.name ASC`,
    [BDA_ROLE_CODES]
  );
  return rows;
}

async function getCeoUsers() {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE ( LOWER(r.code) = 'ceo' OR LOWER(TRIM(r.name)) = 'ceo' )
        AND COALESCE(LOWER(u.status), 'active')
              NOT IN ('inactive','disabled','suspended','terminated','deleted')`
  );
  return rows;
}

async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, LOWER(r.code) AS role_code
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findBdaByEmail(email) {
  if (!email) return null;
  const list = await getBdaUsers();
  return list.find(u => (u.email || "").toLowerCase() === String(email).toLowerCase()) || null;
}

async function findBdaByName(name) {
  if (!name) return null;
  const norm = s => String(s).trim().replace(/\s+/g, " ").toLowerCase();
  const list = await getBdaUsers();
  return list.find(u => norm(u.name) === norm(name)) || null;
}

module.exports = {
  ESCALATION_HOURS,
  OVERDUE_GRACE_DAYS,
  BDA_ROLE_CODES,
  CLOSED_STATUSES,
  UNASSIGNED_SQL,
  ASSIGNED_TO_ME_SQL,
  ensureLeadAssignmentSchema,
  getBdaUsers,
  getCeoUsers,
  getUserById,
  findBdaByEmail,
  findBdaByName,
};