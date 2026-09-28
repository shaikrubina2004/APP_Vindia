const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const { getOverview } = require("../controllers/analyticsController");

router.get("/overview", authMiddleware, requireRole("ceo"), getOverview);

module.exports = router;