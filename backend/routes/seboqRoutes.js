// FILE PATH: backend/routes/boqRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// BOQ (Bill of Quantities) endpoints.
// When QS / PM updates or approves a BOQ line, SE gets notified.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const createSENotification = require("../utils/createSENotification");

// ── GET all BOQ items ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM boq ORDER BY created_at DESC");
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch BOQ error:", err.message);
    return res.status(500).json({ error: "Failed to fetch BOQ" });
  }
});

// ── POST  add BOQ item ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { item_name, quantity, unit, unit_rate, added_by } = req.body;

    const result = await pool.query(
      `INSERT INTO boq (item_name, quantity, unit, unit_rate, added_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [item_name, quantity, unit, unit_rate, added_by]
    );

    await createSENotification({
      type:        "boq",
      severity:    "info",
      title:       `BOQ Updated: ${item_name}`,
      description: `"${item_name}" was added/updated by ${added_by || "QS"}. Qty: ${quantity} ${unit} @ ₹${unit_rate}.`,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add BOQ error:", err.message);
    return res.status(500).json({ error: "Failed to add BOQ item" });
  }
});

// ── PATCH /:id/approve  – QS / PM approves a BOQ item ────────────────────────
// Body: { approvedBy: "Jane – QS", role: "qs" }
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id }                  = req.params;
    const { approvedBy, comment } = req.body;

    await pool.query(
      `UPDATE boq SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    let itemName = `BOQ item #${id}`;
    try {
      const b = await pool.query("SELECT item_name FROM boq WHERE id = $1", [id]);
      if (b.rows[0]) itemName = b.rows[0].item_name;
    } catch { /* ignore */ }

    await createSENotification({
      type:        "boq",
      severity:    "ok",
      title:       `BOQ Approved: ${itemName}`,
      description: `${approvedBy || "QS"} approved "${itemName}".${comment ? ` Note: ${comment}` : ""}`,
    });

    return res.json({ message: "BOQ item approved and SE notified." });
  } catch (err) {
    console.error("Approve BOQ error:", err.message);
    return res.status(500).json({ error: "Failed to approve BOQ item" });
  }
});

// ── PUT /:id  – update a BOQ item ─────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id }                                  = req.params;
    const { item_name, quantity, unit, unit_rate, updated_by } = req.body;

    await pool.query(
      `UPDATE boq
          SET item_name = $1, quantity = $2, unit = $3, unit_rate = $4, updated_at = NOW()
        WHERE id = $5`,
      [item_name, quantity, unit, unit_rate, id]
    );

    await createSENotification({
      type:        "boq",
      severity:    "warn",
      title:       `BOQ Item Revised: ${item_name}`,
      description: `"${item_name}" was updated by ${updated_by || "QS"}. New qty: ${quantity} ${unit} @ ₹${unit_rate}.`,
    });

    return res.json({ message: "BOQ item updated and SE notified." });
  } catch (err) {
    console.error("Update BOQ error:", err.message);
    return res.status(500).json({ error: "Failed to update BOQ item" });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM boq WHERE id = $1", [req.params.id]);
    return res.json({ message: "BOQ item deleted" });
  } catch (err) {
    console.error("Delete BOQ error:", err.message);
    return res.status(500).json({ error: "Failed to delete BOQ item" });
  }
});

module.exports = router;