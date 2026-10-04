// ===== FILE: APP_Vindia/backend/routes/employeeDocumentRoutes.js =====
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const employeeDocumentController = require("../controllers/employeeDocumentController");

router.post("/", authMiddleware, upload.single("file"), employeeDocumentController.uploadDocument);
router.get("/employee/:employeeId", authMiddleware, employeeDocumentController.getDocumentsByEmployee);
router.delete("/:id", authMiddleware, employeeDocumentController.deleteDocument);

module.exports = router;