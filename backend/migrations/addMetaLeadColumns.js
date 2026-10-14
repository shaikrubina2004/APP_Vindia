// backend/migrations/addMetaLeadColumns.js
// Run once: node migrations/addMetaLeadColumns.js   (safe to re-run)
//
// Adds the columns the Meta (Facebook / Instagram) Lead Ads webhook needs:
//   leadgen_id         – Meta's unique id for the lead; UNIQUE so retries can't create duplicates
//   meta_form_id       – which lead form it came from
//   meta_campaign_name – campaign / ad names, when Meta returns them
//   meta_ad_name
// (leads.platform and leads.medium already exist from the marketing migration.)

require("dotenv").config();
const pool = require("../config/db");

async function run() {
  try {
    await pool.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS platform           VARCHAR(60),
        ADD COLUMN IF NOT EXISTS medium             VARCHAR(60),
        ADD COLUMN IF NOT EXISTS leadgen_id         TEXT,
        ADD COLUMN IF NOT EXISTS meta_form_id       TEXT,
        ADD COLUMN IF NOT EXISTS meta_campaign_name TEXT,
        ADD COLUMN IF NOT EXISTS meta_ad_name       TEXT;
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_leadgen_id
        ON leads (leadgen_id) WHERE leadgen_id IS NOT NULL;
    `);
    console.log("Meta lead columns ready.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
run();