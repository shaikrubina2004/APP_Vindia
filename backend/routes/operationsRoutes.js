// ===== FILE: APP_Vindia/backend/routes/operationsRoutes.js =====
// Mounted at /api/operations — Operations Manager control tower.
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/operationsController");
const wbsController = require("../controllers/operationsWbsController");

router.use(protect, requireRole("operations_manager", "ceo"));

router.get("/dashboard", controller.getDashboard);
router.get("/approvals", controller.getApprovals);
router.get("/reports", controller.getReports);

// Read-only WBS control for Operations Manager / CEO.
router.get("/wbs/projects", wbsController.listProjects);
router.get("/wbs/:projectId", wbsController.getProjectWbs);

module.exports = router;
