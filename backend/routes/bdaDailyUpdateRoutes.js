const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/bdaDailyUpdateController");

router.use(protect);

/* BDA (role code "bda") */
router.get("/stats",         requireRole("bda"), c.getStats);
router.get("/today",         requireRole("bda"), c.getToday);
router.get("/mine",          requireRole("bda"), c.getMine);
router.post("/",             requireRole("bda"), c.submit);
router.post("/other-report", requireRole("bda"), c.submitOther);

/* CEO inbox */
router.get("/",              requireRole("ceo"), c.getAllForCeo);

module.exports = router;