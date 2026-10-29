const pool = require("../config/db");
const teamNotify = require("../utils/teamNotifications");

const ROLE = (req) =>
  String(req.user?.role || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
const USER_ID = (req) =>
  req.user?.id ?? req.user?.user_id ?? req.user?.userId ?? null;
const isExecutive = (req) =>
  ["ceo", "admin", "administrator"].includes(ROLE(req));
const isPM = (req) => ROLE(req) === "project_manager";

// Project Managers are scoped through projects.manager_id -> employees.id -> employees.user_id.
// CEO/admin retain company-wide visibility. Other permitted read-only roles must not inherit PM write access.
async function canAccessProject(req, projectId, client = pool) {
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) return false;
  if (isExecutive(req)) return true;

  // Full Team Management access is restricted to Project Managers.
  // Other roles must use their own role-specific pages and APIs.
  if (!isPM(req)) return false;

  const uid = USER_ID(req);
  if (uid == null) return false;

  const result = await client.query(
    `SELECT 1
       FROM projects p
       JOIN employees e ON e.id = p.manager_id
      WHERE p.id = $1
        AND e.user_id = $2
      LIMIT 1`,
    [numericProjectId, uid],
  );
  return result.rowCount > 0;
}

async function assertProject(req, projectId, client = pool) {
  if (!(await canAccessProject(req, projectId, client))) {
    const error = new Error("You do not have access to this project");
    error.status = 403;
    throw error;
  }
}
async function getMember(id, req, client = pool, lock = false) {
  const r = await client.query(
    `SELECT tm.*, p.name AS project_name FROM team_members tm JOIN projects p ON p.id=tm.project_id WHERE tm.id=$1 ${lock ? "FOR UPDATE OF tm" : ""}`,
    [id],
  );
  if (!r.rows.length) {
    const e = new Error("Team member not found");
    e.status = 404;
    throw e;
  }
  await assertProject(req, r.rows[0].project_id, client);
  return r.rows[0];
}
function handleError(res, err, fallback) {
  console.error(fallback, err);
  return res
    .status(err.status || 500)
    .json({ error: err.status ? err.message : fallback });
}
const badRequest = (message) => {
  const e = new Error(message);
  e.status = 400;
  return e;
};
const MEMBER_TYPES = ["Staff", "Labour"];
const MEMBER_STATUSES = ["Active", "On Leave", "Inactive"];
const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"];
// Invalid dates used to reach Postgres and come back as a generic 500.
const parseOptionalDate = (value, label) => {
  if (value == null || value === "") return null;
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s)
    throw badRequest(`${label} must be a valid date (YYYY-MM-DD)`);
  return s;
};
const cleanText = (value, label, max) => {
  const s = String(value ?? "").trim();
  if (s.length > max) throw badRequest(`${label} must be ${max} characters or fewer`);
  return s;
};
const parseOptionalAmount = (value, label) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw badRequest(`${label} must be a valid non-negative number`);
  return Math.round(n * 100) / 100;
};
// Staff roles come from the same `roles` table HR uses for employee designations (portal-only
// "Client" excluded), so free-typed roles cannot creep in. Returns the canonical spelling.
async function resolveStaffRole(role, client = pool) {
  const r = await client.query(
    `SELECT name FROM roles
      WHERE is_active = true AND LOWER(name) = LOWER($1) AND LOWER(name) <> 'client'
      LIMIT 1`,
    [role],
  );
  if (!r.rowCount) throw badRequest("Staff role must be chosen from the role list");
  return r.rows[0].name;
}
// Cancelled tasks are no longer open work, so they must not count toward tasks_count.
const OPEN_TASKS_SQL = `(SELECT COUNT(*)::int FROM team_tasks WHERE member_id=$1 AND status NOT IN ('Completed','Cancelled'))`;

