// ===== FILE: APP_Vindia/backend/controllers/financeWbsController.js =====
//
// Finance-facing WBS options endpoint. Reuses the existing `wbs` table
// exactly as wbsController.js does — this is deliberately NOT the same
// response shape as GET /api/wbs/:projectId (that one also fans out to
// wbs_labour / wbs_material / wbs_equipment / wbs_miscellaneous, which
// Finance has no business seeing per Section 7).
//
// Mounted at:
//   GET /api/accountant/wbs?project_id=123   (accountantRoutes.js)
//   GET /api/finance/wbs?project_id=123      (financeRoutes.js)
// Both share this one controller/query — no duplicated business logic.

const pool = require("../config/db");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

exports.getFinanceWbsOptions = asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) {
    throw new AppError("project_id is required.", 400);
  }
  const projectId = Number(project_id);
  if (!Number.isFinite(projectId)) {
    throw new AppError("Invalid project_id.", 400);
  }

  const { rows } = await pool.query(
    `SELECT id, code, name, parent_id, status, progress
     FROM wbs
     WHERE project_id = $1
     ORDER BY COALESCE(code, ''), created_at ASC`,
    [projectId]
  );

  const top = rows.filter((r) => !r.parent_id);
  const children = rows.filter((r) => r.parent_id);

  const shape = (row, level) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    parent_id: row.parent_id,
    level,
    status: row.status,
    progress: row.progress,
  });

  const tree = top.map((milestone) => ({
    ...shape(milestone, "milestone"),
    children: children
      .filter((c) => c.parent_id === milestone.id)
      .map((c) => shape(c, "activity")),
  }));

  res.json({ success: true, data: tree });
});
