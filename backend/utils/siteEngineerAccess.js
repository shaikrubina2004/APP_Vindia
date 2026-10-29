const pool = require("../config/db");

async function isAssignedProject(userId, projectId) {
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    return false;
  }

  const result = await pool.query(
    `SELECT 1
       FROM projects
      WHERE id = $1
        AND site_engineer_id = $2
      LIMIT 1`,
    [numericProjectId, userId]
  );
  return result.rows.length > 0;
}

async function getAssignedProjectIds(userId) {
  const result = await pool.query(
    `SELECT id
       FROM projects
      WHERE site_engineer_id = $1`,
    [userId]
  );
  return result.rows.map((row) => Number(row.id));
}

async function isWbsInProject(wbsId, projectId) {
  const numericWbsId = Number(wbsId);
  const numericProjectId = Number(projectId);
  if (
    !Number.isInteger(numericWbsId) || numericWbsId <= 0 ||
    !Number.isInteger(numericProjectId) || numericProjectId <= 0
  ) {
    return false;
  }
  const result = await pool.query(
    "SELECT 1 FROM wbs WHERE id = $1 AND project_id = $2 LIMIT 1",
    [numericWbsId, numericProjectId]
  );
  return result.rows.length > 0;
}

async function isManagedProject(userId, projectId) {
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    return false;
  }
  const result = await pool.query(
    `SELECT 1
       FROM projects p
       JOIN employees e ON e.id = p.manager_id
      WHERE p.id = $1
        AND e.user_id = $2
      LIMIT 1`,
    [numericProjectId, userId]
  );
  return result.rows.length > 0;
}

async function getManagedProjectIds(userId) {
  const result = await pool.query(
    `SELECT p.id
       FROM projects p
       JOIN employees e ON e.id = p.manager_id
      WHERE e.user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => Number(row.id));
}

module.exports = {
  isAssignedProject,
  getAssignedProjectIds,
  isWbsInProject,
  isManagedProject,
  getManagedProjectIds,
};
