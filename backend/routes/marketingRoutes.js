// backend/routes/marketingRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/marketingDashboardController");

router.use(protect);
router.use(requireRole("digital_marketing", "ceo"));

router.get("/dashboard", controller.getDashboard);
router.get("/reports", controller.getReports);

module.exports = router;