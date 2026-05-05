// FILE PATH: backend/routes/structuralRoutes.js

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const createSENotification = require("../utils/createSENotification");

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// ═══════════════════════════════════════════════════════════════════════════
// 📊  DASHBOARD
//     Accepts optional ?project_id=123 query param.
//     If provided → counts only drawings for that project.
//     If omitted  → counts all drawings (fallback).
// ═══════════════════════════════════════════════════════════════════════════
router.get("/dashboard", async (req, res) => {
  try {
    const { project_id } = req.query; // optional filter

    // ── Total drawings (project-aware) ─────────────────────────────────
    let drawingsCount = 0;
    let latestVersion = "N/A";

    if (project_id) {
      // Count only drawings for this project
      const dr = await pool.query(
        "SELECT COUNT(*) FROM drawings WHERE project_id = $1",
        [project_id],
      );
      drawingsCount = parseInt(dr.rows[0].count, 10);

      // Latest version for this project
      try {
        const vr = await pool.query(
          "SELECT version FROM drawings WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
          [project_id],
        );
        latestVersion = vr.rows[0]?.version || "N/A";
      } catch {
        console.log("⚠️  version column missing in drawings");
      }
    } else {
      // No project filter — count all
      const dr = await pool.query("SELECT COUNT(*) FROM drawings");
      drawingsCount = parseInt(dr.rows[0].count, 10);

      try {
        const vr = await pool.query(
          "SELECT version FROM drawings ORDER BY created_at DESC LIMIT 1",
        );
        latestVersion = vr.rows[0]?.version || "N/A";
      } catch {
        console.log("⚠️  version column missing");
      }
    }

    // ── Pending incidents ──────────────────────────────────────────────
    let incidentsCount = 0;
    try {
      const ir = await pool.query(
        "SELECT COUNT(*) FROM incidents WHERE status = 'pending'",
      );
      incidentsCount = parseInt(ir.rows[0].count, 10);
    } catch {
      console.log("⚠️  incidents table missing");
    }

    // ── Unread SE notifications ────────────────────────────────────────
    let notificationsCount = 0;
    try {
      const nr = await pool.query(
        "SELECT COUNT(*) FROM notifications WHERE role = 'structural_engineer' AND is_read = false",
      );
      notificationsCount = parseInt(nr.rows[0].count, 10);
    } catch {
      console.log("⚠️  notifications table missing");
    }

    return res.json({
      totalDrawings: drawingsCount,
      latestVersion,
      pendingIncidents: incidentsCount,
      notifications: notificationsCount,
    });
  } catch (err) {
    console.error("Dashboard Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📤  UPLOAD DRAWING
// ═══════════════════════════════════════════════════════════════════════════
router.post("/upload-drawing", upload.single("file"), async (req, res) => {
  try {
    const { name, version, uploaded_by, project_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    await pool.query(
      "INSERT INTO drawings (name, version, file_url, uploaded_by, project_id) VALUES ($1, $2, $3, $4, $5)",
      [name, version, req.file.filename, uploaded_by, project_id || null],
    );

    await createSENotification({
      type: "drawing",
      severity: "info",
      title: `New Drawing Uploaded: ${name}`,
      description: `Drawing "${name}" (${version || "no version"}) was uploaded by ${uploaded_by || "a team member"}.`,
    });

    return res.json({ message: "Drawing uploaded successfully" });
  } catch (err) {
    console.error("Upload Error:", err.message);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📄  GET DRAWINGS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/drawings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM drawings ORDER BY created_at DESC",
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch Drawings Error:", err.message);
    return res.status(500).json({ error: "Error fetching drawings" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ❌  DELETE DRAWING
// ═══════════════════════════════════════════════════════════════════════════
router.delete("/drawings/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM drawings WHERE id = $1", [req.params.id]);
    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err.message);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔄  UPDATE DRAWING STATUS
// ═══════════════════════════════════════════════════════════════════════════
router.put("/drawings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const COLUMN_MAP = {
      architect: "architect_status",
      mep: "mep_status",
      manager: "manager_status",
    };

    const column = COLUMN_MAP[role];
    if (!column) {
      return res.status(400).json({ error: "Invalid role" });
    }

    let drawingName = `Drawing #${id}`;
    try {
      const dr = await pool.query("SELECT name FROM drawings WHERE id = $1", [
        id,
      ]);
      if (dr.rows[0]) drawingName = dr.rows[0].name;
    } catch {
      /* ignore */
    }

    await pool.query(`UPDATE drawings SET ${column} = $1 WHERE id = $2`, [
      status,
      id,
    ]);

    const severityMap = {
      approved: "ok",
      rejected: "critical",
      pending: "warn",
    };
    const severity = severityMap[status?.toLowerCase()] || "info";
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);

    await createSENotification({
      type: "drawing",
      severity,
      title: `Drawing ${status} by ${roleName}`,
      description: `"${drawingName}" was marked as "${status}" by the ${roleName}.`,
    });

    return res.json({ message: "Updated successfully" });
  } catch (err) {
    console.error("Update Error:", err.message);
    return res.status(500).json({ error: "Failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌  RECENT ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════
router.get("/recent-activity", async (req, res) => {
  try {
    const drawings = await pool.query(
      "SELECT name, created_at FROM drawings ORDER BY created_at DESC LIMIT 3",
    );

    let incidents = { rows: [] };
    try {
      incidents = await pool.query(
        "SELECT title, created_at FROM incidents ORDER BY created_at DESC LIMIT 2",
      );
    } catch {
      /* incidents table may not exist */
    }

    const activity = [
      ...drawings.rows.map((d) => ({
        type: "drawing",
        text: `New drawing uploaded: ${d.name}`,
      })),
      ...incidents.rows.map((i) => ({
        type: "incident",
        text: `Issue reported: ${i.title}`,
      })),
    ];

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔔  GET SE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/notifications", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, is_read, created_at
       FROM notifications
       WHERE role = 'structural_engineer'
       ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Notifications Error:", err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔕  MARK NOTIFICATION AS READ
// ═══════════════════════════════════════════════════════════════════════════
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

module.exports = router;
