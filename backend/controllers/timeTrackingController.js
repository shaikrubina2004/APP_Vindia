const pool = require("../config/db");

/* ══════════════════════════════════════
   LOG TIME SPENT ON A LEAD
   POST /api/leads/:leadId/track-time
   Body: { bda_email, bda_name, session_type ("view"|"edit"), duration_sec }
   Max capped at 300 seconds (5 minutes) server-side
══════════════════════════════════════ */
exports.logTimeSpent = async (req, res) => {
  try {
    const { leadId } = req.params;
    let { bda_email, bda_name, session_type, duration_sec } = req.body;

    if (!bda_email || !session_type || !duration_sec) {
      return res.status(400).json({ error: "bda_email, session_type, duration_sec are required" });
    }

    // Cap at 300 seconds (5 minutes) — never record more
    duration_sec = Math.min(Math.round(Number(duration_sec)), 300);
    if (duration_sec <= 0) {
      return res.json({ success: true, skipped: true, reason: "zero duration" });
    }

    await pool.query(
      `INSERT INTO lead_time_tracking (lead_id, bda_email, bda_name, session_type, duration_sec)
       VALUES ($1, $2, $3, $4, $5)`,
      [leadId, bda_email, bda_name || bda_email, session_type, duration_sec]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Track time error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   GET TIME SPENT REPORT
   GET /api/reports/time-spent
   Returns per-lead and per-BDA aggregates
══════════════════════════════════════ */
exports.getTimeSpentReport = async (req, res) => {
  try {
    const { from, to, bda_email } = req.query;

    const conditions = [];
    const vals = [];
    let n = 1;

    if (from)      { conditions.push(`t.tracked_at >= $${n++}`); vals.push(from); }
    if (to)        { conditions.push(`t.tracked_at <= $${n++}`); vals.push(to + " 23:59:59"); }
    if (bda_email) { conditions.push(`t.bda_email = $${n++}`); vals.push(bda_email); }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // ── Per-BDA summary ──
    const bdaSummary = await pool.query(
      `SELECT
         t.bda_email,
         t.bda_name,
         COUNT(DISTINCT t.lead_id)                    AS leads_touched,
         SUM(t.duration_sec)                          AS total_sec,
         ROUND(AVG(t.duration_sec), 1)                AS avg_sec_per_session,
         COUNT(*)                                     AS total_sessions,
         COUNT(*) FILTER (WHERE t.session_type='edit') AS edit_sessions,
         COUNT(*) FILTER (WHERE t.session_type='view') AS view_sessions
       FROM lead_time_tracking t
       ${where}
       GROUP BY t.bda_email, t.bda_name
       ORDER BY total_sec DESC`,
      vals
    );

    // ── Top leads by time spent ──
    const topLeads = await pool.query(
      `SELECT
         t.lead_id,
         l.name   AS lead_name,
         l.phone,
         l.status AS lead_status,
         l.assigned_to,
         SUM(t.duration_sec)  AS total_sec,
         COUNT(*)             AS sessions,
         MAX(t.tracked_at)    AS last_viewed
       FROM lead_time_tracking t
       JOIN leads l ON l.id = t.lead_id
       ${where}
       GROUP BY t.lead_id, l.name, l.phone, l.status, l.assigned_to
       ORDER BY total_sec DESC
       LIMIT 20`,
      vals
    );

    // ── Daily activity trend (last 30 days) ──
    const dailyTrend = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('day', t.tracked_at), 'DD Mon') AS day,
         DATE_TRUNC('day', t.tracked_at)                    AS raw_day,
         SUM(t.duration_sec)                                AS total_sec,
         COUNT(DISTINCT t.lead_id)                          AS leads_touched,
         COUNT(DISTINCT t.bda_email)                        AS active_bdas
       FROM lead_time_tracking t
       WHERE t.tracked_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', t.tracked_at)
       ORDER BY raw_day ASC`
    );

    // ── Session type breakdown ──
    const sessionBreakdown = await pool.query(
      `SELECT
         session_type,
         COUNT(*)             AS sessions,
         SUM(duration_sec)    AS total_sec,
         ROUND(AVG(duration_sec), 1) AS avg_sec
       FROM lead_time_tracking t
       ${where}
       GROUP BY session_type`
    , vals);

    res.json({
      bdaSummary:       bdaSummary.rows,
      topLeads:         topLeads.rows,
      dailyTrend:       dailyTrend.rows,
      sessionBreakdown: sessionBreakdown.rows,
    });
  } catch (err) {
    console.error("Time spent report error:", err.message);
    res.status(500).json({ error: "Failed to fetch time spent report" });
  }
};