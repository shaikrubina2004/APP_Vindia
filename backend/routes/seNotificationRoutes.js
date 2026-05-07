// FILE PATH: backend/routes/seNotificationRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// All SE notification endpoints.
// Mounted in server.js as: app.use("/api/se-notifications", seNotificationRoutes)
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const pool = require("../config/db");

// ── Link map: type → frontend route ──────────────────────────────────────────
const TYPE_LINK = {
  drawing: "/structural-engineer/shared/drawings",
  rfi: "/structural-engineer/rfi",
  incident: "/structural-engineer/incidents",
  approval: "/structural-engineer/shared/drawings",
  work: "/structural-engineer/daily-updates",
  boq: "/structural-engineer/boq",
  task: "/structural-engineer/incidents?page=tasks",
  handover: "/structural-engineer/shared/drawings",
  analysis: "/structural-engineer/daily-updates",
};

// ── Safe role checker ───────────────────────────────────────
function isStructuralEngineer(user) {
  const role = user?.role?.toLowerCase?.() || "";

  return role.includes("structural");
}
// ── Helper: shape a DB row into the frontend-expected object ─────────────────
function shapeRow(n) {
  return {
    id: n.id,
    type: n.type || "work",
    severity: n.severity || "info",
    title: n.message,
    description: n.description || n.message,
    created_at: n.created_at,
    is_read: n.is_read,
link:
  n.link ||
  TYPE_LINK[n.type] ||
  "/structural-engineer/dashboard",  };
}

// ── GET /  – unread notifications for the logged-in SE ───────────────────────
router.get("/", protect, async (req, res) => {
  try {
    if (!isStructuralEngineer(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await pool.query(
      `SELECT id, message, description, type, severity, is_read, created_at,link
   FROM notifications
WHERE role = 'structural_engineer'
AND is_read = false
   ORDER BY created_at DESC
   LIMIT 50`,
    );

    return res.json({
      success: true,
      notifications: result.rows.map(shapeRow),
    });
  } catch (err) {
    console.error("GET /se-notifications error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── GET /count  – unread badge count ─────────────────────────────────────────
router.get("/count", protect, async (req, res) => {
  try {
    if (!isStructuralEngineer(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS count
         FROM notifications
        WHERE role = 'structural_engineer'
          AND is_read = false`,
    );

    return res.json({
      success: true,
      count: parseInt(result.rows[0].count, 10),
    });
  } catch (err) {
    console.error("GET /se-notifications/count error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── PATCH /read-all  – mark every unread notification read ───────────────────
router.patch("/read-all", protect, async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await pool.query(
      `UPDATE notifications
          SET is_read = true
        WHERE role = 'structural_engineer'
          AND is_read = false`,
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("PATCH /se-notifications/read-all error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── PATCH /:id/read  – mark a single notification read ───────────────────────
router.patch("/:id/read", protect, async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const realId = parseInt(req.params.id, 10);
    if (isNaN(realId) || realId <= 0) {
      return res
        .status(400)
        .json({ error: `Invalid notification ID: "${req.params.id}"` });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING id`,
      [realId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true, id: realId });
  } catch (err) {
    console.error("PATCH /se-notifications/:id/read error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
