const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const controller = require("../controllers/inventoryItemController");

const CAN_WRITE = requireRole("inventory_controller", "operations_manager", "ceo");

// Any authenticated user can read the item master (procurement/logistics need it too)
router.get("/", authMiddleware, controller.getItems);
router.get("/low-stock", authMiddleware, controller.getLowStock);
router.get("/:id", authMiddleware, controller.getItemById);

router.post("/", authMiddleware, CAN_WRITE, controller.createItem);
router.put("/:id", authMiddleware, CAN_WRITE, controller.updateItem);
router.delete("/:id", authMiddleware, CAN_WRITE, controller.deleteItem);

module.exports = router;