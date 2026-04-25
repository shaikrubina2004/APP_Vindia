const db = require("../config/db");

// -----------------------------
// GET DAILY LOG
// /api/architect-daily-log?architect_id=&project_id=&date=
// -----------------------------
const getDailyLog = async (req, res) => {
  const client = await db.connect();

  try {
    const { architect_id, project_id, date } = req.query;

    if (!architect_id || !project_id || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing query params",
      });
    }

    const logResult = await client.query(
      `
      SELECT * FROM architect_daily_logs
      WHERE architect_id = $1
      AND project_id = $2
      AND date = $3
      LIMIT 1
      `,
      [architect_id, project_id, date]
    );

    const log = logResult.rows[0];

    if (!log) {
      return res.json({ success: true, data: null });
    }

    const tasks = await client.query(
      `SELECT * FROM architect_daily_log_tasks WHERE log_id = $1`,
      [log.id]
    );

    const issues = await client.query(
      `SELECT * FROM architect_daily_log_issues WHERE log_id = $1`,
      [log.id]
    );

    

    return res.json({
      success: true,
      data: {
        ...log,
        tasks: tasks.rows,
        issues: issues.rows,
        
      },
    });
  } catch (err) {
    console.error("GET Daily Log Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    client.release();
  }
};

// -----------------------------
// CREATE / UPDATE DAILY LOG (UPSERT)
// POST /api/architect-daily-log
// -----------------------------
const submitDailyLog = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const {
      id,
      date,
      project_id,
      architect_id,
      role,
      status,
      approval_status,
      work_done,
      tasks = [],
      issues = [],
     
    } = req.body;

    if (!date || !project_id || !architect_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // -----------------------------
    // 1. UPSERT MAIN LOG
    // -----------------------------
const logResult = await client.query(
  `
  INSERT INTO architect_daily_logs
  (date, project_id, architect_id, status, approval_status, work_done)
  VALUES ($1,$2,$3,$4,$5,$6)

  ON CONFLICT (architect_id, project_id, date)
  DO UPDATE SET
    status = EXCLUDED.status,
    approval_status = EXCLUDED.approval_status,
    work_done = EXCLUDED.work_done,
    updated_at = NOW()

  RETURNING id
  `,
  [
    date,
    project_id,
    architect_id,
    status || "Submitted",
    approval_status || "Pending",
    work_done,
  ]
);

    const log_id = logResult.rows[0].id;

    // -----------------------------
    // 2. CLEAN OLD CHILD DATA (IMPORTANT)
    // -----------------------------
    await client.query(
      `DELETE FROM architect_daily_log_tasks WHERE log_id = $1`,
      [log_id]
    );

    await client.query(
      `DELETE FROM architect_daily_log_issues WHERE log_id = $1`,
      [log_id]
    );

    

    // -----------------------------
    // 3. INSERT TASKS
    // -----------------------------
    for (let t of tasks) {
      await client.query(
        `
        INSERT INTO architect_daily_log_tasks
        (log_id, task_name, status)
        VALUES ($1,$2,$3)
        `,
        [log_id, t.task_name, t.status]
      );
    }

    // -----------------------------
    // 4. INSERT ISSUES
    // -----------------------------
 for (let i of issues) {
  await client.query(
    `
    INSERT INTO architect_daily_log_issues
    (log_id, title, type, severity, description)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [
      log_id,
      i.title,
      i.type,
      i.severity,
      i.description,
    ]
  );
}

  
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Daily log saved successfully",
      log_id,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK");

    console.error("POST Daily Log Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getDailyLog,
  submitDailyLog,
};