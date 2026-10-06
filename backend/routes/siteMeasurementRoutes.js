const express = require("express");
const router = express.Router();
const c = require("../controllers/siteMeasurementcontroller");
const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;

router.use(auth);
router.use(requireRole("site_engineer", "quantity_surveyor", "project_manager", "ceo"));
const WRITE_ROLES = requireRole("site_engineer", "project_manager", "ceo");

router.get("/pending", requireRole("quantity_surveyor", "project_manager", "ceo"), c.getPendingForQs);
router.get("/", c.getAll);

// Specific route first
router.get("/:id/items", c.getMeasurementItems);

// ✅ General route after
router.get("/:id", c.getById);

router.post("/", WRITE_ROLES, c.create);
router.put("/:id", WRITE_ROLES, c.update);
router.delete("/:id", WRITE_ROLES, c.remove);

module.exports = router;