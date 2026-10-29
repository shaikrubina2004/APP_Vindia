// Team Management notifications.
//
// Every alert goes through IncidentController.notifyByRole, the same dispatcher incidents use, so
// it lands in the bell that matches the recipient's role. Rules:
//   * Called only AFTER the team change is committed, and never throws: a failed notification can
//     never fail or undo the team action.
//   * "Personal" alerts reach only members linked to an HR employee who has a login
//     (added via "Also working on your projects"); free-typed people have no account to notify.
//   * "Team" alerts go to the project's site engineer, coordinator, architect and any linked staff
//     already on its team, never to the person who made the change or the person concerned.
//   * Every alert is ALSO saved to team_activity, a per-person feed read by the floating "My Project
//     Team" widget (badge + pop-out). That works for every role, including structural engineers,
//     whose bell is a role-wide feed with no per-user target, so only their bell is skipped.
//   * Incidents logged about a person are deliberately NOT notified; they stay with the PM.
const pool = require("../config/db");

const DASHBOARD = {
  site_engineer: "/site-engineer/dashboard",
  quantity_surveyor: "/quantity-surveyor/dashboard",
  project_coordinator: "/project-coordinator/dashboard",
  architect: "/architect/dashboard",
  mep_engineer: "/mep/dashboard",
};
const SKIP_ROLES = new Set(["structural_engineer"]);

const dispatcher = () => require("../controllers/IncidentController").notifyByRole;
const same = (a, b) => a != null && b != null && String(a) === String(b);

async function userForEmployee(employeeId) {
  if (employeeId == null) return null;
  const r = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [employeeId]);
  return r.rows[0]?.user_id ?? null;
}

// Saves the alert to the person's in-app feed and keeps only their latest 200.
async function recordActivity(userId, { type, title, description, severity, projectId }) {
  await pool.query(
    `INSERT INTO team_activity (user_id, project_id, kind, title, description, severity)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, projectId, type === "task" ? "task" : "team", String(title).slice(0, 160), description, severity],
  );
  await pool.query(
    `DELETE FROM team_activity
      WHERE user_id = $1
        AND id < COALESCE((SELECT id FROM team_activity WHERE user_id = $1 ORDER BY id DESC OFFSET 199 LIMIT 1), 0)`,
    [userId],
  );
}

// The feed and the bell are independent: one failing never blocks the other or the team action.
async function send(userId, { type = "team", title, description, severity = "info", projectId = null }) {
  let sent = 0;
  try {
    const role = await pool.query(
      `SELECT r.code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [userId],
    );
    if (!role.rowCount) return 0;
    const code = String(role.rows[0].code || "").toLowerCase();
    try {
      await recordActivity(userId, { type, title, description, severity, projectId });
      sent = 1;
    } catch (err) {
      console.error("teamNotifications.recordActivity failed:", err.message);
    }
    if (!SKIP_ROLES.has(code)) {
      try {
        await dispatcher()(userId, type, title, description, DASHBOARD[code] || null, severity, null, projectId);
        sent = 1;
      } catch (err) {
        console.error("teamNotifications bell failed:", err.message);
      }
    }
  } catch (err) {
    console.error("teamNotifications.send failed:", err.message);
  }
  return sent;
}

// Staff on the project who care about its team, minus anyone in `exclude`.
async function projectUserIds(projectId, exclude = []) {
  const r = await pool.query(
    `SELECT DISTINCT uid FROM (
       SELECT site_engineer_id AS uid FROM projects WHERE id = $1
       UNION ALL SELECT coordinator_id FROM projects WHERE id = $1
       UNION ALL SELECT architect_id FROM projects WHERE id = $1
       UNION ALL SELECT e.user_id FROM team_members tm
                  JOIN employees e ON e.id = tm.employee_id
                 WHERE tm.project_id = $1 AND tm.status <> 'Inactive'
     ) s WHERE uid IS NOT NULL`,
    [projectId],
  );
  return r.rows.map((x) => x.uid).filter((id) => !exclude.some((e) => same(e, id)));
}

async function tellTeam(member, actorId, personalUserId, payload) {
  const ids = await projectUserIds(member.project_id, [actorId, personalUserId]);
  let sent = 0;
  for (const id of ids) sent += await send(id, { ...payload, projectId: member.project_id });
  return sent;
}

