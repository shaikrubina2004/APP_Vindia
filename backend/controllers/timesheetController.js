const pool = require("../config/db");

/* ===============================
   CREATE TIMESHEET ENTRY
================================ */
exports.createTimesheet = async (req, res) => {
  try {
    const {
      project_id,
      task_id,
      user_id,
      work_date,
      hours,
      description
    } = req.body;

    if (!project_id || !task_id || !user_id || !work_date || !hours) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (hours > 12) {
      return res.status(400).json({
        error: "Cannot log more than 12 hours"
      });
    }

    const result = await pool.query(
      `INSERT INTO timesheets
      (project_id, task_id, user_id, work_date, hours, description, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [project_id, task_id, user_id, work_date, hours, description, "Pending"]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create timesheet" });
  }
};

/* ===============================
   GET ALL TIMESHEETS (MANAGER)
================================ */
exports.getAllTimesheets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name, p.project_name, ts.task
       FROM timesheets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN tasks ts ON t.task_id = ts.id
       ORDER BY t.work_date DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
};

/* ===============================
   GET BY PROJECT
================================ */
exports.getTimesheetsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT t.*, ts.task
       FROM timesheets t
       LEFT JOIN tasks ts ON t.task_id = ts.id
       WHERE t.project_id = $1
       ORDER BY t.id DESC`,
      [projectId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
};

/* ===============================
   APPROVE / REJECT
================================ */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE timesheets 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};