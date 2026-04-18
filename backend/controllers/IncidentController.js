const pool = require("../config/db"); // ✅ FIX: was ../../config/db (wrong depth for this project)

/* ─── HELPERS ─────────────────────────────────────────────── */

function calcDeadline(priority) {
  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;
  const offsets = { P1: 8 * HOUR, P2: 2 * DAY, P3: 7 * DAY };
  return new Date(now + (offsets[priority] ?? 2 * DAY));
}

async function patchHistoryUser(client, table, fkCol, fkVal, userId) {
  await client.query(
    `UPDATE ${table}
     SET changed_by = $1
     WHERE id = (
       SELECT id FROM ${table}
       WHERE ${fkCol} = $2
       ORDER BY changed_at DESC
       LIMIT 1
     )`,
    [userId, fkVal],
  );
}

/* ══════════════════════════════════════════════════════════════
   ROLES + USERS
══════════════════════════════════════════════════════════════ */

/**
 * GET /api/incidents/roles
 * Returns all distinct roles from the users table.
 * Uses a JOIN to the roles table if role_id exists,
 * falls back to a direct role column otherwise.
 */
exports.getRoles = async (req, res) => {
  try {
    // Tries roles table first; if your schema has role column directly adjust here
    const { rows } = await pool.query(`
      SELECT DISTINCT r.id, r.name
      FROM roles r
      INNER JOIN users u ON u.role_id = r.id
      WHERE r.name IS NOT NULL
      ORDER BY r.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getRoles:", err);
    res.status(500).json({ success: false, message: "Failed to fetch roles" });
  }
};

/**
 * GET /api/incidents/roles/:roleId/users
 * Returns all users whose role_id matches :roleId.
 * roleId is the role's UUID/integer primary key.
 */
exports.getUsersByRole = async (req, res) => {
  const { roleId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.role_id = $1
       ORDER BY u.name`,
      [roleId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getUsersByRole:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch users for role" });
  }
};

/* ══════════════════════════════════════════════════════════════
   INCIDENTS
══════════════════════════════════════════════════════════════ */

// GET /api/incidents
exports.getAllIncidents = async (req, res) => {
  try {
    const { status, priority, assigned_to, search } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`priority = $${idx++}`);
      params.push(priority);
    }
    if (assigned_to) {
      conditions.push(`assigned_to_id = $${idx++}`);
      params.push(assigned_to);
    }
    if (search) {
      conditions.push(`(title ILIKE $${idx} OR incident_no ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM v_incident_overview ${where} ORDER BY created_at DESC`,
      params,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getAllIncidents:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch incidents" });
  }
};

// GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows: incRows } = await client.query(
      `SELECT * FROM v_incident_overview WHERE id = $1`,
      [id],
    );
    if (!incRows.length)
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });

    const { rows: comments } = await client.query(
      `SELECT ic.id, ic.body, ic.created_at, ic.updated_at,
              u.id AS author_id, u.name AS author_name
       FROM incident_comments ic
       JOIN users u ON u.id = ic.author_id
       WHERE ic.incident_id = $1
       ORDER BY ic.created_at ASC`,
      [id],
    );

    const { rows: photos } = await client.query(
      `SELECT id, url, uploaded_at FROM incident_photos
       WHERE incident_id = $1 ORDER BY uploaded_at ASC`,
      [id],
    );

    // ✅ FIX: join roles table for role_name
    const { rows: tasks } = await client.query(
      `SELECT
         t.id, t.incident_id, t.task_no, t.title, t.note, t.priority, t.status,
         t.done_at, t.created_at, t.updated_at,
         u.id   AS assignee_id,
         u.name AS assignee_name,
         r.name AS role_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE t.incident_id = $1 AND t.is_deleted = FALSE
       ORDER BY t.created_at ASC`,
      [id],
    );

    const taskIds = tasks.map((t) => t.id);
    let taskComments = [];
    if (taskIds.length) {
      const { rows } = await client.query(
        `SELECT tc.id, tc.task_id, tc.body, tc.comment_type, tc.created_at,
                u.id AS author_id, u.name AS author_name
         FROM task_comments tc
         JOIN users u ON u.id = tc.author_id
         WHERE tc.task_id = ANY($1)
         ORDER BY tc.created_at ASC`,
        [taskIds],
      );
      taskComments = rows;
    }

    const tasksWithComments = tasks.map((t) => ({
      ...t,
      comments: taskComments.filter((c) => c.task_id === t.id),
    }));

    res.json({
      success: true,
      data: { ...incRows[0], comments, photos, tasks: tasksWithComments },
    });
  } catch (err) {
    console.error("getIncidentById:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch incident" });
  } finally {
    client.release();
  }
};

