// controllers/siteMeasurementController.js
//
// CHANGES (measurement lifecycle only — nothing else touched):
//
// 1. create()               → inserts with status = 'submitted'
// 2. update()               → blocked only when status = 'approved'
//                             rejected / under_review / submitted remain editable
// 3. remove()               → blocked only when status = 'approved'
// 4. formatMeasurement()    → returns status, statusLabel, statusColor, canEdit
// 5. updateMeasurementStatus() → internal helper, reused by quantityReportController
//
// NOT changed:
// - GET /site-measurements        (getAll)   — no data modification
// - GET /site-measurements/:id    (getById)  — no data modification, GET never changes state
// - All existing fields and logic
// - All routes and endpoint URLs
// - BOQ status update logic

const pool = require("../config/db");

// ── Auto-create / migrate table ──
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_measurements (
        id              SERIAL        PRIMARY KEY,
        boq_id          INTEGER       NOT NULL,
        project_id      INTEGER       NOT NULL,
        project_name    VARCHAR(255)  NOT NULL DEFAULT '',
        milestone_id    INTEGER       NOT NULL,
        milestone_name  VARCHAR(255)  NOT NULL DEFAULT '',
        labour_report_id INTEGER,
daily_diary_id INTEGER,
        submitted_by    VARCHAR(255)  NOT NULL DEFAULT 'Site Engineer',
        submitted_at    TIMESTAMP     DEFAULT NOW(),
        date            DATE          NOT NULL DEFAULT CURRENT_DATE,
        zone            VARCHAR(255)  NOT NULL DEFAULT '',
        activity        VARCHAR(255)  NOT NULL DEFAULT '',
        notes           TEXT          DEFAULT '',
        items           JSONB         NOT NULL DEFAULT '[]',
        status          VARCHAR(20)   NOT NULL DEFAULT 'submitted',
        created_at      TIMESTAMP     DEFAULT NOW(),
        updated_at      TIMESTAMP     DEFAULT NOW()
      );
      ALTER TABLE site_measurements
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'submitted';
        ALTER TABLE site_measurements
ADD COLUMN IF NOT EXISTS labour_report_id INTEGER;

ALTER TABLE site_measurements
ADD COLUMN IF NOT EXISTS daily_diary_id INTEGER;
      CREATE INDEX IF NOT EXISTS idx_site_measurements_boq_id
        ON site_measurements (boq_id);
      CREATE INDEX IF NOT EXISTS idx_site_measurements_project_id
        ON site_measurements (project_id);
      CREATE INDEX IF NOT EXISTS idx_site_measurements_status
        ON site_measurements (status);
    `);
    console.log("✅ site_measurements table ready");
  } catch (err) {
    console.error("❌ site_measurements table setup failed:", err.message);
  }
})();

// ── Helpers ──
function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  if (typeof v === "object") return Array.isArray(v) ? v : [];
  return [];
}

function fmtDate(v) {
  if (!v) return null;
  return new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Status display metadata for frontend badges
const STATUS_META = {
  submitted:    { label: "Submitted",    color: "blue"   },
  under_review: { label: "Under Review", color: "amber"  },
  approved:     { label: "Approved",     color: "green"  },
  rejected:     { label: "Rejected",     color: "red"    },
};

// ── Format response ──
// CHANGED: adds status, statusLabel, statusColor, canEdit
// canEdit = false ONLY for approved. All other statuses remain editable.
function formatMeasurement(r) {
  const status = r.status || "submitted";
  return {
    id:            r.id,
    boqId:         r.boq_id,
    projectId:     r.project_id,
    labourReportId: r.labour_report_id,
dailyDiaryId: r.daily_diary_id,
    projectName:   r.project_name    || "",
    milestoneId:   r.milestone_id,
    milestoneName: r.milestone_name  || "",
    submittedBy:   r.submitted_by    || "Site Engineer",
    submittedAt:   fmtDate(r.submitted_at),
    date:          r.date ? new Date(r.date).toISOString().split("T")[0] : null,
    zone:          r.zone     || "",
    activity:      r.activity || "",
    notes:         r.notes    || "",
    items:         safeArr(r.items),
    // Measurement lifecycle fields
    status,
    statusLabel:   STATUS_META[status]?.label || status,
    statusColor:   STATUS_META[status]?.color || "gray",
    canEdit:       status !== "approved", // only approved is locked
    createdDate:   fmtDate(r.created_at),
    updatedDate:   fmtDate(r.updated_at),
  };
}

/* ═══════════════════════════════════════════════════════════
   INTERNAL HELPER — updateMeasurementStatus
   Called by quantityReportController. Not exposed as a route.
   WHY: single place for measurement status SQL — no duplication.
═══════════════════════════════════════════════════════════ */
exports.updateMeasurementStatus = async (client, measurementId, newStatus) => {
  if (!measurementId) return;
  const allowed = ["submitted", "under_review", "approved", "rejected"];
  if (!allowed.includes(newStatus)) return;
  await client.query(
    `UPDATE site_measurements SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, parseInt(measurementId)]
  );
  console.log(`✅ Measurement #${measurementId} → ${newStatus}`);
};

