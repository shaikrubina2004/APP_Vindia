const pool = require("../config/db");

const isProjectManager = (req) => req.user?.role === "project_manager";

const getTeamMembers = async (req, projectId = null) => {
  const where = projectId === null ? "" : "WHERE tm.project_id = $2";
  const membersRes = isProjectManager(req)
    ? await pool.query(
        `SELECT tm.id, tm.name, tm.role, tm.type, tm.status, tm.project_id,
                p.name AS project_name,
                access.can_manage,
                CASE WHEN access.can_manage THEN tm.wage END AS wage,
                CASE WHEN access.can_manage THEN tm.days_worked END AS days_worked,
                CASE WHEN access.can_manage THEN tm.tasks_count END AS tasks_count
         FROM team_members tm
         LEFT JOIN projects p ON p.id = tm.project_id
         CROSS JOIN LATERAL (
           SELECT EXISTS (
             SELECT 1
             FROM projects managed_project
             JOIN employees manager ON manager.id = managed_project.manager_id
             WHERE managed_project.id = tm.project_id
               AND manager.user_id = $1
           ) AS can_manage
         ) access
         ${where}
         ORDER BY tm.name ASC`,
        projectId === null ? [req.user.id] : [req.user.id, projectId]
      )
    : await pool.query(
        `SELECT tm.*, p.name AS project_name, TRUE AS can_manage
         FROM team_members tm
         LEFT JOIN projects p ON p.id = tm.project_id
         ${projectId === null ? "" : "WHERE tm.project_id = $1"}
         ORDER BY tm.name ASC`,
        projectId === null ? [] : [projectId]
      );

  const memberIds = membersRes.rows
    .filter((member) => member.can_manage)
    .map((member) => member.id);
  let incidents = [];

  if (memberIds.length > 0) {
    const incRes = await pool.query(
      `SELECT member_id, text, severity, created_at
       FROM team_incidents
       WHERE member_id = ANY($1::int[])
       ORDER BY created_at DESC`,
      [memberIds]
    );
    incidents = incRes.rows;
  }

  return membersRes.rows.map((member) => ({
    ...member,
    incidents: incidents
      .filter((incident) => incident.member_id === member.id)
      .map((incident) => ({
        text: incident.text,
        severity: incident.severity,
        date: new Date(incident.created_at).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
      })),
  }));
};

const managedProjectAccess = (projectExpression, userPlaceholder) => `
  EXISTS (
    SELECT 1
    FROM projects managed_project
    JOIN employees manager ON manager.id = managed_project.manager_id
    WHERE managed_project.id = ${projectExpression}
      AND manager.user_id = ${userPlaceholder}
  )
`;

