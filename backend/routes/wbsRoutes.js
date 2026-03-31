const express = require("express");
const router = express.Router();
const wbs = require("../controllers/wbsController");

// ── WBS Tree ──────────────────────────────────────────────
router.get("/:projectId", wbs.getWBSByProject); // GET full tree for project

// ── WBS Items ─────────────────────────────────────────────
router.post("/", wbs.createWBSItem); // POST top-level task
router.post("/task", wbs.createWBSTask); // POST subtask (child)
router.delete("/:id", wbs.deleteWBSItem); // DELETE wbs item

// ── Cost Details ──────────────────────────────────────────
router.post("/labour", wbs.addLabour);
router.delete("/labour/:id", wbs.deleteLabour);

router.post("/material", wbs.addMaterial);
router.delete("/material/:id", wbs.deleteMaterial);

router.post("/equipment", wbs.addEquipment);
router.delete("/equipment/:id", wbs.deleteEquipment);

router.post("/miscellaneous", wbs.addMiscellaneous);
router.delete("/miscellaneous/:id", wbs.deleteMiscellaneous);

module.exports = router;
