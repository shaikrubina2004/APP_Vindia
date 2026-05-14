const express = require("express");
const router = express.Router();

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