async function withIncidents(members, client = pool) {
  const ids = members.map((m) => m.id);
  if (!ids.length) return members.map((m) => ({ ...m, incidents: [] }));
  const result = await client.query(
    `SELECT id, member_id, text, severity, created_at, status, due_date, created_by_user_id, resolved_at
     FROM team_incidents WHERE member_id = ANY($1::int[]) ORDER BY created_at DESC`,
    [ids],
  );
  return members.map((m) => ({
    ...m,
    incidents: result.rows
      .filter((i) => Number(i.member_id) === Number(m.id))
      .map((i) => ({
        ...i,
        date: i.created_at
          ? new Date(i.created_at).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })
          : "",
      })),
  }));
}

// ---------------------------------------------------------------------------
// Roster: everyone who works on a project but is not (yet) a team_members row.
//   labour_registry - workers the Site Engineer registered against the project
//   staff           - HR employees assigned to the project (PM / site engineer / coordinator /
//                     architect) or who booked timesheet hours to it recently
// Anyone already linked from team_members (worker_id / employee_id) is left out, so nobody repeats.
// ---------------------------------------------------------------------------
const ROSTER_STAFF_DAYS = 90;

async function loadRosterExtras(projectIds, excludeUserId = null, client = pool) {
  const [workers, staff] = await Promise.all([
    client.query(
      `SELECT 'labour_registry' AS source, w.id AS source_id, w.full_name AS name,
              COALESCE(NULLIF(w.trade, ''), 'Labour') AS role, 'Labour' AS type,
              INITCAP(COALESCE(w.status, 'active')) AS status,
              w.project_id, p.name AS project_name,
              NULLIF(w.contractor_name, '') AS detail, NULL::numeric AS hours
         FROM workers w
         JOIN projects p ON p.id = w.project_id
        WHERE w.is_deleted IS NOT TRUE
          AND COALESCE(w.status, 'active') <> 'inactive'
          AND ($1::int[] IS NULL OR w.project_id = ANY($1::int[]))
          AND NOT EXISTS (SELECT 1 FROM team_members tm
                           WHERE tm.worker_id = w.id AND tm.project_id = w.project_id)
        ORDER BY p.name, w.full_name`,
      [projectIds],
    ),
    client.query(
      `WITH assigned AS (
         SELECT p.id AS project_id, e.id AS employee_id, 'Project Manager' AS label
           FROM projects p JOIN employees e ON e.id = p.manager_id
         UNION ALL SELECT p.id, e.id, 'Site Engineer'
           FROM projects p JOIN employees e ON e.user_id = p.site_engineer_id
         UNION ALL SELECT p.id, e.id, 'Project Coordinator'
           FROM projects p JOIN employees e ON e.user_id = p.coordinator_id
         UNION ALL SELECT p.id, e.id, 'Architect'
           FROM projects p JOIN employees e ON e.user_id = p.architect_id
       ), logged AS (
         SELECT te.project_id, ts.employee_id,
                SUM(te.regular_hours + te.overtime_hours) AS hours
           FROM timesheet_entries te
           JOIN timesheets ts ON ts.id = te.timesheet_id
          WHERE te.project_id IS NOT NULL
            AND te.work_date >= CURRENT_DATE - $2::int
            AND te.regular_hours + te.overtime_hours > 0
          GROUP BY te.project_id, ts.employee_id
       ), pe AS (
         SELECT project_id, employee_id FROM assigned
         UNION SELECT project_id, employee_id FROM logged
       )
       SELECT 'staff' AS source, e.id AS source_id, e.name,
              COALESCE(NULLIF(e.designation, ''), 'Staff') AS role, 'Staff' AS type,
              INITCAP(COALESCE(e.status, 'active')) AS status,
              pe.project_id, p.name AS project_name,
              NULLIF(CONCAT_WS(' · ',
                (SELECT string_agg(DISTINCT a.label, ', ') FROM assigned a
                  WHERE a.project_id = pe.project_id AND a.employee_id = pe.employee_id),
                CASE WHEN l.hours IS NOT NULL
                     THEN ROUND(l.hours, 1)::text || ' h logged (last ' || $2::int || ' days)' END
              ), '') AS detail,
              l.hours
         FROM pe
         JOIN employees e ON e.id = pe.employee_id
         JOIN projects p ON p.id = pe.project_id
         LEFT JOIN logged l ON l.project_id = pe.project_id AND l.employee_id = pe.employee_id
        WHERE ($1::int[] IS NULL OR pe.project_id = ANY($1::int[]))
          AND ($3::int IS NULL OR e.user_id IS DISTINCT FROM $3::int)
          AND NOT EXISTS (SELECT 1 FROM team_members tm
                           WHERE tm.employee_id = e.id AND tm.project_id = pe.project_id)
        ORDER BY p.name, e.name`,
      [projectIds, ROSTER_STAFF_DAYS, excludeUserId],
    ),
  ]);
  return [...workers.rows, ...staff.rows];
}

