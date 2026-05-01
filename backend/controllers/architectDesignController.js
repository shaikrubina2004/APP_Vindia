// controllers/architectDesignController.js
const pool = require("../config/db");

// ─── helpers ────────────────────────────────────────────────────────────────
const STAGE_LABELS = {
  qs:     "Quantity Surveyor",
  site:   "Site Engineer",
  pm:     "Project Manager",
  client: "Client",
};
const STAGE_ORDER = ["qs", "site", "pm", "client"];

/**
 * Build the frontend-compatible drawing object from DB rows.
 * Merges drawing + all workflow rows + history (revisions) + action logs.
 */
async function buildDrawing(client, drawingId) {
  const { rows: [d] } = await client.query(
    `SELECT * FROM architect_drawings WHERE id = $1`, [drawingId]
  );
  if (!d) return null;

  const { rows: wfRows } = await client.query(
    `SELECT * FROM architect_drawing_workflow
      WHERE drawing_id = $1
      ORDER BY created_at ASC`,
    [drawingId]
  );

  const { rows: revRows } = await client.query(
    `SELECT * FROM architect_drawing_revisions
      WHERE drawing_id = $1
      ORDER BY created_at DESC`,
    [drawingId]
  );

  const { rows: logRows } = await client.query(
    `SELECT * FROM architect_drawing_logs
      WHERE drawing_id = $1
      ORDER BY created_at DESC`,
    [drawingId]
  );

  // Build workflow object keyed by stage (use LATEST row per stage)
  const emptyNode = () => ({
    state: "pending", sentAt: null, returnedAt: null,
    approvedAt: null, sentBy: "", note: "", revision: "",
  });

  const workflow = {
    qs:     emptyNode(),
    site:   emptyNode(),
    pm:     emptyNode(),
    client: emptyNode(),
  };

  // Group workflow rows by stage — take the last action per stage
  for (const row of wfRows) {
    const key = row.stage; // stored as "qs" | "site" | "pm" | "client"
    if (!workflow[key]) continue;
    workflow[key] = {
      state:      row.state       || "pending",
      sentAt:     row.sent_at     || null,
      returnedAt: row.rejected_at || null,
      approvedAt: row.approved_at || null,
      sentBy:     row.sent_by     ? String(row.sent_by) : "",
      note:       row.note        || "",
      revision:   d.current_revision || "",
    };
  }

  return {
    id:               d.id,
    project:          String(d.project_id),
    projectId:        d.project_id,
    name:             d.name,
    drawingType:      d.drawing_type,
    revision:         d.current_revision || "",
    stage:            d.stage            || "Draft",
    status:           d.status           || "Pending",
    description:      "",
    fileName:         revRows[0]?.file_name || "",
    fileUrl:          revRows[0]?.file_url  || "",
    approvedRevision: d.approved_revision  || "",
    createdAt:        d.created_at,
    updated:          d.updated_at,
    workflow,
    history: revRows.map((r) => ({
      rev:     r.revision,
      stage:   d.stage  || "Draft",
      status:  d.status || "Pending",
      updated: r.created_at,
      note:    r.file_name || "",
    })),
    actionLog: logRows.map((l) => ({
      ts:     l.created_at,
      action: l.action,
      stage:  l.stage,
      note:   l.note || "",
    })),
  };
}

