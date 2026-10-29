const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
router.use(auth);

const MANAGER_ROLES = new Set([
  "project_manager",
  "operations_manager",
  "hr_manager",
  "finance_manager",
  "ceo",
]);

function roleOf(req) {
  return String(req.user?.role || "").trim().toLowerCase();
}

function isManager(req) {
  return MANAGER_ROLES.has(roleOf(req));
}

function isCeo(req) {
  return roleOf(req) === "ceo";
}

function startOfWeek(value) {
  if (!isDateOnly(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeek(weekStart) {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validationError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function validateEntries(client, payload, weekStart, accessibleProjectIds, allowEmpty, employeeId) {
  const entries = [];
  const hoursByDate = new Map();
  const weekEnd = endOfWeek(weekStart);

  for (const [index, item] of payload.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError(400, `Entry ${index + 1} is invalid.`);
    }

    const hasHours = item.hours !== null && item.hours !== undefined &&
      String(item.hours).trim() !== "";
    const hours = hasHours ? Number(item.hours) : 0;
    if (hasHours && (!Number.isFinite(hours) || hours < 0)) {
      throw validationError(400, `Entry ${index + 1} must have valid positive hours.`);
    }
    if (!hasHours || hours === 0) continue;

    if (!isDateOnly(item.work_date)) {
      throw validationError(400, `Entry ${index + 1} must have a valid work date.`);
    }
    if (item.work_date < weekStart || item.work_date > weekEnd) {
      throw validationError(400, "All entries must be within the same Monday–Sunday week.");
    }

    const projectId = Number(item.project_id);
    const taskId = Number(item.task_id);
    if (!Number.isInteger(projectId) || projectId <= 0 ||
        !Number.isInteger(taskId) || taskId <= 0) {
      throw validationError(400, `Entry ${index + 1} must include a project and task.`);
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) {
      throw validationError(400, "Each timesheet entry must be greater than 0 and no more than 12 hours.");
    }
    if (accessibleProjectIds !== null && !accessibleProjectIds.includes(projectId)) {
      throw validationError(403, "You are not assigned to one of the selected projects.");
    }

    const task = await client.query(
      `SELECT id FROM tasks WHERE id = $1 AND project_id = $2 LIMIT 1`,
      [taskId, projectId]
    );
    if (!task.rows.length) {
      throw validationError(400, "Selected task does not belong to the selected project.");
    }

    const dailyHours = (hoursByDate.get(item.work_date) || 0) + hours;
    if (dailyHours > 24) {
      throw validationError(400, `Total hours for ${item.work_date} cannot exceed 24.`);
    }
    hoursByDate.set(item.work_date, dailyHours);
    entries.push({
      work_date: item.work_date,
      project_id: projectId,
      task_id: taskId,
      hours,
      description: item.description || null,
    });
  }

  if (!allowEmpty && !entries.length) {
    throw validationError(400, "At least one valid project/task/time entry is required.");
  }

  if (entries.length) {
    const leaveResult = await client.query(
      `SELECT from_date, to_date
         FROM leaves
        WHERE employee_id = $1
          AND LOWER(status) = 'approved'
          AND from_date <= $3::date
          AND to_date >= $2::date`,
      [employeeId, weekStart, weekEnd]
    );
    const approvedLeaves = leaveResult.rows.map((leave) => ({
      from: String(leave.from_date).slice(0, 10),
      to: String(leave.to_date).slice(0, 10),
    }));
    if (entries.some((entry) =>
      approvedLeaves.some((leave) => entry.work_date >= leave.from && entry.work_date <= leave.to)
    )) {
      throw validationError(400, "Timesheet hours cannot be entered on an approved leave day.");
    }
  }

  return entries;
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "pending") return "submitted";
  if (value === "changes_requested") return "changes_requested";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "under_review") return "under_review";
  return value || "submitted";
}

function displayStatus(status) {
  return {
    draft: "Draft",
    submitted: "Pending",
    under_review: "Under Review",
    changes_requested: "Changes Requested",
    resubmitted: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    reopened: "Reopened",
  }[status] || status;
}

async function getEmployeeForUser(userId) {
  const result = await pool.query(
    `SELECT id, name, email, designation, department, user_id, manager_id
       FROM employees
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getEmployeeByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, designation, department, user_id, manager_id
       FROM employees
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

function assertEmployee(res, employee) {
  if (!employee) {
    res.status(404).json({ error: "Employee profile is not linked to this user account." });
    return false;
  }
  return true;
}

async function canManagerAccessEmployee(req, employeeId) {
  if (!isManager(req)) return false;
  if (isCeo(req)) return true;

  const manager = await getEmployeeForUser(req.user.id);
  if (!manager) return false;

  const targetId = Number(employeeId);
  if (!Number.isInteger(targetId) || targetId <= 0 || targetId === Number(manager.id)) return false;

  const result = await pool.query(
    `SELECT 1
       FROM employees e
      WHERE e.id = $1
        AND (
          e.manager_id = $2
          OR (
            e.manager_id IS NULL
            AND $3 = 'project_manager'
            AND EXISTS (
              SELECT 1
                FROM projects p
               WHERE p.site_engineer_id = e.user_id
                 AND p.manager_id = $2
            )
          )
        )
      LIMIT 1`,
    [targetId, manager.id, roleOf(req)]
  );
  return result.rows.length > 0;
}

async function canUserAccessTimesheet(req, sheet) {
  const requester = await getEmployeeForUser(req.user.id);
  if (!requester) return false;

  if (Number(sheet.employee_id) === Number(requester.id)) return true;
  return canManagerAccessEmployee(req, sheet.employee_id);
}

async function getAccessibleProjectIds(req) {
  const employee = await getEmployeeForUser(req.user.id);
  if (!employee) return [];

  const role = roleOf(req);
  if (isCeo(req)) return null; // null = all projects

  // QS has no dedicated project-assignment FK in the current schema, so keep
  // existing project access for QS while still requiring authentication.
  if (role === "quantity_surveyor") {
    return null;
  }

  // params/conditions used to be built separately — params was always
  // hardcoded to [employee.id, req.user.id] (2 values), but the
  // project_manager branch below only ever referenced $1 in the SQL text.
  // Postgres sizes a prepared statement by the highest placeholder it finds
  // in the query, so for a project_manager this always threw "bind message
  // supplies 2 parameters, but prepared statement requires 1" — built now so
  // params only ever contains what's actually referenced.
  const params = [employee.id];
  const conditions = [
    `EXISTS (
       SELECT 1
       FROM timesheet_entries te
       JOIN timesheets t2 ON t2.id = te.timesheet_id
       WHERE t2.employee_id = $1 AND te.project_id = p.id
     )`,
  ];

  if (role === "project_manager") {
    conditions.push(`p.manager_id = $1`);
  } else if (role === "site_engineer") {
    params.push(req.user.id);
    conditions.push(`p.site_engineer_id = $${params.length}`);
  }

  const sql = `
    SELECT DISTINCT p.id
      FROM projects p
     WHERE p.id IS NOT NULL
       AND p.status IS DISTINCT FROM 'Archived'
       AND (${conditions.join(" OR ")})
  `;
  const result = await pool.query(sql, params);
  return result.rows.map((r) => Number(r.id));
}

async function canUserAccessProject(req, projectId) {
  const allowed = await getAccessibleProjectIds(req);
  if (allowed === null) return true;
  return allowed.includes(Number(projectId));
}

async function fetchSheet(sheetId) {
  const result = await pool.query(
    `SELECT t.*, e.name, e.email, e.designation, e.department
       FROM timesheets t
       JOIN employees e ON e.id = t.employee_id
      WHERE t.id = $1`,
    [sheetId]
  );
  return result.rows[0] || null;
}

async function fetchEntries(sheetId) {
  const result = await pool.query(
    `SELECT te.*, p.name AS project_name, tk.title AS task_title
       FROM timesheet_entries te
       LEFT JOIN projects p ON p.id = te.project_id
       LEFT JOIN tasks tk ON tk.id = te.task_id
      WHERE te.timesheet_id = $1
      ORDER BY te.work_date, te.id`,
    [sheetId]
  );
  return result.rows;
}

async function fetchHistory(sheetId) {
  const result = await pool.query(
    `SELECT h.id, h.timesheet_id, h.action, h.comment, h.created_at,
            e.name AS action_by_name, e.email AS action_by_email
       FROM timesheet_approval_history h
       JOIN employees e ON e.id = h.action_by
      WHERE h.timesheet_id = $1
      ORDER BY h.created_at ASC, h.id ASC`,
    [sheetId]
  );
  return result.rows;
}

function toUiRows(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.project_id || ""}:${entry.task_id || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: entry.id,
        projectCode: entry.project_id == null ? "" : String(entry.project_id),
        taskCode: entry.task_id == null ? "" : String(entry.task_id),
        employeeType: entry.description || "Employee",
        hours: {},
        groupId: entry.project_id || entry.id,
      });
    }
    const row = groups.get(key);
    row.hours[String(entry.work_date).slice(0, 10)] =
      Number(entry.regular_hours || 0) + Number(entry.overtime_hours || 0);
  }
  return Array.from(groups.values());
}

async function requireOwnSheet(req, res, sheet) {
  if (!sheet) {
    res.status(404).json({ error: "Timesheet not found" });
    return false;
  }
  if (!(await canUserAccessTimesheet(req, sheet))) {
    res.status(403).json({ error: "You are not authorized to access this timesheet." });
    return false;
  }
  return true;
}

async function transitionTimesheet(req, res, sheetId, action, comment = "") {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const sheetResult = await client.query(
      `SELECT * FROM timesheets WHERE id = $1 FOR UPDATE`,
      [sheetId]
    );
    const sheet = sheetResult.rows[0];
    if (!sheet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Timesheet not found" });
    }

    const requester = await getEmployeeForUser(req.user.id);
    if (!requester) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Employee profile not found" });
    }

    const employeeOwns = Number(sheet.employee_id) === Number(requester.id);
    const managerCanAct = await canManagerAccessEmployee(req, sheet.employee_id);

    const employeeActions = new Set(["submitted", "resubmitted"]);
    const managerActions = new Set(["under_review", "approved", "changes_requested", "rejected", "reopened"]);
    if (employeeActions.has(action) && !employeeOwns) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Only the employee can submit their own timesheet." });
    }
    if (managerActions.has(action) && !managerCanAct) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Only the employee's reporting manager can review this timesheet." });
    }

    const allowedTransitions = {
      submitted: new Set(["draft", "changes_requested", "reopened", "rejected"]),
      resubmitted: new Set(["changes_requested"]),
      under_review: new Set(["submitted", "resubmitted"]),
      approved: new Set(["submitted", "resubmitted", "under_review", "reopened"]),
      changes_requested: new Set(["submitted", "resubmitted", "under_review"]),
      rejected: new Set(["submitted", "resubmitted", "under_review"]),
      reopened: new Set(["approved", "rejected"]),
    };
    if (!allowedTransitions[action]?.has(sheet.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Cannot ${action.replaceAll("_", " ")} a timesheet in ${displayStatus(sheet.status)} status.`,
      });
    }

    const submittedAt = ["submitted", "resubmitted"].includes(action) ? "NOW()" : "submitted_at";
    let approvalSql = "";
    const updateParams = [action, sheetId];
    if (action === "approved") {
      updateParams.push(requester.id);
      approvalSql = `approved_by = $3, approved_at = NOW(),`;
    } else if (action === "reopened") {
      approvalSql = `approved_by = NULL, approved_at = NULL,`;
    }
    updateParams.push(sheet.status);
    const expectedStatusParam = action === "approved" ? "$4" : "$3";

    const result = await client.query(
      `UPDATE timesheets
          SET status = $1,
              ${approvalSql}
              submitted_at = ${submittedAt},
              updated_at = NOW()
        WHERE id = $2 AND status = ${expectedStatusParam}
        RETURNING *`,
      updateParams
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Timesheet status changed; reload and try again." });
    }

    await client.query(
      `INSERT INTO timesheet_approval_history (timesheet_id, action, action_by, comment)
       VALUES ($1, $2, $3, $4)`,
      [sheetId, action, requester.id, comment || null]
    );
    await client.query("COMMIT");

    return res.json({
      data: {
        ...result.rows[0],
        display_status: displayStatus(result.rows[0].status),
      },
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("timesheet transition rollback:", rollbackError);
      }
    }
    console.error("timesheet transition:", err);
    return res.status(500).json({ error: "Failed to update timesheet status" });
  } finally {
    client?.release();
  }
}

