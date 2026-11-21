// ===== FILE: APP_Vindia/backend/routes/hiringRequestRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const c = require("../controllers/hiringRequestController");

router.use(protect);

const managers = requireRole(...c.MANAGER_ROLES);

/* Manager: raise / list own */
router.post("/", managers, c.createRequest);
router.get("/mine", managers, c.getMine);

/* Finance Manager (+ CEO): queue and decision */
router.get("/finance", requireRole("finance_manager", "ceo"), c.getFinanceQueue);
router.patch("/:id/finance-decision", requireRole("finance_manager", "ceo"), c.financeDecision);

/* HR Manager (+ CEO): queue and decision */
router.get("/hr", requireRole("hr_manager", "ceo"), c.getHrQueue);
router.patch("/:id/hr-decision", requireRole("hr_manager", "ceo"), c.hrDecision);

/* Owner actions on one request (keep below the fixed paths above) */
router.put("/:id", managers, c.resubmit);
router.patch("/:id/cancel", managers, c.cancel);

/* Detail: owner, Finance Manager, HR Manager or CEO (checked in the controller) */
router.get("/:id", c.getOne);

module.exports = router;