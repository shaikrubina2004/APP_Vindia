// ===== FILE: APP_Vindia/backend/routes/procurementRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const procurementController = require("../controllers/procurementController");

// Only Procurement Officers can see/act on their own approved-requests queue.
router.get(
  "/material-requests/approved",
  protect,
  requireRole("procurement_officer"),
  procurementController.getApprovedRequests
);

// Only Procurement Officers can create purchase orders.
router.post(
  "/purchase-orders",
  protect,
  requireRole("procurement_officer"),
  procurementController.createPurchaseOrder
);

// GET /purchase-orders and GET /purchase-orders/:id are also opened to
// Logistics Coordinators, who need to read the list to link a delivery
// to a PO — they can't create or modify one.
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

// Manager rollup — every officer's daily reports. Deliberately its own
// role set (operations_manager / ceo), and registered before the
// ":date" route below so "/all" doesn't get swallowed as a date param.
// Safe to leave mounted now even though no one can log in as
// operations_manager yet.
router.get(
  "/daily-reports/all",
  protect,
  requireRole("operations_manager", "ceo"),
  procurementController.getAllDailyReportsForManager
);

// Daily reports are personal to each Procurement Officer — no other
// role reads or writes these.
router.get(
  "/daily-reports",
  protect,
  requireRole("procurement_officer"),
  procurementController.getDailyReportsHistory
);

router.get(
  "/daily-reports/:date",
  protect,
  requireRole("procurement_officer"),
  procurementController.getDailyReport
);

router.post(
  "/daily-reports",
  protect,
  requireRole("procurement_officer"),
  procurementController.upsertDailyReport
);

module.exports = router;