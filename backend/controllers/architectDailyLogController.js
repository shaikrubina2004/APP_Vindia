const db = require("../config/db");

const createDailyLog = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const {
      date,
      project_id,
      architect_id,
      role,
      status,
      work_done,
      tasks,
      issues,
      attachments
    } = req.body;

    // -----------------------------
    // SAFE PARSE HELPER
    // -----------------------------
    const parse = (value) => {
      if (!value) return [];
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return value;
    };

    const taskList = parse(tasks);
    const issueList = parse(issues);
    const attachList = parse(attachments);

    // -----------------------------
    // VALIDATION (IMPORTANT)
    // -----------------------------
    if (!date || !project_id || !architect_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (date, project_id, architect_id)"
      });
    }

    // -----------------------------
    // 1. INSERT MAIN DAILY LOG
    // -----------------------------
    const logResult = await client.query(
      `INSERT INTO archdailylogs
      (date, project_id, architect_id, role, status, work_done)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id`,
      [date, project_id, architect_id, role, status || "Draft", work_done]
    );

    const dailylog_id = logResult.rows[0].id;

    // -----------------------------
    // 2. INSERT TASKS
    // -----------------------------
    for (let t of taskList) {
      if (!t.task_name) continue;

      await client.query(
        `INSERT INTO archdailylog_tasks
        (dailylog_id, task_name, status)
        VALUES ($1,$2,$3)`,
        [
          dailylog_id,
          t.task_name,
          t.status || "In Progress"
        ]
      );
    }

    // -----------------------------
    // 3. INSERT ISSUES
    // -----------------------------
    for (let i of issueList) {
      await client.query(
        `INSERT INTO archdailylog_issues
        (dailylog_id, title, type, severity, description)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          dailylog_id,
          i.title || "",
          i.type || "",
          i.severity || "P2",
          i.description || ""
        ]
      );
    }

    // -----------------------------
    // 4. INSERT ATTACHMENTS
    // -----------------------------
    for (let a of attachList) {
      await client.query(
        `INSERT INTO archdailylog_attachments
        (dailylog_id, file_name, file_type, file_url)
        VALUES ($1,$2,$3,$4)`,
        [
          dailylog_id,
          a.file_name,
          a.file_type,
          a.file_url
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Daily log created successfully",
      dailylog_id
    });

  } catch (err) {
    if (client) await client.query("ROLLBACK");

    console.error("Daily Log Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create daily log",
      error: err.message
    });

  } finally {
    if (client) client.release();
  }
};

// ----------------------------------
// GET (placeholder)
// ----------------------------------
const getDailyLogsByArchitect = (req, res) => {
  res.json({ message: "Not implemented yet" });
};

module.exports = {
  createDailyLog,
  getDailyLogsByArchitect
};