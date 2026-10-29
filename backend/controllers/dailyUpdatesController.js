const pool = require("../config/db");
const { notifyCEO } = require("./ceoNotificationsController");

const managedProjectNameAccess = (projectNameExpression, userPlaceholder) => `
  EXISTS (
    SELECT 1
    FROM projects managed_project
    JOIN employees manager ON manager.id = managed_project.manager_id
    WHERE managed_project.name = ${projectNameExpression}
      AND manager.user_id = ${userPlaceholder}
  )
`;

const reportProjectAccess = (projectNameExpression, rolePlaceholder, userPlaceholder) => `
  (${rolePlaceholder} <> 'project_manager'
    OR ${managedProjectNameAccess(projectNameExpression, userPlaceholder)})
`;

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

    const project = await pool.query(
      `SELECT p.id FROM projects p
       WHERE p.name = $1
         AND ($2 <> 'project_manager' OR EXISTS (
           SELECT 1 FROM employees manager
           WHERE manager.id = p.manager_id AND manager.user_id = $3
         ))`,
      [project_name, req.user.role, req.user.id]
    );
    if (!project.rows.length) {
      return res.status(404).json({ error: "Project not found or not managed by you" });
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
   📋 GET ALL MANUAL PROJECT REPORTS
========================================================= */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await pool.query(
      `SELECT * FROM daily_reports
       WHERE ${reportProjectAccess("project_name", "$1", "$2")}
       ORDER BY date DESC`,
      [req.user.role, req.user.id]
    );
    res.status(200).json(reports.rows.map((report) => ({
      ...report,
      data: typeof report.data === "string" ? JSON.parse(report.data) : report.data,
    })));

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
      `SELECT * FROM daily_reports
       WHERE id = $1 AND ${reportProjectAccess("project_name", "$2", "$3")}`,
      [id, req.user.role, req.user.id]
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
         AND ${reportProjectAccess("project_name", "$2", "$3")}
       RETURNING *`,
      [id, req.user.role, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found or not in a project you manage" });
    }
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
    const project = await pool.query(
      `SELECT p.id FROM projects p
       WHERE p.name = $1
         AND ($2 <> 'project_manager' OR EXISTS (
           SELECT 1 FROM employees manager
           WHERE manager.id = p.manager_id AND manager.user_id = $3
         ))`,
      [project_name, req.user.role, req.user.id]
    );
    if (!project.rows.length) {
      return res.status(404).json({ error: "Project not found or not managed by you" });
    }

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
         AND ${reportProjectAccess("project_name", "$9", "$10")}
       RETURNING *`,
      [
        project_name,
        date,
        phase,
        overall_status,
        submitted_by,
        submission_time,
        JSON.stringify(data || {}),
        id,
        req.user.role,
        req.user.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found or not in a project you manage" });
    }
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
    const result = await pool.query(
      `DELETE FROM daily_reports
       WHERE id = $1
         AND ${reportProjectAccess("project_name", "$2", "$3")}
       RETURNING id`,
      [id, req.user.role, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Report not found or not in a project you manage" });
    }
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
         AND ${reportProjectAccess("project_name", "$2", "$3")}
       RETURNING id, project_name, phase, overall_status, submitted_by, sent_to_ceo, sent_to_ceo_at`,
      [req.params.id, req.user.role, req.user.id]
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