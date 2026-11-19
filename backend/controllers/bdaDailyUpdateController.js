const pool = require("../config/db");

const IST_TODAY = `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`;

/* How leads are linked to a BDA across the app: leads.assigned_to holds the
   user's name or email (see BDAAddLead). Match either, case-insensitively.
   Unassigned leads (NULL) are NOT counted for anyone. */
const MATCH = `LOWER(l.assigned_to) IN (LOWER($1), LOWER($2))`;

async function getUser(id) {
  const { rows } = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [id]
  );
  return rows[0];
}

/* ── Auto-calculated counts for ONE bda, for today (IST) ─────────── */
async function computeStats(user) {
  const p = [user.name || "", user.email || ""];
  const n = (r) => parseInt(r.rows[0].count, 10) || 0;

  const [added, qualified, converted, deleted, done, tomorrow, overdue] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM leads l
          WHERE ${MATCH} AND l.deleted_by_admin = false`,
        p
      ),
      // Qualified today = lead created today as Interested/Qualified, or a
      // follow-up logged today that marked it Interested/Qualified.
      pool.query(
        `SELECT COUNT(*) FROM (
           SELECT l.id FROM leads l
            WHERE ${MATCH} AND l.deleted_by_admin = false
              AND LOWER(l.status) IN ('interested','qualified')
              AND (l.created_at AT TIME ZONE 'Asia/Kolkata')::date = ${IST_TODAY}
           UNION
           SELECT l.id FROM followups f JOIN leads l ON l.id = f.lead_id
            WHERE ${MATCH} AND l.deleted_by_admin = false
              AND LOWER(f.status) IN ('interested','qualified')
              AND (f.created_at AT TIME ZONE 'Asia/Kolkata')::date = ${IST_TODAY}
         ) q`,
        p
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads l
          WHERE ${MATCH} AND l.deleted_by_admin = false
            AND l.converted_at IS NOT NULL
            AND (l.converted_at AT TIME ZONE 'Asia/Kolkata')::date = ${IST_TODAY}`,
        p
      ),
      // Deleted = leads this BDA sent to junk today (admin may have already
      // removed them, so no deleted_by_admin filter here).
      pool.query(
        `SELECT COUNT(*) FROM leads l
          WHERE ${MATCH} AND l.junk_requested_at IS NOT NULL
            AND (l.junk_requested_at AT TIME ZONE 'Asia/Kolkata')::date = ${IST_TODAY}`,
        p
      ),
      pool.query(
        `SELECT COUNT(*) FROM followups f JOIN leads l ON l.id = f.lead_id
          WHERE ${MATCH} AND l.deleted_by_admin = false
            AND (f.created_at AT TIME ZONE 'Asia/Kolkata')::date = ${IST_TODAY}`,
        p
      ),
      pool.query(
        `SELECT COUNT(*) FROM followups f JOIN leads l ON l.id = f.lead_id
          WHERE ${MATCH} AND l.deleted_by_admin = false
            AND DATE(f.next_followup) = ${IST_TODAY} + 1`,
        p
      ),
      // Same "overdue" definition the BDA dashboard already uses.
      pool.query(
        `SELECT COUNT(*) FROM followups f JOIN leads l ON l.id = f.lead_id
          WHERE ${MATCH} AND l.deleted_by_admin = false
            AND DATE(f.next_followup) < ${IST_TODAY}`,
        p
      ),
    ]);

  return {
    leads_added: n(added),
    leads_qualified: n(qualified),
    leads_converted: n(converted),
    leads_deleted: n(deleted),
    followups_done: n(done),
    followups_due_tomorrow: n(tomorrow),
    followups_overdue: n(overdue),
  };
}

const int = (v) => Math.max(0, parseInt(v, 10) || 0);
const num = (v) => Math.max(0, Number(v) || 0);

/* GET /api/bda-daily-updates/stats  → live auto counts for logged-in BDA */
exports.getStats = async (req, res) => {
  try {
    const user = await getUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, data: await computeStats(user) });
  } catch (err) {
    console.error("BDA stats error:", err.message);
    res.status(500).json({ message: "Failed to load stats" });
  }
};

