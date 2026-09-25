const pool = require("../config/db");

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

/* ══════════════════════════════════════
   GET ALL NOTIFICATIONS FOR A BDA
   GET /api/bda-notifications?bda_email=x
   (returns global + email-specific)
══════════════════════════════════════ */
exports.getNotifications = async (req, res) => {
  try {
    const { bda_email } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM bda_notifications
       WHERE (bda_email = $1 OR bda_email IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`,
      [bda_email || null]
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
       WHERE bda_email = $1 OR bda_email IS NULL`,
      [bda_email || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   TRIGGER: NEW LEAD CREATED
   Called from createLead() in leadsController
   after a successful INSERT.
   
   Usage:
     const { notifyNewLead } = require("./bdaNotificationsController");
     await notifyNewLead({ leadId, name, source, phone });
══════════════════════════════════════ */
exports.notifyNewLead = async ({ leadId, name, source, phone }) => {
  const sourceLabels = {
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

  const normalizedSource = sourceLabels[(source || "").toLowerCase().trim()] || source || "Unknown";

  // Source-based severity
  const severityMap = {
    "Meta Ads":    "critical",
    "JustDial":    "warn",
    "Google":      "critical",
    "YouTube":     "warn",
    "Website":     "info",
    "Excel Import":"info",
  };
  const severity = severityMap[normalizedSource] || "info";

  await createNotification({
    type:        "new_lead",
    title:       `New lead from ${normalizedSource}`,
    description: `${name} (${phone || "No phone"}) just came in via ${normalizedSource}`,
    severity,
    lead_id:     leadId,
    bda_email:   null, // broadcast to all BDAs
  });
};

/* ══════════════════════════════════════
   CRON / SCHEDULED JOB: FOLLOW-UP ALERTS
   
   Run this function once daily (e.g. at 8 AM)
   via a cron job or node-cron.
   
   It inserts notifications for:
   - Overdue follow-ups
   - Today's follow-ups
   - Upcoming (tomorrow) follow-ups
   
   Usage in your cron file:
     const { generateFollowUpNotifications } = require("./bdaNotificationsController");
     cron.schedule("0 8 * * *", generateFollowUpNotifications);
══════════════════════════════════════ */
exports.generateFollowUpNotifications = async () => {
  try {
    console.log("⏰ Running follow-up notification job...");

    // Overdue
    const { rows: overdue } = await pool.query(
      `SELECT DISTINCT ON (l.id) l.id, l.name, l.phone, l.assigned_to, l.snooze_until
       FROM leads l
       WHERE l.deleted_by_admin = false
         AND l.snooze_until IS NOT NULL
         AND DATE(l.snooze_until) < CURRENT_DATE
       ORDER BY l.id, l.snooze_until ASC`
    );

    for (const lead of overdue) {
      const daysAgo = Math.floor(
        (new Date() - new Date(lead.snooze_until)) / 86400000
      );
      await createNotification({
        type:        "followup_overdue",
        title:       `Overdue follow-up: ${lead.name}`,
        description: `Follow-up for ${lead.name} (${lead.phone}) is ${daysAgo} day${daysAgo !== 1 ? "s" : ""} overdue`,
        severity:    "critical",
        lead_id:     lead.id,
        bda_email:   lead.assigned_to || null,
      });
    }

    // Today
    const { rows: today } = await pool.query(
      `SELECT DISTINCT ON (l.id) l.id, l.name, l.phone, l.assigned_to
       FROM leads l
       WHERE l.deleted_by_admin = false
         AND l.snooze_until IS NOT NULL
         AND DATE(l.snooze_until) = CURRENT_DATE
       ORDER BY l.id`
    );

    for (const lead of today) {
      await createNotification({
        type:        "followup_today",
        title:       `Follow-up due today: ${lead.name}`,
        description: `You have a follow-up scheduled today for ${lead.name} (${lead.phone})`,
        severity:    "warn",
        lead_id:     lead.id,
        bda_email:   lead.assigned_to || null,
      });
    }

    // Upcoming (tomorrow)
    const { rows: upcoming } = await pool.query(
      `SELECT DISTINCT ON (l.id) l.id, l.name, l.phone, l.assigned_to, l.snooze_until
       FROM leads l
       WHERE l.deleted_by_admin = false
         AND l.snooze_until IS NOT NULL
         AND DATE(l.snooze_until) = CURRENT_DATE + INTERVAL '1 day'
       ORDER BY l.id`
    );

    for (const lead of upcoming) {
      await createNotification({
        type:        "followup_upcoming",
        title:       `Upcoming follow-up: ${lead.name}`,
        description: `Reminder: follow-up with ${lead.name} (${lead.phone}) is scheduled for tomorrow`,
        severity:    "info",
        lead_id:     lead.id,
        bda_email:   lead.assigned_to || null,
      });
    }

    console.log(`✅ Follow-up notifications: ${overdue.length} overdue, ${today.length} today, ${upcoming.length} upcoming`);
  } catch (err) {
    console.error("❌ Follow-up notification job error:", err.message);
  }
};
/* ══════════════════════════════════════
   CRON / SCHEDULED JOB: MISSED FOLLOW-UP ESCALATION

   This is the "misses a follow-up → goes to another BDA" behaviour.
   Run daily (see server.js), AFTER generateFollowUpNotifications.

   Fully automatic — no manual name mapping. For every lead that:
     - is not deleted / converted / junk
     - has a next follow-up (snooze_until) overdue by more than
       ESCALATION_GRACE_DAYS
   → look up every ACTIVE user with the "bda" role, exclude whoever
     the lead is currently assigned to, and reassign the lead to
     whichever remaining BDA currently has the fewest active leads
     (keeps leads spread evenly across the team, works for any BDA
     without config). Logs an audit follow-up entry and notifies
     both the original and the new BDA. If there's no other active
     BDA to hand it to, it's left alone and flagged so someone can
     look at it manually.

   Usage in your cron file:
     const { escalateOverdueFollowUps } = require("./bdaNotificationsController");
     cron.schedule("0 8 * * *", async () => {
       await generateFollowUpNotifications();
       await escalateOverdueFollowUps();
     });
══════════════════════════════════════ */
exports.escalateOverdueFollowUps = async () => {
  const { ESCALATION_GRACE_DAYS } = require("../config/bdaEscalation");
  const ACTIVE_STATUSES_EXCLUDED = "'converted', 'junk', 'junk_requested', 'not interested'";

  try {
    console.log("🔁 Running missed follow-up escalation job...");

    const { rows: overdueLeads } = await pool.query(
      `SELECT id, name, phone, assigned_to, snooze_until, status
       FROM leads
       WHERE deleted_by_admin = false
         AND assigned_to IS NOT NULL
         AND snooze_until IS NOT NULL
         AND DATE(snooze_until) < CURRENT_DATE - $1::int
         AND LOWER(status) NOT IN (${ACTIVE_STATUSES_EXCLUDED})`,
      [ESCALATION_GRACE_DAYS]
    );

    if (!overdueLeads.length) {
      console.log("✅ Escalation job done: nothing overdue");
      return { escalated: 0 };
    }

    // Every currently-active BDA, with how many active leads they
    // already carry — used to pick the least-loaded backup below.
    // Re-fetched fresh each run so it reacts to leave/new hires
    // automatically.
    const { rows: bdas } = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(l.id) FILTER (
                WHERE l.deleted_by_admin = false
                  AND LOWER(l.status) NOT IN (${ACTIVE_STATUSES_EXCLUDED})
              ) AS active_lead_count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN leads l
         ON LOWER(TRIM(l.assigned_to)) = LOWER(TRIM(u.name))
       WHERE r.code = 'bda' AND u.status = 'active'
       GROUP BY u.id, u.name, u.email
       ORDER BY active_lead_count ASC`
    );

    let escalated = 0;

    for (const lead of overdueLeads) {
      const fromName = lead.assigned_to;

      // Least-loaded active BDA who ISN'T the person who just missed it.
      const backup = bdas.find(
        b => b.name?.trim().toLowerCase() !== fromName.trim().toLowerCase()
      );

      if (!backup) {
        // No other active BDA exists to hand this to — flag it instead
        // of silently leaving it stuck.
        await createNotification({
          type:        "followup_escalation_failed",
          title:       `Needs attention: ${lead.name}`,
          description: `Follow-up for ${lead.name} (${lead.phone}) is overdue and there's no other active BDA to reassign it to.`,
          severity:    "critical",
          lead_id:     lead.id,
          bda_email:   null, // broadcast
        });
        continue;
      }

      // Reassign. Give it a fresh "today" follow-up date so the backup
      // BDA sees it immediately instead of it looking overdue for work
      // they never had a chance to do.
      await pool.query(
        `UPDATE leads SET assigned_to = $1, snooze_until = NOW() WHERE id = $2`,
        [backup.name, lead.id]
      );

      // Audit trail: visible in the lead's follow-up history.
      await pool.query(
        `INSERT INTO followups (lead_id, note, status, next_followup)
         VALUES ($1, $2, $3, NOW())`,
        [
          lead.id,
          `Auto-reassigned from ${fromName} to ${backup.name}: follow-up was overdue by more than ${ESCALATION_GRACE_DAYS} day(s).`,
          lead.status || null,
        ]
      );

      // Keep this BDA's running load count accurate for the rest of
      // this run, so back-to-back reassignments in the same batch
      // don't all pile onto the same person.
      backup.active_lead_count = Number(backup.active_lead_count || 0) + 1;
      bdas.sort((a, b) => a.active_lead_count - b.active_lead_count);

      const fromEmail = (
        await pool.query(
          `SELECT email FROM users
           WHERE REGEXP_REPLACE(LOWER(TRIM(name)), '\\s+', ' ', 'g') =
                 REGEXP_REPLACE(LOWER(TRIM($1)), '\\s+', ' ', 'g')
           LIMIT 1`,
          [fromName]
        )
      ).rows[0]?.email || null;

      await createNotification({
        type:        "followup_escalated",
        title:       `Lead reassigned: ${lead.name}`,
        description: `You missed the follow-up for ${lead.name} (${lead.phone}) — it has been reassigned to ${backup.name}.`,
        severity:    "critical",
        lead_id:     lead.id,
        bda_email:   fromEmail,
      });

      await createNotification({
        type:        "followup_escalated_incoming",
        title:       `New lead assigned: ${lead.name}`,
        description: `${lead.name} (${lead.phone}) was reassigned to you — the previous follow-up with ${fromName} was missed.`,
        severity:    "warn",
        lead_id:     lead.id,
        bda_email:   backup.email,
      });

      escalated++;
    }

    console.log(`✅ Escalation job done: ${escalated} lead(s) reassigned`);
    return { escalated };
  } catch (err) {
    console.error("❌ Escalation job error:", err.message);
    return { escalated: 0, error: err.message };
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