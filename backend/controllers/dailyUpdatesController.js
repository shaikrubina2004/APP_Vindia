const pool = require("../config/db");
const { notifyCEO } = require("./ceoNotificationsController");

// /api/daily-reports (Project Manager) and /api/se-daily-reports (Structural
// Engineer) both route through this same controller and the same
// daily_reports table — but the table had no column distinguishing which
// role a row belonged to, so both tabs would eventually show identical data.
// source_role fixes that; it's added here (self-healing) so no manual
// migration step is needed. Existing rows are left NULL and are treated as
// "project_manager" below, matching createReport's old default of
// submitted_by: "Project Manager".
(async () => {
  try {
    await pool.query(`
      ALTER TABLE daily_reports
        ADD COLUMN IF NOT EXISTS source_role VARCHAR(50) DEFAULT NULL;
    `);
  } catch (err) {
    console.error("daily_reports.source_role setup failed:", err.message);
  }
})();

/* =========================================================
   ➕ CREATE MANUAL REPORT (PM or others)
========================================================= */
exports.createReport = async (req, res) => {
  try {
    const {
      project_name,
      date,
      phase,
      overall_status,
      submitted_by,
      submission_time,
      data
    } = req.body;

    if (!project_name || !date) {
      return res.status(400).json({ error: "project_name and date are required" });
    }

    // req.reportRole is set by the mounting route (dailyUpdatesRoutes.js ->
    // "project_manager", seDailyupdatesRoutes.js -> "structural_engineer") so
    // a single shared controller can still tell the two sources apart.
    const sourceRole = req.reportRole || "project_manager";

    const result = await pool.query(
      `INSERT INTO daily_reports
      (project_name, date, phase, overall_status, submitted_by, submission_time, data, approved, source_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
      RETURNING *`,
      [
        project_name,
        date,
        phase || null,
        overall_status || "on-track",
        submitted_by || (sourceRole === "structural_engineer" ? "Structural Engineer" : "Project Manager"),
        submission_time || null,
        JSON.stringify(data || {}),
        sourceRole,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ error: "Failed to create report" });
  }
};

/* =========================================================
   📋 GET ALL REPORTS
   Scoped by req.reportRole (set by the mounting route) so
   /api/daily-reports (Project Manager) and /api/se-daily-reports
   (Structural Engineer) return their own reports instead of a shared
   unfiltered table.

   This used to also re-query site_engineer_daily_updates and merge
   Site Engineer diary rows in here — that query selected a column
   (labour_total) that doesn't exist on that table, so every call to
   either endpoint failed with a 500. It was also the wrong place for
   diary data in the first place: the Site Engineer's Daily Diary is
   already served correctly by its own endpoint (GET /api/diary/review),
   which the "Site Engineer" tab in the PM dashboard already uses — so
   diary entries don't belong merged into the PM's or the Structural
   Engineer's own report list, and the block has been removed rather
   than patched.
========================================================= */
exports.getAllReports = async (req, res) => {
  try {
    const sourceRole = req.reportRole || "project_manager";

    // Legacy rows created before source_role existed are NULL — treat those
    // as Project Manager reports (createReport's old default), so nothing
    // that was already saved disappears from that tab.
    const result =
      sourceRole === "project_manager"
        ? await pool.query(
            `SELECT * FROM daily_reports
             WHERE source_role = $1 OR source_role IS NULL
             ORDER BY date DESC`,
            [sourceRole]
          )
        : await pool.query(
            `SELECT * FROM daily_reports
             WHERE source_role = $1
             ORDER BY date DESC`,
            [sourceRole]
          );

    const reports = result.rows.map(r => ({
      ...r,
      data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    }));

    res.status(200).json(reports);

  } catch (error) {
    console.error("FETCH ERROR:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

/* =========================================================
   🔍 GET REPORT BY ID
========================================================= */
exports.getReportById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM daily_reports WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = result.rows[0];

    report.data =
      typeof report.data === "string"
        ? JSON.parse(report.data)
        : report.data;

    res.status(200).json(report);

  } catch (error) {
    console.error("GET BY ID ERROR:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

/* =========================================================
   ✅ APPROVE REPORT
========================================================= */
exports.approveReport = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE daily_reports
       SET approved = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("APPROVE ERROR:", error);
    res.status(500).json({ error: "Failed to approve report" });
  }
};

/* =========================================================
   ✏️ UPDATE REPORT
========================================================= */
exports.updateReport = async (req, res) => {
  const { id } = req.params;

  const {
    project_name,
    date,
    phase,
    overall_status,
    submitted_by,
    submission_time,
    data
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE daily_reports
       SET project_name = $1,
           date = $2,
           phase = $3,
           overall_status = $4,
           submitted_by = $5,
           submission_time = $6,
           data = $7
       WHERE id = $8
       RETURNING *`,
      [
        project_name,
        date,
        phase,
        overall_status,
        submitted_by,
        submission_time,
        JSON.stringify(data || {}),
        id
      ]
    );

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
};

/* =========================================================
   ❌ DELETE REPORT
========================================================= */
exports.deleteReport = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM daily_reports WHERE id = $1`,
      [id]
    );

    res.status(200).json({ message: "Deleted successfully" });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
};

/* =========================================================
   📤 SEND A PM DAILY REPORT TO THE CEO
   PUT /api/daily-reports/send-to-ceo/:id   (login required)
========================================================= */
exports.sendToCeo = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE daily_reports
       SET sent_to_ceo = TRUE, sent_to_ceo_at = NOW()
       WHERE id = $1
       RETURNING id, project_name, phase, overall_status, submitted_by, sent_to_ceo, sent_to_ceo_at`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Report not found" });

    const r = rows[0];
    await notifyCEO({
      type: "daily_update",
      title: `Project update sent by ${r.submitted_by || "Project Manager"}`,
      description: `${r.project_name}${r.phase ? " · " + r.phase : ""} · ${r.overall_status || "on-track"}`,
      link: `/reports?tab=daily&open=pm-${r.id}`,
      severity: r.overall_status === "critical" ? "critical" : r.overall_status && r.overall_status !== "on-track" ? "warning" : "info",
      referenceId: r.id,
    });
    res.json(r);
  } catch (error) {
    console.error("SEND TO CEO ERROR:", error);
    res.status(500).json({ error: "Failed to send report to CEO" });
  }
};