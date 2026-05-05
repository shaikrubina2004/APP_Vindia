const express = require("express");
const router = express.Router();
const c = require("../controllers/boqController");

// ═══════════════════════════════════════
// PROJECTS & MILESTONES
// ═══════════════════════════════════════

// GET projects
router.get("/projects", c.getProjects);

// GET milestones by project
router.get("/milestones/:projectId", c.getMilestones);

// ═══════════════════════════════════════
// BOQ CRUD
// ═══════════════════════════════════════

// GET all BOQs (with filters)
router.get("/", c.getAllBoqs);

// GET single BOQ
router.get("/:id", c.getBoqById);

// CREATE BOQ
router.post("/", c.createBoq);

// UPDATE BOQ
router.put("/:id", c.updateBoq);

// DELETE BOQ
router.delete("/:id", c.deleteBoq);

module.exports = router;