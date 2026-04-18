const pool = require("../config/db");

/**
 * ➕ CREATE REPORT
 */
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO daily_reports 
      (project_name, date, phase, overall_status, submitted_by, submission_time, data)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [project_name, date, phase, overall_status, submitted_by, submission_time, data]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create report" });
  }
};

/**
 * 📋 GET ALL REPORTS
 */
exports.getAllReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM daily_reports ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

/**
 * 🔍 GET REPORT BY ID
 */
exports.getReportById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM daily_reports WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

/**
 * ✅ APPROVE REPORT
 */
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
    console.error(error);
    res.status(500).json({ error: "Failed to approve report" });
  }
};

/**
 * ✏️ UPDATE REPORT
 */
exports.updateReport = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  try {
    const result = await pool.query(
      `UPDATE daily_reports
       SET data = $1
       WHERE id = $2
       RETURNING *`,
      [data, id]
    );

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update report" });
  }
};

/**
 * ❌ DELETE REPORT
 */
exports.deleteReport = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM daily_reports WHERE id = $1`,
      [id]
    );

    res.status(200).json({ message: "Deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete report" });
  }
};