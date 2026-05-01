// FILE PATH: backend/routes/rfiRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// RFI endpoints.  When any role RESPONDS to an RFI, the Structural Engineer
// receives a real notification.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const createSENotification = require("../utils/createSENotification");

// ── GET all RFIs ──────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rfis ORDER BY created_at DESC");
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch RFIs error:", err.message);
    return res.status(500).json({ error: "Failed to fetch RFIs" });
  }
});

// ── POST  create a new RFI ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { subject, description, raised_by, priority = "medium" } = req.body;

    const result = await pool.query(
      `INSERT INTO rfis (subject, description, raised_by, priority, status, created_at)
       VALUES ($1, $2, $3, $4, 'open', NOW()) RETURNING *`,
      [subject, description, raised_by, priority]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create RFI error:", err.message);
    return res.status(500).json({ error: "Failed to create RFI" });
  }
});

// ── PATCH /:id/respond  – another role responds to an RFI ────────────────────
// Body: { response: "...", respondedBy: "John – Architect", role: "architect" }
router.patch("/:id/respond", async (req, res) => {
  try {
    const { id }                         = req.params;
    const { response, respondedBy, role } = req.body;

    if (!response) {
      return res.status(400).json({ error: "Response text is required" });
    }

    await pool.query(
      `UPDATE rfis
          SET response = $1, responded_by = $2, status = 'responded', updated_at = NOW()
        WHERE id = $3`,
      [response, respondedBy || role, id]
    );

    // Fetch RFI subject for a meaningful message
    let subject = `RFI #${id}`;
    try {
      const rfi = await pool.query("SELECT subject FROM rfis WHERE id = $1", [id]);
      if (rfi.rows[0]) subject = rfi.rows[0].subject;
    } catch { /* ignore */ }

    await createSENotification({
      type:        "rfi",
      severity:    "info",
      title:       `RFI Responded: ${subject}`,
      description: `${respondedBy || role} responded to "${subject}".`,
    });

    return res.json({ message: "RFI response saved and SE notified." });
  } catch (err) {
    console.error("Respond RFI error:", err.message);
    return res.status(500).json({ error: "Failed to respond to RFI" });
  }
});

// ── PATCH /:id/close  – close an RFI ─────────────────────────────────────────
router.patch("/:id/close", async (req, res) => {
  try {
    const { id }       = req.params;
    const { closedBy } = req.body;

    await pool.query(
      `UPDATE rfis SET status = 'closed', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    let subject = `RFI #${id}`;
    try {
      const rfi = await pool.query("SELECT subject FROM rfis WHERE id = $1", [id]);
      if (rfi.rows[0]) subject = rfi.rows[0].subject;
    } catch { /* ignore */ }

    await createSENotification({
      type:        "rfi",
      severity:    "ok",
      title:       `RFI Closed: ${subject}`,
      description: `"${subject}" has been closed by ${closedBy || "a team member"}.`,
    });

    return res.json({ message: "RFI closed and SE notified." });
  } catch (err) {
    console.error("Close RFI error:", err.message);
    return res.status(500).json({ error: "Failed to close RFI" });
  }
});

module.exports = router;