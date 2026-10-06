const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware, authMiddleware.requireRole("site_engineer", "project_manager", "ceo"));

const {
  getSiteEngineerDashboard,
  getDashboardMetrics,
  getZoneProgress   // ✅ important
} = require("../controllers/dashboardController");

/* ===== GET SITE ENGINEER DASHBOARD ===== */
router.get("/", getSiteEngineerDashboard);

/* ===== GET DASHBOARD METRICS ===== */
router.get("/metrics", getDashboardMetrics);

/* ===== GET ZONE PROGRESS ===== */
router.get("/zone-progress", getZoneProgress);

module.exports = router;