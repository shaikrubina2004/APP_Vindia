const express = require("express");
const router  = express.Router();
const wbs     = require("../controllers/wbsController");
const { protect } = require("../middleware/authMiddleware");
const pool = require("../config/db");
const {
  isAssignedProject,
  isManagedProject,
} = require("../utils/siteEngineerAccess");

// Every WBS/milestone route needs a logged-in user (was fully open before)
router.use(protect);

router.use(async (req, res, next) => {
  if (!["site_engineer", "project_manager"].includes(req.user?.role)) return next();
  try {
    let projectId = req.params.projectId || req.query.project_id || req.body?.project_id;
    const path = req.path;

    if (req.method === "GET" && path === "/") return next();

    if (/^\/se-alerts\/\d+\/(apply|dismiss)$/.test(path)) {
      const result = await pool.query(
        "SELECT project_id FROM site_engineer_daily_updates WHERE id = $1",
        [path.split("/")[2]]
      );
      projectId = result.rows[0]?.project_id;
    } else if (path === "/sync-from-se") {
      const result = req.user.role === "site_engineer"
        ? await pool.query(
          "SELECT project_id FROM site_engineer_daily_updates WHERE id = $1 AND submitted_by = $2",
          [req.body?.report_id, req.user.id]
        )
        : await pool.query(
          "SELECT project_id FROM site_engineer_daily_updates WHERE id = $1",
          [req.body?.report_id]
        );
      projectId = result.rows[0]?.project_id;
    } else if (
      ["POST", "DELETE"].includes(req.method) &&
      ["/labour", "/material", "/equipment", "/miscellaneous"].includes(path)
    ) {
      const taskId = req.body?.task_id;
      const result = await pool.query("SELECT project_id FROM wbs WHERE id = $1", [taskId]);
      projectId = result.rows[0]?.project_id;
    } else if (
      req.method === "DELETE" &&
      /^\/(labour|material|equipment|miscellaneous)\/\d+$/.test(path)
    ) {
      const [, detailType, detailId] = path.split("/");
      const table = {
        labour: "wbs_labour",
        material: "wbs_material",
        equipment: "wbs_equipment",
        miscellaneous: "wbs_miscellaneous",
      }[detailType];
      const result = await pool.query(
        `SELECT w.project_id
           FROM ${table} detail
           JOIN wbs w ON w.id = detail.task_id
          WHERE detail.id = $1`,
        [detailId]
      );
      projectId = result.rows[0]?.project_id;
    } else if (req.params.id && /^\/\d+$/.test(path)) {
      const result = await pool.query(
        "SELECT project_id FROM wbs WHERE id = $1",
        [req.params.id]
      );
      projectId = result.rows[0]?.project_id;
    }

    const allowed = req.user.role === "site_engineer"
      ? await isAssignedProject(req.user.id, projectId)
      : await isManagedProject(req.user.id, projectId);
    if (!allowed) {
      return res.status(403).json({
        error: req.user.role === "site_engineer"
          ? "You are not assigned to this project"
          : "You do not manage this project",
      });
    }
    return next();
  } catch (error) {
    console.error("WBS project access check failed:", error);
    return res.status(500).json({ error: "Unable to verify project access" });
  }
});

// ── IMPORTANT: specific named routes MUST come before /:id params ──

// Auto-plan (replace all WBS for a project)
router.post("/auto-plan",            wbs.autoPlanWBS);

// Sync from SE daily report (legacy)
router.post("/sync-from-se",         wbs.syncFromSEReport);

// ── SE Alert routes (reads from site_engineer_daily_updates) ──
// GET  /api/wbs/se-alerts?project_id=X   → list pending alerts
// POST /api/wbs/se-alerts/:id/apply      → approve & apply to WBS
// POST /api/wbs/se-alerts/:id/dismiss    → dismiss without applying
router.get("/se-alerts",             wbs.getSEAlerts);
router.post("/se-alerts/:id/apply",  wbs.applySEAlert);
router.post("/se-alerts/:id/dismiss",wbs.dismissSEAlert);

// Child task
router.post("/task",                 wbs.createWBSTask);

// Cost detail creates
router.post("/labour",               wbs.addLabour);
router.post("/material",             wbs.addMaterial);
router.post("/equipment",            wbs.addEquipment);
router.post("/miscellaneous",        wbs.addMiscellaneous);

// Cost detail deletes
router.delete("/labour/:id",         wbs.deleteLabour);
router.delete("/material/:id",       wbs.deleteMaterial);
router.delete("/equipment/:id",      wbs.deleteEquipment);
router.delete("/miscellaneous/:id",  wbs.deleteMiscellaneous);

// ── Generic WBS CRUD ──
router.get("/",                      wbs.getAllWBS);           // flat list — used for existingProjectIds check
router.get("/:projectId",            wbs.getWBSByProject);    // nested tree for one project
router.post("/",                     wbs.createWBSItem);       // create top-level milestone
router.patch("/:id",                 wbs.updateWBSItem);       // update status/progress/fields
router.delete("/:id",                wbs.deleteWBSItem);       // delete milestone or subtask

module.exports = router;