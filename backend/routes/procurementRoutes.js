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

// Read access to purchase orders:
//  - Logistics Coordinators link deliveries to a PO
//  - Operations Manager / CEO oversee and approve
//  - Finance reads them for invoice matching
// Only Procurement creates POs; only the Operations Manager approves them.
const PO_READERS = [
  "procurement_officer",
  "logistics_coordinator",
  "operations_manager",
  "finance_manager",
  "accountant",
  "ceo",
];

router.get(
  "/purchase-orders",
  protect,
  requireRole(...PO_READERS),
  procurementController.getPurchaseOrders
);

router.get(
  "/purchase-orders/:id",
  protect,
  requireRole(...PO_READERS),
  procurementController.getPurchaseOrderById
);

router.put(
  "/purchase-orders/:id/approve",
  protect,
  requireRole("operations_manager", "ceo"),
  procurementController.approvePurchaseOrder
);

router.put(
  "/purchase-orders/:id/reject",
  protect,
  requireRole("operations_manager", "ceo"),
  procurementController.rejectPurchaseOrder
);

router.put(
  "/purchase-orders/:id/cancel",
  protect,
  requireRole("procurement_officer", "operations_manager", "ceo"),
  procurementController.cancelPurchaseOrder
);

// Manager rollup — every officer's daily reports. Deliberately its own
// role set (operations_manager / ceo), and registered before the
// ":date" route below so "/all" doesn't get swallowed as a date param.
// Powers the Procurement tab on the Operations Manager screens.
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