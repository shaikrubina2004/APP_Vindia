const pool = require("../config/db");

/* ═══════════════════════════════════════════════════════
   QS DASHBOARD
═══════════════════════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  try {
    const role = "quantity_surveyor";

    const { rows: notifications } = await pool.query(
      `SELECT * FROM notifications 
       WHERE role=$1 
       ORDER BY created_at DESC LIMIT 5`,
      [role]
    );

    const { rows: projects } = await pool.query(
      `SELECT * FROM projects LIMIT 5`
    );

    const { rows: progress } = await pool.query(
      `SELECT * FROM progress LIMIT 5`
    );

    res.json({
      success: true,
      data: { notifications, projects, progress },
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
      `SELECT * FROM notifications 
       WHERE role='quantity_surveyor'
       ORDER BY created_at DESC`
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
      `SELECT * FROM qs_daily_updates WHERE id=$1`,
      [id]
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

// CREATE
exports.createDailyUpdate = async (req, res) => {
  const {
    project_id,
    phase,
    status,
    activity,
    quantity,
    unit,
    location,
    manpower,
    progress,
    boq_item,
    cost_estimate,
    cost_actual,
    remarks
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO qs_daily_updates 
      (project_id, phase, status, activity, quantity, unit, location, manpower, progress, boq_item, cost_estimate, cost_actual, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        project_id, phase, status, activity,
        quantity, unit, location, manpower,
        progress, boq_item, cost_estimate,
        cost_actual, remarks
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });

  } catch (err) {
    console.error("QS Create Error:", err);
    res.status(500).json({ success: false });
  }
};

// UPDATE
exports.updateDailyUpdate = async (req, res) => {
  const { id } = req.params;
  const { status, progress, remarks } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE qs_daily_updates 
       SET status=$1, progress=$2, remarks=$3
       WHERE id=$4 RETURNING *`,
      [status, progress, remarks, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error("QS Update Error:", err);
    res.status(500).json({ success: false });
  }
};

// DELETE
exports.deleteDailyUpdate = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `DELETE FROM qs_daily_updates WHERE id=$1 RETURNING id`,
      [id]
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