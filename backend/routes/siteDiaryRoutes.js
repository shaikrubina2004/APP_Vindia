const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createDiary, getDiary, getDiaryById } = require("../controllers/siteDiaryController");

/* ===== CREATE ===== */
router.post("/", authMiddleware, createDiary);

/* ===== GET ===== */
router.get("/", authMiddleware, getDiary);
router.get("/:id", authMiddleware, getDiaryById);

module.exports = router;