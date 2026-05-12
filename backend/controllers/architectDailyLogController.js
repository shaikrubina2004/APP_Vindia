const db = require("../config/db");

// ─── helper: get a client with timeout protection ────────────────────────────
// Wraps db.connect() so a hanging DB connection never crashes the server.
const getClient = async () => {
  const connectPromise = db.connect();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("DB connection timeout")), 5000)
  );
  return Promise.race([connectPromise, timeoutPromise]);
};

// ─── helper: safe JSON response on DB errors ─────────────────────────────────
const dbError = (res, err) => {
  console.error("DB Error:", err.message);
  if (err.message.includes("timeout") || err.code === "ETIMEDOUT") {
    return res.status(503).json({
      success: false,
      message: "Database is currently unreachable. Please try again shortly.",
    });
  }
  return res.status(500).json({ success: false, message: err.message });
};

// -----------------------------
// GET DAILY LOG
// GET /api/architect-daily-log?architect_id=&project_id=&date=
// -----------------------------
const getDailyLog = async (req, res) => {
  let client;
  try {
    const { architect_id, project_id, date } = req.query;
  
    if (!architect_id || !project_id || !date) {
      return res.status(400).json({ success: false, message: "Missing query params" });
    }

    client = await getClient();

    const logResult = await client.query(
      `SELECT * FROM architect_daily_logs
       WHERE architect_id = $1 AND project_id = $2 AND date = $3
       LIMIT 1`,
      [architect_id, project_id, date]
    );

    const log = logResult.rows[0];
    if (!log) return res.json({ success: true, data: null });

    const tasks  = await client.query(
      `SELECT * FROM architect_daily_log_tasks WHERE log_id = $1`, [log.id]
    );
    const issues = await client.query(
      `SELECT * FROM architect_daily_log_issues WHERE log_id = $1`, [log.id]
    );

    return res.json({
      success: true,
      data: { ...log, tasks: tasks.rows, issues: issues.rows },
    });
  } catch (err) {
    return dbError(res, err);
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// CREATE / UPDATE DAILY LOG (UPSERT)
// POST /api/architect-daily-log
// -----------------------------
const submitDailyLog = async (req, res) => {
  let client;
  try {
    client = await getClient();
    await client.query("BEGIN");

    const {
      date,
      project_id,
      architect_id,
      status,
      approval_status,
      work_done,
      tasks  = [],
      issues = [],
    } = req.body;

    if (!date || !project_id || !architect_id) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. UPSERT MAIN LOG
    const logResult = await client.query(
      `INSERT INTO architect_daily_logs
         (date, project_id, architect_id, status, approval_status, work_done)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (architect_id, project_id, date)
       DO UPDATE SET
         status          = EXCLUDED.status,
         approval_status = EXCLUDED.approval_status,
         work_done       = EXCLUDED.work_done,
         updated_at      = NOW()
       RETURNING id`,
      [date, project_id, architect_id, status || "Submitted", approval_status || "Pending", work_done]
    );

    const log_id = logResult.rows[0].id;

    // 2. CLEAN OLD CHILD DATA
    await client.query(`DELETE FROM architect_daily_log_tasks  WHERE log_id = $1`, [log_id]);
    await client.query(`DELETE FROM architect_daily_log_issues WHERE log_id = $1`, [log_id]);

    // 3. INSERT TASKS
    for (const t of tasks) {
      await client.query(
        `INSERT INTO architect_daily_log_tasks (log_id, task_name, status) VALUES ($1,$2,$3)`,
        [log_id, t.task_name, t.status]
      );
    }

    // 4. INSERT ISSUES
    for (const i of issues) {
      await client.query(
        `INSERT INTO architect_daily_log_issues (log_id, title, type, severity, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [log_id, i.title, i.type, i.severity, i.description]
      );
    }

    await client.query("COMMIT");

    return res.json({ success: true, message: "Daily log saved successfully", log_id });
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) {}
    }
    return dbError(res, err);
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// GET ALL LOGS FOR A PROJECT
// GET /api/architect-daily-log/history?architect_id=&project_id=
// -----------------------------
const getProjectLogs = async (req, res) => {
  let client;
  try {
    const { architect_id, project_id } = req.query;

    if (!architect_id || !project_id) {
      return res.status(400).json({ success: false, message: "Missing query params" });
    }

    client = await getClient();

    const logResult = await client.query(
      `SELECT * FROM architect_daily_logs
       WHERE architect_id = $1 AND project_id = $2
       ORDER BY date DESC`,
      [architect_id, project_id]
    );

    const logs = await Promise.all(
      logResult.rows.map(async (log) => {
        const tasks  = await client.query(
          `SELECT * FROM architect_daily_log_tasks  WHERE log_id = $1`, [log.id]
        );
        const issues = await client.query(
          `SELECT * FROM architect_daily_log_issues WHERE log_id = $1`, [log.id]
        );
        return { ...log, tasks: tasks.rows, issues: issues.rows };
      })
    );

    return res.json({ success: true, data: logs });
  } catch (err) {
    return dbError(res, err);
  } finally {
    if (client) client.release();
  }
};

module.exports = { getDailyLog, submitDailyLog, getProjectLogs, getAllLogs };

// GET /api/architect-daily-log/all  — PM only, no params needed
async function getAllLogs(req, res) {
  let client;
  try {
    client = await getClient();
    const logResult = await client.query(
      `SELECT adl.*,
              u.name  AS architect_name,
              p.name  AS project_name
       FROM architect_daily_logs adl
       LEFT JOIN users    u ON u.id = adl.architect_id
       LEFT JOIN projects p ON p.id = adl.project_id
       ORDER BY adl.date DESC, adl.created_at DESC
       LIMIT 300`
    );
    const logs = await Promise.all(
      logResult.rows.map(async (log) => {
        const tasks  = await client.query(
          `SELECT * FROM architect_daily_log_tasks  WHERE log_id = $1`, [log.id]
        );
        const issues = await client.query(
          `SELECT * FROM architect_daily_log_issues WHERE log_id = $1`, [log.id]
        );
        return { ...log, tasks: tasks.rows, issues: issues.rows };
      })
    );
    return res.json({ success: true, data: logs });
  } catch (err) {
    return dbError(res, err);
  } finally {
    if (client) client.release();
  }
}