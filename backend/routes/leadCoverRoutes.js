const express = require("express");
const router  = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/leadCoverController");

/* every role code that is a BDA (same list as utils/leadAssignment.js) */
const BDA_ROLES = ["bda", "bda1", "bda2", "business_development", "business_development_analyst"];

router.use(protect);
router.get("/mine",     requireRole(...BDA_ROLES), c.mine);
router.get("/outgoing", requireRole(...BDA_ROLES), c.outgoing);
router.post("/:leadId/follow-up", requireRole(...BDA_ROLES), c.followUp);

module.exports = router;