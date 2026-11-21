const pool = require("../config/db");

/* ════════════════════════════════════════════════════════════════
   Reports & Analytics — CEO view of the BDA team
   (replaces the overview / user-performance / source-performance /
    time-spent handlers; exports stay in reportController.js)
════════════════════════════════════════════════════════════════ */

/* Role codes that mean "BDA" — same list as utils/leadAssignment.js.
   Matches roles.code OR the normalised roles.name; skips deactivated users. */
const BDA_CODES_SQL = `('bda','bda1','bda2','business_development','business_development_analyst')`;
const BDA_ROLE_SQL = `(LOWER(r.code) IN ${BDA_CODES_SQL}
                       OR LOWER(REPLACE(TRIM(r.name), ' ', '_')) IN ${BDA_CODES_SQL})
                      AND COALESCE(LOWER(u.status), 'active')
                          NOT IN ('inactive','disabled','suspended','terminated','deleted')`;

/* Statuses that count as junk / rejected lead */
const JUNK_STATUS_SQL = `('junk','junk_requested','delete_requested')`;
/* Statuses that count as a QUALIFIED (good quality) lead */
const QUALIFIED_STATUS_SQL = `('interested','follow up','converted')`;

const toInt = (v) => parseInt(v, 10) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a * 1000) / b) / 10 : 0);

/* Build WHERE pieces for the leads table from query-string filters */
function leadFilters(q, opts = {}) {
  const {
    alias = "l",
    useStatus = true,
    useSource = true,
    useAssigned = true,
    includeDeleted = false,
  } = opts;
  const cond = [];
  const vals = [];

  if (!includeDeleted) cond.push(`${alias}.deleted_by_admin = false`);
  if (q.from) {
    vals.push(q.from);
    cond.push(`${alias}.created_at >= $${vals.length}`);
  }
  if (q.to) {
    vals.push(q.to + " 23:59:59");
    cond.push(`${alias}.created_at <= $${vals.length}`);
  }
  if (useStatus && q.status) {
    vals.push(q.status);
    cond.push(`LOWER(${alias}.status) = LOWER($${vals.length})`);
  }
  if (useSource && q.source) {
    vals.push(q.source);
    cond.push(`LOWER(TRIM(${alias}.source)) = LOWER(TRIM($${vals.length}))`);
  }
  if (useAssigned && q.assigned_to) {
    vals.push(q.assigned_to);
    const n = vals.length;
    // leads are assigned by BDA name (or email) — match either
    cond.push(
      `(LOWER(TRIM(${alias}.assigned_to)) = LOWER(TRIM($${n}))
        OR LOWER(TRIM(${alias}.assigned_to)) IN
           (SELECT LOWER(TRIM(u.email)) FROM users u
             WHERE LOWER(TRIM(u.name)) = LOWER(TRIM($${n}))))`
    );
  }
  return { cond, vals };
}

const whereOf = (cond) => (cond.length ? "WHERE " + cond.join(" AND ") : "");

