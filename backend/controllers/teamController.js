const pool = require("../config/db");

// ── GET ALL members (across all projects) ──
exports.getAllTeam = async (req, res) => {
  try {
    const membersRes = await pool.query(
      `SELECT tm.*, p.name AS project_name
       FROM team_members tm
       LEFT JOIN projects p ON p.id = tm.project_id
       ORDER BY tm.name ASC`
    );

    const memberIds = membersRes.rows.map((m) => m.id);
    let incidents = [];

    if (memberIds.length > 0) {
      const incRes = await pool.query(
        `SELECT * FROM team_incidents
         WHERE member_id = ANY($1::int[])
         ORDER BY created_at DESC`,
        [memberIds]
      );
      incidents = incRes.rows;
    }

    const members = membersRes.rows.map((m) => ({
      ...m,
      incidents: incidents
        .filter((i) => i.member_id === m.id)
        .map((i) => ({
          text: i.text,
          severity: i.severity,
          date: new Date(i.created_at).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
        })),
    }));

    res.json(members);
  } catch (err) {
    console.error("getAllTeam error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

// ── GET all members for a project ──
exports.getTeamByProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId); // ✅ convert to integer

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const membersRes = await pool.query(
      `SELECT tm.*, p.name AS project_name
       FROM team_members tm
       LEFT JOIN projects p ON p.id = tm.project_id
       WHERE tm.project_id = $1
       ORDER BY tm.name ASC`,
      [projectId]
    );

    const memberIds = membersRes.rows.map((m) => m.id);
    let incidents = [];

    if (memberIds.length > 0) {
      const incRes = await pool.query(
        `SELECT * FROM team_incidents
         WHERE member_id = ANY($1::int[])
         ORDER BY created_at DESC`,
        [memberIds]
      );
      incidents = incRes.rows;
    }

    const members = membersRes.rows.map((m) => ({
      ...m,
      incidents: incidents
        .filter((i) => i.member_id === m.id)
        .map((i) => ({
          text: i.text,
          severity: i.severity,
          date: new Date(i.created_at).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
        })),
    }));

    res.json(members);
  } catch (err) {
    console.error("getTeamByProject error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

// ── ADD member ──
exports.addMember = async (req, res) => {
  try {
    const { name, role, type, status, project_id, wage, days_worked, team_head } = req.body;

    console.log("addMember body:", req.body);

    if (!name?.trim() || !role?.trim() || !project_id) {
      return res.status(400).json({ error: "name, role, and project_id are required" });
    }

    const result = await pool.query(
      `INSERT INTO team_members (name, role, type, status, project_id, wage, days_worked, team_head)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name.trim(),
        role.trim(),
        type || "Staff",
        status || "Active",
        parseInt(project_id),
        wage ? Number(wage) : null,
        days_worked ? Number(days_worked) : 0,
        team_head?.trim() || null,
      ]
    );

    // ✅ fetch project_name to return with member
    const projectRes = await pool.query(
      "SELECT name FROM projects WHERE id = $1",
      [parseInt(project_id)]
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

    const existing = await pool.query(
      "SELECT * FROM team_members WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }
    const old = existing.rows[0];

    const result = await pool.query(
      `UPDATE team_members SET
         name        = $1,
         role        = $2,
         status      = $3,
         project_id  = $4,
         wage        = $5,
         days_worked = $6,
         tasks_count = $7,
         team_head   = $8
       WHERE id = $9
       RETURNING *`,
      [
        name?.trim()          || old.name,
        role?.trim()          || old.role,
        status                || old.status,
        project_id ? parseInt(project_id) : old.project_id,
        wage != null ? Number(wage) : old.wage,
        days_worked != null ? Number(days_worked) : old.days_worked,
        tasks_count != null ? Number(tasks_count) : old.tasks_count,
        team_head != null ? (team_head.trim() || null) : old.team_head,
        id,
      ]
    );

    // ✅ fetch project_name to return with updated member
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
      "DELETE FROM team_members WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
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

    await pool.query(
      `INSERT INTO team_incidents (member_id, text, severity)
       VALUES ($1, $2, $3)`,
      [id, text.trim(), severity || "Low"]
    );

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

    await pool.query(
      `INSERT INTO team_tasks (member_id, description, priority, due_date)
       VALUES ($1, $2, $3, $4)`,
      [id, description.trim(), priority || "Normal", due_date || null]
    );

    const result = await pool.query(
      `UPDATE team_members SET tasks_count = tasks_count + 1
       WHERE id = $1 RETURNING tasks_count`,
      [id]
    );

    res.json({ message: "Task assigned", tasks_count: result.rows[0]?.tasks_count });
  } catch (err) {
    console.error("assignTask error:", err);
    res.status(500).json({ error: "Failed to assign task" });
  }
};