exports.getRoster = async (req, res) => {
  try {
    let projectIds = null;
    let excludeUserId = null;
    if (!isExecutive(req)) {
      if (!isPM(req)) return res.status(403).json({ error: "Only Project Managers and executives can access Team Management" });
      const uid = USER_ID(req);
      if (uid == null) return res.status(401).json({ error: "Authenticated user ID is missing" });
      const owned = await pool.query(
        `SELECT p.id FROM projects p JOIN employees e ON e.id = p.manager_id WHERE e.user_id = $1`,
        [uid],
      );
      projectIds = owned.rows.map((r) => r.id);
      excludeUserId = uid; // the PM does not need to add themselves
      if (!projectIds.length) return res.json([]);
    }
    res.json(await loadRosterExtras(projectIds, excludeUserId));
  } catch (err) {
    handleError(res, err, "Failed to fetch project roster");
  }
};

// Adds one roster person to a project's team, linked so they are never listed twice.
exports.importToTeam = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "Only Project Managers can add team members" });
    const projectId = Number(req.body.project_id);
    const source = req.body.source;
    const sourceId = String(req.body.source_id ?? "").trim();
    if (!Number.isInteger(projectId) || projectId <= 0) throw badRequest("A valid project is required");
    if (!["labour_registry", "staff"].includes(source)) throw badRequest("source must be labour_registry or staff");
    if (!/^[A-Za-z0-9-]{1,40}$/.test(sourceId)) throw badRequest("source_id is required");

    await client.query("BEGIN");
    await assertProject(req, projectId, client);

    const person = (await loadRosterExtras([projectId], null, client)).find(
      (x) => x.source === source && String(x.source_id) === sourceId && Number(x.project_id) === projectId,
    );
    if (!person) {
      const e = new Error("That person is not on this project, or is already in the team");
      e.status = 404;
      throw e;
    }
    const dup = await client.query(
      `SELECT 1 FROM team_members WHERE project_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [projectId, person.name],
    );
    if (dup.rowCount) {
      const e = new Error(`A team member named "${person.name}" already exists on this project. Edit that entry instead.`);
      e.status = 409;
      throw e;
    }

    let wage = null;
    if (source === "labour_registry") {
      const w = await client.query(`SELECT daily_wage FROM workers WHERE id = $1`, [sourceId]);
      wage = w.rows[0]?.daily_wage ?? null;
    }
    const status = person.status === "Active" ? "Active" : person.status === "Suspended" ? "On Leave" : "Active";
    const inserted = await client.query(
      `INSERT INTO team_members (name, role, type, status, project_id, wage, days_worked, hours, worker_id, employee_id)
       VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8) RETURNING *`,
      [
        person.name,
        person.role,
        person.type,
        status,
        projectId,
        wage,
        source === "labour_registry" ? sourceId : null,
        source === "staff" ? sourceId : null,
      ],
    );
    await client.query("COMMIT");
    await teamNotify.memberAdded({ ...inserted.rows[0], project_name: person.project_name }, USER_ID(req));
    res.status(201).json({ ...inserted.rows[0], project_name: person.project_name, incidents: [] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505") {
      return res.status(409).json({ error: "That person is already in this project's team" });
    }
    handleError(res, err, "Failed to add to team");
  } finally {
    client.release();
  }
};

// "My project team": every employee can see who works on the projects they belong to.
// You belong to a project if you are assigned to it (PM / site engineer / coordinator / architect),
// were added to its team, or booked timesheet hours to it recently.
// Read-only, and deliberately without wages, ID documents or incident/task notes.
exports.getMyProjectTeams = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() === "client")
      return res.status(403).json({ error: "Not available for client accounts" });
    const uid = USER_ID(req);
    if (uid == null) return res.status(401).json({ error: "Authenticated user ID is missing" });

    const emp = await pool.query(`SELECT id FROM employees WHERE user_id = $1 LIMIT 1`, [uid]);
    if (!emp.rowCount) return res.json([]);
    const empId = emp.rows[0].id;

    const mine = await pool.query(
      `SELECT p.id FROM projects p
        WHERE p.manager_id = $2
           OR p.site_engineer_id = $1 OR p.coordinator_id = $1 OR p.architect_id = $1
           OR EXISTS (SELECT 1 FROM team_members tm
                       WHERE tm.project_id = p.id AND tm.employee_id = $2 AND tm.status <> 'Inactive')
           OR EXISTS (SELECT 1 FROM timesheet_entries te
                        JOIN timesheets ts ON ts.id = te.timesheet_id
                       WHERE te.project_id = p.id AND ts.employee_id = $2
                         AND te.work_date >= CURRENT_DATE - $3::int
                         AND te.regular_hours + te.overtime_hours > 0)`,
      [uid, empId, ROSTER_STAFF_DAYS],
    );
    const ids = mine.rows.map((r) => r.id);
    if (!ids.length) return res.json([]);

    const [projects, team, extras] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, e.name AS project_manager
           FROM projects p LEFT JOIN employees e ON e.id = p.manager_id
          WHERE p.id = ANY($1::int[]) ORDER BY p.name`,
        [ids],
      ),
      pool.query(
        `SELECT tm.id, tm.name, tm.role, tm.type, tm.status, tm.project_id, tm.team_head, tm.employee_id
           FROM team_members tm
          WHERE tm.project_id = ANY($1::int[]) AND tm.status <> 'Inactive'`,
        [ids],
      ),
      loadRosterExtras(ids, null),
    ]);

    const isMe = (v) => v != null && String(v) === String(empId);
    const byProject = new Map(projects.rows.map((p) => [p.id, { project_id: p.id, project_name: p.name, project_manager: p.project_manager, people: [] }]));
    for (const m of team.rows) {
      byProject.get(m.project_id)?.people.push({
        key: `team-${m.id}`, source: "team", name: m.name, role: m.role, type: m.type, status: m.status,
        detail: m.team_head ? `Team head: ${m.team_head}` : null, is_me: isMe(m.employee_id),
      });
    }
    for (const x of extras) {
      byProject.get(x.project_id)?.people.push({
        key: `${x.source}-${x.source_id}`, source: x.source, name: x.name, role: x.role, type: x.type,
        status: x.status, detail: x.detail, is_me: x.source === "staff" && isMe(x.source_id),
      });
    }
    for (const p of byProject.values())
      p.people.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "Staff" ? -1 : 1));
    res.json([...byProject.values()]);
  } catch (err) {
    handleError(res, err, "Failed to fetch your project team");
  }
};