const guard = (fn) => async (...args) => {
  try { return await fn(...args); } catch (err) { console.error("teamNotifications error:", err.message); return 0; }
};

const memberAdded = guard(async (m, actorId) => {
  const personal = await userForEmployee(m.employee_id);
  let sent = 0;
  if (personal != null && !same(personal, actorId))
    sent += await send(personal, {
      title: "Added to a project team",
      description: `You have been added to the ${m.project_name} team as ${m.role}.`,
      projectId: m.project_id,
    });
  sent += await tellTeam(m, actorId, personal, {
    title: m.type === "Labour" ? "New labour on site" : "New team member",
    description: `${m.name} (${m.role}) joined the ${m.project_name} ${m.type === "Labour" ? "labour team" : "team"}.`,
  });
  return sent;
});

const memberLeft = guard(async (m, actorId) => {
  const personal = await userForEmployee(m.employee_id);
  let sent = 0;
  if (personal != null && !same(personal, actorId))
    sent += await send(personal, {
      title: "Removed from a project team",
      description: `You are no longer on the ${m.project_name} team.`,
      severity: "warning",
      projectId: m.project_id,
    });
  sent += await tellTeam(m, actorId, personal, {
    title: m.type === "Labour" ? "Labour left site" : "Team member left",
    description: `${m.name} (${m.role}) is no longer on the ${m.project_name} team.`,
  });
  return sent;
});

const memberChanged = guard(async (before, after, actorId) => {
  const moved = String(before.project_id) !== String(after.project_id);
  const wasOn = before.status !== "Inactive";
  const isOn = after.status !== "Inactive";
  if (moved) return (await memberLeft(before, actorId)) + (isOn ? await memberAdded(after, actorId) : 0);
  if (wasOn && !isOn) return memberLeft(after, actorId);
  if (!wasOn && isOn) return memberAdded(after, actorId);
  const personal = await userForEmployee(after.employee_id);
  if (personal == null || same(personal, actorId)) return 0;
  let sent = 0;
  if (String(before.role || "").toLowerCase() !== String(after.role || "").toLowerCase())
    sent += await send(personal, {
      title: "Your project role changed",
      description: `Your role on the ${after.project_name} team is now ${after.role}.`,
      projectId: after.project_id,
    });
  if (before.status !== after.status)
    sent += await send(personal, {
      title: "Your team status changed",
      description: `Your status on the ${after.project_name} team is now ${after.status}.`,
      projectId: after.project_id,
    });
  return sent;
});

const taskAssigned = guard(async (m, task, actorId) => {
  const personal = await userForEmployee(m.employee_id);
  if (personal == null || same(personal, actorId)) return 0;
  const due = task.due_date ? ` Due ${String(task.due_date instanceof Date ? task.due_date.toISOString() : task.due_date).slice(0, 10)}.` : "";
  return send(personal, {
    type: "task",
    title: "New task assigned",
    description: `${task.description}${due} (${m.project_name})`,
    severity: ["High", "Urgent"].includes(task.priority) ? "warning" : "info",
    projectId: m.project_id,
  });
});

const TASK_VERB = { "In Progress": "marked in progress", Completed: "marked completed", Cancelled: "cancelled", Pending: "reopened" };

const taskUpdated = guard(async (memberId, task, previousStatus, actorId) => {
  if (task.status === previousStatus) return 0;
  const r = await pool.query(
    `SELECT tm.*, p.name AS project_name FROM team_members tm JOIN projects p ON p.id = tm.project_id WHERE tm.id = $1`,
    [memberId],
  );
  const m = r.rows[0];
  if (!m) return 0;
  const personal = await userForEmployee(m.employee_id);
  if (personal == null || same(personal, actorId)) return 0;
  return send(personal, {
    type: "task",
    title: "Task updated",
    description: `"${task.description}" was ${TASK_VERB[task.status] || `set to ${task.status}`}. (${m.project_name})`,
    projectId: m.project_id,
  });
});

module.exports = { memberAdded, memberLeft, memberChanged, taskAssigned, taskUpdated };
