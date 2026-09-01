const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(
      null,
      `${Date.now()}-${safeName}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
});

module.exports = upload;