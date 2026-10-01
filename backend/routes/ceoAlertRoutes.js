const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/ceoAlertController");

router.use(protect, requireRole("ceo"));

router.get("/", c.getMine);
router.patch("/read-all", c.markAllRead);   // must stay above /:id/read
router.delete("/read", c.clearRead);
router.patch("/:id/read", c.markOneRead);

module.exports = router;