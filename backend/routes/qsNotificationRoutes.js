const express = require("express");
const router  = express.Router();
const {
  getAllNotifications,
  markAllRead,
  markOneRead,
  createNotification,
} = require("../controllers/qsNotificationController");

// ⚠️ ORDER MATTERS — specific routes before /:id
router.put ("/mark-all-read", markAllRead);
router.put ("/:id/read",      markOneRead);
router.get ("/",              getAllNotifications);
router.post("/",              createNotification);

module.exports = router;