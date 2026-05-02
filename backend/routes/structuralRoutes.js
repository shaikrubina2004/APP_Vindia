// FILE PATH: backend/routes/structuralRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Structural Engineer API routes.
// Drawing status changes by Architect / MEP / Manager automatically fire
// an SE notification via createSENotification().
// ─────────────────────────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const pool     = require("../config/db");
const multer   = require("multer");
const createSENotification = require("../utils/createSENotification");

// ── Multer (file uploads) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename:    (_req,  file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// ═════════════════════════════════════════════════════════════════════════════
// 📊  DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
router.get("/dashboard", async (req, res) => {
  try {
    const drawingsResult = await pool.query("SELECT COUNT(*) FROM drawings");

    // version column may not exist yet — handled gracefully
    let latestVersion = "N/A";
    try {
      const vr = await pool.query(
        "SELECT version FROM drawings ORDER BY created_at DESC LIMIT 1"
      );
      latestVersion = vr.rows[0]?.version || "N/A";
    } catch {
      console.log("⚠️  version column missing in drawings — returning N/A");
    }

    let incidentsCount = 0;
    try {
      const ir = await pool.query(
        "SELECT COUNT(*) FROM incidents WHERE status = 'pending'"
      );
      incidentsCount = parseInt(ir.rows[0].count, 10);
    } catch {
      console.log("⚠️  incidents table missing");
    }

    // Count only SE-targeted unread notifications
    let notificationsCount = 0;
    try {
      const nr = await pool.query(
        "SELECT COUNT(*) FROM notifications WHERE role = 'structural_engineer' AND is_read = false"
      );
      notificationsCount = parseInt(nr.rows[0].count, 10);
    } catch {
      console.log("⚠️  notifications table missing");
    }

    return res.json({
      totalDrawings:    parseInt(drawingsResult.rows[0].count, 10),
      latestVersion,
      pendingIncidents: incidentsCount,
      notifications:    notificationsCount,
    });
  } catch (err) {
    console.error("Dashboard Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📤  UPLOAD DRAWING
// ═════════════════════════════════════════════════════════════════════════════
router.post("/upload-drawing", upload.single("file"), async (req, res) => {
  try {
    const { name, version, uploaded_by } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    await pool.query(
      "INSERT INTO drawings (name, version, file_url, uploaded_by) VALUES ($1, $2, $3, $4)",
      [name, version, req.file.filename, uploaded_by]
    );

    // Notify SE that a new drawing was uploaded
    await createSENotification({
      type:        "drawing",
      severity:    "info",
      title:       `New Drawing Uploaded: ${name}`,
      description: `Drawing "${name}" (${version || "no version"}) was uploaded by ${uploaded_by || "a team member"}.`,
    });

    return res.json({ message: "Drawing uploaded successfully" });
  } catch (err) {
    console.error("Upload Error:", err.message);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📄  GET DRAWINGS
// ═════════════════════════════════════════════════════════════════════════════
router.get("/drawings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM drawings ORDER BY created_at DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch Drawings Error:", err.message);
    return res.status(500).json({ error: "Error fetching drawings" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ❌  DELETE DRAWING
// ═════════════════════════════════════════════════════════════════════════════
router.delete("/drawings/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM drawings WHERE id = $1", [req.params.id]);
    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err.message);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔄  UPDATE DRAWING STATUS  (called by Architect / MEP / Manager)
//     → fires an SE notification on every status change
// ═════════════════════════════════════════════════════════════════════════════
router.put("/drawings/:id/status", async (req, res) => {
  try {
    const { id }            = req.params;
    const { role, status }  = req.body;

    const COLUMN_MAP = {
      architect: "architect_status",
      mep:       "mep_status",
      manager:   "manager_status",
    };

    const column = COLUMN_MAP[role];
    if (!column) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Fetch the drawing name for a meaningful notification message
    let drawingName = `Drawing #${id}`;
    try {
      const dr = await pool.query("SELECT name FROM drawings WHERE id = $1", [id]);
      if (dr.rows[0]) drawingName = dr.rows[0].name;
    } catch { /* ignore */ }

    await pool.query(
      `UPDATE drawings SET ${column} = $1 WHERE id = $2`,
      [status, id]
    );

    // ── Determine severity based on status ───────────────────────────────
    const severityMap = {
      approved: "ok",
      rejected: "critical",
      pending:  "warn",
    };
    const lcStatus  = status?.toLowerCase();
    const severity  = severityMap[lcStatus] || "info";
    const roleName  = role.charAt(0).toUpperCase() + role.slice(1);

    await createSENotification({
      type:        "drawing",
      severity,
      title:       `Drawing ${status} by ${roleName}`,
      description: `"${drawingName}" was marked as "${status}" by the ${roleName}.`,
    });

    return res.json({ message: "Updated successfully" });
  } catch (err) {
    console.error("Update Error:", err.message);
    return res.status(500).json({ error: "Failed" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ✅  APPROVE DRAWING  (dedicated approval endpoint from any role)
//     POST /api/structural/drawings/:id/approve
//     Body: { approvedBy: "John – Architect", role: "architect", comment: "LGTM" }
// ═════════════════════════════════════════════════════════════════════════════
router.post("/drawings/:id/approve", async (req, res) => {
  try {
    const { id }                            = req.params;
    const { approvedBy, role, comment = "" } = req.body;

    // Mark architect/mep/manager status as approved
    const COLUMN_MAP = {
      architect: "architect_status",
      mep:       "mep_status",
      manager:   "manager_status",
    };
    const column = COLUMN_MAP[role];
    if (column) {
      await pool.query(
        `UPDATE drawings SET ${column} = 'approved' WHERE id = $1`,
        [id]
      );
    }

    let drawingName = `Drawing #${id}`;
    try {
      const dr = await pool.query("SELECT name FROM drawings WHERE id = $1", [id]);
      if (dr.rows[0]) drawingName = dr.rows[0].name;
    } catch { /* ignore */ }

    await createSENotification({
      type:        "approval",
      severity:    "ok",
      title:       `Drawing Approved – ${drawingName}`,
      description: `${approvedBy || role} approved "${drawingName}".${comment ? ` Comment: ${comment}` : ""}`,
    });

    return res.json({ message: "Drawing approved and SE notified." });
  } catch (err) {
    console.error("Approve Error:", err.message);
    return res.status(500).json({ error: "Approval failed" });
  }
});

// 📌 RECENT ACTIVITY
router.get("/recent-activity", async (req, res) => {
  try {
    const drawings = await pool.query(
      "SELECT name, created_at FROM drawings ORDER BY created_at DESC LIMIT 3"
    );

    const incidents = await pool.query(
      "SELECT title, created_at FROM incidents ORDER BY created_at DESC LIMIT 2"
    );

    const activity = [
      ...drawings.rows.map(d => ({
        type: "drawing",
        text: `New drawing uploaded: ${d.name}`
      })),
      ...incidents.rows.map(i => ({
        type: "incident",
        text: `Issue reported: ${i.title}`
      })),
    ];

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// 🔔 GET SE NOTIFICATIONS
router.get("/notifications", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, is_read, created_at
       FROM notifications
       WHERE role = 'structural_engineer'
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Notifications Error:", err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// 🔕 MARK AS READ
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

module.exports = router;