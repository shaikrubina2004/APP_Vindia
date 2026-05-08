// FILE PATH: backend/routes/architectNotificationsRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes for architect notification bell.
// Order matters: read-all must come before /:id/read to avoid param conflicts.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const c       = require("../controllers/architectNotificationsController");

// Mark all read for a user  →  PATCH /api/architect-notifications/read-all/:userId
router.patch("/read-all/:userId", c.markAllRead);

// Mark single notification read  →  PATCH /api/architect-notifications/:id/read
router.patch("/:id/read", c.markRead);

// Get all notifications for a user  →  GET /api/architect-notifications/:userId
router.get("/:userId", c.getNotifications);

module.exports = router;