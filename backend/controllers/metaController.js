// backend/controllers/metaController.js
//
// Facebook + Instagram Lead Ads  ->  leads table.
//
// Flow: Meta POSTs a tiny "leadgen" event -> we verify the signature -> fetch the
// full lead from the Graph API -> insert into `leads` (unassigned, so every BDA
// can see it) -> notify the BDAs.

const crypto = require("crypto");
const axios  = require("axios");
const pool   = require("../config/db");
const { notifyNewLead } = require("./bdaNotificationsController");

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v19.0";
const VERIFY_TOKEN  = () => process.env.META_VERIFY_TOKEN || "vindia_meta_verify";
const PAGE_TOKEN    = () => process.env.PAGE_ACCESS_TOKEN;
const APP_SECRET    = () => process.env.META_APP_SECRET;

/* ── GET /api/meta/webhook : Meta's one-time subscription handshake ── */
exports.verifyWebhook = (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN()) {
    console.log("✅ Meta webhook verified");
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
};

/* ── Signature check (X-Hub-Signature-256 = sha256 HMAC of the raw body) ── */
const signatureOk = (req) => {
  const secret = APP_SECRET();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("❌ META_APP_SECRET is not set - rejecting webhook in production");
      return false;
    }
    console.warn("⚠️  META_APP_SECRET not set - skipping signature check (development only)");
    return true;
  }
  const header = req.get("x-hub-signature-256");
  if (!header || !req.rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ── Graph API: fetch one lead (extra fields first, plain fields as fallback) ── */
const fetchLead = async (leadgenId) => {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}`;
  const token = PAGE_TOKEN();
  try {
    const r = await axios.get(url, {
      params: {
        access_token: token,
        fields: "field_data,created_time,platform,form_id,campaign_name,ad_name,is_organic",
      },
    });
    return r.data;
  } catch (err) {
    // Some extra fields need extra permissions; retry with the always-available ones.
    console.warn("Graph fetch with extended fields failed, retrying basic:", err.response?.data?.error?.message || err.message);
    const r = await axios.get(url, {
      params: { access_token: token, fields: "field_data,created_time" },
    });
    return r.data;
  }
};

const pick = (fieldData, ...names) => {
  for (const name of names) {
    const f = (fieldData || []).find((x) => (x.name || "").toLowerCase().includes(name));
    const v = f?.values?.[0];
    if (v) return String(v).trim();
  }
  return "";
};

const platformLabel = (p) => {
  const v = String(p || "").toLowerCase();
  if (v === "ig" || v.includes("insta")) return "Instagram";
  if (v === "fb" || v.includes("face"))  return "Facebook";
  return "Meta";
};

/* ── Save one lead. Returns "saved" | "duplicate" | "skipped" ── */
const processLead = async (leadgenId, fallbackFormId) => {
  const id = String(leadgenId);

  // Meta's "Test lead" button uses ids that start with 4444 - nothing to fetch.
  if (id.startsWith("4444")) {
    console.log("🧪 Meta test lead - skipped:", id);
    return "skipped";
  }

  // Already stored (Meta retried the delivery)?
  const dup = await pool.query("SELECT 1 FROM leads WHERE leadgen_id = $1", [id]);
  if (dup.rows.length) return "duplicate";

  const lead = await fetchLead(id);
  const fd   = lead.field_data || [];

  const first = pick(fd, "first_name");
  const last  = pick(fd, "last_name");
  const name  = pick(fd, "full_name") || `${first} ${last}`.trim() || "Meta Lead";
  const phone = pick(fd, "phone_number", "phone");
  const email = pick(fd, "email");
  const city  = pick(fd, "city");
  const platform = platformLabel(lead.platform);

  // assigned_to = NULL on purpose: BDAs see leads that are assigned to them OR unassigned.
  // ON CONFLICT covers two deliveries racing each other.
  const result = await pool.query(
    `INSERT INTO leads
       (name, phone, whatsapp, email, city, source, status, assigned_to,
        platform, medium, leadgen_id, meta_form_id, meta_campaign_name, meta_ad_name,
        deleted_by_admin, created_at)
     VALUES ($1,$2,$2,$3,$4,'Meta Ads','New',NULL,$5,'Lead Ad',$6,$7,$8,$9,false,NOW())
     ON CONFLICT (leadgen_id) WHERE leadgen_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      name, phone, email || null, city || null,
      platform, id,
      lead.form_id || fallbackFormId || null,
      lead.campaign_name || null,
      lead.ad_name || null,
    ]
  );
  if (!result.rows.length) return "duplicate";

  console.log(`✅ Meta lead saved (${platform}): ${name} ${phone}`);
  notifyNewLead({
    leadId: result.rows[0].id,
    name,
    source: "Meta Ads",
    phone,
  }).catch((e) => console.error("notifyNewLead failed:", e.message));
  return "saved";
};

/* ── POST /api/meta/webhook : leads arrive here ── */
exports.receiveLeads = async (req, res) => {
  if (!signatureOk(req)) {
    return res.status(403).json({ success: false, message: "Invalid signature" });
  }

  const body = req.body || {};
  // Meta's dashboard test ping / anything that isn't a Page event
  if (!body.object || !Array.isArray(body.entry)) {
    return res.status(200).json({ success: true });
  }

  const counts = { saved: 0, duplicate: 0, skipped: 0, failed: 0 };

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field && change.field !== "leadgen") continue;
      const value = change.value || {};
      if (!value.leadgen_id) continue;
      try {
        const outcome = await processLead(value.leadgen_id, value.form_id);
        counts[outcome] += 1;
      } catch (err) {
        counts.failed += 1;
        console.error(
          `❌ Meta lead ${value.leadgen_id} failed:`,
          err.response?.data?.error?.message || err.response?.data || err.message
        );
      }
    }
  }

  console.log("📥 Meta webhook processed:", JSON.stringify(counts));

  // 500 makes Meta retry later; duplicates are ignored so a retry is safe.
  if (counts.failed > 0) return res.status(500).json({ success: false, ...counts });
  return res.status(200).json({ success: true, ...counts });
};