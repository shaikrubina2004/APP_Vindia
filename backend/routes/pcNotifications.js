const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markOneRead,
  markAllRead,
  createNotification,
} = require("../controllers/pcNotificationsController");

// Every route needs a valid token. Controllers additionally check that the
// notification belongs to the logged-in user.
router.use(protect);

// IMPORTANT: read-all must be before /:id/read to avoid route conflict
router.get("/:userId",              getNotifications);
router.patch("/read-all/:userId",   markAllRead);
router.patch("/:id/read",           markOneRead);
router.post("/",                    createNotification);

module.exports = router;