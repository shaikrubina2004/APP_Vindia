// ===== FILE: APP_Vindia/backend/routes/financeDailyUpdateRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/financeDailyUpdateController");

router.use(protect);

/* ── Finance Manager: submit & view own history ─────────────────── */
router.post("/", requireRole("finance_manager"), controller.submitUpdate);
router.get("/mine", requireRole("finance_manager"), controller.getMyUpdates);
router.get("/today", requireRole("finance_manager"), controller.getTodayMine);

/* ── CEO: review inbox ──────────────────────────────────────────── */
router.get("/", requireRole("ceo"), controller.getAllUpdates);
router.put("/:id/review", requireRole("ceo"), controller.reviewUpdate);

/* ── Either role can view a single record (must stay last) ───────── */
router.get("/:id", requireRole("finance_manager", "ceo"), controller.getUpdateById);

module.exports = router;