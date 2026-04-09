const express = require("express");
const router = express.Router();
const { createRFI, getRFI } = require("../controllers/rfiController");

router.post("/", createRFI);
router.get("/", getRFI);

module.exports = router;