// ══════════════════════════════════════════════════════════════════════════════
//  quantityReportController.js
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { createNotificationDirect } = require("./qsNotificationController");

// ── Auto-create table ─────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quantity_reports (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL,
        project_name    VARCHAR(255)  NOT NULL,
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL,
        boq_id          INTEGER       NOT NULL,
        items           JSONB         NOT NULL DEFAULT '[]',
        total_items     INTEGER       NOT NULL DEFAULT 0,
        status          VARCHAR(50)   NOT NULL DEFAULT 'pending_se',
        se_comment      TEXT          DEFAULT '',
        created_date    DATE          DEFAULT CURRENT_DATE,
        updated_date    DATE,
        created_at      TIMESTAMP     DEFAULT NOW(),
        updated_at      TIMESTAMP     DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_qr_project_id   ON quantity_reports (project_id);
      CREATE INDEX IF NOT EXISTS idx_qr_milestone_id ON quantity_reports (milestone_id);
      CREATE INDEX IF NOT EXISTS idx_qr_boq_id       ON quantity_reports (boq_id);
      CREATE INDEX IF NOT EXISTS idx_qr_status       ON quantity_reports (status);
    `);
    console.log("✅ quantity_reports table ready");
  } catch (err) {
    console.error("❌ quantity_reports table setup failed:", err.message);
  }
})();

// ── Format helper ─────────────────────────────────────────────────────────────
function formatReport(r) {
  return {
    id:            r.id,
    projectId:     r.project_id,
    projectName:   r.project_name,
    milestoneId:   r.milestone_id,
    milestoneName: r.milestone_name,
    boqId:         r.boq_id,
    items:         r.items || [],
    totalItems:    r.total_items || 0,
    status:        r.status,
    seComment:     r.se_comment || "",
    createdDate:   r.created_date
      ? new Date(r.created_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
    updatedDate: r.updated_date
      ? new Date(r.updated_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL  —  GET /api/quantity-report
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllReports = async (req, res) => {
  try {
    const { projectId, status, boqId } = req.query;
    const conditions = [];
    const values     = [];

    if (projectId) { values.push(projectId); conditions.push(`project_id = $${values.length}`); }
    if (status)    { values.push(status);    conditions.push(`status = $${values.length}`);     }
    if (boqId)     { values.push(boqId);     conditions.push(`boq_id = $${values.length}`);    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM quantity_reports ${where} ORDER BY created_at DESC`, values
    );
    res.json(result.rows.map(formatReport));
  } catch (err) {
    console.error("getAllReports:", err.message);
    res.status(500).json({ error: "Failed to fetch quantity reports: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE  —  GET /api/quantity-report/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM quantity_reports WHERE id = $1", [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Quantity report not found" });
    }
    res.json(formatReport(result.rows[0]));
  } catch (err) {
    console.error("getReportById:", err.message);
    res.status(500).json({ error: "Failed to fetch quantity report: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/quantity-report
// ══════════════════════════════════════════════════════════════════════════════
exports.createReport = async (req, res) => {
  try {
    const { projectId, projectName, milestoneId, milestoneName, boqId, items, totalItems } = req.body;

    if (!projectId || !milestoneId || !boqId) {
      return res.status(400).json({ error: "projectId, milestoneId and boqId are required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    const boqCheck = await pool.query("SELECT id, status FROM boqs WHERE id = $1", [boqId]);
    if (!boqCheck.rows.length) {
      return res.status(404).json({ error: "Linked BOQ not found" });
    }
    if (boqCheck.rows[0].status !== "pending_se") {
      return res.status(400).json({
        error: `Quantity report requires a pending_se BOQ. Current status: ${boqCheck.rows[0].status}.`,
      });
    }

    const existing = await pool.query(
      "SELECT id FROM quantity_reports WHERE boq_id = $1 AND status != 'rejected'", [boqId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "A quantity report already exists for this BOQ. Edit it instead." });
    }

    const cleanItems = items.map(({ material, unit, quantity }) => ({
      material, unit, quantity: parseFloat(quantity) || 0,
    }));

    const result = await pool.query(
      `INSERT INTO quantity_reports
         (project_id, project_name, milestone_id, milestone_name,
          boq_id, items, total_items, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_se')
       RETURNING id`,
      [projectId, projectName, milestoneId, milestoneName,
       boqId, JSON.stringify(cleanItems), totalItems || cleanItems.length]
    );

    res.status(201).json({
      message: "Quantity Report created and sent to Site Engineer for approval",
      id:      result.rows[0].id,
      status:  "pending_se",
    });
  } catch (err) {
    console.error("createReport:", err.message);
    res.status(500).json({ error: "Failed to create quantity report: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE  —  PUT /api/quantity-report/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, projectName, milestoneId, milestoneName, boqId, items, totalItems } = req.body;

    const check = await pool.query("SELECT status FROM quantity_reports WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "Quantity report not found" });
    if (check.rows[0].status === "approved") {
      return res.status(403).json({ error: "Cannot edit an approved quantity report" });
    }

    const cleanItems = items
      ? items.map(({ material, unit, quantity }) => ({
          material, unit, quantity: parseFloat(quantity) || 0,
        }))
      : null;

    const result = await pool.query(
      `UPDATE quantity_reports
       SET project_id     = COALESCE($1, project_id),
           project_name   = COALESCE($2, project_name),
           milestone_id   = COALESCE($3, milestone_id),
           milestone_name = COALESCE($4, milestone_name),
           boq_id         = COALESCE($5, boq_id),
           items          = COALESCE($6, items),
           total_items    = COALESCE($7, total_items),
           status         = 'pending_se',
           se_comment     = '',
           updated_date   = CURRENT_DATE,
           updated_at     = NOW()
       WHERE id = $8
       RETURNING id, status`,
      [projectId, projectName, milestoneId, milestoneName, boqId,
       cleanItems ? JSON.stringify(cleanItems) : null, totalItems, id]
    );

    res.json({
      message: "Quantity Report updated and resubmitted to SE",
      id:      result.rows[0].id,
      status:  result.rows[0].status,
    });
  } catch (err) {
    console.error("updateReport:", err.message);
    res.status(500).json({ error: "Failed to update quantity report: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  SE APPROVE  —  PUT /api/quantity-report/approve/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.approveReport = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE quantity_reports
       SET status = 'approved', se_comment = '', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_se'
       RETURNING id, status, boq_id, project_name, milestone_name`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Quantity report not found or not awaiting SE approval" });
    }

    const { boq_id, project_name, milestone_name } = result.rows[0];

    await pool.query(
      `UPDATE boqs
       SET status = 'finalised', sent_to_se = TRUE,
           finalised_date = CURRENT_DATE, se_note = '', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_se'`,
      [boq_id]
    );

    // ── QS Notification ──────────────────────────────────────
    await createNotificationDirect({
      type:         "Quantity",
      project_name: project_name,
      milestone:    milestone_name,
      title:        "Quantity Report Approved ✅",
      message:      `Your quantity report for ${milestone_name} has been approved by SE. BOQ finalised.`,
      status:       "approved",
    });

    res.json({
      message: "Quantity Report approved by SE ✅ — BOQ finalised!",
      id:      result.rows[0].id,
      status:  "approved",
      boqId:   boq_id,
    });
  } catch (err) {
    console.error("approveReport:", err.message);
    res.status(500).json({ error: "Failed to approve quantity report: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  SE REJECT  —  PUT /api/quantity-report/reject/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.rejectReport = async (req, res) => {
  try {
    const { comment } = req.body;
    const note = comment || "Please revise the quantities.";

    const result = await pool.query(
      `UPDATE quantity_reports
       SET status = 'rejected', se_comment = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending_se'
       RETURNING id, status, boq_id, project_name, milestone_name`,
      [note, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Quantity report not found or not awaiting SE approval" });
    }

    const { boq_id, project_name, milestone_name } = result.rows[0];

    await pool.query(
      `UPDATE boqs SET status = 'rejected', se_note = $1, updated_at = NOW()
       WHERE id = $2`,
      [note, boq_id]
    );

    // ── QS Notification ──────────────────────────────────────
    await createNotificationDirect({
      type:         "Quantity",
      project_name: project_name,
      milestone:    milestone_name,
      title:        "Quantity Report Rejected ↩️",
      message:      note,
      status:       "rejected",
    });

    res.json({
      message: "SE requested changes ↩️ — BOQ rejected, QS must edit and resubmit",
      id:      result.rows[0].id,
      status:  "rejected",
      boqId:   boq_id,
    });
  } catch (err) {
    console.error("rejectReport:", err.message);
    res.status(500).json({ error: "Failed to reject quantity report: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/quantity-report/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteReport = async (req, res) => {
  try {
    const check = await pool.query("SELECT status FROM quantity_reports WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Quantity report not found" });
    if (check.rows[0].status === "approved") {
      return res.status(403).json({ error: "Cannot delete an approved quantity report" });
    }
    await pool.query("DELETE FROM quantity_reports WHERE id = $1", [req.params.id]);
    res.json({ message: "Quantity report deleted", id: parseInt(req.params.id) });
  } catch (err) {
    console.error("deleteReport:", err.message);
    res.status(500).json({ error: "Failed to delete quantity report: " + err.message });
  }
};