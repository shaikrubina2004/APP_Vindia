const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
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
router.put(
  "/status/:id",
  authMiddleware,
  controller.updateRequest
);

// Delivery
router.post(
  "/delivery",
  authMiddleware,
  controller.addDelivery
);

// Receive material
router.post(
  "/receive",
  authMiddleware,
  controller.receiveMaterial
);

module.exports = router;