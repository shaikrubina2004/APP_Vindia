const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/bdaDailyUpdateController");

router.use(protect);

/* every role code that is a BDA (same list as utils/leadAssignment.js) */
const BDA_ROLES = ["bda", "bda1", "bda2", "business_development", "business_development_analyst"];

/* BDA (role code "bda") */
router.get("/stats",         requireRole(...BDA_ROLES), c.getStats);
router.get("/today",         requireRole(...BDA_ROLES), c.getToday);
router.get("/mine",          requireRole(...BDA_ROLES), c.getMine);
router.post("/",             requireRole(...BDA_ROLES), c.submit);
router.post("/other-report", requireRole(...BDA_ROLES), c.submitOther);

/* CEO inbox */
router.get("/",              requireRole("ceo"), c.getAllForCeo);

module.exports = router;