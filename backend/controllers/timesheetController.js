const pool = require("../config/db");

// CREATE TIMESHEET
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

    // validation
    if (hours > 12) {
      return res.status(400).json({
        error: "Cannot log more than 12 hours"
      });
    }

    const result = await pool.query(
      `INSERT INTO timesheets 
      (project_id, task_id, user_id, work_date, hours, description)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [project_id, task_id, user_id, work_date, hours, description]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create timesheet" });
  }
};

// GET TIMESHEETS BY PROJECT
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

// APPROVE / REJECT
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE timesheets SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};