const pool = require("../config/db");

// ── Helper: converts empty string / null / undefined → null for numeric DB fields
const toNum = (v) =>
  v === "" || v === null || v === undefined ? null : parseFloat(v);

/* ═══════════════════════════════════════════════════════
   QS DASHBOARD
═══════════════════════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  try {
    const taskResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);

    let taskCounts = { pending: 0, inProgress: 0, done: 0, blocked: 0 };
    taskResult.rows.forEach(t => {
      const status = t.status.toLowerCase();
      if (status === "pending")          taskCounts.pending    = Number(t.count);
      else if (status === "in progress") taskCounts.inProgress = Number(t.count);
      else if (status === "done")        taskCounts.done       = Number(t.count);
      else if (status === "blocked")     taskCounts.blocked    = Number(t.count);
    });

    const { rows: activities } = await pool.query(`
      SELECT * FROM (
        SELECT 'Daily Update Submitted' AS title, activity AS description, created_at
        FROM qs_daily_updates
        UNION ALL
        SELECT 'BOQ Submitted' AS title, description AS description, created_at
        FROM boq_updates
        UNION ALL
        SELECT 'Cost Alert' AS title, message AS description, created_at
        FROM cost_alerts
      ) t
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const { rows: projects } = await pool.query(`SELECT * FROM projects`);
    const totalProjects = projects.length;

    const { rows: progress } = await pool.query(`SELECT * FROM progress LIMIT 5`);

    const { rows: taskRows } = await pool.query(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`);
    let taskData = { pending: 0, inProgress: 0, completed: 0 };
    taskRows.forEach(t => {
      const status = t.status.trim().toLowerCase();
      if (status.includes("block"))    taskData.pending    += parseInt(t.count);
      else if (status.includes("progress")) taskData.inProgress += parseInt(t.count);
      else if (status.includes("done"))     taskData.completed  += parseInt(t.count);
    });

    res.json({
      success: true,
      data: { activities, projects, progress, totalProjects, tasks: taskCounts },
    });
  } catch (err) {
    console.error("QS Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Dashboard failed" });
  }
};

/* ═══════════════════════════════════════════════════════
   QS NOTIFICATIONS
═══════════════════════════════════════════════════════ */
exports.getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE role='quantity_surveyor' ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("QS Notifications Error:", err);
    res.status(500).json({ success: false });
  }
};

/* ═══════════════════════════════════════════════════════
   QS PROJECTS
═══════════════════════════════════════════════════════ */
exports.getProjects = async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM projects`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("QS Projects Error:", err);
    res.status(500).json({ success: false });
  }
};

/* ═══════════════════════════════════════════════════════
   QS DAILY UPDATES
═══════════════════════════════════════════════════════ */

// GET ALL
exports.getDailyUpdates = async (req, res) => {
  try {
    // Ensure approved column exists
    await pool.query(`ALTER TABLE qs_daily_updates ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE`).catch(()=>{});
    const { rows } = await pool.query(`
      SELECT d.*, p.name AS project_name
      FROM qs_daily_updates d
      JOIN projects p ON d.project_id = p.id
      ORDER BY d.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("QS Daily Updates Error:", err);
    res.status(500).json({ success: false });
  }
};

// GET BY ID
exports.getDailyUpdateById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM qs_daily_updates WHERE id=$1`, [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("QS Get By ID Error:", err);
    res.status(500).json({ success: false });
  }
};

// CREATE — fixed: toNum() on all numeric fields
exports.createDailyUpdate = async (req, res) => {
  const {
    project_id, phase, status, activity,
    quantity, unit, location, manpower,
    progress, boq_item, cost_estimate, cost_actual, remarks
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO qs_daily_updates
        (project_id, phase, status, activity, quantity, unit, location,
         manpower, progress, boq_item, cost_estimate, cost_actual, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        project_id,
        phase,
        status,
        activity,
        toNum(quantity),       // numeric
        unit,
        location,
        toNum(manpower),       // numeric
        toNum(progress),       // numeric
        boq_item,
        toNum(cost_estimate),  // numeric ← was crashing with ""
        toNum(cost_actual),    // numeric ← was crashing with ""
        remarks,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("QS Create Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE (full update) — fixed: toNum() on all numeric fields
exports.updateDailyUpdate = async (req, res) => {
  const { id } = req.params;
  const {
    project_id, phase, status, activity,
    quantity, unit, location, manpower,
    progress, boq_item, cost_estimate, cost_actual, remarks
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE qs_daily_updates SET
        project_id   = $1,
        phase        = $2,
        status       = $3,
        activity     = $4,
        quantity     = $5,
        unit         = $6,
        location     = $7,
        manpower     = $8,
        progress     = $9,
        boq_item     = $10,
        cost_estimate= $11,
        cost_actual  = $12,
        remarks      = $13
       WHERE id = $14
       RETURNING *`,
      [
        project_id,
        phase,
        status,
        activity,
        toNum(quantity),
        unit,
        location,
        toNum(manpower),
        toNum(progress),
        boq_item,
        toNum(cost_estimate),
        toNum(cost_actual),
        remarks,
        id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("QS Update Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE
exports.deleteDailyUpdate = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `DELETE FROM qs_daily_updates WHERE id=$1 RETURNING id`, [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("QS Delete Error:", err);
    res.status(500).json({ success: false });
  }
};