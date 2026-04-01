const express = require("express");
const router = express.Router();

// ✅ IMPORT BOTH FUNCTIONS
const { getCostSummary, getCostDetails } = require("../controllers/costController");

// existing route
router.get("/:projectId", getCostSummary);

// ✅ NEW route
router.get("/details/:wbsId", getCostDetails);

module.exports = router;