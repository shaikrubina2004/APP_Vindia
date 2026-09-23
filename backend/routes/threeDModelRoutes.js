// backend/routes/threeDModelRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const modelUpload = require("../middleware/modelUpload");
const controller = require("../controllers/threeDModelController");

/* All 3D model routes require a valid JWT */
router.use(protect);

/* Specific routes BEFORE dynamic /:id routes */
router.get("/stats/summary", controller.getStatsSummary);

/* File upload — visualizer (and ceo) only */
router.post(
  "/upload",
  requireRole("3d_visualizer", "ceo"),
  (req, res, next) => {
    modelUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/models/${req.file.filename}`;
    res.json({
      success: true,
      file_url: fileUrl,
      file_name: req.file.originalname,
      file_type: req.file.originalname.split(".").pop().toLowerCase(),
      file_size: req.file.size,
    });
  }
);

router.get("/", controller.getModels);
router.get("/:id", controller.getModelById);
router.post("/", requireRole("3d_visualizer", "ceo"), controller.createModel);
router.patch("/:id", controller.updateModel);
router.post("/:id/submit", requireRole("3d_visualizer", "ceo"), controller.submitModel);
router.post("/:id/approve", requireRole("architect", "ceo"), controller.approveModel);
router.post("/:id/reject", requireRole("architect", "ceo"), controller.rejectModel);
router.delete("/:id", controller.deleteModel);

module.exports = router;