const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const ops = require("../config/operations");
const controller = require("../controllers/materialRequestController");

/* =========================
   ROUTES
========================= */

// Get requests
router.get(
  "/",
  authMiddleware,
  controller.getRequests
);

// Department-wide list (used by the Operations dashboard). Same visibility
// rules as "/" — approvers/Operations staff see all, others only their own.
router.get(
  "/department",
  authMiddleware,
  controller.getRequests
);

// Create request
router.post(
  "/",
  authMiddleware,
  controller.createRequest
);

// Full edit
router.put(
  "/:id",
  authMiddleware,
  controller.updateFullRequest
);

// Delete
router.delete(
  "/:id",
  authMiddleware,
  controller.deleteRequest
);

// Status update
// Approve / reject — restricted (was open to any logged-in user).
router.put(
  "/status/:id",
  authMiddleware,
  requireRole(...ops.MATERIAL_REQUEST_APPROVER_ROLES),
  controller.updateRequest
);

// Delivery
router.post(
  "/delivery",
  authMiddleware,
  requireRole(...ops.MATERIAL_REQUEST_FULFIL_ROLES),
  controller.addDelivery
);

// Receive material
router.post(
  "/receive",
  authMiddleware,
  requireRole(...ops.MATERIAL_REQUEST_RECEIVE_ROLES),
  controller.receiveMaterial
);

module.exports = router;