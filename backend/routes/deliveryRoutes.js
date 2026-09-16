const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const controller = require("../controllers/deliveryController");

const CAN_WRITE = requireRole("logistics_coordinator", "operations_manager", "ceo");

router.get("/dashboard", authMiddleware, controller.getLogisticsDashboard);
router.get("/pending-receipt", authMiddleware, controller.getPendingReceipts);
router.get("/", authMiddleware, controller.getDeliveries);
router.get("/:id", authMiddleware, controller.getDeliveryById);

router.post("/", authMiddleware, CAN_WRITE, controller.createDelivery);
router.put("/:id/dispatch", authMiddleware, CAN_WRITE, controller.dispatchDelivery);
router.put("/:id/in-transit", authMiddleware, CAN_WRITE, controller.markInTransit);
router.put("/:id/deliver", authMiddleware, CAN_WRITE, controller.markDelivered);
router.put("/:id/delay", authMiddleware, CAN_WRITE, controller.markDelayed);
router.put("/:id/cancel", authMiddleware, CAN_WRITE, controller.cancelDelivery);

module.exports = router;