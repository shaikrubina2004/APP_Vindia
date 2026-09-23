// backend/controllers/marketingDashboardController.js
// Aggregated, real (non-hardcoded) statistics for the Digital Marketing role.
const pool = require("../config/db");

async function handleDbError(res, err, fallbackMsg = "Something went wrong") {
  console.error("[Marketing Dashboard DB Error]", err.code, err.message);
  res.status(500).json({ error: err.message || fallbackMsg });
}

/* ══════════════════════════════════════
   GET /api/marketing/dashboard
══════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalLeads, newLeads, converted, bySource, byMonth,
      byStatus, byBuilding, byCity, campaignAgg, spendAgg, followUpStats,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM leads WHERE deleted_by_admin = false`),
      pool.query(`SELECT COUNT(*)::int AS c FROM leads WHERE deleted_by_admin = false AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*)::int AS c FROM leads WHERE deleted_by_admin = false AND LOWER(status) = 'converted'`),
      pool.query(`SELECT COALESCE(source,'Manual') AS label, COUNT(*)::int AS value FROM leads WHERE deleted_by_admin = false GROUP BY label ORDER BY value DESC`),
      pool.query(`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS value FROM leads WHERE deleted_by_admin = false GROUP BY month ORDER BY month DESC LIMIT 12`),
      pool.query(`SELECT COALESCE(status,'New') AS label, COUNT(*)::int AS value FROM leads WHERE deleted_by_admin = false GROUP BY label ORDER BY value DESC`),
      pool.query(`SELECT building_type AS label, COUNT(*)::int AS value FROM leads WHERE deleted_by_admin = false AND building_type IS NOT NULL GROUP BY label`),
      pool.query(`SELECT city AS label, COUNT(*)::int AS value FROM leads WHERE deleted_by_admin = false AND city IS NOT NULL GROUP BY label ORDER BY value DESC LIMIT 5`),
      pool.query(`
        SELECT c.id, c.name, c.platform, c.status,
               COALESCE(cnt.lead_count,0)::int AS leads,
               COALESCE(cnt.conversions,0)::int AS conversions
        FROM marketing_campaigns c
        LEFT JOIN (
          SELECT campaign_id, COUNT(*) AS lead_count,
                 COUNT(*) FILTER (WHERE LOWER(status)='converted') AS conversions
          FROM leads WHERE deleted_by_admin = false AND campaign_id IS NOT NULL
          GROUP BY campaign_id
        ) cnt ON cnt.campaign_id = c.id
        ORDER BY leads DESC
      `),
      pool.query(`SELECT COALESCE(SUM(spend),0)::numeric AS total_spend, COALESCE(SUM(budget),0)::numeric AS total_budget FROM marketing_campaigns`),
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE DATE(next_followup) = CURRENT_DATE)::int AS due_today,
          COUNT(*) FILTER (WHERE DATE(next_followup) < CURRENT_DATE)::int AS overdue
        FROM followups f
        JOIN leads l ON l.id = f.lead_id
        WHERE l.deleted_by_admin = false
      `),
    ]);

    const total = totalLeads.rows[0].c;
    const convertedCount = converted.rows[0].c;
    const conversionRate = total > 0 ? +((convertedCount / total) * 100).toFixed(1) : 0;

    const totalSpend = parseFloat(spendAgg.rows[0].total_spend) || 0;
    const campaignLeadsTotal = campaignAgg.rows.reduce((s, r) => s + r.leads, 0);
    const campaignConversionsTotal = campaignAgg.rows.reduce((s, r) => s + r.conversions, 0);
    const costPerLead = campaignLeadsTotal > 0 ? +(totalSpend / campaignLeadsTotal).toFixed(2) : 0;
    const roi = totalSpend > 0
      ? +(((campaignConversionsTotal * 1) - totalSpend) / totalSpend * 100).toFixed(1) // relative ROI, needs revenue-per-lead to be exact
      : null;

    res.json({
      success: true,
      totalLeads: total,
      newLeadsToday: newLeads.rows[0].c,
      convertedLeads: convertedCount,
      conversionRate,
      marketingSpend: totalSpend,
      costPerLead,
      campaignLeads: campaignLeadsTotal,
      campaignConversions: campaignConversionsTotal,
      roiNote: "ROI shown is spend-vs-conversions based; connect revenue-per-lead for a precise ROI.",
      roi,
      leadSources: bySource.rows,
      monthlyTrend: byMonth.rows.reverse(),
      leadStatus: byStatus.rows,
      buildingType: byBuilding.rows,
      topCities: byCity.rows,
      campaigns: campaignAgg.rows,
      followUps: followUpStats.rows[0],
    });
  } catch (err) {
    handleDbError(res, err, "Failed to load marketing dashboard");
  }
};

/* ══════════════════════════════════════
   GET /api/marketing/reports
   Filterable by date range, campaign, platform, source
══════════════════════════════════════ */
exports.getReports = async (req, res) => {
  try {
    const { from, to, campaign_id, platform, source } = req.query;
    const clauses = ["l.deleted_by_admin = false"];
    const vals = [];

    if (from) { vals.push(from); clauses.push(`l.created_at >= $${vals.length}`); }
    if (to) { vals.push(to); clauses.push(`l.created_at <= $${vals.length}`); }
    if (campaign_id) { vals.push(campaign_id); clauses.push(`l.campaign_id = $${vals.length}`); }
    if (platform) { vals.push(platform); clauses.push(`l.platform = $${vals.length}`); }
    if (source) { vals.push(source); clauses.push(`l.source = $${vals.length}`); }

    const where = `WHERE ${clauses.join(" AND ")}`;

    const [bySource, byCampaign, convBySource, convByCampaign, monthlyLeads, monthlyConversions] = await Promise.all([
      pool.query(`SELECT COALESCE(source,'Manual') AS label, COUNT(*)::int AS value FROM leads l ${where} GROUP BY label ORDER BY value DESC`, vals),
      pool.query(`
        SELECT c.name AS label, COUNT(l.id)::int AS value
        FROM leads l JOIN marketing_campaigns c ON c.id = l.campaign_id
        ${where} GROUP BY c.name ORDER BY value DESC`, vals),
      pool.query(`SELECT COALESCE(source,'Manual') AS label, COUNT(*)::int AS value FROM leads l ${where} AND LOWER(l.status)='converted' GROUP BY label ORDER BY value DESC`, vals),
      pool.query(`
        SELECT c.name AS label, COUNT(l.id)::int AS value
        FROM leads l JOIN marketing_campaigns c ON c.id = l.campaign_id
        ${where} AND LOWER(l.status)='converted' GROUP BY c.name ORDER BY value DESC`, vals),
      pool.query(`SELECT TO_CHAR(l.created_at,'YYYY-MM') AS month, COUNT(*)::int AS value FROM leads l ${where} GROUP BY month ORDER BY month`, vals),
      pool.query(`SELECT TO_CHAR(l.converted_at,'YYYY-MM') AS month, COUNT(*)::int AS value FROM leads l ${where} AND l.converted_at IS NOT NULL GROUP BY month ORDER BY month`, vals),
    ]);

    const spendRes = await pool.query(`SELECT COALESCE(SUM(spend),0)::numeric AS spend FROM marketing_campaigns` + (campaign_id ? ` WHERE id = $1` : ``), campaign_id ? [campaign_id] : []);
    const totalLeadsRes = await pool.query(`SELECT COUNT(*)::int AS c FROM leads l ${where}`, vals);

    const spend = parseFloat(spendRes.rows[0].spend) || 0;
    const leadsCount = totalLeadsRes.rows[0].c;
    const costPerLead = leadsCount > 0 ? +(spend / leadsCount).toFixed(2) : 0;

    res.json({
      success: true,
      leadsBySource: bySource.rows,
      leadsByCampaign: byCampaign.rows,
      conversionsBySource: convBySource.rows,
      conversionsByCampaign: convByCampaign.rows,
      monthlyLeads: monthlyLeads.rows,
      monthlyConversions: monthlyConversions.rows,
      marketingSpend: spend,
      costPerLead,
      totalLeads: leadsCount,
    });
  } catch (err) {
    handleDbError(res, err, "Failed to build report");
  }
};