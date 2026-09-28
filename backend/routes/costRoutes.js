const express = require("express");
const router = express.Router();

// ✅ IMPORT BOTH FUNCTIONS
const { getCostSummary, getCostDetails } = require("../controllers/costController");

/* ── AUTH ──
   Previously no auth at all — project budgets/costs were readable
   by anyone with no login. Now requires a logged-in user (financial
   figures also feed the CEO/PM Project Management page). */
const authMiddleware = require("../middleware/authMiddleware");

// existing route
router.get("/:projectId", authMiddleware, getCostSummary);

// ✅ NEW route
router.get("/details/:wbsId", authMiddleware, getCostDetails);

module.exports = router;