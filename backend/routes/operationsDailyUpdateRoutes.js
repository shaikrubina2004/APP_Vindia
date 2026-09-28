// ===== FILE: APP_Vindia/backend/routes/operationsDailyUpdateRoutes.js =====
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/operationsDailyUpdateController");

router.use(protect);

/* Inventory Controller + Logistics Coordinator: submit and view their own */
const submitters = requireRole("inventory_controller", "logistics_coordinator");

router.post("/", submitters, controller.submitUpdate);
router.get("/mine", submitters, controller.getMyUpdates);
router.get("/today", submitters, controller.getTodayMine);

/* Operations Manager: review inbox + approve / reject */
const manager = requireRole("operations_manager");

router.get("/", manager, controller.getAllUpdates);
router.put("/:id/review", manager, controller.reviewUpdate);

/* Single update — keep AFTER /mine and /today */
router.get(
  "/:id",
  requireRole("inventory_controller", "logistics_coordinator", "operations_manager"),
  controller.getUpdateById
);

module.exports = router;