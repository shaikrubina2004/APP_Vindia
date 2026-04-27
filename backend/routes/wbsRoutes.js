const express = require("express");
const router  = express.Router();
const wbs     = require("../controllers/wbsController");

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