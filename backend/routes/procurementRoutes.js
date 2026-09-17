// ===== FILE: APP_Vindia/backend/routes/procurementRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const procurementController = require("../controllers/procurementController");

router.use(protect, requireRole("procurement_officer"));

router.get(
  "/material-requests/approved",
  procurementController.getApprovedRequests
);

router.post("/purchase-orders", procurementController.createPurchaseOrder);
router.get("/purchase-orders", procurementController.getPurchaseOrders);
router.get("/purchase-orders/:id", procurementController.getPurchaseOrderById);

module.exports = router;