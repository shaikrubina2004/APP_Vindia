const express = require("express");
const router = express.Router();

const controller = require("../controllers/materialRequestController");

/* ─────────────────────────────
   ROUTES
───────────────────────────── */

router.get("/", controller.getRequests);

router.post("/", controller.createRequest);

router.put("/:id", controller.updateRequest);

module.exports = router;