/* ══════════════════════════════════════
   FILTER OPTIONS  GET /reports/filter-options
   Every BDA user (even with 0 leads) + every source seen in leads
══════════════════════════════════════ */
exports.filterOptions = async (req, res) => {
  try {
    const [bdas, sources] = await Promise.all([
      pool.query(
        `SELECT TRIM(u.name) AS name, TRIM(u.email) AS email
           FROM users u JOIN roles r ON r.id = u.role_id
          WHERE ${BDA_ROLE_SQL}
          ORDER BY u.name ASC`
      ),
      pool.query(
        `SELECT DISTINCT LOWER(TRIM(source)) AS key
           FROM leads
          WHERE source IS NOT NULL AND TRIM(source) <> ''
          ORDER BY 1`
      ),
    ]);
    res.json({
      bdas: bdas.rows,
      sources: sources.rows.map((s) => ({
        key: s.key,
        label: s.key.replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    });
  } catch (err) {
    console.error("Filter options error:", err.message);
    res.status(500).json({ error: "Failed to load filter options" });
  }
};

/* ══════════════════════════════════════
   OVERVIEW  GET /reports/overview
   Honors from / to / status / source / assigned_to
══════════════════════════════════════ */
exports.reportOverview = async (req, res) => {
  try {
    const { cond, vals } = leadFilters(req.query);
    const where = whereOf(cond);

    const [total, converted, byStatus, bySource, monthly] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM leads l ${where}`, vals),
      pool.query(
        `SELECT COUNT(*) FROM leads l ${where ? where + " AND" : "WHERE"}
           LOWER(l.status) = 'converted'`,
        vals
      ),
      pool.query(
        `SELECT INITCAP(LOWER(l.status)) AS status, COUNT(*) AS count
           FROM leads l ${where}
          GROUP BY INITCAP(LOWER(l.status)) ORDER BY count DESC`,
        vals
      ),
      pool.query(
        `SELECT INITCAP(LOWER(l.source)) AS source, COUNT(*) AS count
           FROM leads l ${where}
          GROUP BY INITCAP(LOWER(l.source)) ORDER BY count DESC`,
        vals
      ),
      // last 12 months that have data, oldest → newest
      pool.query(
        `SELECT month, total, converted FROM (
           SELECT TO_CHAR(DATE_TRUNC('month', l.created_at), 'Mon YYYY') AS month,
                  DATE_TRUNC('month', l.created_at) AS raw,
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE LOWER(l.status)='converted') AS converted
             FROM leads l ${where}
            GROUP BY DATE_TRUNC('month', l.created_at)
            ORDER BY raw DESC LIMIT 12
         ) x ORDER BY raw ASC`,
        vals
      ),
    ]);

    const t = toInt(total.rows[0].count);
    const c = toInt(converted.rows[0].count);
    res.json({
      totalLeads: t,
      convertedLeads: c,
      conversionRate: t > 0 ? ((c / t) * 100).toFixed(1) : "0.0",
      byStatus: byStatus.rows,
      bySource: bySource.rows,
      monthly: monthly.rows,
    });
  } catch (err) {
    console.error("Report overview error:", err.message);
    res.status(500).json({ error: "Failed to load report overview" });
  }
};

/* ══════════════════════════════════════
   BDA PERFORMANCE  GET /reports/user-performance
   Starts from the BDA *users*, so a BDA with no leads still appears.
   Honors from / to / source / assigned_to.
══════════════════════════════════════ */
exports.userPerformance = async (req, res) => {
  try {
    const { cond, vals } = leadFilters(req.query, {
      useStatus: false,
      useAssigned: false,
    });

    let personFilter = "";
    if (req.query.assigned_to) {
      vals.push(req.query.assigned_to);
      personFilter = `WHERE LOWER(TRIM(p.bda_name)) = LOWER(TRIM($${vals.length}))`;
    }

    const { rows } = await pool.query(
      `WITH bdas AS (
         SELECT TRIM(u.name) AS bda_name,
                LOWER(TRIM(u.name))  AS k1,
                LOWER(TRIM(u.email)) AS k2
           FROM users u JOIN roles r ON r.id = u.role_id
          WHERE ${BDA_ROLE_SQL}
       ),
       extra AS (   -- assigned_to values that aren't a BDA user (kept so nothing is hidden)
         SELECT DISTINCT ON (LOWER(TRIM(l.assigned_to)))
                TRIM(l.assigned_to) AS bda_name,
                LOWER(TRIM(l.assigned_to)) AS k1,
                NULL::text AS k2
           FROM leads l
          WHERE l.deleted_by_admin = false
            AND l.assigned_to IS NOT NULL AND TRIM(l.assigned_to) <> ''
            AND LOWER(TRIM(l.assigned_to)) NOT IN (SELECT k1 FROM bdas)
            AND LOWER(TRIM(l.assigned_to)) NOT IN (SELECT k2 FROM bdas WHERE k2 IS NOT NULL)
          ORDER BY LOWER(TRIM(l.assigned_to))
       ),
       people AS (SELECT * FROM bdas UNION ALL SELECT * FROM extra)
       SELECT
         p.bda_name,
         COUNT(l.id) AS total_leads,
         COUNT(l.id) FILTER (WHERE LOWER(l.status)='converted')  AS converted,
         COUNT(l.id) FILTER (WHERE LOWER(l.status)='interested') AS interested,
         COUNT(l.id) FILTER (WHERE LOWER(l.status)='follow up')  AS followups,
         COUNT(l.id) FILTER (WHERE LOWER(l.status) IN ${JUNK_STATUS_SQL}) AS junk,
         COALESCE(ROUND(
           COUNT(l.id) FILTER (WHERE LOWER(l.status)='converted') * 100.0
           / NULLIF(COUNT(l.id), 0), 1), 0) AS conversion_rate
       FROM people p
       LEFT JOIN leads l
              ON LOWER(TRIM(l.assigned_to)) IN (p.k1, p.k2)
             ${cond.length ? "AND " + cond.join(" AND ") : ""}
       ${personFilter}
       GROUP BY p.bda_name
       ORDER BY converted DESC, total_leads DESC, p.bda_name ASC`,
      vals
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("User performance error:", err.message);
    res.status(500).json({ error: "Failed to fetch performance report" });
  }
};

/* ══════════════════════════════════════
   SOURCE SPEND (money put into each source, per month)
══════════════════════════════════════ */
let spendTableReady = null;
function ensureSpendTable() {
  if (!spendTableReady) {
    spendTableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS lead_source_spend (
           id         SERIAL PRIMARY KEY,
           source_key TEXT NOT NULL,
           month      DATE NOT NULL,
           amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
           created_at TIMESTAMP DEFAULT NOW(),
           updated_at TIMESTAMP DEFAULT NOW(),
           UNIQUE (source_key, month)
         )`
      )
      .catch((e) => {
        spendTableReady = null;
        throw e;
      });
  }
  return spendTableReady;
}

exports.getSourceSpend = async (req, res) => {
  try {
    await ensureSpendTable();
    const { rows } = await pool.query(
      `SELECT id, source_key, TO_CHAR(month, 'YYYY-MM') AS month, amount
         FROM lead_source_spend
        ORDER BY lead_source_spend.month DESC, source_key ASC
        LIMIT 60`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("Get spend error:", err.message);
    res.status(500).json({ error: "Failed to load spend" });
  }
};

exports.saveSourceSpend = async (req, res) => {
  try {
    await ensureSpendTable();
    const { source, month, amount } = req.body || {};
    const key = String(source || "").trim().toLowerCase();
    const amt = Number(amount);
    if (!key) return res.status(400).json({ error: "Source is required" });
    if (!/^\d{4}-\d{2}$/.test(String(month || "")))
      return res.status(400).json({ error: "Month must be YYYY-MM" });
    if (!Number.isFinite(amt) || amt < 0)
      return res.status(400).json({ error: "Amount must be 0 or more" });

    const { rows } = await pool.query(
      `INSERT INTO lead_source_spend (source_key, month, amount)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (source_key, month)
       DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()
       RETURNING id`,
      [key, `${month}-01`, amt]
    );
    res.status(201).json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("Save spend error:", err.message);
    res.status(500).json({ error: "Failed to save spend" });
  }
};

exports.deleteSourceSpend = async (req, res) => {
  try {
    await ensureSpendTable();
    await pool.query("DELETE FROM lead_source_spend WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete spend entry" });
  }
};

/* ══════════════════════════════════════
   SOURCE ANALYSIS  GET /reports/source-performance
   Per source: volume, QUALITY, JUNK, conversion and COST.
   Honors from / to / assigned_to.
   Includes leads later deleted as junk (otherwise junk would be hidden).
══════════════════════════════════════ */
exports.sourcePerformance = async (req, res) => {
  try {
    await ensureSpendTable();

    const { cond, vals } = leadFilters(req.query, {
      useStatus: false,
      useSource: false,
      includeDeleted: true,
    });

    const { rows } = await pool.query(
      `SELECT
         LOWER(COALESCE(NULLIF(TRIM(l.source), ''), 'unknown')) AS source_key,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE l.deleted_by_admin = false
                            AND LOWER(l.status) IN ${QUALIFIED_STATUS_SQL}) AS qualified,
         COUNT(*) FILTER (WHERE l.deleted_by_admin = false
                            AND LOWER(l.status) = 'converted') AS converted,
         COUNT(*) FILTER (WHERE l.deleted_by_admin = false
                            AND LOWER(l.status) = 'interested') AS hot,
         COUNT(*) FILTER (WHERE l.deleted_by_admin = false
                            AND LOWER(l.status) = 'follow up') AS warm,
         COUNT(*) FILTER (WHERE l.deleted_by_admin = true
                            OR LOWER(l.status) IN ${JUNK_STATUS_SQL}) AS junk
       FROM leads l
       ${whereOf(cond)}
       GROUP BY 1`,
      vals
    );

    /* Spend is per SOURCE (not per BDA) → not meaningful when a BDA is chosen */
    const costAvailable = !req.query.assigned_to;
    const spendMap = {};
    if (costAvailable) {
      const sv = [];
      const sc = [];
      if (req.query.from) {
        sv.push(req.query.from);
        sc.push(`month >= DATE_TRUNC('month', $${sv.length}::date)`);
      }
      if (req.query.to) {
        sv.push(req.query.to);
        sc.push(`month <= DATE_TRUNC('month', $${sv.length}::date)`);
      }
      const sp = await pool.query(
        `SELECT source_key, SUM(amount) AS spend
           FROM lead_source_spend
           ${sc.length ? "WHERE " + sc.join(" AND ") : ""}
          GROUP BY source_key`,
        sv
      );
      sp.rows.forEach((r) => (spendMap[r.source_key] = Number(r.spend)));
    }

    const merged = {};
    rows.forEach((r) => {
      merged[r.source_key] = {
        total: toInt(r.total),
        qualified: toInt(r.qualified),
        converted: toInt(r.converted),
        hot: toInt(r.hot),
        warm: toInt(r.warm),
        junk: toInt(r.junk),
      };
    });
    // a source with spend but no leads in the period is still worth showing
    Object.keys(spendMap).forEach((k) => {
      if (!merged[k]) merged[k] = { total: 0, qualified: 0, converted: 0, hot: 0, warm: 0, junk: 0 };
    });

    const data = Object.entries(merged)
      .map(([key, m]) => {
        const spend = spendMap[key] || 0;
        return {
          source_key: key,
          source: key.replace(/\b\w/g, (c) => c.toUpperCase()),
          total: m.total,
          qualified: m.qualified,
          converted: m.converted,
          hot: m.hot,    // status Interested
          warm: m.warm,  // status Follow Up
          junk: m.junk,
          // everything else that isn't junk: New, Contacted, Not Interested
          cool: Math.max(m.total - m.qualified - m.junk, 0),
          other: Math.max(m.total - m.qualified - m.junk, 0),
          qualified_rate: pct(m.qualified, m.total),
          conversion_rate: pct(m.converted, m.total),
          junk_rate: pct(m.junk, m.total),
          spend,
          cost_per_lead: spend > 0 && m.total > 0 ? Math.round(spend / m.total) : null,
          cost_per_qualified:
            spend > 0 && m.qualified > 0 ? Math.round(spend / m.qualified) : null,
          cost_per_conversion:
            spend > 0 && m.converted > 0 ? Math.round(spend / m.converted) : null,
        };
      })
      .sort((a, b) => b.total - a.total);

    res.json({ data, costAvailable });
  } catch (err) {
    console.error("Source performance error:", err.message);
    res.status(500).json({ error: "Failed to fetch source report" });
  }
};

/* ══════════════════════════════════════
   TIME SPENT  GET /reports/time-spent
   Time a BDA keeps a lead open (details = "view", edit window = "edit").
   Each session is capped at 5 min when recorded (ignores idle tabs).
   CEO's own browsing is excluded.
══════════════════════════════════════ */
exports.getTimeSpentReport = async (req, res) => {
  try {
    const { from, to, bda_email } = req.query;
    const conditions = [
      `LOWER(t.bda_email) NOT IN (
         SELECT LOWER(u.email) FROM users u
           JOIN roles r ON r.id = u.role_id
          WHERE u.email IS NOT NULL
            AND (LOWER(r.code) = 'ceo' OR LOWER(TRIM(r.name)) = 'ceo'))`,
    ];
    const vals = [];
    if (from) {
      vals.push(from);
      conditions.push(`t.tracked_at >= $${vals.length}`);
    }
    if (to) {
      vals.push(to + " 23:59:59");
      conditions.push(`t.tracked_at <= $${vals.length}`);
    }
    if (bda_email) {
      vals.push(bda_email);
      conditions.push(`LOWER(t.bda_email) = LOWER($${vals.length})`);
    }
    const where = "WHERE " + conditions.join(" AND ");

    const [bdaSummary, totals, topLeads] = await Promise.all([
      pool.query(
        `SELECT
           t.bda_email,
           MAX(t.bda_name)                         AS bda_name,
           COUNT(DISTINCT t.lead_id)               AS leads_engaged,
           SUM(t.duration_sec)                     AS total_sec,
           COALESCE(SUM(t.duration_sec) FILTER (WHERE t.session_type='view'), 0) AS review_sec,
           COALESCE(SUM(t.duration_sec) FILTER (WHERE t.session_type='edit'), 0) AS update_sec,
           COUNT(*)                                AS sessions,
           ROUND(SUM(t.duration_sec)::numeric
                 / NULLIF(COUNT(DISTINCT t.lead_id), 0), 0) AS avg_sec_per_lead
         FROM lead_time_tracking t
         ${where}
         GROUP BY t.bda_email
         ORDER BY total_sec DESC`,
        vals
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT t.lead_id)        AS leads_engaged,
           COALESCE(SUM(t.duration_sec), 0) AS total_sec,
           COUNT(DISTINCT t.bda_email)      AS active_bdas
         FROM lead_time_tracking t ${where}`,
        vals
      ),
      pool.query(
        `SELECT
           t.lead_id,
           l.name   AS lead_name,
           l.phone,
           l.status AS lead_status,
           t.bda_email,
           MAX(t.bda_name)   AS bda_name,
           SUM(t.duration_sec) AS total_sec,
           COUNT(*)          AS sessions,
           MAX(t.tracked_at) AS last_worked
         FROM lead_time_tracking t
         JOIN leads l ON l.id = t.lead_id
         ${where}
         GROUP BY t.lead_id, l.name, l.phone, l.status, t.bda_email
         ORDER BY total_sec DESC
         LIMIT 15`,
        vals
      ),
    ]);

    res.json({
      bdaSummary: bdaSummary.rows,
      totals: totals.rows[0],
      topLeads: topLeads.rows,
    });
  } catch (err) {
    console.error("Time spent report error:", err.message);
    res.status(500).json({ error: "Failed to fetch time spent report" });
  }
};