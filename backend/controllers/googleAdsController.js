const crypto = require("crypto");
const pool   = require("../config/db");
const { notifyNewLead } = require("./bdaNotificationsController");

/* ══════════════════════════════════════════════════════════════════
   GOOGLE ADS + YOUTUBE ADS  →  LEADS   (same idea as metaController)

   Google Ads lead-form assets can POST every new lead to a webhook.
   YouTube video campaigns use the very same lead-form asset, so ONE
   receiver serves both — the URL decides the source:

     POST /api/google-ads/webhook            → source "Google Ads"
     POST /api/google-ads/webhook/youtube    → source "YouTube Ads"

   (Optional) If one lead form is shared, list the YouTube campaign IDs
   in .env as YOUTUBE_CAMPAIGN_IDS=123,456 and those leads are tagged
   "YouTube Ads" even on the plain /webhook URL.

   .env
     GOOGLE_ADS_WEBHOOK_KEY=<long random secret — same value you type
                             into the lead form in Google Ads>
     YOUTUBE_CAMPAIGN_IDS=            (optional)
     GOOGLE_ADS_SAVE_TEST_LEADS=true  (optional — saves Google's
                                       "Send test data" lead, marked [TEST])
══════════════════════════════════════════════════════════════════ */

const WEBHOOK_KEY      = process.env.GOOGLE_ADS_WEBHOOK_KEY || "";
const YT_CAMPAIGN_IDS  = (process.env.YOUTUBE_CAMPAIGN_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const SAVE_TEST_LEADS  = String(process.env.GOOGLE_ADS_SAVE_TEST_LEADS || "").toLowerCase() === "true";

/* constant-time string compare (so the key can't be guessed by timing) */
const safeEqual = (a, b) => {
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/* Google sends E.164 (+919539314504); the rest of the app stores plain
   10-digit Indian numbers, so searching / WhatsApp links keep working. */
const cleanPhone = (raw) => {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  d = d.slice(1);
  return d;
};

/* value of the first user_column_data entry whose column_id matches */
const pick = (cols, ...ids) => {
  for (const id of ids) {
    const hit = cols.find(c => String(c.column_id || "").toUpperCase() === id);
    const v = hit && (hit.string_value ?? hit.value);
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const KNOWN_IDS = new Set([
  "FULL_NAME", "FIRST_NAME", "LAST_NAME", "EMAIL", "WORK_EMAIL",
  "PHONE_NUMBER", "WORK_PHONE", "CITY",
]);

const sourceFor = (channel, body) => {
  if (channel === "youtube") return "YouTube Ads";
  if (YT_CAMPAIGN_IDS.includes(String(body.campaign_id || ""))) return "YouTube Ads";
  return "Google Ads";
};

/* GET /api/google-ads/webhook  — handy "is my tunnel / server reachable?" check */
exports.health = (_req, res) =>
  res.status(200).json({ ok: true, service: "Google Ads / YouTube Ads lead webhook" });

/* POST /api/google-ads/webhook[/youtube] */
exports.receiveLead = async (req, res) => {
  try {
    const body    = req.body || {};
    const channel = (req.params.channel || "").toLowerCase();

    if (channel && channel !== "youtube" && channel !== "google")
      return res.status(404).json({ error: "Unknown channel" });

    // 1) The server must have a key configured, otherwise anyone could post leads
    if (!WEBHOOK_KEY) {
      console.error("❌ GOOGLE_ADS_WEBHOOK_KEY is not set in .env — refusing lead");
      return res.status(503).json({ error: "Webhook not configured" });
    }

    // 2) Is it really Google? (google_key must equal the key typed into the lead form)
    if (!safeEqual(body.google_key, WEBHOOK_KEY)) {
      console.warn("⚠️ Google Ads webhook: wrong google_key — rejected");
      return res.status(401).json({ error: "Invalid key" });
    }

    // 3) "Send test data" button in Google Ads
    if (body.is_test && !SAVE_TEST_LEADS) {
      console.log("🧪 Google Ads test lead received — key OK, not saved");
      return res.status(200).json({ success: true, test: true });
    }

    const cols   = Array.isArray(body.user_column_data) ? body.user_column_data : [];
    const source = sourceFor(channel, body);

    const first = pick(cols, "FIRST_NAME");
    const last  = pick(cols, "LAST_NAME");
    let name = pick(cols, "FULL_NAME") || `${first} ${last}`.trim()
               || (source === "YouTube Ads" ? "YouTube Lead" : "Google Lead");
    if (body.is_test) name = `[TEST] ${name}`;

    const phone = cleanPhone(pick(cols, "PHONE_NUMBER", "WORK_PHONE"));
    const email = pick(cols, "EMAIL", "WORK_EMAIL");
    const city  = pick(cols, "CITY");

    if (!phone && !email) {
      // Nothing to call or write to — keep a log, don't create an empty lead
      console.warn("⚠️ Google Ads lead without phone/email skipped:", body.lead_id);
      return res.status(200).json({ success: true, skipped: true });
    }

    // Everything else the customer answered (custom questions, postal code …)
    // goes into the description, one answer per line.
    const extras = cols
      .filter(c => !KNOWN_IDS.has(String(c.column_id || "").toUpperCase()))
      .map(c => {
        const v = String(c.string_value ?? c.value ?? "").trim();
        const q = String(c.column_name || c.column_id || "").trim();
        return v ? `${q}: ${v}` : "";
      })
      .filter(Boolean);
    const description = extras.length ? extras.join("\n") : null;

    const { rows } = await pool.query(
      `INSERT INTO leads
         (name, phone, whatsapp, email, city, source, status, description,
          external_lead_id, ad_campaign_id, ad_gclid, deleted_by_admin, created_at)
       VALUES ($1,$2,$2,$3,$4,$5,'New',$6,$7,$8,$9,false,NOW())
       ON CONFLICT (source, external_lead_id) WHERE external_lead_id IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [
        name, phone || null, email || null, city || null, source, description,
        body.lead_id ? String(body.lead_id) : null,
        body.campaign_id ? String(body.campaign_id) : null,
        body.gcl_id ? String(body.gcl_id) : null,
      ]
    );

    // Google retries a delivery it thinks failed — same lead_id = already saved
    if (!rows.length) {
      console.log("↩️ Duplicate Google Ads lead ignored:", body.lead_id);
      return res.status(200).json({ success: true, duplicate: true });
    }

    // Unassigned → every BDA + CEO is notified (exactly like a Meta lead)
    notifyNewLead({ leadId: rows[0].id, name, source, phone })
      .catch(e => console.error("Notify new lead error:", e.message));

    console.log(`✅ ${source} lead saved:`, name, phone || email);
    return res.status(200).json({ success: true });
  } catch (err) {
    // 500 → Google will try to deliver again later
    console.error("❌ Google Ads webhook error:", err.message);
    return res.status(500).json({ success: false });
  }
};