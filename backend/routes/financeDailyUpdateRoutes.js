// ===== FILE: APP_Vindia/backend/routes/financeDailyUpdateRoutes.js =====

const express = require("express");
const router = express.Router();

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

const controller = require("../controllers/financeDailyUpdateController");

router.use(protect);

/*
 * ============================================================
 * ACCOUNTANT + FINANCE MANAGER
 * Submit and view own daily updates
 * ============================================================
 */

const financeOperationsAccess = requireRole(
  "accountant",
  "finance_manager"
);

router.post(
  "/",
  financeOperationsAccess,
  controller.submitUpdate
);

router.get(
  "/mine",
  financeOperationsAccess,
  controller.getMyUpdates
);

router.get(
  "/today",
  financeOperationsAccess,
  controller.getTodayMine
);

/*
 * ============================================================
 * FINANCE MANAGER
 * Review Accountant daily updates
 * ============================================================
 */

const financeManagerAccess =
  requireRole("finance_manager");

router.get(
  "/",
  financeManagerAccess,
  controller.getAllUpdates
);

router.put(
  "/:id/review",
  financeManagerAccess,
  controller.reviewUpdate
);

/*
 * ============================================================
 * ACCOUNTANT + FINANCE MANAGER
 * View a single update
 * ============================================================
 *
 * Must remain after /mine and /today so those routes
 * are matched correctly.
 */

router.get(
  "/:id",
  requireRole(
    "accountant",
    "finance_manager"
  ),
  controller.getUpdateById
);

module.exports = router;