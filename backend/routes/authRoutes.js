const express = require("express");
const router = express.Router();

const { signup, login, changePassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ PUBLIC SIGNUP
router.post("/signup", signup);

// ✅ LOGIN
router.post("/login", login);

// ✅ CHANGE MY PASSWORD (must be logged in)
router.post("/change-password", authMiddleware, changePassword);

module.exports = router;