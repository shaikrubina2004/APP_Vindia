const express = require("express");
const router = express.Router();
const c = require("../controllers/boqController");
const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;

router.use(auth);
router.use(requireRole("quantity_surveyor", "project_manager", "site_engineer", "client", "ceo"));
const WRITE_ROLES = requireRole("quantity_surveyor", "project_manager", "ceo");

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
router.post("/", WRITE_ROLES, c.createBoq);

// UPDATE BOQ
router.put("/:id", WRITE_ROLES, c.updateBoq);

// DELETE BOQ
router.delete("/:id", WRITE_ROLES, c.deleteBoq);

module.exports = router;