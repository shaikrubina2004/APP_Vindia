const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const {
  getAllNotifications,
  markAllRead,
  markOneRead,
  createNotification,
} = require("../controllers/qsNotificationController");

router.use(authMiddleware);
router.use(requireRole("quantity_surveyor"));

// ⚠️ ORDER MATTERS — specific routes before /:id
router.put ("/mark-all-read", markAllRead);
router.put ("/:id/read",      markOneRead);
router.get ("/",              getAllNotifications);
router.post("/", createNotification);

module.exports = router;