// POST /api/incidents
// Body: { title, description, priority, assigned_to_user_id }
exports.createIncident = async (req, res) => {
  const { title, description, priority = "P2", assigned_to_user_id } = req.body;
  // ✅ FIX: removed hardcoded fallback `|| 27` — use auth middleware user only
  const created_by = req.user?.id ?? null;

  if (!title?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });

  try {
    const deadline_at = calcDeadline(priority);

    // Fetch assignee name + role for response (not stored on incident row)
    let assignee_name = null;
    let role_name = null;
    if (assigned_to_user_id) {
      const { rows } = await pool.query(
        `SELECT u.name, r.name AS role_name
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [assigned_to_user_id],
      );
      if (rows.length) {
        assignee_name = rows[0].name;
        role_name = rows[0].role_name;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO incidents
         (title, description, priority, assigned_to, created_by, deadline_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(),
        description ?? null,
        priority,
        assigned_to_user_id ?? null,
        created_by,
        deadline_at,
      ],
    );

    res.status(201).json({
      success: true,
      data: { ...rows[0], assignee_name, role_name },
    });
  } catch (err) {
    console.error("createIncident:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to create incident" });
  }
};

// PATCH /api/incidents/:id
exports.updateIncident = async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, assigned_to_user_id } = req.body;

  const fields = [];
  const params = [];
  let idx = 1;

  if (title !== undefined) {
    fields.push(`title = $${idx++}`);
    params.push(title);
  }
  if (description !== undefined) {
    fields.push(`description = $${idx++}`);
    params.push(description);
  }
  if (priority !== undefined) {
    fields.push(`priority = $${idx++}`);
    params.push(priority);
  }
  if (assigned_to_user_id !== undefined) {
    fields.push(`assigned_to = $${idx++}`);
    params.push(assigned_to_user_id);
  }

  if (!fields.length)
    return res
      .status(400)
      .json({ success: false, message: "No fields to update" });

  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE incidents SET ${fields.join(", ")} WHERE id = $${idx} AND is_deleted = FALSE RETURNING *`,
      params,
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateIncident:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update incident" });
  }
};

// PATCH /api/incidents/:id/status
exports.updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id ?? null;

  const validStatuses = [
    "Created",
    "Assigned",
    "In Progress",
    "Resolved",
    "Closed",
  ];
  if (!validStatuses.includes(status))
    return res.status(400).json({ success: false, message: "Invalid status" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE incidents SET status = $1 WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
      [status, id],
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    }
    if (userId)
      await patchHistoryUser(
        client,
        "incident_status_history",
        "incident_id",
        id,
        userId,
      );
    await client.query("COMMIT");
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateIncidentStatus:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  } finally {
    client.release();
  }
};

// DELETE /api/incidents/:id
exports.deleteIncident = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE incidents SET is_deleted = TRUE WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
      [id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    res.json({ success: true, message: "Incident deleted" });
  } catch (err) {
    console.error("deleteIncident:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete incident" });
  }
};

/* ══════════════════════════════════════════════════════════════
   INCIDENT COMMENTS
══════════════════════════════════════════════════════════════ */

