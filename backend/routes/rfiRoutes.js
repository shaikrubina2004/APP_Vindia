// FILE PATH: backend/routes/rfiRoutes.js (FULLY FIXED VERSION)
// ✅ FIXED: Handles empty date fields properly

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const multer  = require("multer");
const path    = require("path");
const protect = require("../middleware/authMiddleware");
const createSENotification = require("../utils/createSENotification");

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename:    (_req,  file, cb) =>
    cb(null, `rfi-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const ROLE_LABELS = {
  structural_engineer:  "Structural Engineer",
  mep_engineer:         "MEP Engineer",
  architect:            "Architect",
  project_coordinator:  "Project Coordinator",
  quantity_surveyor:    "Quantity Surveyor",
  site_engineer:        "Site Engineer",
  project_manager:      "Project Manager",
  planning_engineer:    "Planning Engineer",
  qc_engineer:          "QC Engineer",
  safety_officer:       "Safety Officer",
  hr_manager:           "HR Manager",
};

// ── GET /api/rfis?view=all|sent|received ──────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const role = req.user?.role;
    const view = req.query.view || "all";

    console.log(`🔍 RFI GET: role=${role}, view=${view}`);

    let where, params;
    if (view === "sent") { 
      where = "WHERE LOWER(r.raised_by_role) = LOWER($1)"; 
      params = [role]; 
    }
    else if (view === "received") { 
      where = "WHERE LOWER(r.assigned_to_role) = LOWER($1)"; 
      params = [role]; 
    }
    else { 
      where = "WHERE LOWER(r.raised_by_role) = LOWER($1) OR LOWER(r.assigned_to_role) = LOWER($1)"; 
      params = [role]; 
    }

    const result = await pool.query(
      `SELECT r.*,
         (SELECT COUNT(*) FROM rfi_responses rp WHERE rp.rfi_id = r.id) AS response_count
       FROM rfis r
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    console.log(`✅ RFI Found: ${result.rows.length} records`);
    return res.json({ success: true, rfis: result.rows });
  } catch (err) {
    console.error("❌ GET /api/rfis:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/rfis/:id — full thread ─────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const role = req.user?.role;
    const { id } = req.params;

    const rfiRes = await pool.query(
      `SELECT * FROM rfis
       WHERE id = $1 AND (LOWER(raised_by_role) = LOWER($2) OR LOWER(assigned_to_role) = LOWER($2))`,
      [id, role]
    );
    if (rfiRes.rowCount === 0)
      return res.status(404).json({ success: false, message: "Not found or access denied" });

    const responses = await pool.query(
      `SELECT * FROM rfi_responses WHERE rfi_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return res.json({ success: true, rfi: rfiRes.rows[0], responses: responses.rows });
  } catch (err) {
    console.error("❌ GET /api/rfis/:id:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/rfis — create RFI ───────────────────────────────────────────────
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    const { 
      subject, 
      description, 
      priority = "medium", 
      assigned_to_role, 
      project_name, 
      drawing_ref, 
      grid_ref, 
      zone, 
      response_required_by 
    } = req.body;

    const raisedByRole = req.user?.role;
    const raisedByName = req.user?.name || ROLE_LABELS[raisedByRole] || raisedByRole;
    const raisedById   = req.user?.id;

    // Validation
    if (!subject || !assigned_to_role) {
      return res.status(400).json({ 
        success: false, 
        message: "subject and assigned_to_role are required" 
      });
    }

    console.log(`📝 Creating RFI: "${subject}" assigned to: ${assigned_to_role}`);
    console.log(`   from: ${raisedByRole}, priority: ${priority}`);

    // ✅ FIX: Convert empty strings to NULL for optional date fields
    const responseDate = response_required_by && response_required_by.trim() ? response_required_by : null;

    try {
      const result = await pool.query(
        `INSERT INTO rfis
           (subject, description, priority, status, raised_by_role, raised_by_name,
            raised_by_id, assigned_to_role, project_name, drawing_ref, grid_ref, zone, response_required_by)
         VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          subject, 
          description || "", 
          priority, 
          raisedByRole, 
          raisedByName, 
          raisedById, 
          assigned_to_role, 
          project_name || null, 
          drawing_ref || null, 
          grid_ref || null, 
          zone || null, 
          responseDate  // ✅ NULL if empty, otherwise the date value
        ]
      );

      const newRFI = result.rows[0];
      console.log(`✅ RFI Created: ID ${newRFI.id}`);

      // If file attached, save as first response
      if (req.file) {
        await pool.query(
          `INSERT INTO rfi_responses
             (rfi_id, responder_role, responder_name, responder_id, message, file_url, file_name)
           VALUES ($1, $2, $3, $4, '[File attached with RFI]', $5, $6)`,
          [
            newRFI.id, 
            raisedByRole, 
            raisedByName, 
            raisedById,
            `/uploads/${req.file.filename}`, 
            req.file.originalname
          ]
        );
        console.log(`   ✓ File attached: ${req.file.originalname}`);
      }

      // Notify if assigned to structural_engineer
      if (assigned_to_role?.toLowerCase() === "structural_engineer") {
        await createSENotification({
          type:        "rfi",
          severity:    ["critical","high"].includes(priority) ? "critical" : "warn",
          title:       `New RFI: ${subject}`,
          description: `${ROLE_LABELS[raisedByRole] || raisedByRole} raised an RFI to you: "${subject}"`,
        });
      }

      return res.status(201).json({ success: true, rfi: newRFI });
    } catch (dbErr) {
      console.error("   ❌ Database error:", dbErr.message);
      console.error("   Details:", dbErr.detail);
      throw dbErr;
    }
  } catch (err) {
    console.error("❌ POST /api/rfis:", err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to create RFI" 
    });
  }
});