// ---------------------------------------------------------------------------
// Activity feed behind the floating "My Project Team" widget (badge + pop-out alerts).
// Always scoped to the signed-in user: nobody can read or clear anyone else's feed.
// ---------------------------------------------------------------------------
function activityUser(req, res) {
  if (String(req.user?.role || "").toLowerCase() === "client") {
    res.status(403).json({ error: "Not available for client accounts" });
    return null;
  }
  const uid = USER_ID(req);
  if (uid == null) {
    res.status(401).json({ error: "Authenticated user ID is missing" });
    return null;
  }
  return uid;
}

exports.getTeamActivity = async (req, res) => {
  try {
    const uid = activityUser(req, res);
    if (uid == null) return;
    const [items, unseen] = await Promise.all([
      pool.query(
        `SELECT id, kind, title, description, severity, project_id, is_seen, created_at
           FROM team_activity WHERE user_id = $1 ORDER BY id DESC LIMIT 30`,
        [uid],
      ),
      pool.query(`SELECT COUNT(*)::int AS n FROM team_activity WHERE user_id = $1 AND is_seen = FALSE`, [uid]),
    ]);
    res.json({ items: items.rows, unseen: unseen.rows[0].n, latest_id: items.rows[0]?.id ?? 0 });
  } catch (err) {
    handleError(res, err, "Failed to fetch team activity");
  }
};

