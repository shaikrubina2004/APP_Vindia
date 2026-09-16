const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const controller = require("../controllers/inventoryTransactionController");

const CAN_WRITE = requireRole("inventory_controller", "operations_manager", "ceo");

router.get("/dashboard", authMiddleware, controller.getInventoryDashboard);
router.get("/stock-register", authMiddleware, controller.getStockRegister);
router.get("/transactions", authMiddleware, controller.getTransactions);

router.post("/issue", authMiddleware, CAN_WRITE, controller.createIssue);
router.post("/return", authMiddleware, CAN_WRITE, controller.createReturn);
router.post("/transfer", authMiddleware, CAN_WRITE, controller.createTransfer);
router.post("/adjustment", authMiddleware, CAN_WRITE, controller.createAdjustment);

module.exports = router;