// ── GET ALL members (across all projects) ──
exports.getAllTeam = async (req, res) => {
  try {
    res.json(await getTeamMembers(req));
  } catch (err) {
    console.error("getAllTeam error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

// ── GET all members for a project ──
exports.getTeamByProject = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    res.json(await getTeamMembers(req, projectId));
  } catch (err) {
    console.error("getTeamByProject error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

// ── ADD member ──
exports.addMember = async (req, res) => {
  try {
    const { name, role, type, status, project_id, wage, days_worked, team_head } = req.body;

    const projectId = Number(project_id);
    if (!name?.trim() || !role?.trim() || !Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "name, role, and project_id are required" });
    }

    const result = await pool.query(
      `INSERT INTO team_members (name, role, type, status, project_id, wage, days_worked, team_head)
       SELECT $1, $2, $3, $4, p.id, $6, $7, $8
       FROM projects p
       WHERE p.id = $5
         AND ($9::boolean OR ${managedProjectAccess("p.id", "$10")})
       RETURNING *`,
      [
        name.trim(),
        role.trim(),
        type || "Staff",
        status || "Active",
        projectId,
        wage ? Number(wage) : null,
        days_worked ? Number(days_worked) : 0,
        team_head?.trim() || null,
        req.user.role === "ceo",
        req.user.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(403).json({ error: "You can only manage team members for projects you manage" });
    }

    const projectRes = await pool.query(
      "SELECT name FROM projects WHERE id = $1",
      [projectId]
    );

    res.status(201).json({
      ...result.rows[0],
      project_name: projectRes.rows[0]?.name || "",
      incidents: [],
    });
  } catch (err) {
    console.error("addMember error:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
};

// ── EDIT member ──
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status, project_id, wage, days_worked, tasks_count, team_head } = req.body;

    const targetProjectId = project_id == null ? null : Number(project_id);
    if (targetProjectId !== null && (!Number.isInteger(targetProjectId) || targetProjectId <= 0)) {
      return res.status(400).json({ error: "Invalid project_id" });
    }

    const result = await pool.query(
      `UPDATE team_members SET
         name        = COALESCE($1, name),
         role        = COALESCE($2, role),
         status      = COALESCE($3, status),
         project_id  = COALESCE($4, project_id),
         wage        = COALESCE($5, wage),
         days_worked = COALESCE($6, days_worked),
         tasks_count = COALESCE($7, tasks_count),
         team_head   = CASE WHEN $12::boolean THEN $8 ELSE team_head END
       WHERE id = $9
         AND ($10::boolean OR (
           ${managedProjectAccess("team_members.project_id", "$11")}
           AND ${managedProjectAccess("COALESCE($4::int, team_members.project_id)", "$11")}
         ))
       RETURNING *`,
      [
        name?.trim() || null,
        role?.trim() || null,
        status || null,
        targetProjectId,
        wage != null ? Number(wage) : null,
        days_worked != null ? Number(days_worked) : null,
        tasks_count != null ? Number(tasks_count) : null,
        team_head != null ? (team_head.trim() || null) : null,
        id,
        req.user.role === "ceo",
        req.user.id,
        team_head != null,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found or not in a project you manage" });
    }

    const projectRes = await pool.query(
      "SELECT name FROM projects WHERE id = $1",
      [result.rows[0].project_id]
    );

    res.json({
      ...result.rows[0],
      project_name: projectRes.rows[0]?.name || "",
    });
  } catch (err) {
    console.error("updateMember error:", err);
    res.status(500).json({ error: "Failed to update member" });
  }
};

// ── DELETE member ──
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM team_members
       WHERE id = $1
         AND ($2::boolean OR ${managedProjectAccess("team_members.project_id", "$3")})
       RETURNING id`,
      [id, req.user.role === "ceo", req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found or not in a project you manage" });
    }
    res.json({ message: "Member removed successfully" });
  } catch (err) {
    console.error("deleteMember error:", err);
    res.status(500).json({ error: "Failed to delete member" });
  }
};

// ── LOG incident ──
exports.logIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, severity } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Incident description is required" });
    }

    const result = await pool.query(
      `INSERT INTO team_incidents (member_id, text, severity)
       SELECT tm.id, $2, $3
       FROM team_members tm
       WHERE tm.id = $1
         AND ($4::boolean OR ${managedProjectAccess("tm.project_id", "$5")})
       RETURNING member_id`,
      [id, text.trim(), severity || "Low", req.user.role === "ceo", req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found or not in a project you manage" });
    }

    res.json({ message: "Incident logged" });
  } catch (err) {
    console.error("logIncident error:", err);
    res.status(500).json({ error: "Failed to log incident" });
  }
};

// ── ASSIGN task ──
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, priority, due_date } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({ error: "Task description is required" });
    }

    const result = await pool.query(
      `WITH inserted_task AS (
         INSERT INTO team_tasks (member_id, description, priority, due_date)
         SELECT tm.id, $2, $3, $4
         FROM team_members tm
         WHERE tm.id = $1
           AND ($5::boolean OR ${managedProjectAccess("tm.project_id", "$6")})
         RETURNING member_id
       )
       UPDATE team_members tm
       SET tasks_count = COALESCE(tm.tasks_count, 0) + 1
       FROM inserted_task task
       WHERE tm.id = task.member_id
       RETURNING tm.tasks_count`,
      [id, description.trim(), priority || "Normal", due_date || null, req.user.role === "ceo", req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found or not in a project you manage" });
    }

    res.json({ message: "Task assigned", tasks_count: result.rows[0]?.tasks_count });
  } catch (err) {
    console.error("assignTask error:", err);
    res.status(500).json({ error: "Failed to assign task" });
  }
};