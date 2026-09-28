const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const c = require("../controllers/settingsController");

router.post("/change-password", authMiddleware, c.changePassword);
router.get("/system",  authMiddleware, requireRole("ceo"), c.getSystemSettings);
router.put("/system",  authMiddleware, requireRole("ceo"), c.updateSystemSettings);

module.exports = router;