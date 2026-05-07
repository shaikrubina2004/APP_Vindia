const pool = require("../config/db");
const axios = require("axios");

const VERIFY_TOKEN = "vindia_meta_verify";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const { notifyNewLead } = require("./bdaNotificationsController");

exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
};

exports.receiveLeads = async (req, res) => {
  try {
    console.log("📥 Meta lead received:", JSON.stringify(req.body, null, 2));

    // ✅ Handle Meta's test ping
    if (req.body.object === undefined || req.body.entry === undefined) {
      console.log("📌 Test ping received from Meta");
      return res.status(200).json({ success: true });
    }

    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value || !value.leadgen_id) {
      console.log("⚠️ No leadgen_id found");
      return res.status(200).json({ success: true });
    }

    const leadgen_id = value.leadgen_id;
    console.log("🔍 Fetching lead ID:", leadgen_id);

    // ✅ Skip fake test IDs
    if (leadgen_id === "444444444444" || leadgen_id.startsWith("4444")) {
      console.log("🧪 Test lead detected - skipping Graph API call");
      return res.status(200).json({ success: true });
    }

    const metaRes = await axios.get(
      `https://graph.facebook.com/v19.0/${leadgen_id}`,
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
          fields: "field_data,created_time"
        }
      }
    );

    const fieldData = metaRes.data.field_data;
    console.log("📋 Field data:", JSON.stringify(fieldData, null, 2));

    const getValue = (name) => {
      const field = fieldData.find(
        (f) => f.name.toLowerCase().includes(name.toLowerCase())
      );
      return field?.values?.[0] || null;
    };

    const firstName = getValue("first_name") || "";
    const lastName  = getValue("last_name") || "";
    const fullName  = getValue("full_name") ||
                      `${firstName} ${lastName}`.trim() ||
                      "Meta Lead";
    const phone     = getValue("phone") || getValue("phone_number") || "";
    const email     = getValue("email") || "";
    const city      = getValue("city") || "";

    const result = await pool.query(
  `INSERT INTO leads (name, phone, email, source, status, assigned_to, city, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
   RETURNING id`,
  [fullName, phone, email, "Meta Ads", "New", "Unassigned", city]
);

notifyNewLead({
  leadId: result.rows[0].id,
  name:   fullName,
  source: "Meta Ads",
  phone:  phone,
}).catch(console.error);

    console.log("✅ Real lead saved:", fullName, phone, email);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Meta webhook error:", error.response?.data || error.message);
    return res.status(500).json({ success: false });
  }
};