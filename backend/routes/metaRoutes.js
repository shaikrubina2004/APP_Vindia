const express = require("express");
const router = express.Router();
const metaController = require("../controllers/metaController");

router.get("/webhook", metaController.verifyWebhook);
router.post("/webhook", metaController.receiveLeads);

module.exports = router;