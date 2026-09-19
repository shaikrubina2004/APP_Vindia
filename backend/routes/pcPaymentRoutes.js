// ===== FILE: APP_Vindia/backend/routes/pcPaymentRoutes.js =====
//
// Read-only payment routes for the Project Coordinator.
// Deliberately separate from /api/finance/* so the PC never inherits
// accountant permissions (create/update/delete payments, vendor payouts).

const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const pcPaymentController = require("../controllers/pcPaymentController");

router.use(protect);

// Project Manager and CEO can see the same view — they also oversee projects.
const coordinatorAccess = requireRole(
  "project_coordinator",
  "project_manager",
  "ceo"
);

router.get("/", coordinatorAccess, pcPaymentController.getCoordinatorPayments);

router.get(
  "/:invoiceId/transactions",
  coordinatorAccess,
  pcPaymentController.getInvoiceTransactions
);

module.exports = router;