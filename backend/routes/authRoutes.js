const express = require("express");
const router = express.Router();

// ✅ IMPORT CORRECTLY
const authController = require("../controllers/authController");

// ✅ ROUTES
router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;