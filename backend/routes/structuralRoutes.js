// FILE PATH: backend/routes/structuralRoutes.js

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const protect = require("../middleware/authMiddleware");
const { requireRole } = protect;
const createSENotification = require("../utils/createSENotification");

// Every route in this file now requires a valid login token.
router.use(protect);

// Structural Engineer area (the CEO may also look).
const SE_OR_CEO = requireRole("structural_engineer", "ceo");

// Drawing approval is done by Architect / MEP / Manager. The column that gets
// updated comes from the LOGGED-IN user's role, never from the request body.
const STATUS_COLUMN_BY_ROLE = {
  architect: { column: "architect_status", label: "Architect" },
  mep_engineer: { column: "mep_status", label: "MEP Engineer" },
  project_manager: { column: "manager_status", label: "Manager" },
  ceo: { column: "manager_status", label: "Manager" },
};
const DRAWING_STATUS_ROLES = requireRole(
  "architect",
  "mep_engineer",
  "project_manager",
  "ceo",
);

// ── Multer ────────────────────────────────────────────────────────────────────
// Only drawing-type files, max 25 MB, and a cleaned-up file name. (/uploads is
// served publicly, so HTML / script files must never be accepted here.)
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".dwg", ".dxf"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const safe = path
      .basename(file.originalname)
      .replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(
        new Error(`File type ${ext || "(none)"} is not allowed. Use: ${ALLOWED_EXT.join(", ")}`),
      );
    }
    cb(null, true);
  },
});

// Turn a multer error into a clean 400 instead of a server error.
const uploadDrawingFile = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });

// ═══════════════════════════════════════════════════════════════════════════
// 📊  DASHBOARD
//     Accepts optional ?project_id=123 query param.
//     If provided → counts only drawings for that project.
//     If omitted  → counts all drawings (fallback).
// ═══════════════════════════════════════════════════════════════════════════
router.get("/dashboard", SE_OR_CEO, async (req, res) => {
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
router.post("/upload-drawing", SE_OR_CEO, uploadDrawingFile, async (req, res) => {
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
router.get("/drawings", SE_OR_CEO, async (req, res) => {
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
router.delete("/drawings/:id", SE_OR_CEO, async (req, res) => {
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
//     Which approval column is changed depends on who is logged in.
// ═══════════════════════════════════════════════════════════════════════════
router.put("/drawings/:id/status", DRAWING_STATUS_ROLES, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const mapping = STATUS_COLUMN_BY_ROLE[req.user.role];
    if (!mapping) {
      return res.status(403).json({ error: "Your role cannot approve drawings" });
    }

    const allowedStatuses = ["approved", "rejected", "pending"];
    if (!allowedStatuses.includes(String(status || "").toLowerCase())) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { column, label: roleName } = mapping;

    let drawingName = `Drawing #${id}`;
    try {
      const dr = await pool.query("SELECT name FROM drawings WHERE id = $1", [
        id,
      ]);
      if (dr.rows[0]) drawingName = dr.rows[0].name;
    } catch {
      /* ignore */
    }

    // `column` always comes from the fixed map above, never from user input.
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
router.get("/recent-activity", SE_OR_CEO, async (req, res) => {
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
router.get("/notifications", SE_OR_CEO, async (req, res) => {
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
//     Only Structural Engineer notifications can be touched here.
// ═══════════════════════════════════════════════════════════════════════════
router.patch("/notifications/:id/read", SE_OR_CEO, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND role = 'structural_engineer'",
      [req.params.id],
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

module.exports = router;