// ---- Static routes FIRST -------------------------------------------------

router.get("/me", async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user.id);
    if (!assertEmployee(res, employee)) return;

    const weekStart = startOfWeek(
      req.query.week_start || new Date().toISOString().slice(0, 10)
    );
    if (!weekStart) return res.status(400).json({ error: "Invalid week_start" });

    const result = await pool.query(
      `SELECT id, employee_id, week_start, week_end, status, employee_comment,
              submitted_at, approved_by, approved_at, created_at, updated_at
         FROM timesheets
        WHERE employee_id = $1 AND week_start = $2`,
      [employee.id, weekStart]
    );

    if (!result.rows.length) return res.json({ data: null });
    const sheet = result.rows[0];
    const entries = await fetchEntries(sheet.id);
    res.json({ data: { ...sheet, display_status: displayStatus(sheet.status), entries } });
  } catch (err) {
    console.error("timesheets/me:", err);
    res.status(500).json({ error: "Failed to load timesheet" });
  }
});

router.get("/user/:email", async (req, res) => {
  try {
    const requester = await getEmployeeForUser(req.user.id);
    const target = await getEmployeeByEmail(req.params.email);
    if (!assertEmployee(res, target)) return;
    if (!requester) return res.status(404).json({ error: "Employee profile not found" });

    const canView = requester.id === target.id || await canManagerAccessEmployee(req, target.id);
    if (!canView) return res.status(403).json({ error: "You can only view your own timesheets or those of your direct reports." });

    const result = await pool.query(
      `SELECT id, employee_id, week_start, week_end, status, employee_comment,
              submitted_at, approved_at
         FROM timesheets
        WHERE employee_id = $1
        ORDER BY week_start DESC
        LIMIT 1`,
      [target.id]
    );
    if (!result.rows.length) return res.json([]);

    const sheet = result.rows[0];
    const entries = await fetchEntries(sheet.id);
    res.json([{
      ...sheet,
      name: target.name,
      email: target.email,
      role: roleOf(req),
      week: `${sheet.week_start} – ${sheet.week_end}`,
      status: displayStatus(sheet.status),
      rows: toUiRows(entries),
    }]);
  } catch (err) {
    console.error("timesheets/user:", err);
    res.status(500).json({ error: "Failed to fetch user timesheets" });
  }
});

