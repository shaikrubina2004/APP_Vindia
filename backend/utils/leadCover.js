const pool = require("../config/db");

/* ══════════════════════════════════════════════════════════
   FOLLOW-UP COVER — schema
   An assigned lead NEVER goes back to the unassigned pool.
   When the owner misses a follow-up date, another BDA is asked to "cover"
   it (call the client). The BDA who follows up FIRST keeps the lead:
     • the cover BDA follows up → POST /api/lead-cover/:id/follow-up
       assigns the lead to them (see leadCoverController)
     • the owner follows up first → the trigger below ends the cover and
       the owner simply keeps it

   Triggers (idempotent — safe to run on every start):
     • any follow-up logged on a lead ends its cover
     • reassigning the lead ends its cover
   ══════════════════════════════════════════════════════════ */
let ready = null;

function ensureLeadCoverSchema() {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        ALTER TABLE leads
          ADD COLUMN IF NOT EXISTS cover_email TEXT,
          ADD COLUMN IF NOT EXISTS cover_name  TEXT,
          ADD COLUMN IF NOT EXISTS cover_since TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS cover_count INTEGER NOT NULL DEFAULT 0
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_leads_cover_email ON leads (LOWER(cover_email))`
      );

      // 1) any follow-up logged on a lead ends its cover
      await pool.query(`
        CREATE OR REPLACE FUNCTION leads_clear_cover_on_followup() RETURNS trigger AS $$
        BEGIN
          UPDATE leads
             SET cover_email = NULL, cover_name = NULL, cover_since = NULL
           WHERE id = NEW.lead_id AND cover_email IS NOT NULL;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql
      `);
      await pool.query(`DROP TRIGGER IF EXISTS trg_followup_clears_cover ON followups`);
      await pool.query(`
        CREATE TRIGGER trg_followup_clears_cover
        AFTER INSERT ON followups
        FOR EACH ROW EXECUTE PROCEDURE leads_clear_cover_on_followup()
      `);

      // 2) reassigning the lead ends its cover
      await pool.query(`
        CREATE OR REPLACE FUNCTION leads_clear_cover_on_reassign() RETURNS trigger AS $$
        BEGIN
          NEW.cover_email := NULL; NEW.cover_name := NULL; NEW.cover_since := NULL;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql
      `);
      await pool.query(`DROP TRIGGER IF EXISTS trg_reassign_clears_cover ON leads`);
      await pool.query(`
        CREATE TRIGGER trg_reassign_clears_cover
        BEFORE UPDATE OF assigned_to ON leads
        FOR EACH ROW
        WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
        EXECUTE PROCEDURE leads_clear_cover_on_reassign()
      `);

      console.log("✅ Follow-up cover schema ready");
    })().catch((err) => {
      ready = null;
      console.error("❌ Follow-up cover schema error:", err.message);
      throw err;
    });
  }
  return ready;
}

module.exports = { ensureLeadCoverSchema };