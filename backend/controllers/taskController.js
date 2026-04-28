const pool = require("../config/db");

// 🎯 CREATE TASK
exports.createTask = async (req, res) => {
  try {
    const { title, description, project_id, status } = req.body;

    // 🧼 Normalize status (VERY IMPORTANT for enum)
    const statusMap = {
      pending: "Pending",
      in_progress: "In Progress",
      done: "Done",
      blocked: "Blocked",
      open: "open"
    };

    const rawStatus = status?.trim().toLowerCase();
    const finalStatus = statusMap[rawStatus];

    // ❌ Invalid status
    if (!finalStatus) {
      return res.status(400).json({
        error: `Invalid task_status: ${status}`
      });
    }

    console.log("FINAL STATUS:", JSON.stringify(finalStatus));

    // ✅ Insert task into DB
    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, project_id, finalStatus]
    );

    const createdTask = result.rows[0];

    // 🔔 CREATE NOTIFICATION (CORE FEATURE)
    await pool.query(
      `INSERT INTO notifications (message, type, role, severity)
       VALUES ($1, $2, $3, $4)`,
      [
        `New Task Assigned: ${createdTask.title}`,
        "task",
        "structural_engineer",
        "info"
      ]
    );

    res.status(201).json(createdTask);

  } catch (err) {
    console.error("createTask:", err.message);
    res.status(500).json({ error: "Failed to create task" });
  }
};


// 🎯 GET TASKS BY PROJECT
exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      "SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("getTasksByProject:", err.message);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};


// 🎯 OPTIONAL: UPDATE TASK STATUS (with notification)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusMap = {
      pending: "Pending",
      in_progress: "In Progress",
      done: "Done",
      blocked: "Blocked",
      open: "open"
    };

    const rawStatus = status?.trim().toLowerCase();
    const finalStatus = statusMap[rawStatus];

    if (!finalStatus) {
      return res.status(400).json({
        error: `Invalid task_status: ${status}`
      });
    }

    const result = await pool.query(
      `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
      [finalStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updatedTask = result.rows[0];

    // 🔔 Notification for status update
    await pool.query(
      `INSERT INTO notifications (message, type, role, severity)
       VALUES ($1, $2, $3, $4)`,
      [
        `Task Updated: ${updatedTask.title} → ${finalStatus}`,
        "task",
        "structural_engineer",
        "info"
      ]
    );

    res.json(updatedTask);

  } catch (err) {
    console.error("updateTaskStatus:", err.message);
    res.status(500).json({ error: "Failed to update task" });
  }
};