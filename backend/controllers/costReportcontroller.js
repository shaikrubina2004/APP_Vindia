// ══════════════════════════════════════════════════════════════════════════════
//  costReportController.js
//  Cost Report CRUD + PM approval workflow
//  Data is pulled from BOQs with status = 'pending_pm'
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create table on startup ──────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cost_reports (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        project_name    VARCHAR(255)  NOT NULL,
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL,
        boq_id          INTEGER       NOT NULL,
        items           JSONB         NOT NULL DEFAULT '[]',
        total_cost      NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(50)   NOT NULL DEFAULT 'pending_pm',
        pm_comment      TEXT                   DEFAULT '',
        created_date    DATE                   DEFAULT CURRENT_DATE,
        updated_date    DATE,
        created_at      TIMESTAMP              DEFAULT NOW(),
        updated_at      TIMESTAMP              DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cr_project   ON cost_reports (project_id);
      CREATE INDEX IF NOT EXISTS idx_cr_status    ON cost_reports (status);
      CREATE INDEX IF NOT EXISTS idx_cr_milestone ON cost_reports (milestone_id);
      CREATE INDEX IF NOT EXISTS idx_cr_boq       ON cost_reports (boq_id);
    `);
    console.log("✅ cost_reports table ready");
  } catch (err) {
    console.error("❌ cost_reports table setup failed:", err.message);
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
    totalCost:     parseFloat(r.total_cost) || 0,
    status:        r.status,
    pmComment:     r.pm_comment || "",
    createdDate:   r.created_date
      ? new Date(r.created_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
    updatedDate:   r.updated_date
      ? new Date(r.updated_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET ALL  —  GET /api/cost-report
//  Optional: ?projectId=&status=
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllReports = async (req, res) => {
  try {
    const { projectId, status } = req.query;
    const conditions = [];
    const values     = [];

    if (projectId) {
      values.push(projectId);
      conditions.push(`project_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT * FROM cost_reports ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(result.rows.map(formatReport));
  } catch (err) {
    console.error("getAllReports:", err.message);
    res.status(500).json({ error: "Failed to fetch cost reports" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET ONE  —  GET /api/cost-report/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cost_reports WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Cost report not found" });
    }
    res.json(formatReport(result.rows[0]));
  } catch (err) {
    console.error("getReportById:", err.message);
    res.status(500).json({ error: "Failed to fetch cost report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/cost-report
//  Body: { projectId, projectName, milestoneId, milestoneName, boqId, items, totalCost }
//  Status starts as 'pending_pm'
// ══════════════════════════════════════════════════════════════════════════════
exports.createReport = async (req, res) => {
  try {
    const {
      projectId,
      projectName,
      milestoneId,
      milestoneName,
      boqId,
      items,
      totalCost,
    } = req.body;

    // Validation
    if (!projectId || !milestoneId || !boqId) {
      return res.status(400).json({
        error: "projectId, milestoneId and boqId are required",
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    // Check BOQ exists and is pending_pm
    const boqCheck = await pool.query(
      "SELECT id, status FROM boqs WHERE id = $1",
      [boqId]
    );
    if (!boqCheck.rows.length) {
      return res.status(404).json({ error: "Linked BOQ not found" });
    }
    if (boqCheck.rows[0].status !== "pending_pm") {
      return res.status(400).json({
        error: "Cost report can only be created from a BOQ awaiting PM approval",
      });
    }

    // Check if cost report already exists for this BOQ
    const existing = await pool.query(
      "SELECT id FROM cost_reports WHERE boq_id = $1 AND status != 'rejected'",
      [boqId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "A cost report already exists for this BOQ. Edit it instead.",
      });
    }

    const result = await pool.query(
      `INSERT INTO cost_reports
         (project_id, project_name, milestone_id, milestone_name, boq_id, items, total_cost, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_pm')
       RETURNING id`,
      [
        projectId,
        projectName,
        milestoneId,
        milestoneName,
        boqId,
        JSON.stringify(items),
        totalCost || 0,
      ]
    );

    res.status(201).json({
      message: "Cost Report created and sent to PM for approval",
      id:      result.rows[0].id,
      status:  "pending_pm",
    });
  } catch (err) {
    console.error("createReport:", err.message);
    res.status(500).json({ error: "Failed to create cost report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE  —  PUT /api/cost-report/:id
//  QS edits a rejected report and resubmits → status resets to 'pending_pm'
// ══════════════════════════════════════════════════════════════════════════════
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, projectName, milestoneId, milestoneName, boqId, items, totalCost } = req.body;

    // Only allow edit if rejected or pending_pm
    const check = await pool.query(
      "SELECT status FROM cost_reports WHERE id = $1",
      [id]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: "Cost report not found" });
    }
    if (check.rows[0].status === "approved") {
      return res.status(403).json({ error: "Cannot edit an approved cost report" });
    }

    const result = await pool.query(
      `UPDATE cost_reports
       SET project_id     = COALESCE($1, project_id),
           project_name   = COALESCE($2, project_name),
           milestone_id   = COALESCE($3, milestone_id),
           milestone_name = COALESCE($4, milestone_name),
           boq_id         = COALESCE($5, boq_id),
           items          = COALESCE($6, items),
           total_cost     = COALESCE($7, total_cost),
           status         = 'pending_pm',
           pm_comment     = '',
           updated_date   = CURRENT_DATE,
           updated_at     = NOW()
       WHERE id = $8
       RETURNING id, status`,
      [
        projectId, projectName, milestoneId, milestoneName,
        boqId,
        items ? JSON.stringify(items) : null,
        totalCost,
        id,
      ]
    );

    res.json({
      message: "Cost Report updated and resubmitted to PM",
      id:      result.rows[0].id,
      status:  result.rows[0].status,
    });
  } catch (err) {
    console.error("updateReport:", err.message);
    res.status(500).json({ error: "Failed to update cost report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PM APPROVE  —  PUT /api/cost-report/approve/:id
//  ⚠️  Register BEFORE /:id in router
// ══════════════════════════════════════════════════════════════════════════════
exports.approveReport = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE cost_reports
       SET status     = 'approved',
           pm_comment = '',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending_pm'
       RETURNING id, status`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Cost report not found or not awaiting PM approval",
      });
    }
    res.json({
      message: "Cost Report approved by PM ✅",
      id:      result.rows[0].id,
      status:  "approved",
    });
  } catch (err) {
    console.error("approveReport:", err.message);
    res.status(500).json({ error: "Failed to approve cost report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PM REJECT  —  PUT /api/cost-report/reject/:id
//  Body: { comment }
//  ⚠️  Register BEFORE /:id in router
// ══════════════════════════════════════════════════════════════════════════════
exports.rejectReport = async (req, res) => {
  try {
    const { comment } = req.body;
    const result = await pool.query(
      `UPDATE cost_reports
       SET status     = 'rejected',
           pm_comment = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'pending_pm'
       RETURNING id, status`,
      [comment || "Please review the cost figures.", req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Cost report not found or not awaiting PM approval",
      });
    }
    res.json({
      message: "PM requested changes ↩️",
      id:      result.rows[0].id,
      status:  "rejected",
    });
  } catch (err) {
    console.error("rejectReport:", err.message);
    res.status(500).json({ error: "Failed to reject cost report" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/cost-report/:id
//  Only rejected reports can be deleted
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteReport = async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT status FROM cost_reports WHERE id = $1",
      [req.params.id]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: "Cost report not found" });
    }
    if (check.rows[0].status === "approved") {
      return res.status(403).json({ error: "Cannot delete an approved cost report" });
    }

    await pool.query("DELETE FROM cost_reports WHERE id = $1", [req.params.id]);
    res.json({ message: "Cost report deleted", id: parseInt(req.params.id) });
  } catch (err) {
    console.error("deleteReport:", err.message);
    res.status(500).json({ error: "Failed to delete cost report" });
  }
};