exports.markTeamActivitySeen = async (req, res) => {
  try {
    const uid = activityUser(req, res);
    if (uid == null) return;
    const upTo = Number(req.body?.up_to);
    if (!Number.isInteger(upTo) || upTo < 0) throw badRequest("up_to must be a valid activity id");
    await pool.query(
      `UPDATE team_activity SET is_seen = TRUE WHERE user_id = $1 AND id <= $2 AND is_seen = FALSE`,
      [uid, upTo],
    );
    const unseen = await pool.query(`SELECT COUNT(*)::int AS n FROM team_activity WHERE user_id = $1 AND is_seen = FALSE`, [uid]);
    res.json({ unseen: unseen.rows[0].n });
  } catch (err) {
    handleError(res, err, "Failed to update team activity");
  }
};

// Read-only, company-wide summary for the Operations Manager.
// Deliberately omits wage and incident/task text: oversight needs counts, not pay or notes.
exports.getTeamOverview = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tm.id, tm.name, tm.role, tm.type, tm.status, tm.project_id,
              p.name AS project_name, tm.team_head,
              COALESCE(tm.days_worked, 0) AS days_worked,
              COALESCE(tm.hours, 0) AS hours,
              (SELECT COUNT(*)::int FROM team_tasks tt
                WHERE tt.member_id = tm.id
                  AND tt.status NOT IN ('Completed','Cancelled')) AS open_tasks,
              (SELECT COUNT(*)::int FROM team_tasks tt
                WHERE tt.member_id = tm.id
                  AND tt.status NOT IN ('Completed','Cancelled')
                  AND tt.due_date < CURRENT_DATE) AS overdue_tasks,
              (SELECT COUNT(*)::int FROM team_incidents ti
                WHERE ti.member_id = tm.id
                  AND COALESCE(ti.status, 'Open') NOT IN ('Resolved','Closed')) AS open_incidents
         FROM team_members tm
         JOIN projects p ON p.id = tm.project_id
        ORDER BY p.name, tm.name`,
    );
    // Team members first, then registry workers and staff who are not in a team yet.
    const extras = await loadRosterExtras(null);
    res.json([
      ...result.rows.map((r) => ({ ...r, source: "team", detail: null })),
      ...extras.map((x) => ({
        id: x.source_id, source: x.source, name: x.name, role: x.role, type: x.type,
        status: x.status, project_id: x.project_id, project_name: x.project_name,
        team_head: null, days_worked: null, hours: x.hours,
        open_tasks: null, overdue_tasks: null, open_incidents: null, detail: x.detail,
      })),
    ]);
  } catch (err) {
    handleError(res, err, "Failed to fetch team overview");
  }
};

exports.getAllTeam = async (req, res) => {
  try {
    let query = `
      SELECT tm.*, p.name AS project_name
      FROM team_members tm
      JOIN projects p ON p.id = tm.project_id`;
    const params = [];

    if (!isExecutive(req)) {
      if (!isPM(req)) {
        return res.status(403).json({
          error: "Only Project Managers and executives can access Team Management",
        });
      }

      const uid = USER_ID(req);
      if (uid == null) {
        return res.status(401).json({ error: "Authenticated user ID is missing" });
      }

      query += `
        WHERE EXISTS (
          SELECT 1
          FROM employees e
          WHERE e.id = p.manager_id
            AND e.user_id = $1
        )`;
      params.push(uid);
    }

    query += " ORDER BY p.name, tm.name";
    const result = await pool.query(query, params);
    res.json(await withIncidents(result.rows));
  } catch (err) {
    handleError(res, err, "Failed to fetch team");
  }
};

exports.getTeamByProject = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0)
      return res.status(400).json({ error: "Invalid project ID" });
    await assertProject(req, projectId);
    const result = await pool.query(
      `SELECT tm.*, p.name AS project_name FROM team_members tm JOIN projects p ON p.id=tm.project_id WHERE tm.project_id=$1 ORDER BY tm.name`,
      [projectId],
    );
    res.json(await withIncidents(result.rows));
  } catch (err) {
    handleError(res, err, "Failed to fetch team");
  }
};

exports.addMember = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      role,
      type,
      status,
      project_id,
      wage,
      days_worked,
      team_head,
      hours,
    } = req.body;
    const projectId = Number(project_id);
    if (
      !String(name || "").trim() ||
      !String(role || "").trim() ||
      !Number.isInteger(projectId) ||
      projectId <= 0
    )
      return res
        .status(400)
        .json({ error: "Valid name, role, and project_id are required" });
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot add team members" });

    if (type != null && type !== "" && !MEMBER_TYPES.includes(type))
      throw badRequest(`Type must be one of: ${MEMBER_TYPES.join(", ")}`);
    if (status != null && status !== "" && !MEMBER_STATUSES.includes(status))
      throw badRequest(`Status must be one of: ${MEMBER_STATUSES.join(", ")}`);
    const memberName = cleanText(name, "Name", 120);
    const memberRole = cleanText(role, "Role", 120);
    const memberHead = cleanText(team_head, "Team head", 120);
    const wageValue = parseOptionalAmount(wage, "Wage");
    const daysValue = parseOptionalAmount(days_worked, "Days worked");
    const hoursValue = parseOptionalAmount(hours, "Hours");

    await client.query("BEGIN");
    await assertProject(req, projectId, client);
    const project = await client.query(
      "SELECT id, name FROM projects WHERE id=$1",
      [projectId],
    );
    if (!project.rows.length) {
      const e = new Error("Project not found");
      e.status = 404;
      throw e;
    }
    const finalType = type || "Staff";
    const finalRole = finalType === "Staff" ? await resolveStaffRole(memberRole, client) : memberRole;
    const result = await client.query(
      `INSERT INTO team_members (name, role, type, status, project_id, wage, days_worked, team_head, hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        memberName,
        finalRole,
        finalType,
        status || "Active",
        projectId,
        wageValue,
        daysValue ?? 0,
        memberHead || null,
        hoursValue ?? 0,
      ],
    );
    await client.query("COMMIT");
    await teamNotify.memberAdded({ ...result.rows[0], project_name: project.rows[0].name }, USER_ID(req));
    res
      .status(201)
      .json({
        ...result.rows[0],
        project_name: project.rows[0].name,
        incidents: [],
      });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to add member");
  } finally {
    client.release();
  }
};

