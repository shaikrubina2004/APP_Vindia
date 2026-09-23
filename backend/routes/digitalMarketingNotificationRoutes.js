// backend/routes/digitalMarketingNotificationRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/digitalMarketingNotificationsController");

router.use(protect);
router.use(requireRole("digital_marketing", "ceo"));

router.get("/", controller.getNotifications);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);

module.exports = router;