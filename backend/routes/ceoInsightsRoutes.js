const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { overview } = require("../controllers/ceoInsightsController");

router.get("/overview", protect, requireRole("ceo"), overview);

module.exports = router;