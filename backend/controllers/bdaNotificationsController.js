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