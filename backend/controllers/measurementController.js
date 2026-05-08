const pool = require("../config/db");

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS measurement_sheets (
        id              SERIAL        PRIMARY KEY,
        project_id      INTEGER       NOT NULL,
        project_name    VARCHAR(255)  NOT NULL,
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL,
        sheet_title     VARCHAR(255)  NOT NULL,
        unit            VARCHAR(20)   NOT NULL DEFAULT 'm²',
        rows            JSONB         NOT NULL DEFAULT '[]',
        gross_qty       NUMERIC(15,4) NOT NULL DEFAULT 0,
        deduct_qty      NUMERIC(15,4) NOT NULL DEFAULT 0,
        net_qty         NUMERIC(15,4) NOT NULL DEFAULT 0,
        pushed_to_boq   BOOLEAN       DEFAULT FALSE,
        boq_id          INTEGER,
        updated_date    DATE,
        created_at      TIMESTAMP     DEFAULT NOW(),
        updated_at      TIMESTAMP     DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ms_project_id   ON measurement_sheets (project_id);
      CREATE INDEX IF NOT EXISTS idx_ms_milestone_id ON measurement_sheets (milestone_id);
    `);
    console.log("✅ measurement_sheets table ready");
  } catch (err) {
    console.error("❌ measurement_sheets table setup failed:", err.message);
  }
})();

function formatSheet(r) {
  return {
    id:            r.id,
    projectId:     r.project_id,
    projectName:   r.project_name || "",
    milestoneId:   r.milestone_id,
    milestoneName: r.milestone_name,
    sheetTitle:    r.sheet_title,
    unit:          r.unit,
    rows:          r.rows || [],
    grossQty:      parseFloat(r.gross_qty)  || 0,
    deductQty:     parseFloat(r.deduct_qty) || 0,
    netQty:        parseFloat(r.net_qty)    || 0,
    pushedToBoq:   r.pushed_to_boq || false,
    boqId:         r.boq_id || null,
    updatedDate: r.updated_date
      ? new Date(r.updated_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
      : null,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
      : null,
  };
}

// GET all
exports.getAll = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.query;
    const conditions = [], values = [];
    if (projectId)   { values.push(projectId);   conditions.push(`project_id = $${values.length}`); }
    if (milestoneId) { values.push(milestoneId);  conditions.push(`milestone_id = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM measurement_sheets ${where} ORDER BY created_at DESC`, values
    );
    res.json(result.rows.map(formatSheet));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sheets: " + err.message });
  }
};

// GET one
exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM measurement_sheets WHERE id = $1", [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Sheet not found" });
    res.json(formatSheet(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sheet: " + err.message });
  }
};

// CREATE
exports.create = async (req, res) => {
  try {
    const { projectId, milestoneId, milestoneName, sheetTitle, unit, rows, grossQty, deductQty, netQty } = req.body;
    if (!projectId || !milestoneId || !sheetTitle)
      return res.status(400).json({ error: "projectId, milestoneId and sheetTitle are required" });

    const proj = await pool.query("SELECT name FROM projects WHERE id = $1", [projectId]);
    if (!proj.rows.length) return res.status(404).json({ error: "Project not found" });

    const wbs = await pool.query(
      "SELECT name FROM wbs WHERE id = $1 AND project_id = $2 AND parent_id IS NULL",
      [milestoneId, projectId]
    );
    const msName = wbs.rows.length ? wbs.rows[0].name : milestoneName;

    const result = await pool.query(
      `INSERT INTO measurement_sheets
         (project_id, project_name, milestone_id, milestone_name, sheet_title, unit, rows, gross_qty, deduct_qty, net_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [projectId, proj.rows[0].name, milestoneId, msName, sheetTitle,
       unit || "m²", JSON.stringify(rows || []),
       grossQty || 0, deductQty || 0, netQty || 0]
    );
    res.status(201).json({ message: "Measurement sheet created", id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create sheet: " + err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const { sheetTitle, unit, rows, grossQty, deductQty, netQty } = req.body;
    const check = await pool.query("SELECT id FROM measurement_sheets WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Sheet not found" });

    await pool.query(
      `UPDATE measurement_sheets
       SET sheet_title  = COALESCE($1, sheet_title),
           unit         = COALESCE($2, unit),
           rows         = COALESCE($3, rows),
           gross_qty    = COALESCE($4, gross_qty),
           deduct_qty   = COALESCE($5, deduct_qty),
           net_qty      = COALESCE($6, net_qty),
           updated_date = CURRENT_DATE,
           updated_at   = NOW()
       WHERE id = $7`,
      [sheetTitle, unit, rows ? JSON.stringify(rows) : null,
       grossQty, deductQty, netQty, req.params.id]
    );
    res.json({ message: "Sheet updated", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update sheet: " + err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const check = await pool.query("SELECT id FROM measurement_sheets WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Sheet not found" });
    await pool.query("DELETE FROM measurement_sheets WHERE id = $1", [req.params.id]);
    res.json({ message: "Sheet deleted", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete sheet: " + err.message });
  }
};

// PUSH TO BOQ
exports.pushToBoq = async (req, res) => {
  try {
    const { targetBoqId } = req.body;
    const sheet = await pool.query(
      "SELECT * FROM measurement_sheets WHERE id = $1", [req.params.id]
    );
    if (!sheet.rows.length) return res.status(404).json({ error: "Sheet not found" });
    const s = sheet.rows[0];

    if (targetBoqId) {
      // Add as a new row to existing BOQ
      const boq = await pool.query("SELECT * FROM boqs WHERE id = $1", [targetBoqId]);
      if (!boq.rows.length) return res.status(404).json({ error: "BOQ not found" });

      const existingRows = boq.rows[0].rows || [];
      const newRow = {
        id:        Math.random().toString(36).substr(2, 9),
        material:  s.sheet_title,
        unit:      s.unit,
        quantity:  parseFloat(s.net_qty),
        unitPrice: 0,
        total:     0,
      };
      const updatedRows = [...existingRows, newRow];
      await pool.query(
        "UPDATE boqs SET rows = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(updatedRows), targetBoqId]
      );
      await pool.query(
        "UPDATE measurement_sheets SET pushed_to_boq = true, boq_id = $1 WHERE id = $2",
        [targetBoqId, req.params.id]
      );
      res.json({ message: "Pushed to existing BOQ", boqId: targetBoqId });
    } else {
      // Just mark as pushed — frontend navigates to BOQ create form
      await pool.query(
        "UPDATE measurement_sheets SET pushed_to_boq = true WHERE id = $1", [req.params.id]
      );
      res.json({
        message:    "Ready to push",
        sheetTitle: s.sheet_title,
        unit:       s.unit,
        netQty:     parseFloat(s.net_qty),
        projectId:  s.project_id,
        milestoneId: s.milestone_id,
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to push to BOQ: " + err.message });
  }
};