const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createNCR, getNCR, getNCRById, updateNCR } = require("../controllers/ncrController");

/* ===== CREATE ===== */
router.post("/", authMiddleware, createNCR);

/* ===== GET ===== */
router.get("/", getNCR);
router.get("/:id", getNCRById);

/* ===== UPDATE ===== */
router.put("/:id", authMiddleware, updateNCR);

module.exports = router;