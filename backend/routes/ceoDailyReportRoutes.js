const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/ceoDailyReportController");

router.use(protect);

/* ── Managers (PM / BDA / Operations / HR): submit & view own ───── */
router.post("/", c.submit);
router.get("/today", c.today);
router.get("/mine", c.mine);

/* ── CEO: review inbox ─────────────────────────────────────────── */
router.get("/summary", requireRole("ceo"), c.summary);
router.get("/", requireRole("ceo"), c.list);
router.put("/:source/:id/review", requireRole("ceo"), c.review);

module.exports = router;