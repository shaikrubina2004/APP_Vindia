const express = require("express");
const router = express.Router();
const { createNCR, getNCR } = require("../controllers/ncrController");

router.post("/", createNCR);
router.get("/", getNCR);

module.exports = router;