/* ═══════════════════════════════════════════════════════════
   GET ALL  —  GET /api/site-measurements
   UNCHANGED — no data modification on GET
═══════════════════════════════════════════════════════════ */
exports.getAll = async (req, res) => {
  try {
    const { boqId, projectId } = req.query;
    const conds = [], params = [];

    if (boqId) {
      params.push(parseInt(boqId));
      conds.push(`boq_id = $${params.length}`);
    }
    if (projectId) {
      params.push(parseInt(projectId));
      conds.push(`project_id = $${params.length}`);
    }

    const where  = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM site_measurements ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows.map(formatMeasurement));
  } catch (err) {
    console.error("sm.getAll:", err.message);
    res.status(500).json({ error: "Failed to fetch measurements: " + err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET ONE  —  GET /api/site-measurements/:id
   UNCHANGED — GET requests never modify data
   WHY: opening or refreshing a page must never change
        business state. Only business actions change status.
═══════════════════════════════════════════════════════════ */
exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM site_measurements WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    res.json(formatMeasurement(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch measurement: " + err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   CREATE  —  POST /api/site-measurements
   CHANGED: inserts with status = 'submitted'
   WHY: every new measurement starts as submitted so QS
        can track it is ready for review.
   UNCHANGED: all existing fields, BOQ status update
═══════════════════════════════════════════════════════════ */
exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
  boqId,
  projectId,
  milestoneId,

  labourReportId,
  dailyDiaryId,

  submittedBy,
  date,
  zone,
  activity,
  notes,
  items = [],
} = req.body;

    if (!boqId || !projectId || !milestoneId || !labourReportId || !dailyDiaryId) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    error:
      "BOQ, project, milestone, labour report and daily diary are required",
  });
}
    if (!Array.isArray(items) || items.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    const boqRes = await client.query(
      `SELECT id, project_id, project_name, milestone_id, milestone_name, status
       FROM boqs WHERE id = $1`,
      [parseInt(boqId)]
    );
    if (!boqRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "BOQ not found" });
    }
    const boq = boqRes.rows[0];
    // Verify the submitted project and milestone belong to the selected BOQ
if (
  parseInt(projectId) !== parseInt(boq.project_id) ||
  parseInt(milestoneId) !== parseInt(boq.milestone_id)
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    error: "Project or milestone does not match the selected BOQ",
  });
}

// Verify Labour Report belongs to the same project/milestone
if (labourReportId) {
  const labourRes = await client.query(
    `SELECT id, project_id, milestone_id, daily_diary_id
     FROM labour_report
     WHERE id = $1`,
    [parseInt(labourReportId)]
  );

  if (!labourRes.rows.length) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      error: "Linked Labour Report not found",
    });
  }

  const labour = labourRes.rows[0];

  if (
    parseInt(labour.project_id) !== parseInt(boq.project_id) ||
    parseInt(labour.milestone_id || 0) !== parseInt(boq.milestone_id)
  ) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      error: "Linked Labour Report does not match the selected BOQ",
    });
  }

  // If both are supplied, they must point to the same Daily Diary
  if (
    dailyDiaryId &&
    labour.daily_diary_id &&
    parseInt(labour.daily_diary_id) !== parseInt(dailyDiaryId)
  ) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      error: "Labour Report and Daily Diary do not match",
    });
  }
}

// Verify Daily Diary belongs to the same project/milestone
if (dailyDiaryId) {
  const diaryRes = await client.query(
    `SELECT id, project_id, milestone_id
     FROM site_engineer_daily_updates
     WHERE id = $1`,
    [parseInt(dailyDiaryId)]
  );

  if (!diaryRes.rows.length) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      error: "Linked Daily Diary not found",
    });
  }

  const diary = diaryRes.rows[0];

  if (
    parseInt(diary.project_id) !== parseInt(boq.project_id) ||
    parseInt(diary.milestone_id || 0) !== parseInt(boq.milestone_id)
  ) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      error: "Linked Daily Diary does not match the selected BOQ",
    });
  }
}

    const allowedBoqStatuses = [
      "measurement_pending",
      "measurement_received",
      "rejected_by_se",
    ];
    
    if (!allowedBoqStatuses.includes(boq.status)) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: `Cannot submit measurements for a BOQ with status: ${boq.status}`,
      });
    }

    const cleanItems = safeArr(items)
      .filter(it => it.description && String(it.description).trim())
      .map(({ description, unit, qty_actual }) => ({
        description: String(description).trim(),
        unit:        unit || "m²",
        qty_actual:  parseFloat(qty_actual) || 0,
      }));

    if (!cleanItems.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "At least one item with a description is required",
      });
    }

    // CHANGED: status = 'submitted' explicitly set
    const result = await client.query(
      `INSERT INTO site_measurements
         (
boq_id,
project_id,
project_name,
milestone_id,
milestone_name,

labour_report_id,
daily_diary_id,

submitted_by,
date,
zone,
activity,
notes,
items,
status,
submitted_at,
created_at,
updated_at
)
      VALUES (
$1,$2,$3,$4,$5,
$6,$7,
$8,$9,$10,$11,$12,$13,
'submitted',
NOW(),
NOW(),
NOW()
)
       RETURNING id`,
      [
  parseInt(boqId),
  parseInt(projectId),
  boq.project_name || "",
  parseInt(milestoneId),
  boq.milestone_name || "",

  labourReportId ? parseInt(labourReportId) : null,
  dailyDiaryId ? parseInt(dailyDiaryId) : null,

  submittedBy || "Site Engineer",
  date || new Date().toISOString().split("T")[0],
  zone || "",
  activity || "",
  notes || "",
  JSON.stringify(cleanItems),
]
    );

    // Advance BOQ status (unchanged logic)
    await client.query(
      `UPDATE boqs
       SET status = 'measurement_received', updated_at = NOW()
       WHERE id = $1 AND status IN ('measurement_pending', 'rejected_by_se')`,
      [parseInt(boqId)]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message:           "Measurements submitted successfully. QS can now generate the Quantity Report.",
      id:                result.rows[0].id,
      boqId:             parseInt(boqId),
      boqStatus:         "measurement_received",
      measurementStatus: "submitted",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("sm.create ERROR:", err.message);
    res.status(500).json({ error: "Failed to submit measurements: " + err.message });
  } finally {
    client.release();
  }
};