// ── POST /api/rfis/:id/respond — add reply + optional file ───────────────────
router.post("/:id/respond", protect, upload.single("file"), async (req, res) => {
  try {
    const { id }      = req.params;
    const { message } = req.body;
    const role        = req.user?.role;
    const name        = req.user?.name || ROLE_LABELS[role] || role;
    const userId      = req.user?.id;

    if (!message && !req.file) {
      return res.status(400).json({ success: false, message: "Message or file required" });
    }

    const rfiRes = await pool.query(
      `SELECT * FROM rfis
       WHERE id = $1 AND (LOWER(raised_by_role) = LOWER($2) OR LOWER(assigned_to_role) = LOWER($2))`,
      [id, role]
    );
    if (rfiRes.rowCount === 0)
      return res.status(404).json({ success: false, message: "Not found or access denied" });

    const rfi = rfiRes.rows[0];

    const fileUrl  = req.file ? `/uploads/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;

    const resp = await pool.query(
      `INSERT INTO rfi_responses
         (rfi_id, responder_role, responder_name, responder_id, message, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [id, role, name, userId, message || "[File attached]", fileUrl, fileName]
    );

    // Auto-update status to 'responded'
    if (rfi.status === "open") {
      await pool.query(`UPDATE rfis SET status='responded', updated_at=NOW() WHERE id=$1`, [id]);
    }

    // Notify if another role responded
    const otherRole = rfi.raised_by_role === role ? rfi.assigned_to_role : rfi.raised_by_role;
    if (otherRole?.toLowerCase() === "structural_engineer" && role?.toLowerCase() !== "structural_engineer") {
      await createSENotification({
        type:        "rfi",
        severity:    "info",
        title:       `RFI Response: ${rfi.subject}`,
        description: `${ROLE_LABELS[role] || role} responded to your RFI "${rfi.subject}"`,
      });
    }

    console.log(`✅ Response Added to RFI ${id}`);
    return res.json({ success: true, response: resp.rows[0] });
  } catch (err) {
    console.error("❌ POST /api/rfis/:id/respond:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/rfis/:id/status ────────────────────────────────────────────────
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    const role       = req.user?.role;

    if (!["open","responded","closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE rfis SET status=$1, updated_at=NOW()
       WHERE id=$2 AND (LOWER(raised_by_role)=LOWER($3) OR LOWER(assigned_to_role)=LOWER($3)) 
       RETURNING *`,
      [status, id, role]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Not found or access denied" });
    }

    console.log(`✅ RFI ${id} status updated to: ${status}`);
    return res.json({ success: true, rfi: result.rows[0] });
  } catch (err) {
    console.error("❌ PATCH /api/rfis/:id/status:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;