router.get("/team/summary", async (req, res) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Manager access required." });
    const manager = await getEmployeeForUser(req.user.id);
    if (!manager && !isCeo(req)) return res.status(404).json({ error: "Manager employee profile not found" });

    const params = [];
    let scope = "";
    if (!isCeo(req)) {
      params.push(manager.id);
      params.push(roleOf(req));
      scope = `WHERE (
        e.manager_id = $1
        OR (
          e.manager_id IS NULL
          AND $2 = 'project_manager'
          AND EXISTS (
            SELECT 1
              FROM projects p_scope
             WHERE p_scope.site_engineer_id = e.user_id
               AND p_scope.manager_id = $1
          )
        )
      )`;
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE t.status IN ('submitted','resubmitted'))::int AS pending,
         COUNT(*) FILTER (WHERE t.status = 'under_review')::int AS under_review,
         COUNT(*) FILTER (WHERE t.status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE t.status = 'changes_requested')::int AS changes_requested,
         COUNT(*) FILTER (WHERE t.status = 'rejected')::int AS rejected
       FROM timesheets t
       JOIN employees e ON e.id = t.employee_id
       ${scope}`,
      params
    );
    res.json({ data: result.rows[0] || { pending: 0, under_review: 0, approved: 0, changes_requested: 0, rejected: 0 } });
  } catch (err) {
    console.error("timesheets/team/summary:", err);
    res.status(500).json({ error: "Failed to fetch team summary" });
  }
});

async function getTeamTimesheets(req, res) {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Manager access required." });
    const manager = await getEmployeeForUser(req.user.id);
    if (!manager && !isCeo(req)) return res.status(404).json({ error: "Manager employee profile not found" });

    const params = [];
    let scope = "";
    if (!isCeo(req)) {
      params.push(manager.id);
      params.push(roleOf(req));
      scope = `WHERE (
        e.manager_id = $1
        OR (
          e.manager_id IS NULL
          AND $2 = 'project_manager'
          AND EXISTS (
            SELECT 1
              FROM projects p_scope
             WHERE p_scope.site_engineer_id = e.user_id
               AND p_scope.manager_id = $1
          )
        )
      )`;
    }

    const result = await pool.query(
      `SELECT t.id, t.employee_id, t.week_start, t.week_end, t.status, t.submitted_at,
              e.name, e.email, e.designation, e.department,
              COALESCE(SUM(te.regular_hours + te.overtime_hours), 0) AS work_hours,
              COALESCE(SUM(te.leave_hours), 0) AS leave_hours
         FROM timesheets t
         JOIN employees e ON e.id = t.employee_id
         LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
        ${scope}
        GROUP BY t.id, e.id
        ORDER BY t.week_start DESC, t.submitted_at DESC NULLS LAST`,
      params
    );

    res.json(result.rows.map((r) => ({
      ...r,
      status: displayStatus(r.status),
      raw_status: r.status,
      week: `${r.week_start} – ${r.week_end}`,
      workHours: Number(r.work_hours || 0),
      leaveHours: Number(r.leave_hours || 0),
    })));
  } catch (err) {
    console.error("timesheets/team:", err);
    res.status(500).json({ error: "Failed to fetch team timesheets" });
  }
}

router.get("/team", getTeamTimesheets);
router.get("/", getTeamTimesheets);

// GET /timesheets/project/:projectId
// Hours actually recorded against one project/WBS — this is what the PM
// dashboard's per-project "Timesheet" tab needs (who logged hours, how many,
// on which task, this week vs overall), which /team and /team/summary above
// can't answer since they only return whole-timesheet totals with no
// project breakdown at all.
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    if (!(await canUserAccessProject(req, projectId))) {
      return res.status(403).json({ error: "You are not assigned to this project." });
    }

    const result = await pool.query(
      `SELECT te.id, te.work_date, te.project_id, te.task_id,
              te.regular_hours, te.overtime_hours, te.leave_hours, te.description,
              t.id AS timesheet_id, t.status AS timesheet_status, t.week_start, t.week_end,
              e.id AS employee_id, e.name AS employee_name, e.designation,
              tk.title AS task_title
         FROM timesheet_entries te
         JOIN timesheets t ON t.id = te.timesheet_id
         JOIN employees e ON e.id = t.employee_id
         LEFT JOIN tasks tk ON tk.id = te.task_id
        WHERE te.project_id = $1
        ORDER BY te.work_date DESC, e.name ASC`,
      [projectId]
    );

    const entries = result.rows.map((r) => ({
      ...r,
      status: displayStatus(r.timesheet_status),
      regular_hours: Number(r.regular_hours || 0),
      overtime_hours: Number(r.overtime_hours || 0),
      leave_hours: Number(r.leave_hours || 0),
    }));

    const totalHours = entries.reduce((s, e) => s + e.regular_hours + e.overtime_hours, 0);
    const uniqueStaff = new Set(entries.map((e) => e.employee_id)).size;

    res.json({
      data: entries,
      summary: {
        total_hours: totalHours,
        staff_count: uniqueStaff,
        entry_count: entries.length,
      },
    });
  } catch (err) {
    console.error("timesheets/project/:projectId:", err);
    // Temporarily echoing err.message here (instead of just the generic
    // string) so the real Postgres error is visible without digging through
    // server logs. This is an authenticated, internal endpoint, so it's safe
    // to leave in — but fine to remove once this is confirmed working.
    res.status(500).json({ error: "Failed to fetch project timesheets", detail: err.message });
  }
});

router.get("/options/projects", async (req, res) => {
  try {
    const role = roleOf(req);
    if (role === "client") return res.status(403).json({ error: "Timesheet access is not available to client accounts." });

    const employee = await getEmployeeForUser(req.user.id);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const allowed = await getAccessibleProjectIds(req);
    const params = [];
    let where = "WHERE p.status IS DISTINCT FROM 'Archived'";
    if (allowed !== null) {
      if (!allowed.length) return res.json({ data: [] });
      params.push(allowed);
      where += ` AND p.id = ANY($1::int[])`;
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.status
         FROM projects p
        ${where}
        ORDER BY p.name ASC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error("timesheets/options/projects:", err);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

router.get("/options/projects/:projectId/tasks", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ error: "Invalid project ID" });
    if (!(await canUserAccessProject(req, projectId))) return res.status(403).json({ error: "You are not assigned to this project." });

    const result = await pool.query(
      `SELECT id, title, status
         FROM tasks
        WHERE project_id = $1
        ORDER BY created_at DESC NULLS LAST, id DESC`,
      [projectId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error("timesheets/options/tasks:", err);
    res.status(500).json({ error: "Failed to load tasks" });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const sheet = await fetchSheet(req.params.id);
    if (!(await requireOwnSheet(req, res, sheet))) return;
    res.json({ data: await fetchHistory(sheet.id) });
  } catch (err) {
    console.error("timesheets/history:", err);
    res.status(500).json({ error: "Failed to fetch timesheet history" });
  }
});

router.post("/draft", async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const employee = await getEmployeeForUser(req.user.id);
    if (!assertEmployee(res, employee)) return;

    const payload = Array.isArray(req.body?.entries) ? req.body.entries : Array.isArray(req.body) ? req.body : [];
    const firstDate = payload.map((x) => x?.work_date).filter(Boolean).sort()[0] || req.body?.week_start;
    const weekStart = startOfWeek(firstDate || new Date().toISOString().slice(0, 10));
    if (!weekStart) return res.status(400).json({ error: "Invalid week date." });
    const weekEnd = endOfWeek(weekStart);

    const accessibleProjectIds = await getAccessibleProjectIds(req);
    await client.query("BEGIN");
    const entries = await validateEntries(client, payload, weekStart, accessibleProjectIds, true, employee.id);
    const existingResult = await client.query(
      `SELECT * FROM timesheets
        WHERE employee_id = $1 AND week_start = $2
        FOR UPDATE`,
      [employee.id, weekStart]
    );
    let sheet = existingResult.rows[0];
    if (sheet && !["draft", "changes_requested", "rejected", "reopened"].includes(sheet.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `A timesheet in ${displayStatus(sheet.status)} status cannot be edited.`,
      });
    }
    if (sheet) {
      const updated = await client.query(
        `UPDATE timesheets SET updated_at = NOW() WHERE id = $1 RETURNING *`,
        [sheet.id]
      );
      sheet = updated.rows[0];
    } else {
      const created = await client.query(
        `INSERT INTO timesheets (employee_id, week_start, week_end, status, updated_at)
         VALUES ($1,$2,$3,'draft',NOW())
         RETURNING *`,
        [employee.id, weekStart, weekEnd]
      );
      sheet = created.rows[0];
    }

    await client.query("DELETE FROM timesheet_entries WHERE timesheet_id = $1", [sheet.id]);
    for (const item of entries) {
      await client.query(
        `INSERT INTO timesheet_entries
          (timesheet_id, work_date, project_id, task_id, regular_hours, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sheet.id, item.work_date, item.project_id, item.task_id, item.hours, item.description]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ data: { id: sheet.id, status: displayStatus(sheet.status), week_start: weekStart, week_end: weekEnd } });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("timesheets/draft rollback:", rollbackError);
      }
    }
    console.error("timesheets/draft:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save draft" });
  } finally {
    client?.release();
  }
});

