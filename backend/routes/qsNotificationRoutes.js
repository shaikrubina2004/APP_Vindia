// ══════════════════════════════════════════════════════════════════════════════
//  qsNotificationRoutes.js
//
//  Register in server.js:
//    const qsNotifRoutes = require("./routes/qsNotificationRoutes");
//    app.use("/api/qs/notifications", qsNotifRoutes);
//
// ══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();

const {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markOneRead,
  markAllRead,
  deleteNotification,
} = require("../controllers/qsNotificationController");

// Optional auth middleware:
// const { protect } = require("../middleware/authMiddleware");
// router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️  ORDER MATTERS:
//  /mark-all-read and /:id/read MUST come BEFORE /:id
// ─────────────────────────────────────────────────────────────────────────────

router.put ("/mark-all-read",  markAllRead);          // PUT  mark all as read
router.put ("/:id/read",       markOneRead);           // PUT  mark one as read

router.get ("/",               getAllNotifications);   // GET  all notifications (?type=&unread=)
router.post("/",               createNotification);    // POST create notification
router.get ("/:id",            getNotificationById);   // GET  single notification
router.delete("/:id",          deleteNotification);    // DELETE notification

module.exports = router;