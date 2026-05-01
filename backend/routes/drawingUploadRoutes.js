const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware"); // ✅ ADD

router.use(authMiddleware); // ✅ ADD THIS LINE
const {
  uploadDrawing,
  uploadNewVersion,
  getDrawingsByProject,
  getVersionsByDrawing,
  approveDrawing,
  issueForConstruction,
  flagClash,
  getClashesByDrawing,
  resolveClash,
  getFloorsByProject,
  deleteDrawing,
} = require("../controllers/drawingUploadController");

/* ══════════════════════════════════════
   MULTER — file storage config
   Saves to /uploads/drawings/
   Accepts: .dwg .dxf .pdf .rvt .ifc
══════════════════════════════════════ */
const uploadDir = path.join(__dirname, "../uploads/drawings");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [".dwg", ".dxf", ".pdf", ".rvt", ".ifc"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .dwg .dxf .pdf .rvt .ifc files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

/* ══════════════════════════════════════
   ROUTES
══════════════════════════════════════ */

// ── Drawing CRUD ──────────────────────
// POST   /api/drawings              → upload new drawing + first version
// GET    /api/drawings/project/:project_id → get all drawings for a project
// DELETE /api/drawings/:drawing_id  → soft delete a drawing

router.post("/", upload.single("file"), uploadDrawing);
router.get("/project/:project_id", getDrawingsByProject);
router.delete("/:drawing_id", deleteDrawing);

// ── Versions ──────────────────────────
// POST /api/drawings/:drawing_id/versions → upload new version
// GET  /api/drawings/:drawing_id/versions → get all versions of a drawing

router.post("/:drawing_id/versions", upload.single("file"), uploadNewVersion);
router.get("/:drawing_id/versions", getVersionsByDrawing);

// ── Approvals ─────────────────────────
// PUT /api/drawings/versions/:version_id/approve
// Body: { role: 'arch'|'str'|'mep', user_id, status, comments }

router.put("/versions/:version_id/approve", approveDrawing);

// ── Issue for Construction ─────────────
// PUT /api/drawings/versions/:version_id/issue-for-construction
// Body: { user_id, role: 'arch' }

router.put(
  "/versions/:version_id/issue-for-construction",
  issueForConstruction,
);

// ── Clash Flag ────────────────────────
// POST /api/drawings/clashes
// Body: { drawing_id_1, drawing_id_2, clash_type, description, ... }

router.post("/clashes", flagClash);
router.get("/clashes/:drawing_id", getClashesByDrawing);
router.put("/clashes/:clash_id/resolve", resolveClash);
// ── Floors ────────────────────────────
// GET /api/drawings/floors/:project_id

router.get("/floors/:project_id", getFloorsByProject);

module.exports = router;
