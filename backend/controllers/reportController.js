const pool = require("../config/db");
const XLSX = require("xlsx");

/* ══════════════════════════════════════
   REPORT OVERVIEW — summary stats
══════════════════════════════════════ */
exports.reportOverview = async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = "";
    const vals = [];

    if (from && to) {
      dateFilter = `AND created_at BETWEEN $1 AND $2`;
      vals.push(from, to);
    }

    const [total, converted, byStatus, bySource, monthly] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM leads WHERE deleted_by_admin=false ${dateFilter}`, vals),
      pool.query(`SELECT COUNT(*) FROM leads WHERE LOWER(status)='converted' AND deleted_by_admin=false ${dateFilter}`, vals),
      // ← INITCAP normalizes "new" and "New" into one group
      pool.query(
        `SELECT INITCAP(LOWER(status)) AS status, COUNT(*) as count FROM leads
         WHERE deleted_by_admin=false ${dateFilter}
         GROUP BY INITCAP(LOWER(status)) ORDER BY count DESC`, vals),
      // ← INITCAP normalizes "meta" and "Meta" into one group
      pool.query(
        `SELECT INITCAP(LOWER(source)) AS source, COUNT(*) as count FROM leads
         WHERE deleted_by_admin=false ${dateFilter}
         GROUP BY INITCAP(LOWER(source)) ORDER BY count DESC`, vals),
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE LOWER(status)='converted') AS converted
         FROM leads WHERE deleted_by_admin=false
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at) ASC
         LIMIT 12`),
    ]);

    res.json({
      totalLeads:     parseInt(total.rows[0].count),
      convertedLeads: parseInt(converted.rows[0].count),
      conversionRate: total.rows[0].count > 0
        ? ((converted.rows[0].count / total.rows[0].count) * 100).toFixed(1)
        : "0.0",
      byStatus:  byStatus.rows,
      bySource:  bySource.rows,
      monthly:   monthly.rows,
    });
  } catch (err) {
    console.error("Report overview error:", err.message);
    res.status(500).json({ error: "Failed to load report overview" });
  }
};

/* ══════════════════════════════════════
   BDA PERFORMANCE — per assigned_to
   Excludes NULL/Unassigned rows
══════════════════════════════════════ */
exports.userPerformance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         assigned_to AS bda_name,
         COUNT(*) AS total_leads,
         COUNT(*) FILTER (WHERE LOWER(status)='converted')  AS converted,
         COUNT(*) FILTER (WHERE LOWER(status)='interested') AS interested,
         COUNT(*) FILTER (WHERE LOWER(status)='follow up')  AS followups,
         COUNT(*) FILTER (WHERE LOWER(status)='junk')       AS junk,
         ROUND(
           COUNT(*) FILTER (WHERE LOWER(status)='converted') * 100.0
           / NULLIF(COUNT(*), 0), 1
         ) AS conversion_rate
       FROM leads
       WHERE deleted_by_admin = false
         AND assigned_to IS NOT NULL
         AND TRIM(assigned_to) != ''
       GROUP BY assigned_to
       ORDER BY converted DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("User performance error:", err.message);
    res.status(500).json({ error: "Failed to fetch performance report" });
  }
};

/* ══════════════════════════════════════
   SOURCE PERFORMANCE — normalized casing
══════════════════════════════════════ */
exports.sourcePerformance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         INITCAP(LOWER(COALESCE(source, 'Unknown'))) AS source,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE LOWER(status)='converted') AS converted,
         ROUND(
           COUNT(*) FILTER (WHERE LOWER(status)='converted') * 100.0
           / NULLIF(COUNT(*), 0), 1
         ) AS conversion_rate
       FROM leads
       WHERE deleted_by_admin = false
       GROUP BY INITCAP(LOWER(COALESCE(source, 'Unknown')))
       ORDER BY total DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("Source performance error:", err.message);
    res.status(500).json({ error: "Failed to fetch source report" });
  }
};

