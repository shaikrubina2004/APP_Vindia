// backend/controllers/campaignController.js
const pool = require("../config/db");
const { notifyCampaignEvent, notifyBudgetWarning } = require("./digitalMarketingNotificationsController");

const VALID_STATUSES = ["draft", "scheduled", "active", "completed", "paused"];

async function handleDbError(res, err, fallbackMsg = "Something went wrong") {
  console.error("[Campaign DB Error]", err.code, err.message);
  res.status(500).json({ error: err.message || fallbackMsg });
}

/* ══════════════════════════════════════
   GET /api/campaigns
   Includes real lead/conversion/CPL metrics
   computed from the leads table (no hardcoding).
══════════════════════════════════════ */
exports.getCampaigns = async (req, res) => {
  try {
    const { status, platform } = req.query;
    const clauses = [];
    const vals = [];

    if (status) { vals.push(status); clauses.push(`c.status = $${vals.length}`); }
    if (platform) { vals.push(platform); clauses.push(`c.platform = $${vals.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
         c.*,
         u.name AS created_by_name,
         COALESCE(l.lead_count, 0)::int AS leads_count,
         COALESCE(l.conversions, 0)::int AS conversions_count,
         CASE WHEN COALESCE(l.lead_count,0) > 0
              THEN ROUND(c.spend / l.lead_count, 2)
              ELSE 0 END AS cost_per_lead,
         CASE WHEN COALESCE(l.conversions,0) > 0
              THEN ROUND(c.spend / l.conversions, 2)
              ELSE 0 END AS cost_per_conversion
       FROM marketing_campaigns c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN (
         SELECT campaign_id,
                COUNT(*) AS lead_count,
                COUNT(*) FILTER (WHERE LOWER(status) = 'converted') AS conversions
         FROM leads
         WHERE deleted_by_admin = false AND campaign_id IS NOT NULL
         GROUP BY campaign_id
       ) l ON l.campaign_id = c.id
       ${where}
       ORDER BY c.created_at DESC`,
      vals
    );

    res.json({ success: true, campaigns: rows });
  } catch (err) {
    handleDbError(res, err, "Failed to fetch campaigns");
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS created_by_name FROM marketing_campaigns c
       LEFT JOIN users u ON u.id = c.created_by WHERE c.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });

    const leadStats = await pool.query(
      `SELECT COUNT(*)::int AS leads,
              COUNT(*) FILTER (WHERE LOWER(status) = 'converted')::int AS conversions
       FROM leads WHERE campaign_id = $1 AND deleted_by_admin = false`,
      [id]
    );

    res.json({ success: true, campaign: rows[0], stats: leadStats.rows[0] });
  } catch (err) {
    handleDbError(res, err, "Failed to fetch campaign");
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const {
      name, platform, campaign_type, start_date, end_date,
      budget, target_audience, status, description, impressions, clicks, spend,
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Campaign name is required" });

    const finalStatus = VALID_STATUSES.includes(status) ? status : "draft";

    const { rows } = await pool.query(
      `INSERT INTO marketing_campaigns
        (name, platform, campaign_type, start_date, end_date, budget, target_audience,
         status, description, impressions, clicks, spend, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        name.trim(), platform || null, campaign_type || null,
        start_date || null, end_date || null, budget || 0,
        target_audience || null, finalStatus, description || null,
        impressions || 0, clicks || 0, spend || 0, userId,
      ]
    );

    res.status(201).json({ success: true, campaign: rows[0] });
  } catch (err) {
    handleDbError(res, err, "Failed to create campaign");
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const before = await pool.query("SELECT status FROM marketing_campaigns WHERE id = $1", [id]);
    const prevStatus = before.rows[0]?.status;

    const fields = [
      "name", "platform", "campaign_type", "start_date", "end_date",
      "budget", "target_audience", "status", "description",
      "impressions", "clicks", "spend",
    ];

    const setClauses = [];
    const vals = [];
    let n = 1;

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === "status" && !VALID_STATUSES.includes(req.body[f])) return;
        setClauses.push(`${f} = $${n++}`);
        vals.push(req.body[f]);
      }
    });

    if (!setClauses.length) return res.status(400).json({ error: "No valid fields to update" });

    setClauses.push(`updated_at = NOW()`);
    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE marketing_campaigns SET ${setClauses.join(", ")} WHERE id = $${n} RETURNING *`,
      vals
    );

    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });
    const campaign = rows[0];

    // Fire-and-forget notifications — never block the response on these.
    if (campaign.status !== prevStatus) {
      if (campaign.status === "active") notifyCampaignEvent({ campaignId: campaign.id, campaignName: campaign.name, event: "started" });
      if (campaign.status === "completed") notifyCampaignEvent({ campaignId: campaign.id, campaignName: campaign.name, event: "completed" });
    }
    if (req.body.spend !== undefined) {
      notifyBudgetWarning({ campaignId: campaign.id, campaignName: campaign.name, spend: parseFloat(campaign.spend) || 0, budget: parseFloat(campaign.budget) || 0 });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    handleDbError(res, err, "Failed to update campaign");
  }
};
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const attributed = await pool.query(
      "SELECT COUNT(*)::int AS c FROM leads WHERE campaign_id = $1", [id]
    );

    if (attributed.rows[0].c > 0) {
      await pool.query(
        "UPDATE marketing_campaigns SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [id]
      );
      return res.json({ success: true, archived: true, message: "Campaign has attributed leads; archived instead of deleted." });
    }

    const result = await pool.query("DELETE FROM marketing_campaigns WHERE id = $1 RETURNING id", [id]);
    if (!result.rows.length) return res.status(404).json({ error: "Campaign not found" });
    res.json({ success: true, deleted: true });
  } catch (err) {
    handleDbError(res, err, "Failed to delete campaign");
  }
};