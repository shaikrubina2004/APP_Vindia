// ══════════════════════════════════════════════════════════════════════════════
//  boqController.js
//  Uses existing tables:
//    projects  (id, name)
//    wbs       (id, project_id, code, name, parent_id)
//    boqs      (our new workflow table)
//    boq_items (id, boq_id, material, unit, quantity, unit_price, total)
// ══════════════════════════════════════════════════════════════════════════════
const pool = require("../config/db");

// ── Auto-create boqs table (uses existing projects table, no FK issues) ───────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boqs (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL,
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL,
        rows            JSONB         NOT NULL DEFAULT '[]',
        grand_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(50)   NOT NULL DEFAULT 'pending_pm',
        pm_note         TEXT                   DEFAULT '',
        se_note         TEXT                   DEFAULT '',
        sent_to_se      BOOLEAN                DEFAULT FALSE,
        finalised_date  DATE,
        updated_date    DATE,
        created_at      TIMESTAMP              DEFAULT NOW(),
        updated_at      TIMESTAMP              DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_boqs_project   ON boqs (project_id);
      CREATE INDEX IF NOT EXISTS idx_boqs_status    ON boqs (status);
      CREATE INDEX IF NOT EXISTS idx_boqs_milestone ON boqs (milestone_id);
    `);
    console.log("✅ boqs table ready");
  } catch (err) {
    console.error("❌ boqs table setup failed:", err.message);
  }
})();

// ── Auto-create cost_reports table ────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cost_reports (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_cr_boq       ON cost_reports (boq_id);
    `);
    console.log("✅ cost_reports table ready");
  } catch (err) {
    console.error("❌ cost_reports table setup failed:", err.message);
  }
})();

// ── Format BOQ row for API response ──────────────────────────────────────────
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
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET PROJECTS  —  GET /api/boq/projects
//  Reads from existing `projects` table  (id, name)
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
//  Reads from existing `wbs` table WHERE parent_id IS NULL (top-level = milestones)
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
//  Joins boqs with projects to get project name
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

    const result = await pool.query(
      `SELECT b.*, p.name AS project_name
       FROM boqs b
       JOIN projects p ON p.id = b.project_id
       ${where}
       ORDER BY b.created_at DESC`,
      values
    );
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
      `SELECT b.*, p.name AS project_name
       FROM boqs b
       JOIN projects p ON p.id = b.project_id
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

    // Verify project exists
    const projCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1", [projectId]
    );
    if (!projCheck.rows.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify milestone exists in wbs
    const wbsCheck = await pool.query(
      "SELECT id, name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
      [milestoneId, projectId]
    );
    if (!wbsCheck.rows.length) {
      return res.status(404).json({ error: "Milestone not found in WBS" });
    }

    const result = await pool.query(
      `INSERT INTO boqs
         (project_id, milestone_id, milestone_name, rows, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, 'pending_pm')
       RETURNING id`,
      [projectId, milestoneId, milestoneName, JSON.stringify(rows), grandTotal || 0]
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
//  QS edits rejected/pending BOQ and resubmits
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

    const result = await pool.query(
      `UPDATE boqs
       SET project_id     = COALESCE($1, project_id),
           milestone_id   = COALESCE($2, milestone_id),
           milestone_name = COALESCE($3, milestone_name),
           rows           = COALESCE($4, rows),
           grand_total    = COALESCE($5, grand_total),
           status         = 'pending_pm',
           pm_note        = '',
           se_note        = '',
           updated_date   = CURRENT_DATE,
           updated_at     = NOW()
       WHERE id = $6
       RETURNING id, status`,
      [
        projectId, milestoneId, milestoneName,
        rows ? JSON.stringify(rows) : null,
        grandTotal, id,
      ]
    );

    res.json({
      message: "BOQ updated and resubmitted to PM",
      id:      result.rows[0].id,
      status:  result.rows[0].status,
    });
  } catch (err) {
    console.error("updateBoq:", err.message);
    res.status(500).json({ error: "Failed to update BOQ: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PM APPROVE  —  PUT /api/boq/approve/pm/:id
//  ⚠️  Must be registered BEFORE /:id in routes
// ══════════════════════════════════════════════════════════════════════════════
exports.pmApprove = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE boqs
       SET status = 'pending_se', pm_note = '', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_pm'
       RETURNING id, status`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "BOQ not found or not in pending_pm status" });
    }
    res.json({
      message: "PM approved — sent to Site Engineer",
      id: result.rows[0].id, status: "pending_se",
    });
  } catch (err) {
    console.error("pmApprove:", err.message);
    res.status(500).json({ error: "Failed to approve: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PM REJECT  —  PUT /api/boq/reject/pm/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.pmReject = async (req, res) => {
  try {
    const { note } = req.body;
    const result = await pool.query(
      `UPDATE boqs
       SET status = 'rejected', pm_note = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending_pm'
       RETURNING id, status`,
      [note || "Please review the cost estimates.", req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "BOQ not found or not in pending_pm status" });
    }
    res.json({ message: "PM requested changes", id: result.rows[0].id, status: "rejected" });
  } catch (err) {
    console.error("pmReject:", err.message);
    res.status(500).json({ error: "Failed to reject: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  SE APPROVE  —  PUT /api/boq/approve/se/:id
//  Finalises BOQ + marks sent_to_se = TRUE
// ══════════════════════════════════════════════════════════════════════════════
exports.seApprove = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE boqs
       SET status = 'finalised', sent_to_se = TRUE,
           finalised_date = CURRENT_DATE, se_note = '', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_se'
       RETURNING id, status`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "BOQ not found or not in pending_se status" });
    }
    res.json({
      message: "BOQ finalised and sent to Site Engineer ✅",
      id: result.rows[0].id, status: "finalised",
    });
  } catch (err) {
    console.error("seApprove:", err.message);
    res.status(500).json({ error: "Failed to finalise: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  SE REJECT  —  PUT /api/boq/reject/se/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.seReject = async (req, res) => {
  try {
    const { note } = req.body;
    const result = await pool.query(
      `UPDATE boqs
       SET status = 'rejected', se_note = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending_se'
       RETURNING id, status`,
      [note || "Quantity revision needed.", req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "BOQ not found or not in pending_se status" });
    }
    res.json({ message: "SE requested changes", id: result.rows[0].id, status: "rejected" });
  } catch (err) {
    console.error("seReject:", err.message);
    res.status(500).json({ error: "Failed to reject: " + err.message });
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