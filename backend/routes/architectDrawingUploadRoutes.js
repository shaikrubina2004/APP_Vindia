const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); // reuse same middleware
const path = require("path");

// POST /api/architect-drawings/upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // ✅ Full URL so React on port 5173 can reach it
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  
  res.json({ url: fileUrl, file_name: req.file.originalname });
});
module.exports = router;