// backend/routes/ceoNotificationRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/ceoNotificationsController");

router.use(protect);
router.use(requireRole("ceo"));

router.get("/", c.getNotifications);
router.patch("/read-all", c.markAllRead); // must stay above /:id/read
router.patch("/:id/read", c.markOneRead);

module.exports = router;