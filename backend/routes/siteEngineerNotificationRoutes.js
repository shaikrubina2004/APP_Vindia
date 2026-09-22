// FILE PATH: backend/routes/siteEngineerNotificationRoutes.js
// Per-user Site Engineer notification endpoints, following the same
// shape as routes/operationsNotifications.js (Logistics Coordinator /
// Inventory Controller pattern).
// Mounted in server.js as: app.use("/api/site-engineer-notifications", siteEngineerNotificationRoutes)
//
// Note: unlike operationsNotifications.js, this keeps the `protect`
// auth middleware other routes in this app use — the operations
// version currently has none, which means any client can read any
// user's notifications by guessing their id. Worth tightening there too.

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
} = require("../controllers/siteEngineerNotificationsController");

// IMPORTANT: read-all must be before /:id/read to avoid route conflict
router.get("/:userId", protect, getNotifications);
router.patch("/read-all/:userId", protect, markAllRead);
router.patch("/:id/read", protect, markOneRead);
router.post("/", protect, createNotification);

module.exports = router;
