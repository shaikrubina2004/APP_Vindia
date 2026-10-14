// ===== FILE: APP_Vindia/backend/utils/projectPeople.js =====
// Who is assigned to a project, and a notification dispatcher that tells the
// RIGHT people (the ones assigned to the engineer's project) instead of every
// user holding a role. Each role's bell reads its own table, so this writes to
// the correct one:
//   project_manager   -> operations_notifications (generic, per-user; PM bell)
//   quantity_surveyor -> qs_notifications
//   architect         -> architect notifications
//   project_coordinator -> pc notifications
//   site_engineer     -> site_engineer_notifications
//   anything else     -> operations_notifications (best effort)
// Notification failures never break the business action that triggered them.
const pool = require("../config/db");
const ops = require("../controllers/operationsNotificationsController");
const se = require("../controllers/siteEngineerNotificationsController");
const qs = require("../controllers/qsNotificationController");
const architect = require("../controllers/architectNotificationsController");
const pc = require("../controllers/pcNotificationsController");

/* Projects a user is the assigned Site Engineer on */
async function projectIdsForEngineer(userId) {
  const { rows } = await pool.query("SELECT id FROM projects WHERE site_engineer_id = $1", [userId]);
  return rows.map((r) => r.id);
}

/* Project people: { site_engineer, project_manager, coordinator, architect } -> user ids.
   projects.manager_id is an EMPLOYEE id, so the PM's login user comes via employees.user_id. */
async function projectPeople(projectId) {
  const { rows } = await pool.query(
    `SELECT p.site_engineer_id, p.coordinator_id, p.architect_id, m.user_id AS manager_user_id
       FROM projects p
       LEFT JOIN employees m ON m.id = p.manager_id
      WHERE p.id = $1`,
    [projectId]
  );
  const r = rows[0] || {};
  return {
    site_engineer: r.site_engineer_id || null,
    project_coordinator: r.coordinator_id || null,
    architect: r.architect_id || null,
    project_manager: r.manager_user_id || null,
  };
}

/* Assigned user(s) for a role on the given projects; if none are assigned, every
   active user with that role (so a request is never silently dropped). */
async function resolveRoleUsers(role, projectIds) {
  const ids = new Set();
  if (projectIds && projectIds.length) {
    const col = { architect: "p.architect_id", project_coordinator: "p.coordinator_id" }[role];
    if (role === "project_manager") {
      const { rows } = await pool.query(
        `SELECT m.user_id AS id FROM projects p JOIN employees m ON m.id = p.manager_id
          WHERE p.id = ANY($1) AND m.user_id IS NOT NULL`,
        [projectIds]
      );
      rows.forEach((r) => ids.add(r.id));
    } else if (col) {
      const { rows } = await pool.query(`SELECT DISTINCT ${col} AS id FROM projects p WHERE p.id = ANY($1) AND ${col} IS NOT NULL`, [projectIds]);
      rows.forEach((r) => ids.add(r.id));
    }
  }
  if (!ids.size) {
    const { rows } = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = $1 AND u.status = 'active'`,
      [role]
    );
    rows.forEach((r) => ids.add(r.id));
  }
  return [...ids];
}

/* Write one notification into the table the user's bell reads. */
async function writeFor(role, userId, n) {
  const { type, title, description, link, severity = "info", projectId = null, refId = null } = n;
  switch (role) {
    case "site_engineer":
      return se.insertNotification(userId, type, title, description, link, severity, projectId);
    case "quantity_surveyor":
      return qs.insertNotification(userId, type, title, description, link, severity, refId);
    case "architect":
      return architect.insertArchitectNotification(userId, type, title, description, link, severity, refId);
    case "project_coordinator":
      return pc.insertNotification(userId, type, title, description, link, severity, projectId);
    default:
      // project_manager and everything else use the generic per-user table
      return ops.insertNotification(userId, type, title, description, link, severity, projectId, role, refId);
  }
}

/* Tell the reviewers assigned to the sender's project(s).
   notifyReviewers({ role, fromUserId | projectId, type, title, description, link, severity, refId }) */
async function notifyReviewers({ role, fromUserId, projectId, ...n }) {
  try {
    const projectIds = projectId ? [projectId] : fromUserId ? await projectIdsForEngineer(fromUserId) : [];
    const users = await resolveRoleUsers(role, projectIds);
    for (const userId of users) {
      if (fromUserId && Number(userId) === Number(fromUserId)) continue; // never notify yourself
      await writeFor(role, userId, { ...n, projectId: projectId || projectIds[0] || null });
    }
    return users.length;
  } catch (err) {
    console.error("notifyReviewers failed:", err.message);
    return 0;
  }
}

/* Tell the Site Engineer assigned to a project (or one specific user). */
async function notifyEngineer({ userId, projectId, ...n }) {
  try {
    const target = userId || (projectId ? (await projectPeople(projectId)).site_engineer : null);
    if (!target) return 0;
    await writeFor("site_engineer", target, { ...n, projectId: projectId || null });
    return 1;
  } catch (err) {
    console.error("notifyEngineer failed:", err.message);
    return 0;
  }
}

module.exports = { projectIdsForEngineer, projectPeople, resolveRoleUsers, notifyReviewers, notifyEngineer };
