const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const controller = require("../controllers/goodsReceiptController");

const CAN_WRITE = requireRole("inventory_controller", "operations_manager", "ceo");

router.get("/", authMiddleware, controller.getGoodsReceipts);
router.get("/:id", authMiddleware, controller.getGoodsReceiptById);
router.post("/", authMiddleware, CAN_WRITE, controller.createGoodsReceipt);

module.exports = router;