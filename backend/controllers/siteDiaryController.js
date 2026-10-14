const pool = require("../config/db");
const { notifyReviewers, notifyEngineer } = require("../utils/projectPeople");

/* pg returns DATE columns as a JS Date at SERVER-LOCAL midnight. JSON-serialising that
   (toISOString) shifts it to the previous day for any server east of UTC (e.g. IST), so a
   diary submitted "today" looked like yesterday's. Return the calendar date as YYYY-MM-DD. */
const ymd = (v) => {
  if (!(v instanceof Date)) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
};
const withPlainDate = (row) => ({ ...row, report_date: ymd(row.report_date) });

// Roles that review Site Engineer diaries
const DIARY_REVIEW_ROLES = ["project_manager", "project_coordinator", "ceo"];

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

    // An engineer can only file a diary for a project they are assigned to. (If the project has
    // no engineer assigned yet, the old open behaviour is kept so nothing is blocked.)
    if (req.user?.role === "site_engineer") {
      const owner = await pool.query("SELECT site_engineer_id FROM projects WHERE id = $1", [project_id]);
      if (!owner.rows.length) return res.status(404).json({ error: "Project not found" });
      const assigned = owner.rows[0].site_engineer_id;
      if (assigned && Number(assigned) !== Number(userId)) {
        return res.status(403).json({ error: "You are not assigned to this project" });
      }
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

    // The assigned Project Manager is told a diary arrived. Without this the PM
    // had to open the Daily Reports page to discover a submission.
    const saved = result.rows[0];
    await notifyReviewers({
      role: "project_manager",
      projectId: saved.project_id,
      fromUserId: userId,
      type: "diary",
      title: "Site diary submitted",
      description: `${req.user?.name || "Site Engineer"} submitted the diary for ${ymd(saved.report_date)}${saved.zone ? ` · ${saved.zone}` : ""}.`,
      link: "/pm/daily-updates",
      severity: "info",
      refId: saved.id,
    });

    return res.status(201).json(saved);

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

    return res.json(result.rows.map(withPlainDate));

  } catch (err) {
    console.error("GET DIARY ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* ========================================
   REVIEW LIST  (PM / PC / CEO)
   GET /api/diary/review?project_id=&from=&to=
   Enriched with the project name, engineer name and approval state so the PM's
   Daily Reports screen can show Site Engineer submissions (it used to read the
   Structural Engineer's endpoint instead).
======================================== */
exports.getDiaryForReview = async (req, res) => {
  try {
    const values = [];
    let where = "WHERE 1=1";
    if (req.query.project_id) { values.push(Number(req.query.project_id)); where += ` AND d.project_id = $${values.length}`; }
    if (req.query.from) { values.push(req.query.from); where += ` AND d.report_date >= $${values.length}::date`; }
    if (req.query.to) { values.push(req.query.to); where += ` AND d.report_date <= $${values.length}::date`; }

    // A PM only reviews the projects they manage (CEO / PC see all).
    if (req.user.role === "project_manager") {
      values.push(req.user.id);
      where += ` AND d.project_id IN (SELECT p.id FROM projects p JOIN employees m ON m.id = p.manager_id WHERE m.user_id = $${values.length})`;
    }

    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, u.name AS engineer_name
         FROM site_engineer_daily_updates d
         LEFT JOIN projects p ON p.id = d.project_id
         LEFT JOIN users u ON u.id::text = d.submitted_by
         ${where}
         ORDER BY d.report_date DESC, d.id DESC
         LIMIT 300`,
      values
    );
    return res.json(result.rows.map((r) => ({ ...withPlainDate(r), approved: r.approved === true })));
  } catch (err) {
    console.error("DIARY REVIEW ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* PUT /api/diary/approve/:id   (PM / PC / CEO) — marks reviewed + tells the engineer */
exports.approveDiary = async (req, res) => {
  try {
    let result;
    try {
      result = await pool.query(
        `UPDATE site_engineer_daily_updates
            SET approved = TRUE, approved_by = $2, approved_at = NOW()
          WHERE id = $1 RETURNING *`,
        [req.params.id, req.user.id]
      );
    } catch (err) {
      if (err.code === "42703") {
        return res.status(409).json({ error: "Diary approval columns are missing — run `npm run migrate:diary`." });
      }
      throw err;
    }
    if (!result.rows.length) return res.status(404).json({ error: "Diary not found" });
    const d = result.rows[0];
    await notifyEngineer({
      userId: Number(d.submitted_by),
      projectId: d.project_id,
      type: "work",
      title: "Your site diary was reviewed",
      description: `The diary for ${ymd(d.report_date)} was approved by ${req.user?.name || "your Project Manager"}.`,
      link: "/site-engineer/daily-diary",
      severity: "ok",
      refId: d.id,
    });
    return res.json(d);
  } catch (err) {
    console.error("DIARY APPROVE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.DIARY_REVIEW_ROLES = DIARY_REVIEW_ROLES;

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