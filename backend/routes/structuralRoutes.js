const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");


// ==============================
// 📂 MULTER CONFIG (FILE UPLOAD)
// ==============================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// ==============================
// 📊 DASHBOARD API (REAL DATA)
// ==============================
router.get("/dashboard", async (req, res) => {
  try {
    const drawingsResult = await pool.query(
      "SELECT COUNT(*) FROM drawings"
    );

    const latestVersionResult = await pool.query(
      "SELECT version FROM drawings ORDER BY created_at DESC LIMIT 1"
    );

    // ✅ SAFE FALLBACK (no table crash)
    let incidentsCount = 0;
    let notificationsCount = 0;

    try {
      const incidentsResult = await pool.query(
        "SELECT COUNT(*) FROM incidents WHERE status='pending'"
      );
      incidentsCount = parseInt(incidentsResult.rows[0].count);
    } catch (err) {
      console.log("⚠️ incidents table missing");
    }

    try {
      const notificationsResult = await pool.query(
        "SELECT COUNT(*) FROM notifications"
      );
      notificationsCount = parseInt(notificationsResult.rows[0].count);
    } catch (err) {
      console.log("⚠️ notifications table missing");
    }

    res.json({
      totalDrawings: parseInt(drawingsResult.rows[0].count),
      latestVersion: latestVersionResult.rows[0]?.version || "N/A",
      pendingIncidents: incidentsCount,
      notifications: notificationsCount,
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 📤 UPLOAD DRAWING API
// ==============================
router.post("/upload-drawing", upload.single("file"), async (req, res) => {
  try {
    const { name, version, uploaded_by } = req.body;
    const file_url = req.file.filename;

    await pool.query(
      "INSERT INTO drawings (name, version, file_url, uploaded_by) VALUES ($1, $2, $3, $4)",
      [name, version, file_url, uploaded_by]
    );

    res.json({ message: "Drawing uploaded successfully" });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// ==============================
// 📄 GET ALL DRAWINGS
// ==============================
router.get("/drawings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM drawings ORDER BY created_at DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Fetch Drawings Error:", err);
    res.status(500).json({ error: "Error fetching drawings" });
  }
});

router.delete("/drawings/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM drawings WHERE id=$1", [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.put("/drawings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query(
      "UPDATE drawings SET status=$1, updated_at=NOW() WHERE id=$2",
      [status, id]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;