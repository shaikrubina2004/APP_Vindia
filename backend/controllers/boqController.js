const pool = require("../config/db");

// ── Auto-create boqs table ──
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
        labour_rows     JSONB         NOT NULL DEFAULT '[]',
        grand_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
        material_total  NUMERIC(15,2) NOT NULL DEFAULT 0,
        labour_total    NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(50)   NOT NULL DEFAULT 'pending_pm',
        pm_note         TEXT          DEFAULT '',
        se_note         TEXT          DEFAULT '',
        sent_to_se      BOOLEAN       DEFAULT FALSE,
        finalised_date  DATE,
        updated_date    DATE,
        created_at      TIMESTAMP     DEFAULT NOW(),
        updated_at      TIMESTAMP     DEFAULT NOW()
      );

      -- Add new columns if table already exists (safe migration)
      ALTER TABLE boqs ADD COLUMN IF NOT EXISTS labour_rows    JSONB         NOT NULL DEFAULT '[]';
      ALTER TABLE boqs ADD COLUMN IF NOT EXISTS material_total NUMERIC(15,2) NOT NULL DEFAULT 0;
      ALTER TABLE boqs ADD COLUMN IF NOT EXISTS labour_total   NUMERIC(15,2) NOT NULL DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_boqs_project_id   ON boqs (project_id);
      CREATE INDEX IF NOT EXISTS idx_boqs_milestone_id ON boqs (milestone_id);
      CREATE INDEX IF NOT EXISTS idx_boqs_status       ON boqs (status);
    `);
    console.log("✅ boqs table ready");
  } catch (err) {
    console.error("❌ boqs table setup failed:", err.message);
  }
})();

// ── Safe JSON parse helper ──
function safeParseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch (_) { return []; }
  }
  if (typeof val === "object") return val;
  return [];
}

// ── Format helper ──
function formatBoq(r) {
  const labourRows = safeParseJson(r.labour_rows);
  const rows       = safeParseJson(r.rows);

  return {
    id:            r.id,
    projectId:     r.project_id,
    projectName:   r.project_name || "",
    milestoneId:   r.milestone_id,
    milestoneName: r.milestone_name,
    rows,
    labourRows,
    grandTotal:    parseFloat(r.grand_total)    || 0,
    materialTotal: parseFloat(r.material_total) || 0,
    labourTotal:   parseFloat(r.labour_total)   || 0,
    status:        r.status,
    pmNote:        r.pm_note   || "",
    seNote:        r.se_note   || "",
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
    costReportStatus: r.cost_report_status || null,
    qtyReportStatus:  r.qty_report_status  || null,
  };
}

// ── GET PROJECTS ──
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

// ── GET MILESTONES ──
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

// ── GET ALL BOQs ──
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
        p.name AS project_name,
        cr.status AS cost_report_status,
        qr.status AS qty_report_status
      FROM boqs b
      LEFT JOIN projects p ON b.project_id = p.id
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
      ${where}
      ORDER BY b.created_at DESC
    `, values);

    res.json(result.rows.map(formatBoq));
  } catch (err) {
    console.error("getAllBoqs:", err.message);
    res.status(500).json({ error: "Failed to fetch BOQs: " + err.message });
  }
};

// ── GET ONE BOQ ──
exports.getBoqById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              p.name AS project_name,
              cr.status AS cost_report_status,
              qr.status AS qty_report_status
       FROM boqs b
       LEFT JOIN projects p ON b.project_id = p.id
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

// ── CREATE BOQ ──
exports.createBoq = async (req, res) => {
  try {
    const {
      projectId, milestoneId, milestoneName,
      rows, labourRows,
      grandTotal, materialTotal, labourTotal,
    } = req.body;

    if (!projectId || !milestoneId || !milestoneName) {
      return res.status(400).json({
        error: "projectId, milestoneId and milestoneName are required",
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows must be a non-empty array" });
    }

    const projCheck = await pool.query(
      "SELECT id, name FROM projects WHERE id = $1", [projectId]
    );
    if (!projCheck.rows.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    const wbsCheck = await pool.query(
      "SELECT id, name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
      [milestoneId, projectId]
    );
    if (!wbsCheck.rows.length) {
      return res.status(404).json({ error: "Milestone not found in WBS" });
    }

    // Ensure labourRows is always a valid array
    const safeLabourRows = Array.isArray(labourRows) ? labourRows : [];

    const result = await pool.query(
      `INSERT INTO boqs
         (project_id, project_name, milestone_id, milestone_name,
          rows, labour_rows, grand_total, material_total, labour_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_pm')
       RETURNING id`,
      [
        projectId,
        projCheck.rows[0].name,
        milestoneId,
        wbsCheck.rows[0].name,
        JSON.stringify(rows),
        JSON.stringify(safeLabourRows),
        grandTotal    || 0,
        materialTotal || grandTotal || 0,
        labourTotal   || 0,
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

// ── UPDATE BOQ ──
exports.updateBoq = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectId, milestoneId, milestoneName,
      rows, labourRows,
      grandTotal, materialTotal, labourTotal,
    } = req.body;

    const check = await pool.query("SELECT status FROM boqs WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "BOQ not found" });
    if (check.rows[0].status === "finalised") {
      return res.status(403).json({ error: "Cannot edit a finalised BOQ" });
    }

    let projectName = null;
    if (projectId) {
      const p = await pool.query("SELECT name FROM projects WHERE id = $1", [projectId]);
      if (p.rows.length) projectName = p.rows[0].name;
    }

    let milestoneNameFromDb = milestoneName;
    if (milestoneId && projectId) {
      const w = await pool.query(
        "SELECT name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
        [milestoneId, projectId]
      );
      if (w.rows.length) milestoneNameFromDb = w.rows[0].name;
    }

    await pool.query(
      "DELETE FROM cost_reports WHERE boq_id = $1 AND status = 'rejected'", [id]
    );
    await pool.query(
      "DELETE FROM quantity_reports WHERE boq_id = $1 AND status = 'rejected'", [id]
    );

    // Ensure labourRows is always a valid array
    const safeLabourRows = Array.isArray(labourRows) ? labourRows : [];

    const result = await pool.query(
      `UPDATE boqs
       SET project_id     = COALESCE($1, project_id),
           project_name   = COALESCE($2, project_name),
           milestone_id   = COALESCE($3, milestone_id),
           milestone_name = COALESCE($4, milestone_name),
           rows           = COALESCE($5, rows),
           labour_rows    = COALESCE($6, labour_rows),
           grand_total    = COALESCE($7, grand_total),
           material_total = COALESCE($8, material_total),
           labour_total   = COALESCE($9, labour_total),
           status         = 'pending_pm',
           pm_note        = '',
           se_note        = '',
           updated_date   = CURRENT_DATE,
           updated_at     = NOW()
       WHERE id = $10
       RETURNING id, status`,
      [
        projectId,
        projectName,
        milestoneId,
        milestoneNameFromDb,
        rows             ? JSON.stringify(rows)             : null,
        labourRows !== undefined ? JSON.stringify(safeLabourRows) : null,
        grandTotal    || null,
        materialTotal || null,
        labourTotal   !== undefined ? labourTotal : null,
        id,
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

// ── DELETE BOQ ──
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