exports.updateMember = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot edit team members" });
    await client.query("BEGIN");
    const old = await getMember(req.params.id, req, client, true);
    const b = req.body;
    const projectId =
      b.project_id == null ? Number(old.project_id) : Number(b.project_id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      const e = new Error("Invalid project ID");
      e.status = 400;
      throw e;
    }
    await assertProject(req, projectId, client);
    if (b.status != null && b.status !== "" && !MEMBER_STATUSES.includes(b.status))
      throw badRequest(`Status must be one of: ${MEMBER_STATUSES.join(", ")}`);
    const memberName = cleanText(b.name ?? old.name, "Name", 120);
    const memberRole = cleanText(b.role ?? old.role, "Role", 120);
    if (!memberName || !memberRole) throw badRequest("Name and role cannot be empty");
    const roleChanged = memberRole.toLowerCase() !== String(old.role || "").toLowerCase();
    const finalRole =
      old.type === "Staff" && roleChanged ? await resolveStaffRole(memberRole, client) : memberRole;
    const wageValue = parseOptionalAmount(b.wage, "Wage");
    const daysValue = parseOptionalAmount(b.days_worked, "Days worked");
    const hoursValue = parseOptionalAmount(b.hours, "Hours");
    const project = await client.query(
      "SELECT id,name FROM projects WHERE id=$1",
      [projectId],
    );
    if (!project.rows.length) {
      const e = new Error("Project not found");
      e.status = 404;
      throw e;
    }
    const result = await client.query(
      `UPDATE team_members SET name=$1, role=$2, status=$3, project_id=$4, wage=$5, days_worked=$6, team_head=$7, hours=$8 WHERE id=$9 RETURNING *`,
      [
        memberName,
        finalRole,
        b.status || old.status,
        projectId,
        wageValue ?? old.wage,
        daysValue ?? old.days_worked,
        b.team_head == null
          ? old.team_head
          : cleanText(b.team_head, "Team head", 120) || null,
        hoursValue ?? old.hours ?? 0,
        old.id,
      ],
    );
    await client.query("COMMIT");
    await teamNotify.memberChanged(old, { ...result.rows[0], project_name: project.rows[0].name }, USER_ID(req));
    res.json({ ...result.rows[0], project_name: project.rows[0].name });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to update member");
  } finally {
    client.release();
  }
};

