const express = require("express");
const router = express.Router();
const c = require("../controllers/mepNotificationsController");

router.get("/:userId", c.getNotifications);
router.patch("/:id/read", c.markRead);
router.patch("/read-all/:userId", c.markAllRead);

module.exports = router;