router.post("/bulk", async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const employee = await getEmployeeForUser(req.user.id);
    if (!assertEmployee(res, employee)) return;

    const payload = Array.isArray(req.body) ? req.body : [];
    if (!payload.length) return res.status(400).json({ error: "No timesheet entries supplied." });

    const dates = payload.map((x) => x?.work_date).filter(Boolean).sort();
    const weekStart = startOfWeek(dates[0]);
    if (!weekStart) return res.status(400).json({ error: "Invalid work date." });
    const weekEnd = endOfWeek(weekStart);

    const accessibleProjectIds = await getAccessibleProjectIds(req);

    await client.query("BEGIN");
    const entries = await validateEntries(client, payload, weekStart, accessibleProjectIds, false, employee.id);
    const existingResult = await client.query(
      `SELECT * FROM timesheets
        WHERE employee_id = $1 AND week_start = $2
        FOR UPDATE`,
      [employee.id, weekStart]
    );
    let sheet = existingResult.rows[0];
    if (sheet && !["draft", "changes_requested", "rejected", "reopened"].includes(sheet.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `A timesheet in ${displayStatus(sheet.status)} status cannot be submitted again.`,
      });
    }
    const action = sheet?.status === "changes_requested" ? "resubmitted" : "submitted";
    if (sheet) {
      const updated = await client.query(
        `UPDATE timesheets
            SET status = $1, submitted_at = NOW(), updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [action, sheet.id]
      );
      sheet = updated.rows[0];
    } else {
      const created = await client.query(
        `INSERT INTO timesheets (employee_id, week_start, week_end, status, submitted_at, updated_at)
         VALUES ($1,$2,$3,'submitted',NOW(),NOW())
         RETURNING *`,
        [employee.id, weekStart, weekEnd]
      );
      sheet = created.rows[0];
    }

    await client.query("DELETE FROM timesheet_entries WHERE timesheet_id = $1", [sheet.id]);
    for (const item of entries) {
      await client.query(
        `INSERT INTO timesheet_entries
          (timesheet_id, work_date, project_id, task_id, regular_hours, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sheet.id, item.work_date, item.project_id, item.task_id, item.hours, item.description]
      );
    }

    await client.query(
      `INSERT INTO timesheet_approval_history (timesheet_id, action, action_by, comment)
       VALUES ($1, $2, $3, $4)`,
      [sheet.id, action, employee.id, req.body?.comment || null]
    );

    await client.query("COMMIT");
    res.status(201).json({ id: sheet.id, status: displayStatus(sheet.status), week_start: weekStart, week_end: weekEnd });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("timesheets/bulk rollback:", rollbackError);
      }
    }
    console.error("timesheets/bulk:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to submit timesheet" });
  } finally {
    client?.release();
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sheet = await fetchSheet(req.params.id);
    if (!(await requireOwnSheet(req, res, sheet))) return;
    const entries = await fetchEntries(sheet.id);
    res.json({ data: { ...sheet, display_status: displayStatus(sheet.status), entries } });
  } catch (err) {
    console.error("timesheets/get:", err);
    res.status(500).json({ error: "Failed to fetch timesheet" });
  }
});

router.post("/:id/submit", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "submitted", req.body?.comment);
});

router.post("/:id/review", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "under_review", req.body?.comment);
});

router.post("/:id/approve", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "approved", req.body?.comment);
});

router.post("/:id/request-changes", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "changes_requested", req.body?.comment);
});

router.post("/:id/reject", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "rejected", req.body?.comment);
});

router.post("/:id/reopen", async (req, res) => {
  return transitionTimesheet(req, res, req.params.id, "reopened", req.body?.comment);
});

// Backwards-compatible manager status endpoint.
router.patch("/:id", async (req, res) => {
  try {
    const nextStatus = normalizeStatus(req.body?.status);
    const actionMap = {
      submitted: "submitted",
      under_review: "under_review",
      approved: "approved",
      changes_requested: "changes_requested",
      rejected: "rejected",
      reopened: "reopened",
    };
    const action = actionMap[nextStatus];
    if (!action) return res.status(400).json({ error: "Invalid timesheet status" });
    return transitionTimesheet(req, res, req.params.id, action, req.body?.comment);
  } catch (err) {
    console.error("timesheets/patch:", err);
    res.status(500).json({ error: "Failed to update timesheet" });
  }
});

module.exports = router;
