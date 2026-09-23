// backend/controllers/digitalMarketingNotificationsController.js
// Mirrors the existing bdaNotificationsController pattern, scoped to
// digital_marketing_notifications so the BDA notification system is untouched.
const pool = require("../config/db");

async function createNotification({ type, title, message, lead_id = null, campaign_id = null }) {
  await pool.query(
    `INSERT INTO digital_marketing_notifications (type, title, message, lead_id, campaign_id, is_read, created_at)
     VALUES ($1,$2,$3,$4,$5,false,NOW())`,
    [type, title, message, lead_id, campaign_id]
  );
}
exports.createNotification = createNotification;

/* GET /api/dm-notifications */
exports.getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM digital_marketing_notifications ORDER BY created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* PATCH /api/dm-notifications/:id/read */
exports.markRead = async (req, res) => {
  try {
    await pool.query("UPDATE digital_marketing_notifications SET is_read = true WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* PATCH /api/dm-notifications/read-all */
exports.markAllRead = async (req, res) => {
  try {
    await pool.query("UPDATE digital_marketing_notifications SET is_read = true WHERE is_read = false");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* Trigger: a lead came in attributed to a campaign */
exports.notifyNewMarketingLead = async ({ leadId, name, campaignId, campaignName }) => {
  try {
    await createNotification({
      type: "new_marketing_lead",
      title: `New lead via ${campaignName || "a campaign"}`,
      message: `${name || "A new lead"} came in through ${campaignName || "a tracked campaign"}.`,
      lead_id: leadId,
      campaign_id: campaignId || null,
    });
  } catch (err) {
    console.error("notifyNewMarketingLead error:", err.message);
  }
};

/* Trigger: campaign status transitions (started / completed) */
exports.notifyCampaignEvent = async ({ campaignId, campaignName, event }) => {
  const titles = {
    started: `Campaign started: ${campaignName}`,
    completed: `Campaign completed: ${campaignName}`,
  };
  if (!titles[event]) return;
  try {
    await createNotification({
      type: `campaign_${event}`,
      title: titles[event],
      message: `"${campaignName}" is now ${event}.`,
      campaign_id: campaignId,
    });
  } catch (err) {
    console.error("notifyCampaignEvent error:", err.message);
  }
};

/* Trigger: spend approaching/exceeding budget */
exports.notifyBudgetWarning = async ({ campaignId, campaignName, spend, budget }) => {
  if (!budget || budget <= 0) return;
  const pct = (spend / budget) * 100;
  if (pct < 90) return;
  try {
    await createNotification({
      type: "campaign_budget_warning",
      title: `Budget alert: ${campaignName}`,
      message: `"${campaignName}" has used ${pct.toFixed(0)}% of its budget (₹${spend} of ₹${budget}).`,
      campaign_id: campaignId,
    });
  } catch (err) {
    console.error("notifyBudgetWarning error:", err.message);
  }
};