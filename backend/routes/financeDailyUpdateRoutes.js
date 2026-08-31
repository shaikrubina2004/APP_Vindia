// ===== FILE: APP_Vindia/backend/routes/financeDailyUpdateRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/financeDailyUpdateController");

router.use(protect);

/* ── Finance Manager: submit & view own history ─────────────────── */
router.post("/", requireRole("Finance Manager"), controller.submitUpdate);
router.get("/mine", requireRole("Finance Manager"), controller.getMyUpdates);
router.get("/today", requireRole("Finance Manager"), controller.getTodayMine);

/* ── CEO: review inbox ──────────────────────────────────────────── */
router.get("/", requireRole("CEO"), controller.getAllUpdates);
router.put("/:id/review", requireRole("CEO"), controller.reviewUpdate);

/* ── Either role can view a single record (must stay last) ───────── */
router.get("/:id", requireRole("Finance Manager", "CEO"), controller.getUpdateById);

module.exports = router;