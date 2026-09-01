const pool = require("../config/db");

/* ========================================
   CREATE DIARY
======================================== */
exports.createDiary = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    const {
      project_id,
      date,
      shift,
      site,
      zone,
      weather_am,
      weather_pm,
      temp_c,
      work_done,
      plant,
      materials,
      issues,
      delay_type,
      delay_description,
      linked_rfi,
      linked_incident,
      instructions,
      next_day,
      notes,
      milestone_id,
      subtask_id,
    } = req.body;

    /* ---------- REQUIRED FIELDS ---------- */

    if (!project_id) {
      return res.status(400).json({
        error: "project_id is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        error: "Date is required",
      });
    }

    if (!site) {
      return res.status(400).json({
        error: "Site is required",
      });
    }

    if (!work_done || work_done.trim().length < 5) {
      return res.status(400).json({
        error: "Work done must contain at least 5 characters",
      });
    }

    /* ---------- MATERIALS ---------- */

    let parsedMaterials = [];

    if (materials) {
      try {
        parsedMaterials =
          typeof materials === "string"
            ? JSON.parse(materials)
            : materials;
      } catch {
        parsedMaterials = [];
      }
    }

    if (!Array.isArray(parsedMaterials)) {
      parsedMaterials = [];
    }

    /* ---------- ISSUES ---------- */

    /*
      Database column is JSONB.
      Frontend currently sends a plain text string.
      Store it as a JSON string value rather than
      inventing a new object structure.
    */
    let parsedIssues = null;

    if (issues) {
      try {
        parsedIssues =
          typeof issues === "string"
            ? JSON.stringify(issues)
            : JSON.stringify(issues);
      } catch {
        parsedIssues = null;
      }
    }

    /* ---------- ATTACHMENTS ---------- */

    const files = req.files || [];

    const attachments = files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    }));

    /* ---------- INSERT ---------- */

    const result = await pool.query(
      `
        INSERT INTO site_engineer_daily_updates
        (
          project_id,
          submitted_by,
          report_date,
          milestone_id,
          subtask_id,
          shift,
          site,
          zone,
          weather_am,
          weather_pm,
          temp_c,
          work_done,
          plant,
          materials,
          issues,
          instructions,
          next_day,
          notes,
          delay_description,
          linked_rfi,
          linked_incident,
          attachments,
          delay_type
        )
        VALUES
        (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,
          $21,$22,$23
        )
        RETURNING *
      `,
      [
        Number(project_id),
        String(userId),
        date,
        milestone_id ? Number(milestone_id) : null,
        subtask_id ? Number(subtask_id) : null,

        shift || "morning",
        site,
        zone || null,

        weather_am || null,
        weather_pm || null,
        temp_c || null,

        work_done,
        plant || null,

        JSON.stringify(parsedMaterials),
        parsedIssues,

        instructions || null,
        next_day || null,
        notes || null,

        delay_description || null,
        linked_rfi || null,
        linked_incident || null,

        JSON.stringify(attachments),

        delay_type || null,
      ]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("CREATE DIARY ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* ========================================
   GET DIARY
======================================== */
exports.getDiary = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    let result;

    if (role === "site_engineer") {
      result = await pool.query(
        `
          SELECT *
          FROM site_engineer_daily_updates
          WHERE submitted_by = $1
          ORDER BY report_date DESC, id DESC
        `,
        [String(userId)]
      );
    } else {
      result = await pool.query(
        `
          SELECT *
          FROM site_engineer_daily_updates
          ORDER BY report_date DESC, id DESC
        `
      );
    }

    return res.json(result.rows);

  } catch (err) {
    console.error("GET DIARY ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* ========================================
   GET MILESTONES
======================================== */
exports.getMilestones = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        error: "project_id is required",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          name
        FROM wbs
        WHERE project_id = $1
          AND parent_id IS NULL
        ORDER BY id
      `,
      [project_id]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("GET MILESTONES ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* ========================================
   GET TASKS / WBS
======================================== */
exports.getWbs = async (req, res) => {
  try {
    const {
      milestone_id,
      project_id,
    } = req.query;

    if (!milestone_id) {
      return res.status(400).json({
        error: "milestone_id is required",
      });
    }

    let query = `
      SELECT
        id,
        name
      FROM wbs
      WHERE parent_id = $1
    `;

    const params = [milestone_id];

    if (project_id) {
      query += ` AND project_id = $2`;
      params.push(project_id);
    }

    query += ` ORDER BY id`;

    const result = await pool.query(query, params);

    return res.json(result.rows);

  } catch (err) {
    console.error("GET WBS ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};