// ─── POST /api/architect-designs ─────────────────────────────────────────────
exports.createDrawing = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      id,
      project_id,
      name,
      drawing_type,
      revision   = "R1",
      created_by,
      file_name  = "",
      file_url   = "",
    } = req.body;

    if (!id || !project_id || !name || !drawing_type) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "id, project_id, name, drawing_type are required." });
    }

    // Insert into architect_drawings
    await client.query(
      `INSERT INTO architect_drawings
         (id, project_id, name, drawing_type, current_revision, stage, status, created_by)
       VALUES ($1,$2,$3,$4,$5,'Draft','Pending',$6)`,
      [id, project_id, name, drawing_type, revision, created_by || null]
    );

    // Insert initial revision
    await client.query(
      `INSERT INTO architect_drawing_revisions
         (drawing_id, revision, file_name, file_url, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, revision, file_name, file_url, created_by || null]
    );

    // Insert creation log
    await client.query(
      `INSERT INTO architect_drawing_logs
         (drawing_id, action, stage, performed_by, note)
       VALUES ($1,'Created','—',$2,'Drawing created')`,
      [id, created_by || null]
    );

    await client.query("COMMIT");

    const drawing = await buildDrawing(pool, id);
    res.status(201).json({ success: true, data: drawing });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createDrawing:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─── GET /api/architect-designs/project/:projectId ───────────────────────────
exports.getDrawingsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const { rows } = await pool.query(
      `SELECT id FROM architect_drawings
        WHERE project_id = $1
        ORDER BY created_at DESC`,
      [projectId]
    );

    const drawings = await Promise.all(rows.map((r) => buildDrawing(pool, r.id)));
    res.json({ success: true, data: drawings.filter(Boolean) });
  } catch (err) {
    console.error("getDrawingsByProject:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/architect-designs/:drawingId ───────────────────────────────────
exports.getDrawingById = async (req, res) => {
  try {
    const drawing = await buildDrawing(pool, req.params.drawingId);
    if (!drawing) return res.status(404).json({ success: false, message: "Drawing not found" });
    res.json({ success: true, data: drawing });
  } catch (err) {
    console.error("getDrawingById:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/architect-designs/:drawingId/revision ─────────────────────────
exports.addRevision = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { drawingId } = req.params;
    const { revision, file_name = "", file_url = "", created_by } = req.body;

    if (!revision) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "revision is required." });
    }

    await client.query(
      `INSERT INTO architect_drawing_revisions
         (drawing_id, revision, file_name, file_url, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [drawingId, revision, file_name, file_url, created_by || null]
    );

    await client.query(
      `UPDATE architect_drawings
          SET current_revision=$1, updated_at=NOW()
        WHERE id=$2`,
      [revision, drawingId]
    );

    await client.query(
      `INSERT INTO architect_drawing_logs
         (drawing_id, action, stage, performed_by, note)
       VALUES ($1,'Revision Added','—',$2,$3)`,
      [drawingId, created_by || null, `New revision: ${revision}`]
    );

    await client.query("COMMIT");

    const drawing = await buildDrawing(pool, drawingId);
    res.json({ success: true, data: drawing });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("addRevision:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─── GET /api/architect-designs/:drawingId/revisions ─────────────────────────
exports.getRevisions = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM architect_drawing_revisions
        WHERE drawing_id=$1
        ORDER BY created_at DESC`,
      [req.params.drawingId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getRevisions:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/architect-designs/:drawingId/workflow ─────────────────────────
// body: { stage: "qs"|"site"|"pm"|"client", action: "send"|"approve"|"reject", user_id, note? }
exports.updateWorkflow = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { drawingId } = req.params;
    const { stage, action, user_id, note = "" } = req.body;

    if (!STAGE_ORDER.includes(stage)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: `Invalid stage: ${stage}` });
    }
    if (!["send", "approve", "reject"].includes(action)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: `Invalid action: ${action}` });
    }

    const { rows: [drawing] } = await client.query(
      `SELECT * FROM architect_drawings WHERE id=$1 FOR UPDATE`, [drawingId]
    );
    if (!drawing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Drawing not found" });
    }

    const isWorking  = drawing.drawing_type === "Working Drawing";
    const isDetailed = drawing.drawing_type === "Detailed Drawing";
    const label      = STAGE_LABELS[stage];

    // ── determine timestamps ──────────────────────────────────────────────
    let state     = "pending";
    let sent_at   = null;
    let approved_at = null;
    let rejected_at = null;
    let sent_by   = null;
    let acted_by  = user_id || null;
    let newStage  = drawing.stage;
    let newStatus = drawing.status;

    if (action === "send") {
      state   = "sent";
      sent_at = new Date();
      sent_by = user_id || null;
      newStage  = `${label} Review`;
      newStatus = "Pending";
    }

    if (action === "approve") {
      state       = "approved";
      approved_at = new Date();

      if (stage === "client") {
        // Final approval
        newStatus = "Approved";
        newStage  = "Fully Approved";
        await client.query(
          `UPDATE architect_drawings
              SET status='Approved', approved_revision=current_revision, stage='Fully Approved', updated_at=NOW()
            WHERE id=$1`,
          [drawingId]
        );
      } else if (isWorking) {
        // Working Drawing: auto-advance to next stage
        const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
        if (nextStage) {
          await client.query(
            `INSERT INTO architect_drawing_workflow
               (drawing_id, stage, state, sent_at, sent_by, note)
             VALUES ($1,$2,'sent',NOW(),$3,$4)`,
            [drawingId, nextStage, user_id || null, `Auto-sent from ${label}`]
          );
          newStage  = `${STAGE_LABELS[nextStage]} Review`;
          newStatus = "Pending";
        }
      } else if (isDetailed) {
        // Detailed Drawing: each stage approves independently, no auto-advance
        newStage  = `${label} Approved`;
        newStatus = "Pending";
      }
    }

    if (action === "reject") {
      state       = "rejected";
      rejected_at = new Date();
      newStage    = `${label} Rejected`;
      newStatus   = "Rejected";
    }

    // Insert workflow row
    await client.query(
      `INSERT INTO architect_drawing_workflow
         (drawing_id, stage, state, sent_at, approved_at, rejected_at, sent_by, acted_by, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [drawingId, stage, state, sent_at, approved_at, rejected_at, sent_by, acted_by, note]
    );

    // Update drawing stage/status (unless already handled above for final approve)
    if (!(action === "approve" && stage === "client")) {
      await client.query(
        `UPDATE architect_drawings SET stage=$1, status=$2, updated_at=NOW() WHERE id=$3`,
        [newStage, newStatus, drawingId]
      );
    }

    // Insert audit log
    await client.query(
      `INSERT INTO architect_drawing_logs
         (drawing_id, action, stage, performed_by, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [drawingId, action, stage, user_id || null, note || `${label} — ${action}`]
    );

    await client.query("COMMIT");

    const updated = await buildDrawing(pool, drawingId);
    res.json({ success: true, data: updated });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateWorkflow:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─── DELETE /api/architect-designs/:drawingId ────────────────────────────────
exports.deleteDrawing = async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM architect_drawings WHERE id=$1`, [req.params.drawingId]
    );
    if (rowCount === 0)
      return res.status(404).json({ success: false, message: "Drawing not found" });
    res.json({ success: true, message: "Drawing deleted" });
  } catch (err) {
    console.error("deleteDrawing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/architect-designs/stats ────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*)                                           AS total_drawings,
        COUNT(*) FILTER (WHERE status='Pending')           AS pending,
        COUNT(*) FILTER (WHERE status='Approved')          AS approved,
        COUNT(*) FILTER (WHERE status='Rejected')          AS rejected,
        COUNT(DISTINCT project_id)                         AS total_projects
      FROM architect_drawings
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("getStats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};