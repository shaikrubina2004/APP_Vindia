const pool = require("../config/db");
const XLSX = require("xlsx");
const path = require("path");
const fs   = require("fs");

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
      pool.query(
        `SELECT status, COUNT(*) as count FROM leads
         WHERE deleted_by_admin=false ${dateFilter}
         GROUP BY status ORDER BY count DESC`, vals),
      pool.query(
        `SELECT source, COUNT(*) as count FROM leads
         WHERE deleted_by_admin=false ${dateFilter}
         GROUP BY source ORDER BY count DESC`, vals),
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
══════════════════════════════════════ */
exports.userPerformance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(assigned_to, 'Unassigned') AS bda_name,
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
   SOURCE PERFORMANCE
══════════════════════════════════════ */
exports.sourcePerformance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(source, 'Unknown') AS source,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE LOWER(status)='converted') AS converted,
         ROUND(
           COUNT(*) FILTER (WHERE LOWER(status)='converted') * 100.0
           / NULLIF(COUNT(*), 0), 1
         ) AS conversion_rate
       FROM leads
       WHERE deleted_by_admin = false
       GROUP BY source
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
    if (source)      { conditions.push(`l.source = $${n++}`); vals.push(source); }
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
   EXPORT TO EXCEL
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
    if (source)      { conditions.push(`source = $${n++}`); vals.push(source); }
    if (assigned_to) { conditions.push(`assigned_to = $${n++}`); vals.push(assigned_to); }

    const { rows } = await pool.query(
      `SELECT name, phone, email, city, source, status, assigned_to,
              building_type, floors, budget, description, created_at
       FROM leads WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      vals
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Report");

    const buffer = XLSX.write(wb, { type:"buffer", bookType:"xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=leads-report-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ error: "Export failed" });
  }
};