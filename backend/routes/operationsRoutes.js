// ===== FILE: APP_Vindia/backend/routes/operationsRoutes.js =====
// Mounted at /api/operations — Operations Manager control tower.
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/operationsController");

router.use(protect, requireRole("operations_manager", "ceo"));

router.get("/dashboard", controller.getDashboard);
router.get("/approvals", controller.getApprovals);
router.get("/reports", controller.getReports);

module.exports = router;