/* GET /api/bda-daily-updates/today → today's saved update (or null) */
exports.getToday = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bda_daily_updates
        WHERE submitted_by = $1 AND date = ${IST_TODAY}`,
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: "Failed to load today's update" });
  }
};

/* POST /api/bda-daily-updates → submit/resubmit today's update.
   The 7 auto fields are IGNORED from the request body and recomputed here. */
exports.submit = async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.summary || "").trim()) {
      return res.status(400).json({ message: "Summary of the day is required" });
    }
    const user = await getUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const s = await computeStats(user);

    const status = ["on-track", "attention", "critical"].includes(b.overall_status)
      ? b.overall_status
      : "on-track";

    const { rows } = await pool.query(
      `INSERT INTO bda_daily_updates
         (submitted_by, date,
          leads_added, leads_qualified, leads_converted, leads_deleted,
          calls_made, emails_sent, meetings_held, proposals_sent,
          followups_done, followups_due_tomorrow, followups_overdue,
          pipeline_value, key_opportunity, overall_status,
          summary, highlights, issues, plan_tomorrow, updated_at)
       VALUES ($1, ${IST_TODAY}, $2,$3,$4,$5, $6,$7,$8,$9, $10,$11,$12,
               $13,$14,$15, $16,$17,$18,$19, NOW())
       ON CONFLICT (submitted_by, date) DO UPDATE SET
         leads_added=EXCLUDED.leads_added, leads_qualified=EXCLUDED.leads_qualified,
         leads_converted=EXCLUDED.leads_converted, leads_deleted=EXCLUDED.leads_deleted,
         calls_made=EXCLUDED.calls_made, emails_sent=EXCLUDED.emails_sent,
         meetings_held=EXCLUDED.meetings_held, proposals_sent=EXCLUDED.proposals_sent,
         followups_done=EXCLUDED.followups_done,
         followups_due_tomorrow=EXCLUDED.followups_due_tomorrow,
         followups_overdue=EXCLUDED.followups_overdue,
         pipeline_value=EXCLUDED.pipeline_value, key_opportunity=EXCLUDED.key_opportunity,
         overall_status=EXCLUDED.overall_status, summary=EXCLUDED.summary,
         highlights=EXCLUDED.highlights, issues=EXCLUDED.issues,
         plan_tomorrow=EXCLUDED.plan_tomorrow, updated_at=NOW()
       RETURNING *`,
      [
        req.user.id,
        s.leads_added, s.leads_qualified, s.leads_converted, s.leads_deleted,
        int(b.calls_made), int(b.emails_sent), int(b.meetings_held), int(b.proposals_sent),
        s.followups_done, s.followups_due_tomorrow, s.followups_overdue,
        num(b.pipeline_value), b.key_opportunity || null, status,
        String(b.summary).trim(), b.highlights || null, b.issues || null,
        b.plan_tomorrow || null,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("BDA submit error:", err.message);
    res.status(500).json({ message: "Failed to submit daily update" });
  }
};

/* POST /api/bda-daily-updates/other-report */
exports.submitOther = async (req, res) => {
  try {
    const { title, details } = req.body || {};
    if (!String(title || "").trim() || !String(details || "").trim()) {
      return res.status(400).json({ message: "Title and details are required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO bda_other_reports (submitted_by, title, details)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, String(title).trim(), String(details).trim()]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Failed to send report" });
  }
};

/* GET /api/bda-daily-updates/mine → own history (daily updates) */
exports.getMine = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bda_daily_updates WHERE submitted_by = $1
        ORDER BY date DESC LIMIT 30`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
};

/* GET /api/bda-daily-updates → CEO inbox (daily updates + other reports) */
exports.getAllForCeo = async (req, res) => {
  try {
    const [daily, other] = await Promise.all([
      pool.query(
        `SELECT d.*, u.name AS bda_name FROM bda_daily_updates d
           JOIN users u ON u.id = d.submitted_by
          ORDER BY d.date DESC, d.updated_at DESC LIMIT 200`
      ),
      pool.query(
        `SELECT r.*, u.name AS bda_name FROM bda_other_reports r
           JOIN users u ON u.id = r.submitted_by
          ORDER BY r.created_at DESC LIMIT 200`
      ),
    ]);
    res.json({ success: true, data: { daily: daily.rows, other: other.rows } });
  } catch (err) {
    res.status(500).json({ message: "Failed to load updates" });
  }
};