/* ═══════════════════════════════════════════════════════════
   UPDATE  —  PUT /api/site-measurements/:id
   CHANGED: blocked ONLY when status = 'approved'
   WHY: approved measurements are finalised and locked.
        rejected, under_review, submitted stay editable.
   UNCHANGED: all field update logic
═══════════════════════════════════════════════════════════ */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, zone, activity, notes, items } = req.body;

    const check = await pool.query(
      "SELECT id, status FROM site_measurements WHERE id = $1", [id]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: "Measurement not found" });
    }

    // CHANGED: only approved is blocked
    if (check.rows[0].status === "approved") {
      return res.status(403).json({
        error: "This measurement has been approved and cannot be edited.",
      });
    }

    const cleanItems = items
      ? safeArr(items)
          .filter(it => it.description && String(it.description).trim())
          .map(({ description, unit, qty_actual }) => ({
            description: String(description).trim(),
            unit:        unit || "m²",
            qty_actual:  parseFloat(qty_actual) || 0,
          }))
      : null;

    await pool.query(
      `UPDATE site_measurements
       SET date       = COALESCE($1, date),
           zone       = COALESCE($2, zone),
           activity   = COALESCE($3, activity),
           notes      = COALESCE($4, notes),
           items      = COALESCE($5, items),
           updated_at = NOW()
       WHERE id = $6`,
      [
        date       || null,
        zone       || null,
        activity   || null,
        notes      || null,
        cleanItems ? JSON.stringify(cleanItems) : null,
        id,
      ]
    );

    res.json({ message: "Measurement updated", id: parseInt(id) });
  } catch (err) {
    console.error("sm.update:", err.message);
    res.status(500).json({ error: "Failed to update measurement: " + err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   DELETE  —  DELETE /api/site-measurements/:id
   CHANGED: blocked ONLY when status = 'approved'
   WHY: same as update — approved is locked, others are not.
   UNCHANGED: BOQ revert logic
═══════════════════════════════════════════════════════════ */
exports.remove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      "SELECT id, boq_id, status FROM site_measurements WHERE id = $1",
      [req.params.id]
    );
    if (!check.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Measurement not found" });
    }

    // CHANGED: only approved is blocked
    if (check.rows[0].status === "approved") {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "This measurement has been approved and cannot be deleted.",
      });
    }

    const { boq_id } = check.rows[0];

    await client.query(
      "DELETE FROM site_measurements WHERE id = $1", [req.params.id]
    );

    // If no measurements remain, revert BOQ status (unchanged logic)
    const remaining = await client.query(
      "SELECT id FROM site_measurements WHERE boq_id = $1 LIMIT 1", [boq_id]
    );
    if (!remaining.rows.length) {
      await client.query(
        `UPDATE boqs SET status = 'measurement_pending', updated_at = NOW()
         WHERE id = $1 AND status = 'measurement_received'`,
        [boq_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Measurement deleted", id: parseInt(req.params.id) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("sm.remove:", err.message);
    res.status(500).json({ error: "Failed to delete measurement: " + err.message });
  } finally {
    client.release();
  }
};
// GET /api/site-measurements/:id/items
exports.getMeasurementItems = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, items
       FROM site_measurements
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Measurement not found"
      });
    }

    const measurement = result.rows[0];

    const items = safeArr(measurement.items).map((item, index) => ({
      measurementId: measurement.id,
      boqItemId: index + 1,
      description: item.description,
      unit: item.unit,
      quantity: item.qty_actual
    }));

    res.json(items);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch measurement items"
    });
  }
};