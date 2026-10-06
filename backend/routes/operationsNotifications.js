const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
} = require("../controllers/operationsNotificationsController");

// IMPORTANT: read-all must be before /:id/read to avoid route conflict
// Every route requires a valid token; handlers additionally scope to req.user.id.
router.use(protect);

router.get("/:userId", getNotifications);
router.patch("/read-all/:userId", markAllRead);
router.patch("/:id/read", markOneRead);
// Manual trigger — managers only (was open to anonymous callers).
router.post("/", requireRole("operations_manager", "ceo"), createNotification);

module.exports = router;