/* ══════════════════════════════════════
   RECENT LEADS REPORT (filtered)
══════════════════════════════════════ */
exports.getLeadsReport = async (req, res) => {
  try {
    const { from, to, status, source, assigned_to } = req.query;
    const conditions = ["l.deleted_by_admin = false"];
    const vals = [];
    let n = 1;

    if (from)        { conditions.push(`l.created_at >= $${n++}`); vals.push(from); }
    if (to)          { conditions.push(`l.created_at <= $${n++}`); vals.push(to + " 23:59:59"); }
    if (status)      { conditions.push(`LOWER(l.status) = LOWER($${n++})`); vals.push(status); }
    if (source)      { conditions.push(`LOWER(l.source) = LOWER($${n++})`); vals.push(source); }
    if (assigned_to) { conditions.push(`l.assigned_to = $${n++}`); vals.push(assigned_to); }

    const { rows } = await pool.query(
      `SELECT l.*,
         (SELECT COUNT(*) FROM followups f WHERE f.lead_id = l.id) AS followup_count,
         (SELECT MAX(f.created_at) FROM followups f WHERE f.lead_id = l.id) AS last_followup
       FROM leads l
       WHERE ${conditions.join(" AND ")}
       ORDER BY l.created_at DESC
       LIMIT 200`,
      vals
    );
    res.json({ leads: rows });
  } catch (err) {
    console.error("Leads report error:", err.message);
    res.status(500).json({ error: "Failed to fetch leads report" });
  }
};

/* ══════════════════════════════════════
   EXPORT ALL LEADS TO EXCEL
══════════════════════════════════════ */
exports.exportReports = async (req, res) => {
  try {
    const { from, to, status, source, assigned_to } = req.query;
    const conditions = ["deleted_by_admin = false"];
    const vals = [];
    let n = 1;

    if (from)        { conditions.push(`created_at >= $${n++}`); vals.push(from); }
    if (to)          { conditions.push(`created_at <= $${n++}`); vals.push(to + " 23:59:59"); }
    if (status)      { conditions.push(`LOWER(status) = LOWER($${n++})`); vals.push(status); }
    if (source)      { conditions.push(`LOWER(source) = LOWER($${n++})`); vals.push(source); }
    if (assigned_to) { conditions.push(`assigned_to = $${n++}`); vals.push(assigned_to); }

    const { rows } = await pool.query(
      `SELECT name, phone, email, city,
              INITCAP(LOWER(source)) AS source,
              INITCAP(LOWER(status)) AS status,
              assigned_to, building_type, floors, budget, description, created_at
       FROM leads WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      vals
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Leads");
    const buffer = XLSX.write(wb, { type:"buffer", bookType:"xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=all-leads-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ error: "Export failed" });
  }
};

/* ══════════════════════════════════════
   EXPORT BDA PERFORMANCE REPORT
   NEW endpoint → GET /api/reports/export-bda-performance
══════════════════════════════════════ */
exports.exportBDAPerformance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         assigned_to                                                          AS "BDA Name",
         COUNT(*)                                                             AS "Total Leads",
         COUNT(*) FILTER (WHERE LOWER(status)='converted')                   AS "Converted",
         COUNT(*) FILTER (WHERE LOWER(status)='interested')                  AS "Interested",
         COUNT(*) FILTER (WHERE LOWER(status)='follow up')                   AS "Follow-ups",
         COUNT(*) FILTER (WHERE LOWER(status)='not interested')              AS "Not Interested",
         COUNT(*) FILTER (WHERE LOWER(status)='junk')                        AS "Junk",
         ROUND(
           COUNT(*) FILTER (WHERE LOWER(status)='converted') * 100.0
           / NULLIF(COUNT(*), 0), 1
         )                                                                    AS "Conversion Rate (%)"
       FROM leads
       WHERE deleted_by_admin = false
         AND assigned_to IS NOT NULL
         AND TRIM(assigned_to) != ''
       GROUP BY assigned_to
       ORDER BY "Converted" DESC`
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BDA Performance");
    const buffer = XLSX.write(wb, { type:"buffer", bookType:"xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=bda-performance-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("BDA export error:", err.message);
    res.status(500).json({ error: "BDA export failed" });
  }
};