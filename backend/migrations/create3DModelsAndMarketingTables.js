// backend/migrations/create3DModelsAndMarketingTables.js
// Run once: node migrations/create3DModelsAndMarketingTables.js
require("dotenv").config();
const pool = require("../config/db");

async function run() {
  try {
    console.log("Creating 3D Visualizer + Digital Marketing tables...");

    /* ── 3D MODELS ─────────────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS three_d_models (
        id                 SERIAL PRIMARY KEY,
        title              VARCHAR(255) NOT NULL,
        description        TEXT,
        project_id         INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        drawing_id         INTEGER REFERENCES architect_drawings(id) ON DELETE SET NULL,
        created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_name          VARCHAR(255),
        file_url           VARCHAR(500),
        file_type          VARCHAR(20),
        file_size          BIGINT,
        version            INTEGER DEFAULT 1,
        status             VARCHAR(30) DEFAULT 'draft',
        notes              TEXT,
        architect_feedback TEXT,
        reviewed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at         TIMESTAMPTZ DEFAULT NOW(),
        submitted_at       TIMESTAMPTZ,
        reviewed_at        TIMESTAMPTZ
      );
    `);
    console.log("three_d_models ready");

    // Version/revision history so "view model history" has real data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS three_d_model_versions (
        id           SERIAL PRIMARY KEY,
        model_id     INTEGER NOT NULL REFERENCES three_d_models(id) ON DELETE CASCADE,
        version      INTEGER NOT NULL,
        file_name    VARCHAR(255),
        file_url     VARCHAR(500),
        file_type    VARCHAR(20),
        status       VARCHAR(30),
        note         TEXT,
        created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("three_d_model_versions ready");

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dmodels_status ON three_d_models(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dmodels_created_by ON three_d_models(created_by);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dmodels_project ON three_d_models(project_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dmodels_drawing ON three_d_models(drawing_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_3dmodel_versions_model ON three_d_model_versions(model_id);`);

    /* ── MARKETING CAMPAIGNS ───────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(255) NOT NULL,
        platform         VARCHAR(60),
        campaign_type    VARCHAR(60),
        start_date       DATE,
        end_date         DATE,
        budget           NUMERIC(14,2) DEFAULT 0,
        spend            NUMERIC(14,2) DEFAULT 0,
        target_audience  VARCHAR(255),
        status           VARCHAR(30) DEFAULT 'draft',
        description      TEXT,
        impressions      BIGINT DEFAULT 0,
        clicks           BIGINT DEFAULT 0,
        created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("marketing_campaigns ready");

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON marketing_campaigns(platform);`);

    /* ── LEAD ATTRIBUTION (extend existing leads table) ───── */
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES marketing_campaigns(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS platform VARCHAR(60);`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS medium VARCHAR(60);`);
    console.log("leads table extended with campaign_id / platform / medium");
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);`);

    /* ── DIGITAL MARKETING NOTIFICATIONS (mirrors bda pattern) ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS digital_marketing_notifications (
        id           SERIAL PRIMARY KEY,
        type         VARCHAR(60) NOT NULL,
        title        VARCHAR(255) NOT NULL,
        message      TEXT,
        lead_id      INTEGER,
        campaign_id  INTEGER REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        is_read      BOOLEAN DEFAULT false,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("digital_marketing_notifications ready");

    console.log("✅ All 3D Visualizer + Digital Marketing tables ready.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

run();