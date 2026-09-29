// backend/routes/ceoRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/ceoController");

router.use(protect);
router.use(requireRole("ceo"));

router.get("/dashboard", c.getDashboard);
router.get("/manager-updates", c.getManagerUpdates);
router.get("/manager-updates/today", c.getTodayStatus);
router.put("/manager-updates/finance/:id/review", c.reviewFinanceUpdate);

module.exports = router;