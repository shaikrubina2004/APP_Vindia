const express = require("express");
const router = express.Router();

const controller = require("../controllers/materialRequestController");

/* ─────────────────────────────
   ROUTES
───────────────────────────── */

router.get("/", controller.getRequests);

router.post("/", controller.createRequest);

// ✅ FULL EDIT (not just status)
router.put("/:id", controller.updateFullRequest);

// ✅ DELETE
router.delete("/:id", controller.deleteRequest);

// status update (if needed separately)
router.put("/status/:id", controller.updateRequest);

router.post("/delivery", controller.addDelivery);
router.post("/receive", controller.receiveMaterial);

module.exports = router;