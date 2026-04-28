// FILE PATH: routes/seNotificationRoutes.js

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const pool = require("../config/db");

// 🔗 TYPE → PAGE ROUTING MAP
const TYPE_LINK = {
  drawing:  "/structural-engineer/drawings",
  rfi:      "/structural-engineer/rfi",
  incident: "/structural-engineer/incidents",
  approval: "/structural-engineer/approvals",
  work:     "/structural-engineer/daily-updates",
  boq:      "/structural-engineer/boq",
  task:     "/structural-engineer/incidents?page=tasks",
  handover: "/structural-engineer/handover",
  analysis: "/structural-engineer/analysis",
};

// ✅ GET — only unread (on reload, read ones never come back)
const getSENotifications = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await pool.query(`
      SELECT id, message, type, severity, is_read, created_at
      FROM notifications
      WHERE role = 'structural_engineer'
        AND is_read = false
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const notifications = result.rows.map((n) => ({
      id:          n.id,
      type:        n.type,
      severity:    n.severity,
      title:       n.message,
      description: n.message,
      created_at:  n.created_at,
      is_read:     n.is_read,
      link:        TYPE_LINK[n.type] || "/structural-engineer/dashboard",
    }));

    return res.json({ success: true, notifications });
  } catch (err) {
    console.error("getSENotifications error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET COUNT — used by dashboard card
const getSENotificationCount = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await pool.query(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE role = 'structural_engineer' AND is_read = false
    `);

    return res.json({ success: true, count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("getSENotificationCount error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ MARK SINGLE READ
const markRead = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const rawId = req.params.id;
    const realId = parseInt(rawId, 10);

    if (isNaN(realId) || realId <= 0) {
      return res.status(400).json({
        error: `Invalid notification ID: "${rawId}". Must be a positive integer.`,
      });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING id`,
      [realId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true, id: realId });
  } catch (err) {
    console.error("markRead error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ MARK ALL READ
const markAllRead = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await pool.query(`
      UPDATE notifications
      SET is_read = true
      WHERE role = 'structural_engineer' AND is_read = false
    `);

    return res.json({ success: true });
  } catch (err) {
    console.error("markAllRead error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ⚠️ ORDER MATTERS: /count and /read-all must be BEFORE /:id/read
router.get("/count",      protect, getSENotificationCount);
router.get("/",           protect, getSENotifications);
router.patch("/read-all", protect, markAllRead);
router.patch("/:id/read", protect, markRead);

module.exports = router;