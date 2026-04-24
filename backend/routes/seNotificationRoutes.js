const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const pool    = require("../config/db");

const getSENotifications = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const notifications = [];

    // ── 1. NOTIFICATIONS TABLE — SE role-filtered ─────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, message, type, severity, is_read, created_at
        FROM notifications
        WHERE role = 'structural_engineer'
        ORDER BY created_at DESC
        LIMIT 20
      `);
      const rows = result.rows || result[0] || [];
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
      rows.forEach(n => notifications.push({
        id:          `notif-${n.id}`,
        type:        n.type     || "work",
        severity:    n.severity || "info",
        title:       n.message?.split("–")[0]?.trim() || "Notification",
        description: n.message,
        created_at:  n.created_at,
        is_read:     n.is_read,
        link:        TYPE_LINK[n.type] || "/structural-engineer/dashboard",
      }));
    } catch (e) { console.log("notifications query skipped:", e.message); }

    // ── 2. DRAWINGS — SE pending/rejected ────────────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, name, status_structural, updated_at
        FROM drawings
        WHERE status_structural IN ('pending', 'rejected', 'revision_required')
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(d => notifications.push({
        id:          `drawing-${d.id}`,
        type:        "drawing",
        severity:    d.status_structural === "rejected" ? "critical" : "warn",
        title:       d.status_structural === "rejected" ? "Drawing Rejected" : "Drawing Review Pending",
        description: `${d.name} – ${d.status_structural.replace(/_/g, " ")}`,
        created_at:  d.updated_at,
        is_read:     false,
        link:        "/structural-engineer/drawings",
      }));
    } catch (e) { console.log("drawings query skipped:", e.message); }

    // ── 3. RFI — open/pending ─────────────────────────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, title, description, status, priority, created_at
        FROM rfi
        WHERE status IN ('open', 'pending', 'in_review')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(r => notifications.push({
        id:          `rfi-${r.id}`,
        type:        "rfi",
        severity:    r.priority === "high" || r.priority === "critical" ? "critical" : "warn",
        title:       `RFI: ${r.title}`,
        description: r.description || "RFI requires your response",
        created_at:  r.created_at,
        is_read:     false,
        link:        "/structural-engineer/rfi",
      }));
    } catch (e) { console.log("rfi query skipped:", e.message); }

    // ── 4. INCIDENTS — open/in_progress ──────────────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, incident_no, title, description, priority, status, created_at
        FROM incidents
        WHERE status IN ('open', 'in_progress', 'reported')
        AND is_deleted = false
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(i => notifications.push({
        id:          `incident-${i.id}`,
        type:        "incident",
        severity:    i.priority === "high" || i.priority === "critical" ? "critical" : "warn",
        title:       `Incident ${i.incident_no}: ${i.title}`,
        description: i.description || "Incident requires your attention",
        created_at:  i.created_at,
        is_read:     false,
        link:        "/structural-engineer/incidents",
      }));
    } catch (e) { console.log("incidents query skipped:", e.message); }

    // ── 5. TASKS — open/pending assigned tasks ────────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, title, status, created_at, deadline_at
        FROM tasks
        WHERE status IN ('open', 'pending', 'in_progress')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(t => {
        const overdue = t.deadline_at && new Date(t.deadline_at) < new Date();
        notifications.push({
          id:          `task-${t.id}`,
          type:        "task",
          severity:    overdue ? "critical" : "warn",
          title:       overdue ? `Task Overdue: ${t.title}` : `Task Pending: ${t.title}`,
          description: overdue
            ? `This task was due on ${new Date(t.deadline_at).toLocaleDateString()}`
            : "Task is pending your action",
          created_at:  t.created_at,
          is_read:     false,
          link:        "/structural-engineer/incidents?page=tasks",
        });
      });
    } catch (e) { console.log("tasks query skipped:", e.message); }

    // ── 6. BOQ — check for items needing review ───────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, created_at
        FROM boq
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      // Only notify if BOQ was updated recently (last 7 days)
      if (rows.length > 0) {
        const daysSince = (Date.now() - new Date(rows[0].created_at)) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) {
          notifications.push({
            id:          `boq-${rows[0].id}`,
            type:        "boq",
            severity:    "info",
            title:       "BOQ Updated",
            description: "Bill of Quantities has been updated — review required",
            created_at:  rows[0].created_at,
            is_read:     false,
            link:        "/structural-engineer/boq",
          });
        }
      }
    } catch (e) { console.log("boq query skipped:", e.message); }

    // ── 7. DAILY UPDATE — today not submitted ─────────────────────────────
    try {
      const result = await pool.query(`
        SELECT COUNT(*) AS submitted
        FROM se_daily_reports
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      const rows  = result.rows || result[0] || [];
      const count = parseInt(rows[0]?.submitted || rows[0]?.count || 0);
      if (count === 0) {
        notifications.push({
          id:          `daily-${Date.now()}`,
          type:        "work",
          severity:    "warn",
          title:       "Daily Update Due",
          description: "Today's structural site update not yet submitted",
          created_at:  new Date(),
          is_read:     false,
          link:        "/structural-engineer/daily-updates",
        });
      }
    } catch (e) { console.log("se_daily_reports query skipped:", e.message); }

    // ── 8. DAILY REPORTS — flagged status ────────────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, project_name, overall_status, created_at
        FROM se_daily_reports
        WHERE overall_status IN ('delayed', 'on_hold', 'critical')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(r => notifications.push({
        id:          `report-${r.id}`,
        type:        "work",
        severity:    r.overall_status === "critical" ? "critical" : "warn",
        title:       `Site Report: ${r.overall_status.replace(/_/g, " ")}`,
        description: `${r.project_name} – daily report flagged`,
        created_at:  r.created_at,
        is_read:     false,
        link:        "/structural-engineer/daily-updates",
      }));
    } catch (e) { console.log("se_daily_reports status query skipped:", e.message); }

    // ── 9. HANDOVER — pending handover via tasks ──────────────────────────
    try {
      const result = await pool.query(`
        SELECT id, title, status, created_at
        FROM tasks
        WHERE status = 'pending'
        AND LOWER(title) LIKE '%handover%'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(h => notifications.push({
        id:          `handover-${h.id}`,
        type:        "handover",
        severity:    "warn",
        title:       "Handover Pending",
        description: `${h.title} – handover to QS not yet completed`,
        created_at:  h.created_at,
        is_read:     false,
        link:        "/structural-engineer/handover",
      }));
    } catch (e) { console.log("handover query skipped:", e.message); }

    // ── 10. ANALYSIS — recent analysis via progress table ─────────────────
    try {
      const result = await pool.query(`
        SELECT id, created_at
        FROM progress
        WHERE status IN ('delayed', 'behind_schedule', 'at_risk')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const rows = result.rows || result[0] || [];
      rows.forEach(a => notifications.push({
        id:          `analysis-${a.id}`,
        type:        "analysis",
        severity:    "warn",
        title:       "Progress At Risk",
        description: "Structural progress is behind schedule — review analysis",
        created_at:  a.created_at,
        is_read:     false,
        link:        "/structural-engineer/analysis",
      }));
    } catch (e) { console.log("analysis/progress query skipped:", e.message); }

    // ── Deduplicate ───────────────────────────────────────────────────────
    const seen   = new Set();
    const unique = notifications.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, notifications: unique });

  } catch (err) {
    console.error("SE Notification error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const markSENotificationRead = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const { id } = req.params;
    if (id.startsWith("notif-")) {
      const realId = id.replace("notif-", "");
      await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1`, [realId]);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

router.get("/",            protect, getSENotifications);
router.patch("/:id/read", protect, markSENotificationRead);

module.exports = router;