exports.deleteMember = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot remove team members" });
    await client.query("BEGIN");
    const member = await getMember(req.params.id, req, client, true);
    const incidents = await client.query(
      "SELECT 1 FROM team_incidents WHERE member_id=$1 LIMIT 1",
      [member.id],
    );
    const tasks = await client.query(
      "SELECT 1 FROM team_tasks WHERE member_id=$1 LIMIT 1",
      [member.id],
    );
    if (incidents.rowCount || tasks.rowCount) {
      const e = new Error(
        "This member has task or incident history. Mark the member Inactive instead of deleting them.",
      );
      e.status = 409;
      throw e;
    }
    await client.query("DELETE FROM team_members WHERE id=$1", [member.id]);
    await client.query("COMMIT");
    await teamNotify.memberLeft(member, USER_ID(req));
    res.json({ message: "Member removed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to delete member");
  } finally {
    client.release();
  }
};

exports.logIncident = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot raise team incidents" });
    const text = cleanText(req.body.text, "Incident description", 1000);
    const dueDate = parseOptionalDate(req.body.due_date, "Due date");
    const severity = String(req.body.severity || "Low");
    if (!text)
      return res
        .status(400)
        .json({ error: "Incident description is required" });
    if (!["Low", "Medium", "High", "Critical"].includes(severity))
      return res.status(400).json({ error: "Invalid incident severity" });
    await client.query("BEGIN");
    const member = await getMember(req.params.id, req, client, true);
    const result = await client.query(
      `INSERT INTO team_incidents (member_id, text, severity, created_by_user_id, status, due_date)
       VALUES ($1,$2,$3,$4,'Open',$5)
       RETURNING id, member_id, text, severity, created_at, created_by_user_id, status, due_date, resolved_at`,
      [member.id, text, severity, USER_ID(req), dueDate],
    );
    await client.query("COMMIT");
    res
      .status(201)
      .json({
        ...result.rows[0],
        date: new Date(result.rows[0].created_at).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
      });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to log incident");
  } finally {
    client.release();
  }
};

