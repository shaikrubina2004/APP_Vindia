const pool = require("../config/db");

/* ================= CREATE ================= */
exports.createDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id;

    if (!engineer_id) {
      return res.status(401).json({ error: "User not authenticated" });
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

      labour_carpenters,
      labour_steel,
      labour_masons,
      labour_mep,
      labour_general,
      labour_supervisors,
      labour_skilled,
      labour_unskilled,
      labour_total,

      materials,
      issues,
      instructions,
      next_day,
      notes,

      wbs_id,
      milestone_id,
      delay_type
    } = req.body;

    if (!project_id || !date || !work_done) {
      return res.status(400).json({ error: "project_id, date, work_done required" });
    }

    const result = await pool.query(
      `INSERT INTO site_engineer_daily_updates
      (
        project_id,
        submitted_by,
        report_date,

        shift, site, zone,
        weather_am, weather_pm, temp_c,
        work_done, plant,

        labour_carpenters, labour_steel, labour_masons, labour_mep,
        labour_general, labour_supervisors,
        labour_skilled, labour_unskilled, labour_total,

        materials, issues, instructions, next_day, notes,

        wbs_id, milestone_id, suggested_status
      )
      VALUES (
        $1,$2,$3,
        $4,$5,$6,
        $7,$8,$9,
        $10,$11,
        $12,$13,$14,$15,
        $16,$17,
        $18,$19,$20,
        $21,$22,$23,$24,$25,
        $26,$27,$28
      )
      RETURNING *`,
      [
        project_id,
        engineer_id,
        date,

        shift, site, zone,
        weather_am, weather_pm, temp_c,
        work_done, plant,

        labour_carpenters, labour_steel, labour_masons, labour_mep,
        labour_general, labour_supervisors,
        labour_skilled, labour_unskilled, labour_total,

        JSON.stringify(materials || []),
        issues,
        instructions,
        next_day,
        notes,

        wbs_id || null,
        milestone_id || null,
        delay_type || "normal"
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("Create Diary Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/* ================= GET ALL ================= */
exports.getDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id;

    const result = await pool.query(
      `SELECT d.*, w.name AS wbs_name
       FROM site_engineer_daily_updates d
       LEFT JOIN wbs w ON d.wbs_id = w.id
       WHERE d.submitted_by = $1
       ORDER BY d.report_date DESC`,
      [engineer_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Get Diary Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
/* ================= GET BY ID ================= */
exports.getDiaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM site_engineer_daily_updates WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diary not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Get By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET MILESTONES (FROM WBS) ================= */
/* 👉 code like 1,2,3 = milestones */
exports.getMilestones = async (req, res) => {
  try {
    const { project_id } = req.query;

    const result = await pool.query(
      `
      SELECT id, name, code
      FROM wbs
      WHERE project_id = $1
      AND code NOT LIKE '%.%'   -- only main milestones
      ORDER BY code
      `,
      [project_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Milestones Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET WBS (SUBTASKS) ================= */
/* 👉 code like 1.1,1.2,2.1 */
exports.getWbs = async (req, res) => {
  try {
    const { milestone_id, project_id } = req.query;

    // 🔥 get parent code (like "1")
    const milestone = await pool.query(
      "SELECT code FROM wbs WHERE id = $1",
      [milestone_id]
    );

    if (milestone.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    const code = milestone.rows[0].code;

    // 🔥 get children (like 1.1, 1.2)
    const result = await pool.query(
      `
      SELECT id, name, code
      FROM wbs
      WHERE project_id = $1
      AND code LIKE $2 || '.%'
      ORDER BY code
      `,
      [project_id, code]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("WBS Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};