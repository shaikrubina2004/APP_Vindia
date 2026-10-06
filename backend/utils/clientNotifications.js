// Notifications INTO the client portal (the client's bell).
// Never throws: a failed notification must not break the business action that caused it.
const pool = require("../config/db");
const { ensureClientTables } = require("./clientTables");

async function notifyClientUser(userId, n = {}) {
  if (!userId || !n.title) return;
  try {
    await ensureClientTables();
    await pool.query(
      `INSERT INTO client_notifications
         (user_id, type, title, description, link, severity, reference_id, project_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        userId,
        n.type || "info",
        n.title,
        n.description || null,
        n.link || null,
        n.severity || "info",
        n.referenceId ?? null,
        n.projectId ?? null,
      ]
    );
  } catch (err) {
    console.error("notifyClientUser failed:", err.message);
  }
}

// Notify whoever is the client of a project.
async function notifyProjectClient(projectId, n = {}) {
  if (!projectId) return;
  try {
    const r = await pool.query(`SELECT client_user_id FROM projects WHERE id = $1`, [projectId]);
    const userId = r.rows[0]?.client_user_id;
    if (userId) await notifyClientUser(userId, { ...n, projectId });
  } catch (err) {
    console.error("notifyProjectClient failed:", err.message);
  }
}

module.exports = { notifyClientUser, notifyProjectClient };
