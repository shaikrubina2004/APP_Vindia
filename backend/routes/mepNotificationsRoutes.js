const express = require("express");
const router = express.Router();
const c = require("../controllers/mepNotificationsController");

// ✅ new
router.patch("/read-all/:userId", c.markAllRead);
router.patch("/:id/read", c.markRead);
router.get("/:userId", c.getNotifications);

module.exports = router;
