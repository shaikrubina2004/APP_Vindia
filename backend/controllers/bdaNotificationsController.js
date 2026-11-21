const pool = require("../config/db");
const { getBdaUsers, getCeoUsers, UNASSIGNED_SQL, CLOSED_STATUSES } = require("../utils/leadAssignment");

/* ══════════════════════════════════════
   BDA NOTIFICATION HELPERS
══════════════════════════════════════ */

/* Follow-up reminder types (they replace each other when a follow-up changes) */
const FOLLOWUP_TYPES = ["followup_overdue", "followup_today", "followup_upcoming"];

/* Create a notification (internal helper) */
async function createNotification({ type, title, description, severity = "info", lead_id = null, bda_email = null }) {
  await pool.query(
    `INSERT INTO bda_notifications (type, title, description, severity, lead_id, bda_email, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
    [type, title, description, severity, lead_id, bda_email]
  );
}
exports.createNotification = createNotification;

/* Mark a lead's still-unread follow-up reminders as read.
   Used when the follow-up changes or the lead leaves the BDA, so the bell
   never shows a reminder for a date that no longer applies.
   email omitted → applies to everyone who has one for that lead. */
async function clearFollowUpReminders(leadId, email = null) {
  await pool.query(
    `UPDATE bda_notifications
        SET is_read = true
      WHERE lead_id = $1
        AND type = ANY($2)
        AND is_read = false
        AND ($3::text IS NULL OR LOWER(bda_email) = LOWER($3))`,
    [leadId, FOLLOWUP_TYPES, email]
  );
}
exports.clearFollowUpReminders = clearFollowUpReminders;

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

/* One-time clean-up (per server start): rows with NO email are the old shared
   "global" notifications. They can't be marked read per person any more, so
   they used to come back as unread on every refresh and the bell badge never
   reached 0. Mark them read once; they are no longer returned. */
let legacyCleaned = null;
function cleanLegacyGlobalRows() {
  if (!legacyCleaned) {
    legacyCleaned = pool
      .query(`UPDATE bda_notifications SET is_read = true WHERE bda_email IS NULL AND is_read = false`)
      .catch(err => { legacyCleaned = null; console.error("Legacy notification clean-up error:", err.message); });
  }
  return legacyCleaned;
}

/* ══════════════════════════════════════
   GET ALL NOTIFICATIONS FOR A USER
   GET /api/bda-notifications?bda_email=x
   (the person's own rows only)
══════════════════════════════════════ */
exports.getNotifications = async (req, res) => {
  try {
    const { bda_email } = req.query;
    await cleanLegacyGlobalRows();
    const { rows } = await pool.query(
      `SELECT * FROM bda_notifications
       WHERE LOWER(bda_email) = LOWER($1)
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
   "google ads":    "Google Ads",     // ← add
  "youtube ads":   "YouTube Ads",    // ← add
};
const SEVERITY_BY_SOURCE = {
  "Meta Ads":     "critical",
  "JustDial":     "warn",
  "Google":       "critical",
  "YouTube":      "warn",
  "Website":      "info",
  "Excel Import": "info",
  "Google Ads":   "critical",        
  "YouTube Ads":  "warn",            
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
    // No users resolved (misconfigured roles). A row with no email is never
    // shown any more, so just make the problem visible in the server log.
    console.error("notifyNewLead: no active BDA/CEO users found — check roles.code / users.status. Lead", leadId, "was not announced.");
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
  // The lead is back in the pool: nobody owns its old follow-up reminders any more
  await clearFollowUpReminders(leadId);

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
   JOB: MISSED FOLLOW-UP → ANOTHER BDA COVERS      (every 30 min, see server.js)
   (function name kept so server.js needn't change; it no longer takes
    leads back to the pool — an assigned lead stays with its owner FOREVER)

   A follow-up is MISSED when its date has passed and no follow-up was logged
   on or after that date. The lead then gets a temporary "cover" BDA:
     • the other BDA with the fewest leads currently being covered
     • they get a notification + pop-up and see it on their Follow-up page
     • the owner is told; the BDA who follows up FIRST keeps the lead
   (cover BDA → lead is assigned to them; owner first → cover just ends)

   FOLLOWUP_COVER_AFTER_HOUR (optional, 0-23, IST): hand over on the due date
   itself once that hour passes (e.g. 18 = 6 PM). Default: after the date ends.
══════════════════════════════════════ */
exports.escalateStaleLeads = async () => {
  const { getBdaUsers } = require("../utils/leadAssignment");
  const { ensureLeadCoverSchema } = require("../utils/leadCover");
  try {
    await ensureLeadCoverSchema();

    const H = parseInt(process.env.FOLLOWUP_COVER_AFTER_HOUR, 10);
    const sameDayHour = Number.isInteger(H) && H >= 0 && H < 24 ? H : 24;   // 24 = never same day
    const TODAY = `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`;

    const { rows: missed } = await pool.query(
      `SELECT l.id, l.name, l.phone, l.snooze_until,
              l.assigned_to AS owner_name,
              COALESCE(l.assigned_email, u.email) AS owner_email
         FROM leads l
         LEFT JOIN users u
           ON REGEXP_REPLACE(LOWER(TRIM(u.name)), '\\s+', ' ', 'g') =
              REGEXP_REPLACE(LOWER(TRIM(l.assigned_to)), '\\s+', ' ', 'g')
        WHERE l.deleted_by_admin = false
          AND NOT ${UNASSIGNED_SQL("l")}
          AND LOWER(COALESCE(l.status, '')) <> ALL($1)
          AND l.cover_email IS NULL
          AND l.snooze_until IS NOT NULL
          AND ( DATE(l.snooze_until) < ${TODAY}
                OR ( $2::int < 24 AND DATE(l.snooze_until) = ${TODAY}
                     AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata')) >= $2::int ) )
          -- nobody has followed up on/after the due date
          AND NOT EXISTS (
                SELECT 1 FROM followups f
                 WHERE f.lead_id = l.id
                   AND f.created_at >= (DATE(l.snooze_until)::timestamp AT TIME ZONE 'Asia/Kolkata'))
        ORDER BY l.snooze_until ASC`,
      [CLOSED_STATUSES, sameDayHour]
    );
    if (!missed.length) return 0;

    const bdas = (await getBdaUsers()).filter(u => u.email);

    // current cover load per BDA, so a batch is spread fairly
    const { rows: loadRows } = await pool.query(
      `SELECT LOWER(cover_email) AS email, COUNT(*) AS n, MAX(cover_since) AS last_at
         FROM leads
        WHERE cover_email IS NOT NULL AND deleted_by_admin = false
          AND LOWER(COALESCE(status, '')) <> ALL($1)
        GROUP BY 1`,
      [CLOSED_STATUSES]
    );
    const load = {};
    loadRows.forEach(r => { load[r.email] = { n: Number(r.n), last: r.last_at ? new Date(r.last_at).getTime() : 0 }; });

    const norm = x => String(x || "").trim().replace(/\s+/g, " ").toLowerCase();
    const fmt = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
    let covered = 0;

    for (const l of missed) {
      const candidates = bdas.filter(u =>
        l.owner_email ? u.email.toLowerCase() !== String(l.owner_email).toLowerCase()
                      : norm(u.name) !== norm(l.owner_name));
      if (!candidates.length) continue;                    // only one BDA → owner keeps it, nothing to do

      candidates.sort((a, b) => {
        const la = load[a.email.toLowerCase()] || { n: 0, last: 0 };
        const lb = load[b.email.toLowerCase()] || { n: 0, last: 0 };
        return la.n - lb.n || la.last - lb.last || String(a.name).localeCompare(String(b.name));
      });
      const pick = candidates[0];

      // guard against a second run / a follow-up logged a moment ago
      const upd = await pool.query(
        `UPDATE leads
            SET cover_email = $2, cover_name = $3, cover_since = NOW(),
                cover_count = cover_count + 1
          WHERE id = $1 AND cover_email IS NULL
        RETURNING id`,
        [l.id, pick.email, pick.name]
      );
      if (!upd.rows.length) continue;

      const key = pick.email.toLowerCase();
      const cur = load[key] || { n: 0, last: 0 };
      load[key] = { n: cur.n + 1, last: Date.now() };
      covered++;

      const due = fmt(l.snooze_until);
      const owner = l.owner_name || "another BDA";
      await createNotification({
        type:        "followup_overdue",
        title:       `Follow-up needed: ${l.name}`,
        description: `${owner}'s lead ${l.name} (${l.phone || "No phone"}) was due for a follow-up on ${due} and was not attended. Please follow up now — it is on your Follow-ups page. Log a follow-up and the lead becomes yours.`,
        severity:    "critical",
        lead_id:     l.id,
        bda_email:   pick.email,
      }).catch(e => console.error("Cover notify (cover BDA) error:", e.message));

      if (l.owner_email) {
        await createNotification({
          type:        "followup_overdue",
          title:       `Follow-up missed: ${l.name}`,
          description: `You didn't follow up ${l.name} on ${due}. ${pick.name} has been asked to call now. Follow up first if you want to keep it — whoever follows up first keeps the lead.`,
          severity:    "warn",
          lead_id:     l.id,
          bda_email:   l.owner_email,
        }).catch(e => console.error("Cover notify (owner) error:", e.message));
      }
    }

    if (covered) console.log(`📞 ${covered} missed follow-up(s) handed to a covering BDA`);
    return covered;
  } catch (err) {
    console.error("❌ Missed follow-up job error:", err.message);
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
            AND (created_at::timestamptz AT TIME ZONE 'Asia/Kolkata')::date = ${TODAY}
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

  // A new follow-up date replaces the old one: retire the BDA's earlier
  // reminders for this lead so the bell doesn't show two dates at once.
  if (assignedTo) await clearFollowUpReminders(leadId, assignedTo);

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