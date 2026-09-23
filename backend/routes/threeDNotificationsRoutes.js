
const express = require("express");
const router  = express.Router();

const { protect } = require("../middleware/authMiddleware");
const c = require("../controllers/threeDNotificationsController");

router.use(protect);

// Mark all read for a user  →  PATCH /api/3d-notifications/read-all/:userId
router.patch("/read-all/:userId", c.markAllRead);

// Mark single notification read  →  PATCH /api/3d-notifications/:id/read
router.patch("/:id/read", c.markRead);

// Get all notifications for a user  →  GET /api/3d-notifications/:userId
router.get("/:userId", c.getNotifications);

module.exports = router;