// backend/routes/siteEngineerDashboardRoutes.js
const express = require("express");
const router = express.Router();
const {
  getSiteEngineerDashboard,
  getDashboardMetrics,
} = require("../controllers/dashboardController");

/* ===== GET SITE ENGINEER DASHBOARD ===== */
router.get("/", getSiteEngineerDashboard);

/* ===== GET DASHBOARD METRICS ===== */
router.get("/metrics", getDashboardMetrics);

module.exports = router;