exports.addIncidentComment = async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;
  const author_id = req.user?.id ?? null;

  if (!body?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Comment body is required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO incident_comments (incident_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [id, author_id, body.trim()],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("addIncidentComment:", err);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
};

/* ══════════════════════════════════════════════════════════════
   INCIDENT PHOTOS
══════════════════════════════════════════════════════════════ */

exports.addIncidentPhoto = async (req, res) => {
  const { id } = req.params;
  const { url } = req.body;
  const uploaded_by = req.user?.id ?? null;

  if (!url?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Photo URL is required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO incident_photos (incident_id, url, uploaded_by)
       VALUES ($1, $2, $3)
       RETURNING id, url, uploaded_at`,
      [id, url.trim(), uploaded_by],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("addIncidentPhoto:", err);
    res.status(500).json({ success: false, message: "Failed to add photo" });
  }
};

/* ══════════════════════════════════════════════════════════════
   TASKS
══════════════════════════════════════════════════════════════ */

// GET /api/incidents/tasks
exports.getAllTasks = async (req, res) => {
  try {
    const { role, status, priority, search } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (role) {
      conditions.push(`role_name = $${idx++}`);
      params.push(role);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`priority = $${idx++}`);
      params.push(priority);
    }
    if (search) {
      conditions.push(
        `(title ILIKE $${idx} OR assignee_name ILIKE $${idx + 1})`,
      );
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM v_task_queue ${where} ORDER BY created_at DESC`,
      params,
    );

    const taskIds = rows.map((t) => t.id);
    let comments = [];
    if (taskIds.length) {
      const { rows: cRows } = await pool.query(
        `SELECT tc.id, tc.task_id, tc.body, tc.comment_type, tc.created_at,
                u.name AS author_name
         FROM task_comments tc
         JOIN users u ON u.id = tc.author_id
         WHERE tc.task_id = ANY($1)
         ORDER BY tc.created_at ASC`,
        [taskIds],
      );
      comments = cRows;
    }

    const data = rows.map((t) => ({
      ...t,
      comments: comments.filter((c) => c.task_id === t.id),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("getAllTasks:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
};

// GET /api/incidents/:id/tasks
exports.getTasksByIncident = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT
         t.id, t.incident_id, t.task_no, t.title, t.note, t.priority, t.status,
         t.done_at, t.created_at, t.updated_at,
         u.id   AS assignee_id,
         u.name AS assignee_name,
         r.name AS role_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE t.incident_id = $1 AND t.is_deleted = FALSE
       ORDER BY t.created_at ASC`,
      [id],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getTasksByIncident:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
};

// POST /api/incidents/:id/tasks
// Body: { tasks: [{ title, note, priority, assigned_to_user_id }] }
exports.createTasks = async (req, res) => {
  const { id } = req.params;
  const { tasks } = req.body;
  // ✅ FIX: removed hardcoded || 27 fallback
  const created_by = req.user?.id ?? null;

  if (!Array.isArray(tasks) || !tasks.length)
    return res
      .status(400)
      .json({ success: false, message: "tasks array is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: incRows } = await client.query(
      `SELECT id FROM incidents WHERE id = $1 AND is_deleted = FALSE`,
      [id],
    );
    if (!incRows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    }

    const created = [];
    for (const task of tasks) {
      if (!task.title?.trim()) continue;

      let assignee_name = null;
      let role_name = null;
      if (task.assigned_to_user_id) {
        const { rows: userRows } = await client.query(
          `SELECT u.name, r.name AS role_name
           FROM users u
           LEFT JOIN roles r ON r.id = u.role_id
           WHERE u.id = $1`,
          [task.assigned_to_user_id],
        );
        if (userRows.length) {
          assignee_name = userRows[0].name;
          role_name = userRows[0].role_name;
        }
      }

      const { rows } = await client.query(
        `INSERT INTO tasks (incident_id, title, note, priority, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          task.title.trim(),
          task.note ?? null,
          task.priority ?? "P2",
          task.assigned_to_user_id ?? null,
          created_by,
        ],
      );

      // ✅ Return incident_id so frontend normaliseTask can set incidentId correctly
      created.push({ ...rows[0], incident_id: id, assignee_name, role_name });
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createTasks:", err);
    res.status(500).json({ success: false, message: "Failed to create tasks" });
  } finally {
    client.release();
  }
};

// PATCH /api/incidents/tasks/:taskId/status
exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status, blocked_reason } = req.body;
  const userId = req.user?.id ?? null;

  const validStatuses = ["Pending", "In Progress", "Done", "Blocked"];
  if (!validStatuses.includes(status))
    return res.status(400).json({ success: false, message: "Invalid status" });
  if (status === "Blocked" && !blocked_reason?.trim())
    return res
      .status(400)
      .json({
        success: false,
        message: "blocked_reason is required when marking Blocked",
      });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE tasks SET status = $1 WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
      [status, taskId],
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    if (userId)
      await patchHistoryUser(
        client,
        "task_status_history",
        "task_id",
        taskId,
        userId,
      );

    if (status === "Blocked") {
      await client.query(
        `INSERT INTO task_comments (task_id, author_id, body, comment_type)
         VALUES ($1, $2, $3, 'blocked')`,
        [taskId, userId, `🚫 Blocked: ${blocked_reason.trim()}`],
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateTaskStatus:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update task status" });
  } finally {
    client.release();
  }
};

// DELETE /api/incidents/tasks/:taskId
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET is_deleted = TRUE WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
      [taskId],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("deleteTask:", err);
    res.status(500).json({ success: false, message: "Failed to delete task" });
  }
};

/* ══════════════════════════════════════════════════════════════
   TASK COMMENTS
══════════════════════════════════════════════════════════════ */

exports.addTaskComment = async (req, res) => {
  const { taskId } = req.params;
  const { body } = req.body;
  const author_id = req.user?.id ?? null;

  if (!body?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Comment body is required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO task_comments (task_id, author_id, body, comment_type)
       VALUES ($1, $2, $3, 'comment')
       RETURNING id, body, comment_type, created_at`,
      [taskId, author_id, body.trim()],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("addTaskComment:", err);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
};

/* ══════════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════════ */

exports.getStats = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                                    AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed'))                 AS open,
        COUNT(*) FILTER (WHERE status IN ('Resolved','Closed'))                     AS resolved,
        COUNT(*) FILTER (WHERE priority = 'P1')                                     AS p1,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed') AND deadline_at < NOW()) AS overdue
      FROM incidents WHERE is_deleted = FALSE
    `);

    const { rows: taskRows } = await pool.query(`
      SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE status = 'Pending')                        AS pending,
        COUNT(*) FILTER (WHERE status = 'In Progress')                    AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Done')                           AS done,
        COUNT(*) FILTER (WHERE status = 'Blocked')                        AS blocked,
        COUNT(*) FILTER (WHERE priority = 'P1' AND status = 'Pending')    AS p1_urgent
      FROM tasks WHERE is_deleted = FALSE
    `);

    res.json({
      success: true,
      data: { incidents: rows[0], tasks: taskRows[0] },
    });
  } catch (err) {
    console.error("getStats:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};
