const pool = require("../config/db");

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

    const result = await pool.query(
      `INSERT INTO daily_reports
      (project_name, date, phase, overall_status, submitted_by, submission_time, data, approved)
      VALUES ($1,$2,$3,$4,$5,$6,$7,false)
      RETURNING *`,
      [
        project_name,
        date,
        phase || null,
        overall_status || "on-track",
        submitted_by || "Project Manager",
        submission_time || null,
        JSON.stringify(data || {})
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ error: "Failed to create report" });
  }
};

/* =========================================================
   📋 GET ALL REPORTS (MAIN FIX — COMBINED DATA)
========================================================= */
exports.getAllReports = async (req, res) => {
  try {
    // 🔹 1. SITE ENGINEER DIARY DATA
    const diary = await pool.query(`
      SELECT
        d.id,
        d.report_date AS date,
        d.zone AS phase,
        d.work_done,
        d.issues,
        d.delay_type,
        d.delay_description,
        d.labour_total,
        d.materials,

        u.name AS submitted_by,
        p.name AS project_name,

        d.created_at

      FROM site_engineer_daily_updates d
      JOIN users u ON u.id = d.submitted_by
      JOIN projects p ON p.id = d.project_id
    `);

    // 🔹 2. MANUAL REPORTS (PM / others)
    const reports = await pool.query(`
      SELECT *
      FROM daily_reports
    `);

    // 🔥 MERGE BOTH
    const combined = [

      // 🟢 Convert diary → PM format
      ...diary.rows.map(r => ({
        id: `diary-${r.id}`,
        project_name: r.project_name,
        date: r.date,
        phase: r.phase,
        overall_status: r.delay_type ? "delayed" : "on-track",
        submitted_by: r.submitted_by,
        submission_time: r.created_at,
        approved: false,

        data: {
          workItems: [
            {
              activity: r.work_done,
              location: r.phase,
              status: "done"
            }
          ],

          issues: r.issues
            ? [{ issue: r.issues }]
            : [],

          materials: r.materials || [],

          progress: {
            overall: r.labour_total || 0
          },

          delay: r.delay_type,
          delay_description: r.delay_description
        }
      })),

      // 🔵 Manual reports (existing)
      ...reports.rows.map(r => ({
        ...r,
        data: typeof r.data === "string"
          ? JSON.parse(r.data)
          : r.data
      }))
    ];

    // 🔥 SORT BY DATE (latest first)
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(combined);

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