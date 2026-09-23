// backend/middleware/modelUpload.js
// Handles 3D model file uploads (glb, gltf, fbx, obj, zip) using the
// project's existing disk-storage convention (see middleware/upload.js).
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../uploads/models");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const ALLOWED_EXT = [".glb", ".gltf", ".fbx", ".obj", ".zip"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_EXT.join(", ")}`));
  }
  cb(null, true);
};

const modelUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB — 3D assets can be large
    files: 1,
  },
});

module.exports = modelUpload;