exports.updateIncident = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res
        .status(403)
        .json({ error: "You cannot update team incidents" });
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT i.*, tm.project_id FROM team_incidents i JOIN team_members tm ON tm.id=i.member_id WHERE i.id=$1 FOR UPDATE`,
      [req.params.incidentId],
    );
    if (!existing.rows.length) {
      const e = new Error("Incident not found");
      e.status = 404;
      throw e;
    }
    await assertProject(req, existing.rows[0].project_id, client);
    const status =
      req.body.status == null
        ? existing.rows[0].status
        : String(req.body.status);
    if (!["Open", "In Progress", "Resolved", "Closed"].includes(status)) {
      const e = new Error("Invalid incident status");
      e.status = 400;
      throw e;
    }
    const result = await client.query(
      `UPDATE team_incidents SET status=$1::varchar, resolved_at=CASE WHEN $1::varchar IN ('Resolved','Closed') THEN COALESCE(resolved_at,NOW()) ELSE NULL END WHERE id=$2 RETURNING *`,
      [status, req.params.incidentId],
    );
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to update incident");
  } finally {
    client.release();
  }
};

exports.getTasks = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req);
    const r = await pool.query(
      `SELECT * FROM team_tasks WHERE member_id=$1 ORDER BY due_date NULLS LAST, id DESC`,
      [member.id],
    );
    res.json(r.rows);
  } catch (err) {
    handleError(res, err, "Failed to fetch team tasks");
  }
};
exports.assignTask = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot assign team tasks" });
    const description = cleanText(req.body.description, "Task description", 1000);
    const priority = String(req.body.priority || "Normal");
    const dueDate = parseOptionalDate(req.body.due_date, "Due date");
    if (!description)
      return res.status(400).json({ error: "Task description is required" });
    if (!TASK_PRIORITIES.includes(priority))
      return res.status(400).json({ error: "Invalid task priority" });
    await client.query("BEGIN");
    const member = await getMember(req.params.id, req, client, true);
    const task = await client.query(
      `INSERT INTO team_tasks (member_id, description, priority, due_date, created_by_user_id, status) VALUES ($1,$2,$3,$4,$5,'Pending') RETURNING *`,
      [member.id, description, priority, dueDate, USER_ID(req)],
    );
    const count = await client.query(
      `UPDATE team_members SET tasks_count=${OPEN_TASKS_SQL} WHERE id=$1 RETURNING tasks_count`,
      [member.id],
    );
    await client.query("COMMIT");
    await teamNotify.taskAssigned(member, task.rows[0], USER_ID(req));
    res
      .status(201)
      .json({ ...task.rows[0], tasks_count: count.rows[0]?.tasks_count ?? 1 });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to assign task");
  } finally {
    client.release();
  }
};
exports.updateTask = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isExecutive(req) && !isPM(req))
      return res.status(403).json({ error: "You cannot update team tasks" });
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT t.*, tm.project_id FROM team_tasks t JOIN team_members tm ON tm.id=t.member_id WHERE t.id=$1 FOR UPDATE`,
      [req.params.taskId],
    );
    if (!found.rows.length) {
      const e = new Error("Task not found");
      e.status = 404;
      throw e;
    }
    await assertProject(req, found.rows[0].project_id, client);
    const hasDue = Object.prototype.hasOwnProperty.call(req.body, "due_date");
    const dueDate = hasDue ? parseOptionalDate(req.body.due_date, "Due date") : null;
    if (req.body.priority != null && !TASK_PRIORITIES.includes(String(req.body.priority)))
      throw badRequest("Invalid task priority");
    const newDescription =
      req.body.description == null
        ? null
        : cleanText(req.body.description, "Task description", 1000);
    if (newDescription === "") throw badRequest("Task description cannot be empty");
    const status =
      req.body.status == null ? found.rows[0].status : String(req.body.status);
    if (
      !["Pending", "In Progress", "Completed", "Cancelled"].includes(status)
    ) {
      const e = new Error("Invalid task status");
      e.status = 400;
      throw e;
    }
    const task = await client.query(
      `UPDATE team_tasks SET status=$1::varchar, description=COALESCE($2,description), priority=COALESCE($3,priority), due_date=CASE WHEN $4::boolean THEN $5::date ELSE due_date END, completed_at=CASE WHEN $1::varchar='Completed' THEN COALESCE(completed_at,NOW()) ELSE NULL END, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [
        status,
        newDescription,
        req.body.priority || null,
        hasDue,
        dueDate,
        req.params.taskId,
      ],
    );
    const count = await client.query(
      `UPDATE team_members SET tasks_count=${OPEN_TASKS_SQL} WHERE id=$1 RETURNING tasks_count`,
      [found.rows[0].member_id],
    );
    await client.query("COMMIT");
    await teamNotify.taskUpdated(found.rows[0].member_id, task.rows[0], found.rows[0].status, USER_ID(req));
    // tasks_count lets the page refresh its badge from the server instead of guessing.
    res.json({ ...task.rows[0], tasks_count: count.rows[0]?.tasks_count ?? 0 });
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(res, err, "Failed to update task");
  } finally {
    client.release();
  }
};
