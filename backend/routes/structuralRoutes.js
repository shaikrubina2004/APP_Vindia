const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
// ==============================
// 📂 MULTER CONFIG (FILE UPLOAD)
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ==============================
// 📊 DASHBOARD API
// ==============================
router.get("/dashboard", async (req, res) => {
  try {
    const drawingsResult = await pool.query("SELECT COUNT(*) FROM drawings");

    const latestVersionResult = await pool.query(
      "SELECT version FROM drawings ORDER BY created_at DESC LIMIT 1"
    );

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
// 📤 UPLOAD DRAWING
// ==============================
router.post("/upload-drawing", upload.single("file"), async (req, res) => {
  try {
    const { name, version, uploaded_by } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

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
// 📄 GET DRAWINGS
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

// ==============================
// ❌ DELETE DRAWING
// ==============================
router.delete("/drawings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM drawings WHERE id=$1", [id]);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ==============================
// 🔄 UPDATE DRAWING STATUS
// ==============================
router.put("/drawings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    let column = "";

    if (role === "architect") column = "architect_status";
    else if (role === "mep") column = "mep_status";
    else if (role === "manager") column = "manager_status";

    if (!column) {
      return res.status(400).json({ error: "Invalid role" });
    }

    await pool.query(
      `UPDATE drawings SET ${column}=$1 WHERE id=$2`,
      [status, id]
    );

    res.json({ message: "Updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ==============================
// 📋 BOQ ROUTE
// ==============================
router.get("/boq", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM boq ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("BOQ ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;