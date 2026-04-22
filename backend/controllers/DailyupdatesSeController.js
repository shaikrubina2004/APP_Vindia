// ══════════════════════════════════════════════════════════════════════════════
//  dailyUpdatesController.js
//  Handles all SE Daily Report CRUD + check-in + approve
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create table on startup ──────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS se_daily_reports (
        id             SERIAL       PRIMARY KEY,
        project_name   VARCHAR(255),
        date           DATE         NOT NULL,
        overall_status VARCHAR(50)  NOT NULL DEFAULT 'on-track',
        submitted_by   VARCHAR(255)          DEFAULT 'Structural Engineer',
        data           JSONB                 DEFAULT '{}',
        approved       BOOLEAN               DEFAULT FALSE,
        created_at     TIMESTAMP             DEFAULT NOW(),
        updated_at     TIMESTAMP             DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_se_daily_date     ON se_daily_reports (date);
      CREATE INDEX IF NOT EXISTS idx_se_daily_approved ON se_daily_reports (approved);
    `);
    console.log("✅ se_daily_reports table ready");
  } catch (err) {
    console.error("❌ se_daily_reports table setup failed:", err.message);
  }
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRow(r) {
  return {
    id:       r.id,
    approved: r.approved,
    date:     r.date ? r.date.toISOString().split("T")[0] : null,
    data: {
      ...(r.data || {}),
      date: r.date ? r.date.toISOString().split("T")[0] : null,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL  —  GET /api/se-daily-reports
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, project_name, date, overall_status, submitted_by, data, approved
       FROM se_daily_reports
       ORDER BY date DESC`
    );
    res.json(result.rows.map(formatRow));
  } catch (err) {
    console.error("getAllReports:", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE  —  GET /api/se-daily-reports/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM se_daily_reports WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(formatRow(result.rows[0]));
  } catch (err) {
    console.error("getReportById:", err.message);
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/se-daily-reports
//  Upserts by date so check-in and log filing both work safely
// ══════════════════════════════════════════════════════════════════════════════
exports.createReport = async (req, res) => {
  try {
    const {
      project_name   = "",
      date,
      overall_status = "on-track",
      submitted_by   = "Structural Engineer",
      data           = {},
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    // Check for existing record on the same date
    const existing = await pool.query(
      "SELECT id, data FROM se_daily_reports WHERE date = $1",
      [date]
    );

    if (existing.rows.length > 0) {
      // Merge new data into existing record (don't overwrite checkIn if already set)
      const existingData  = existing.rows[0].data || {};
      const mergedData    = { ...existingData, ...data };

      // Preserve existing checkIn if new request doesn't have one
      if (existingData.checkIn && !data.checkIn) {
        mergedData.checkIn = existingData.checkIn;
      }

      const result = await pool.query(
        `UPDATE se_daily_reports
         SET project_name   = COALESCE(NULLIF($1,''), project_name),
             overall_status = $2,
             submitted_by   = COALESCE(NULLIF($3,''), submitted_by),
             data           = $4,
             updated_at     = NOW()
         WHERE id = $5
         RETURNING id, date, approved`,
        [project_name, overall_status, submitted_by, JSON.stringify(mergedData), existing.rows[0].id]
      );
      const r = result.rows[0];
      return res.status(200).json({
        message:  "Report updated",
        id:       r.id,
        date:     r.date ? r.date.toISOString().split("T")[0] : null,
        approved: r.approved,
      });
    }

    // Insert new
    const result = await pool.query(
      `INSERT INTO se_daily_reports (project_name, date, overall_status, submitted_by, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, date, approved`,
      [project_name, date, overall_status, submitted_by, JSON.stringify(data)]
    );
    const r = result.rows[0];
    res.status(201).json({
      message:  "Report created",
      id:       r.id,
      date:     r.date ? r.date.toISOString().split("T")[0] : null,
      approved: r.approved,
    });
  } catch (err) {
    console.error("createReport:", err.message);
    res.status(500).json({ error: "Failed to save report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE  —  PUT /api/se-daily-reports/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name, date, overall_status, submitted_by, data } = req.body;

    const result = await pool.query(
      `UPDATE se_daily_reports
       SET project_name   = COALESCE($1, project_name),
           date           = COALESCE($2, date),
           overall_status = COALESCE($3, overall_status),
           submitted_by   = COALESCE($4, submitted_by),
           data           = COALESCE($5, data),
           updated_at     = NOW()
       WHERE id = $6
       RETURNING id, date, approved`,
      [project_name, date, overall_status, submitted_by,
       data ? JSON.stringify(data) : null, id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    const r = result.rows[0];
    res.json({
      message:  "Report updated",
      id:       r.id,
      date:     r.date ? r.date.toISOString().split("T")[0] : null,
      approved: r.approved,
    });
  } catch (err) {
    console.error("updateReport:", err.message);
    res.status(500).json({ error: "Failed to update report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  APPROVE  —  PUT /api/se-daily-reports/approve/:id
//  ⚠️  This route MUST be registered BEFORE /:id in the router
// ══════════════════════════════════════════════════════════════════════════════
exports.approveReport = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE se_daily_reports
       SET approved = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, approved`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ message: "Report approved", id: result.rows[0].id });
  } catch (err) {
    console.error("approveReport:", err.message);
    res.status(500).json({ error: "Failed to approve report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/se-daily-reports/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteReport = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM se_daily_reports WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ message: "Report deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("deleteReport:", err.message);
    res.status(500).json({ error: "Failed to delete report" });
  }
};