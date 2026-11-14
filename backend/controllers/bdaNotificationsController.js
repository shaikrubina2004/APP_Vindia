const pool = require("../config/db");
const { getBdaUsers, getCeoUsers, UNASSIGNED_SQL, CLOSED_STATUSES } = require("../utils/leadAssignment");

/* ══════════════════════════════════════
   BDA NOTIFICATION HELPERS
══════════════════════════════════════ */

/* Create a notification (internal helper) */
async function createNotification({ type, title, description, severity = "info", lead_id = null, bda_email = null }) {
  await pool.query(
    `INSERT INTO bda_notifications (type, title, description, severity, lead_id, bda_email, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
    [type, title, description, severity, lead_id, bda_email]
  );
}
exports.createNotification = createNotification;

/* Send the same notification to a list of emails — ONE ROW PER PERSON,
   so each BDA has their own read / unread state. (Previously a single
   shared row was used: the first BDA to open it marked it read for all.) */
async function notifyMany(emails, payload) {
  const unique = [...new Set(
    (emails || []).map(e => (e || "").trim().toLowerCase()).filter(Boolean)
  )];
  for (const email of unique) {
    await createNotification({ ...payload, bda_email: email });
  }
  return unique.length;
}
exports.notifyMany = notifyMany;

/* ══════════════════════════════════════
   GET ALL NOTIFICATIONS FOR A USER
   GET /api/bda-notifications?bda_email=x
   (own rows + legacy global rows)
══════════════════════════════════════ */
exports.getNotifications = async (req, res) => {
  try {
    const { bda_email } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM bda_notifications
       WHERE (LOWER(bda_email) = LOWER($1) OR bda_email IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`,
      [bda_email || ""]
    );
    res.json(rows);
  } catch (err) {
    console.error("BDA get notifications error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   MARK ONE AS READ
   PATCH /api/bda-notifications/:id/read
══════════════════════════════════════ */
exports.markRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE bda_notifications SET is_read = true WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   MARK ALL AS READ
   PATCH /api/bda-notifications/read-all
══════════════════════════════════════ */
exports.markAllRead = async (req, res) => {
  try {
    const { bda_email } = req.body;
    await pool.query(
      `UPDATE bda_notifications
       SET is_read = true
       WHERE LOWER(bda_email) = LOWER($1)`,
      [bda_email || ""]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   SOURCE LABELS / SEVERITY
══════════════════════════════════════ */
const SOURCE_LABELS = {
  "meta ads":      "Meta Ads",
  "facebook/meta": "Meta Ads",
  "meta":          "Meta Ads",
  "justdial":      "JustDial",
  "just dial":     "JustDial",
  "excel":         "Excel Import",
  "website":       "Website",
  "walk-in":       "Walk-in",
  "referral":      "Referral",
  "manual":        "Manual",
  "google":        "Google",
  "youtube":       "YouTube",
};
const SEVERITY_BY_SOURCE = {
  "Meta Ads":     "critical",
  "JustDial":     "warn",
  "Google":       "critical",
  "YouTube":      "warn",
  "Website":      "info",
  "Excel Import": "info",
};
const normalizeSourceLabel = (source) =>
  SOURCE_LABELS[(source || "").toLowerCase().trim()] || source || "Unknown";

/* ══════════════════════════════════════
   TRIGGER: NEW *UNASSIGNED* LEAD
   Fans out to every BDA + the CEO(s) so whoever
   logs in first can pick it up from the Leads page.
══════════════════════════════════════ */
exports.notifyNewLead = async ({ leadId, name, source, phone }) => {
  const label    = normalizeSourceLabel(source);
  const severity = SEVERITY_BY_SOURCE[label] || "info";

  const [bdas, ceos] = await Promise.all([getBdaUsers(), getCeoUsers()]);
  const emails = [...bdas, ...ceos].map(u => u.email);

  const payload = {
    type:        "new_lead",
    title:       `New lead from ${label}`,
    description: `${name} (${phone || "No phone"}) just came in via ${label} — unassigned. Open Leads and assign it.`,
    severity,
    lead_id:     leadId,
  };

  if (!emails.length) {
    // No users resolved (misconfigured roles) — fall back to legacy global row
    console.warn("notifyNewLead: no BDA/CEO users found, using global fallback row");
    await createNotification({ ...payload, bda_email: null });
    return;
  }
  await notifyMany(emails, payload);
};

/* ══════════════════════════════════════
   TRIGGER: BULK IMPORT FINISHED
   One summary alert instead of N alerts.
══════════════════════════════════════ */
exports.notifyImport = async ({ count, source }) => {
  if (!count) return;
  const label = normalizeSourceLabel(source);
  const [bdas, ceos] = await Promise.all([getBdaUsers(), getCeoUsers()]);
  await notifyMany([...bdas, ...ceos].map(u => u.email), {
    type:        "new_lead",
    title:       `${count} new lead${count !== 1 ? "s" : ""} imported (${label})`,
    description: `${count} lead${count !== 1 ? "s were" : " was"} imported from ${label} and ${count !== 1 ? "are" : "is"} waiting to be assigned.`,
    severity:    "warn",
    lead_id:     null,
  });
};

/* ══════════════════════════════════════
   TRIGGER: LEAD ASSIGNED TO A BDA
══════════════════════════════════════ */
exports.notifyLeadAssigned = async ({ leadId, name, phone, assigneeEmail, assignedByName }) => {
  if (!assigneeEmail) return;
  await createNotification({
    type:        "lead_assigned",
    title:       `Lead assigned to you: ${name}`,
    description: `${assignedByName || "Someone"} assigned ${name} (${phone || "No phone"}) to you. Please follow up.`,
    severity:    "warn",
    lead_id:     leadId,
    bda_email:   assigneeEmail,
  });
};

/* Once a lead is taken, stop nagging everyone else about it */
exports.clearPoolAlerts = async (leadId, exceptEmail = "") => {
  await pool.query(
    `UPDATE bda_notifications
        SET is_read = true
      WHERE lead_id = $1
        AND type IN ('new_lead', 'lead_escalated')
        AND is_read = false
        AND LOWER(COALESCE(bda_email, '')) <> LOWER($2)`,
    [leadId, exceptEmail || ""]
  );
};

/* ══════════════════════════════════════
   TRIGGER: LEAD ESCALATED (back to the pool)
══════════════════════════════════════ */
exports.notifyEscalated = async ({ leadId, name, phone, prevEmail, prevName, reason }) => {
  const [bdas, ceos] = await Promise.all([getBdaUsers(), getCeoUsers()]);
  const prev = (prevEmail || "").toLowerCase();

  // Everyone except the person who dropped the ball
  const others = bdas.map(u => u.email).filter(e => (e || "").toLowerCase() !== prev);

  await notifyMany([...others, ...ceos.map(u => u.email)], {
    type:        "lead_escalated",
    title:       `Escalated lead: ${name}`,
    description: `${name} (${phone || "No phone"}) was not followed up by ${prevName || "the assigned BDA"} (${reason}). It is open again — assign it to yourself or another BDA.`,
    severity:    "critical",
    lead_id:     leadId,
  });

  if (prev) {
    await createNotification({
      type:        "lead_escalated",
      title:       `Lead taken back: ${name}`,
      description: `${name} was moved back to the pool because there was no follow-up (${reason}).`,
      severity:    "critical",
      lead_id:     leadId,
      bda_email:   prevEmail,
    });
  }
};

/* ══════════════════════════════════════
   JOB: ESCALATE STALE LEADS
   Runs every 30 min (see server.js).
   Rule A — assigned, never followed up, older than ESCALATION_HOURS
   Rule B — follow-up date missed by more than OVERDUE_GRACE_DAYS
   The lead is returned to the pool, flagged escalated, and every
   other BDA + the CEO is notified.
══════════════════════════════════════ */
exports.escalateStaleLeads = async () => {
  const { ESCALATION_HOURS, OVERDUE_GRACE_DAYS } = require("../utils/leadAssignment");
  try {
    const { rows } = await pool.query(
      `WITH stale AS (
         SELECT l.id,
                l.assigned_to    AS prev_name,
                l.assigned_email AS prev_email,
                CASE
                  WHEN l.snooze_until IS NOT NULL
                   AND DATE(l.snooze_until) < ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - $2::int)
                    THEN 'follow-up date missed'
                  ELSE 'no follow-up within ' || $1::int || 'h of assignment'
                END AS reason
           FROM leads l
          WHERE l.deleted_by_admin = false
            AND NOT ${UNASSIGNED_SQL("l")}
            AND LOWER(COALESCE(l.status, '')) <> ALL($3)
            AND (
                  -- Rule A: never followed up since being assigned
                  ( l.assigned_at IS NOT NULL
                    AND l.assigned_at < NOW() - make_interval(hours => $1::int)
                    AND NOT EXISTS (
                          SELECT 1 FROM followups f
                           WHERE f.lead_id = l.id AND f.created_at >= l.assigned_at)
                    AND l.snooze_until IS NULL )
               OR
                  -- Rule B: promised a follow-up date and missed it
                  -- (only a date set AFTER the lead was assigned counts: old dates on
                  --  legacy leads, or inherited from a previous owner, are not this
                  --  BDA's missed promise)
                  ( l.snooze_until IS NOT NULL
                    AND l.assigned_at IS NOT NULL
                    AND DATE(l.snooze_until) >= (l.assigned_at AT TIME ZONE 'Asia/Kolkata')::date
                    AND DATE(l.snooze_until) < ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - $2::int) )
                )
            FOR UPDATE OF l SKIP LOCKED
       )
       UPDATE leads l
          SET last_assignee    = s.prev_name,
              assigned_to      = NULL,
              assigned_email   = NULL,
              assigned_by      = NULL,
              assigned_at      = NULL,
              snooze_until     = NULL,
              escalated_at     = NOW(),
              escalation_count = l.escalation_count + 1
         FROM stale s
        WHERE l.id = s.id
    RETURNING l.id, l.name, l.phone, s.prev_name, s.prev_email, s.reason`,
      [ESCALATION_HOURS, OVERDUE_GRACE_DAYS, CLOSED_STATUSES]
    );

    for (const r of rows) {
      await exports.notifyEscalated({
        leadId:    r.id,
        name:      r.name,
        phone:     r.phone,
        prevEmail: r.prev_email,
        prevName:  r.prev_name,
        reason:    r.reason,
      }).catch(e => console.error("Escalation notify error:", e.message));
    }

    if (rows.length) console.log(`⚡ Escalated ${rows.length} lead(s) back to the pool`);
    return rows.length;
  } catch (err) {
    console.error("❌ Escalation job error:", err.message);
    return 0;
  }
};

/* ══════════════════════════════════════
   CRON: FOLLOW-UP REMINDERS (daily ~8 AM)
   Only for ASSIGNED leads, sent to the assigned BDA's
   email (resolved via users table when the lead only
   stored a name). Never duplicated within the same day.
══════════════════════════════════════ */
exports.generateFollowUpNotifications = async () => {
  try {
    console.log("⏰ Running follow-up notification job...");

    const base = `
      SELECT l.id, l.name, l.phone, l.snooze_until,
             COALESCE(l.assigned_email, u.email) AS email
        FROM leads l
        LEFT JOIN users u
          ON REGEXP_REPLACE(LOWER(TRIM(u.name)), '\\s+', ' ', 'g') =
             REGEXP_REPLACE(LOWER(TRIM(l.assigned_to)), '\\s+', ' ', 'g')
       WHERE l.deleted_by_admin = false
         AND NOT ${UNASSIGNED_SQL("l")}
         AND LOWER(COALESCE(l.status,'')) <> ALL($1)
         AND l.snooze_until IS NOT NULL`;

    const TODAY = `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`;

    const alreadySent = async (leadId, type, email) => {
      const { rows } = await pool.query(
        `SELECT 1 FROM bda_notifications
          WHERE lead_id = $1 AND type = $2 AND LOWER(bda_email) = LOWER($3)
            AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = ${TODAY}
          LIMIT 1`,
        [leadId, type, email]
      );
      return rows.length > 0;
    };

    const send = async (lead, type, title, description, severity) => {
      if (!lead.email) return false;                        // no owner → no broadcast
      if (await alreadySent(lead.id, type, lead.email)) return false;
      await createNotification({ type, title, description, severity, lead_id: lead.id, bda_email: lead.email });
      return true;
    };

    const { rows: overdue } = await pool.query(
      `${base} AND DATE(l.snooze_until) < ${TODAY}`, [CLOSED_STATUSES]);
    for (const l of overdue) {
      const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(l.snooze_until)) / 86400000));
      await send(l, "followup_overdue", `Overdue follow-up: ${l.name}`,
        `Follow-up for ${l.name} (${l.phone}) is ${daysAgo} day${daysAgo !== 1 ? "s" : ""} overdue — it will be escalated if not done`,
        "critical");
    }

    const { rows: today } = await pool.query(
      `${base} AND DATE(l.snooze_until) = ${TODAY}`, [CLOSED_STATUSES]);
    for (const l of today) {
      await send(l, "followup_today", `Follow-up due today: ${l.name}`,
        `You have a follow-up scheduled today for ${l.name} (${l.phone})`, "warn");
    }

    const { rows: upcoming } = await pool.query(
      `${base} AND DATE(l.snooze_until) = ${TODAY} + 1`, [CLOSED_STATUSES]);
    for (const l of upcoming) {
      await send(l, "followup_upcoming", `Upcoming follow-up: ${l.name}`,
        `Reminder: follow-up with ${l.name} (${l.phone}) is scheduled for tomorrow`, "info");
    }

    console.log(`✅ Follow-up notifications: ${overdue.length} overdue, ${today.length} today, ${upcoming.length} upcoming`);
  } catch (err) {
    console.error("❌ Follow-up notification job error:", err.message);
  }
};

/* ══════════════════════════════════════
   TRIGGER: FOLLOW-UP ADDED
   Call this from addFollowUp() in leadsController
══════════════════════════════════════ */
exports.notifyFollowUp = async ({ leadId, name, phone, nextFollowUp, assignedTo }) => {
  if (!nextFollowUp) return; // no date set, skip

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const followDate = new Date(nextFollowUp);
  followDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((followDate - today) / 86400000);

  let type, title, description, severity;

  if (diffDays < 0) {
    type        = "followup_overdue";
    title       = `Overdue follow-up: ${name}`;
    description = `Follow-up for ${name} (${phone}) was due ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
    severity    = "critical";
  } else if (diffDays === 0) {
    type        = "followup_today";
    title       = `Follow-up due today: ${name}`;
    description = `You have a follow-up scheduled today for ${name} (${phone})`;
    severity    = "warn";
  } else {
    type        = "followup_upcoming";
    title       = `Upcoming follow-up: ${name}`;
    description = `Follow-up with ${name} (${phone}) is scheduled in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    severity    = "info";
  }

  await createNotification({
    type,
    title,
    description,
    severity,
    lead_id:   leadId,
    bda_email: assignedTo || null,
  });
};