const express = require("express");
const router  = express.Router();
const {
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
} = require("../controllers/pcNotificationsController");

// IMPORTANT: read-all must be before /:id/read to avoid route conflict
router.get("/:userId",              getNotifications);
router.patch("/read-all/:userId",   markAllRead);
router.patch("/:id/read",           markOneRead);
router.post("/",                    createNotification);

module.exports = router;