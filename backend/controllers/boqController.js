// ══════════════════════════════════════════════════════════════════════════════
//  boqController.js
//  Workflow:
//    QS creates BOQ → status: pending_pm
//    PM approves Cost Report → BOQ: pending_se  (handled in costReportController)
//    SE approves Qty Report  → BOQ: finalised   (handled in quantityReportController)
//    Any rejection           → BOQ: rejected    → QS edits & resubmits
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create boqs table ────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boqs (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL,
        project_name    VARCHAR(255)  NOT NULL,
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL,
        rows            JSONB         NOT NULL DEFAULT '[]',
        grand_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(50)   NOT NULL DEFAULT 'pending_pm',
        pm_note         TEXT          DEFAULT '',
        se_note         TEXT          DEFAULT '',
        sent_to_se      BOOLEAN       DEFAULT FALSE,
        finalised_date  DATE,
        updated_date    DATE,
        created_at      TIMESTAMP     DEFAULT NOW(),
        updated_at      TIMESTAMP     DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_boqs_project_id   ON boqs (project_id);
      CREATE INDEX IF NOT EXISTS idx_boqs_milestone_id ON boqs (milestone_id);
      CREATE INDEX IF NOT EXISTS idx_boqs_status       ON boqs (status);
    `);
    console.log("✅ boqs table ready");
  } catch (err) {
    console.error("❌ boqs table setup failed:", err.message);
  }
})();

// ── Format helper ─────────────────────────────────────────────────────────────
function formatBoq(r) {
  return {
    id:            r.id,
    projectId:     r.project_id,
    projectName:   r.project_name || "",
    milestoneId:   r.milestone_id,
    milestoneName: r.milestone_name,
    rows:          r.rows || [],
    grandTotal:    parseFloat(r.grand_total) || 0,
    status:        r.status,
    pmNote:        r.pm_note  || "",
    seNote:        r.se_note  || "",
    sentToSE:      r.sent_to_se || false,
    finalisedDate: r.finalised_date
      ? new Date(r.finalised_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
    updatedDate: r.updated_date
      ? new Date(r.updated_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
    // Report statuses joined from cost_reports / quantity_reports
    costReportStatus: r.cost_report_status || null,
    qtyReportStatus:  r.qty_report_status  || null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET PROJECTS  —  GET /api/boq/projects
// ══════════════════════════════════════════════════════════════════════════════
exports.getProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM projects ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getProjects:", err.message);
    res.status(500).json({ error: "Failed to fetch projects: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET MILESTONES  —  GET /api/boq/milestones/:projectId
//  Returns WBS rows where parent_id IS NULL (top-level = milestones)
// ══════════════════════════════════════════════════════════════════════════════
exports.getMilestones = async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT id, name, code, status, progress
       FROM wbs
       WHERE project_id = $1
         AND parent_id IS NULL
       ORDER BY code ASC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getMilestones:", err.message);
    res.status(500).json({ error: "Failed to fetch milestones: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL BOQs  —  GET /api/boq
//  Includes cost_report_status and qty_report_status from linked reports
//  Optional: ?projectId=&status=&milestoneId=
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllBoqs = async (req, res) => {
  try {
    const { projectId, status, milestoneId } = req.query;
    const conditions = [];
    const values     = [];

    if (projectId) {
      values.push(projectId);
      conditions.push(`b.project_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`b.status = $${values.length}`);
    }
    if (milestoneId) {
      values.push(milestoneId);
      conditions.push(`b.milestone_id = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

   const result = await pool.query(`
  SELECT 
    b.*,
    p.name AS project_name
  FROM boqs b
  LEFT JOIN projects p ON b.project_id = p.id
  ORDER BY b.created_at DESC
`);
    res.json(result.rows.map(formatBoq));
  } catch (err) {
    console.error("getAllBoqs:", err.message);
    res.status(500).json({ error: "Failed to fetch BOQs: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE BOQ  —  GET /api/boq/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getBoqById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              cr.status AS cost_report_status,
              qr.status AS qty_report_status
       FROM boqs b
       LEFT JOIN LATERAL (
         SELECT status FROM cost_reports
         WHERE boq_id = b.id
         ORDER BY created_at DESC LIMIT 1
       ) cr ON true
       LEFT JOIN LATERAL (
         SELECT status FROM quantity_reports
         WHERE boq_id = b.id
         ORDER BY created_at DESC LIMIT 1
       ) qr ON true
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "BOQ not found" });
    }
    res.json(formatBoq(result.rows[0]));
  } catch (err) {
    console.error("getBoqById:", err.message);
    res.status(500).json({ error: "Failed to fetch BOQ: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE BOQ  —  POST /api/boq
//  Body: { projectId, milestoneId, milestoneName, rows, grandTotal }
//  Status starts as 'pending_pm'
// ══════════════════════════════════════════════════════════════════════════════
exports.createBoq = async (req, res) => {
  try {
    const { projectId, milestoneId, milestoneName, rows, grandTotal } = req.body;

    if (!projectId || !milestoneId || !milestoneName) {
      return res.status(400).json({
        error: "projectId, milestoneId and milestoneName are required",
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows must be a non-empty array" });
    }

    // Get project name from projects table
    const projCheck = await pool.query(
      "SELECT id, name FROM projects WHERE id = $1", [projectId]
    );
    if (!projCheck.rows.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify milestone exists in wbs as top-level (parent_id IS NULL)
    const wbsCheck = await pool.query(
      "SELECT id, name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
      [milestoneId, projectId]
    );
    if (!wbsCheck.rows.length) {
      return res.status(404).json({ error: "Milestone not found in WBS" });
    }

    const result = await pool.query(
      `INSERT INTO boqs
         (project_id, project_name, milestone_id, milestone_name, rows, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending_pm')
       RETURNING id`,
      [
        projectId,
        projCheck.rows[0].name,
        milestoneId,
        wbsCheck.rows[0].name,
        JSON.stringify(rows),
        grandTotal || 0,
      ]
    );

    res.status(201).json({
      message: "BOQ created and sent to PM for approval",
      id:      result.rows[0].id,
      status:  "pending_pm",
    });
  } catch (err) {
    console.error("createBoq:", err.message);
    res.status(500).json({ error: "Failed to create BOQ: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE BOQ  —  PUT /api/boq/:id
//  QS edits rejected BOQ and resubmits → status resets to 'pending_pm'
//  Also deletes old rejected cost/quantity reports so fresh ones can be created
// ══════════════════════════════════════════════════════════════════════════════
exports.updateBoq = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, milestoneId, milestoneName, rows, grandTotal } = req.body;

    const check = await pool.query("SELECT status FROM boqs WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "BOQ not found" });
    if (check.rows[0].status === "finalised") {
      return res.status(403).json({ error: "Cannot edit a finalised BOQ" });
    }

    // Get project name
    let projectName = null;
    if (projectId) {
      const p = await pool.query("SELECT name FROM projects WHERE id = $1", [projectId]);
      if (p.rows.length) projectName = p.rows[0].name;
    }

    // Get milestone name from wbs
    let milestoneNameFromDb = milestoneName;
    if (milestoneId && projectId) {
      const w = await pool.query(
        "SELECT name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
        [milestoneId, projectId]
      );
      if (w.rows.length) milestoneNameFromDb = w.rows[0].name;
    }

    // Delete old rejected reports so QS can create fresh ones
    await pool.query(
      "DELETE FROM cost_reports WHERE boq_id = $1 AND status = 'rejected'", [id]
    );
    await pool.query(
      "DELETE FROM quantity_reports WHERE boq_id = $1 AND status = 'rejected'", [id]
    );

    const result = await pool.query(
      `UPDATE boqs
       SET project_id     = COALESCE($1, project_id),
           project_name   = COALESCE($2, project_name),
           milestone_id   = COALESCE($3, milestone_id),
           milestone_name = COALESCE($4, milestone_name),
           rows           = COALESCE($5, rows),
           grand_total    = COALESCE($6, grand_total),
           status         = 'pending_pm',
           pm_note        = '',
           se_note        = '',
           updated_date   = CURRENT_DATE,
           updated_at     = NOW()
       WHERE id = $7
       RETURNING id, status`,
      [
        projectId, projectName,
        milestoneId, milestoneNameFromDb,
        rows ? JSON.stringify(rows) : null,
        grandTotal, id,
      ]
    );

    res.json({
      message: "BOQ updated and resubmitted to PM for approval",
      id:      result.rows[0].id,
      status:  result.rows[0].status,
    });
  } catch (err) {
    console.error("updateBoq:", err.message);
    res.status(500).json({ error: "Failed to update BOQ: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE BOQ  —  DELETE /api/boq/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteBoq = async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT status FROM boqs WHERE id = $1", [req.params.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: "BOQ not found" });
    if (check.rows[0].status === "finalised") {
      return res.status(403).json({ error: "Cannot delete a finalised BOQ" });
    }
    await pool.query("DELETE FROM boqs WHERE id = $1", [req.params.id]);
    res.json({ message: "BOQ deleted", id: parseInt(req.params.id) });
  } catch (err) {
    console.error("deleteBoq:", err.message);
    res.status(500).json({ error: "Failed to delete BOQ: " + err.message });
  }
};