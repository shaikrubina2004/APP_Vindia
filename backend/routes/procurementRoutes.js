// ===== FILE: APP_Vindia/backend/routes/procurementRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const procurementController = require("../controllers/procurementController");

// Only Procurement Officers can create/manage purchase orders.
// GET /purchase-orders and GET /purchase-orders/:id are also opened to
// Logistics Coordinators, who need to read the list to link a delivery
// to a PO — they can't create or modify one.
router.get(
  "/material-requests/approved",
  protect,
  requireRole("procurement_officer"),
  procurementController.getApprovedRequests
);

router.post(
  "/purchase-orders",
  protect,
  requireRole("procurement_officer"),
  procurementController.createPurchaseOrder
);

router.get(
  "/purchase-orders",
  protect,
  requireRole("procurement_officer", "logistics_coordinator"),
  procurementController.getPurchaseOrders
);

router.get(
  "/purchase-orders/:id",
  protect,
  requireRole("procurement_officer", "logistics_coordinator"),
  procurementController.getPurchaseOrderById
);

module.exports = router;