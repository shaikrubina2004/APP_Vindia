const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/bdaNotificationsController");

router.get("/",               ctrl.getNotifications);
router.patch("/:id/read",     ctrl.markRead);
router.patch("/read-all",     ctrl.markAllRead);

module.exports = router;