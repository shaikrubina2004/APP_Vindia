// controllers/quantityReportController.js
//
// CHANGES (measurement lifecycle only — nothing else touched):
//
// 1. createReport()  → measurement status: submitted → under_review
//    WHY: QS has generated a QR from this measurement.
//         It is now under active SE review.
//
// 2. approveReport() → measurement status: → approved
//    WHY: SE approved the QR built from this measurement.
//         The measurement lifecycle is now complete.
//
// 3. rejectReport()  → measurement status: → rejected
//    WHY: SE rejected the QR. The measurement is flagged
//         so QS knows it needs revision. Still editable.
//
// 4. deleteReport()  → measurement status: → submitted
//    WHY: QR was deleted. Measurement reverts so QS can
//         regenerate a QR from it.
//
// NOT changed:
// - All existing QR logic
// - BOQ status transitions
// - All routes and endpoint URLs
// - getAllReports, getReportById, updateReport

const pool = require("../config/db");

// Reuse the helper from siteMeasurementController — no SQL duplication
const { updateMeasurementStatus } = require("./siteMeasurementController");

const toInt = v => { const n = parseInt(v); return isNaN(n) ? null : n; };

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  if (typeof v === "string") {
    if (v.trim() === "" || v.trim() === "null") return [];
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; }
    catch { return []; }
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

function formatQr(r) {
  return {
    id:              r.id,
    boqId:           r.boq_id,
    projectId:       r.project_id,
    projectName:     r.project_name    || "",
    milestoneId:     r.milestone_id,
    milestoneName:   r.milestone_name  || "",
    status:          r.status,
    seComment:       r.se_comment      || "",
    totalItems:      r.total_items     || 0,
    items:           safeArr(r.items),
    measurementId:   r.measurement_id  || null,
    generatedFrom:   r.generated_from  || "measurement",
    submittedBy:     r.submitted_by    || "",
    zone:            r.zone            || "",
    activity:        r.activity        || "",
    measurementDate: r.measurement_date
      ? new Date(r.measurement_date).toISOString().split("T")[0]
      : null,
    createdDate:     fmtDate(r.created_at),
    updatedDate:     fmtDate(r.updated_at),
  };
}

/* ═══════════════════════════════════════════════════════════
   GET ALL  —  unchanged
═══════════════════════════════════════════════════════════ */
exports.getAllReports = async (req, res) => {
  try {
    const { projectId, boqId, status } = req.query;
    const conds = [], params = [];
    if (boqId)     { params.push(toInt(boqId));     conds.push(`boq_id = $${params.length}`); }
    if (projectId) { params.push(toInt(projectId)); conds.push(`project_id = $${params.length}`); }
    if (status)    { params.push(status);            conds.push(`status = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM quantity_reports ${where} ORDER BY created_at DESC`, params
    );
    return res.json(result.rows.map(formatQr));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET ONE  —  unchanged
═══════════════════════════════════════════════════════════ */
exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM quantity_reports WHERE id = $1", [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(formatQr(result.rows[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   CREATE   POST /api/quantity-report
   CHANGED: measurement status → under_review after QR created
   WHY: QS acted on the measurement by building a QR from it.
        SE is now reviewing it. Status reflects this.
   UNCHANGED: all QR creation logic and BOQ logic
═══════════════════════════════════════════════════════════ */
exports.createReport = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { projectId, milestoneId, boqId } = req.body;

    if (!projectId || !milestoneId || !boqId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "projectId, milestoneId and boqId are required" });
    }

    const boqRes = await client.query("SELECT * FROM boqs WHERE id = $1", [toInt(boqId)]);
    if (!boqRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "BOQ not found" });
    }
    const boq = boqRes.rows[0];

    const allowedStatuses = ["measurement_received", "rejected_by_se"];
    if (!allowedStatuses.includes(boq.status)) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: `Cannot create QR for BOQ with status: ${boq.status}. Measurements must be received first.`,
      });
    }

    const measurementRes = await client.query(
      `SELECT * FROM site_measurements WHERE boq_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [toInt(boqId)]
    );
    if (!measurementRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(422).json({
        error: "Site Engineer measurements must be submitted before creating a Quantity Report.",
      });
    }
    const measurement = measurementRes.rows[0];

    const existing = await client.query(
      `SELECT id FROM quantity_reports WHERE boq_id = $1 AND status = 'pending_se'`,
      [toInt(boqId)]
    );
    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "A quantity report is already pending SE approval for this BOQ.",
      });
    }

    const measurementItems = safeArr(measurement.items);
    const boqRows          = safeArr(boq.rows);

    const cleanItems = measurementItems.map(({ description, unit, qty_actual }) => {
      const boqRow = boqRows.find(r =>
        (r.material || "").toLowerCase().trim() === (description || "").toLowerCase().trim()
      );
      return {
        material:    description || "",
        unit:        unit        || "",
        quantity:    parseFloat(qty_actual) || 0,
        boqQuantity: boqRow ? (parseFloat(boqRow.quantity) || 0) : null,
      };
    });

    const result = await client.query(
      `INSERT INTO quantity_reports
         (project_id, project_name, milestone_id, milestone_name,
          boq_id, measurement_id, items, labour_items,
          total_items, status, generated_from,
          submitted_by, zone, activity, measurement_date,
          created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_se','measurement',
               $10,$11,$12,$13,NOW(),NOW())
       RETURNING id`,
      [
        toInt(projectId),
        boq.project_name   || "",
        toInt(milestoneId),
        boq.milestone_name || "",
        toInt(boqId),
        toInt(measurement.id),
        JSON.stringify(cleanItems),
        JSON.stringify([]),
        cleanItems.length,
        measurement.submitted_by || "Site Engineer",
        measurement.zone         || "",
        measurement.activity     || "",
        measurement.date         || null,
      ]
    );

    // BOQ stays measurement_received — no BOQ status change here

    // CHANGED: measurement status → under_review
    await updateMeasurementStatus(client, measurement.id, "under_review");

    await client.query("COMMIT");

    return res.status(201).json({
      message:           "Quantity Report generated from SE measurements and sent for SE approval.",
      id:                result.rows[0].id,
      status:            "pending_se",
      measurementStatus: "under_review",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("qr.create ERROR:", err.message);
    return res.status(500).json({ error: "Failed to create quantity report: " + err.message });
  } finally {
    client.release();
  }
};

/* ═══════════════════════════════════════════════════════════
   UPDATE   PUT /api/quantity-report/:id
   UNCHANGED — QS revises rejected QR and resubmits
   Measurement status not changed during QS revision.
═══════════════════════════════════════════════════════════ */
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalItems } = req.body;

    const check = await pool.query(
      "SELECT status, boq_id FROM quantity_reports WHERE id = $1", [id]
    );
    if (!check.rows.length) return res.status(404).json({ error: "Quantity report not found" });
    if (check.rows[0].status === "approved") {
      return res.status(403).json({ error: "Cannot edit an approved quantity report" });
    }

    const cleanItems = items
      ? safeArr(items).map(({ material, unit, quantity, boqQuantity }) => ({
          material,
          unit,
          quantity:    parseFloat(quantity)    || 0,
          boqQuantity: boqQuantity !== undefined ? (parseFloat(boqQuantity) || null) : null,
        }))
      : null;

    const result = await pool.query(
      `UPDATE quantity_reports
       SET items       = COALESCE($1, items),
           total_items = COALESCE($2, total_items),
           status      = 'pending_se',
           se_comment  = '',
           updated_at  = NOW()
       WHERE id = $3
       RETURNING id, status, boq_id`,
      [cleanItems ? JSON.stringify(cleanItems) : null, totalItems || null, id]
    );

    res.json({
      message: "Quantity Report resubmitted to Site Engineer.",
      id:      result.rows[0].id,
      status:  "pending_se",
    });
  } catch (err) {
    console.error("qr.update:", err.message);
    res.status(500).json({ error: "Failed to update quantity report: " + err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   SE APPROVE   PUT /api/quantity-report/approve/:id
   CHANGED: measurement status → approved
   WHY: SE approved the QR. The measurement lifecycle is complete.
   UNCHANGED: QR approval, BOQ finalisation
═══════════════════════════════════════════════════════════ */
exports.approveReport = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE quantity_reports
       SET status = 'approved', se_comment = '', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_se'
       RETURNING id, status, boq_id, measurement_id, project_name, milestone_name`,
      [req.params.id]
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Quantity report not found or not awaiting SE approval",
      });
    }

    const { boq_id, measurement_id, project_name, milestone_name } = result.rows[0];

    // Finalise BOQ (unchanged)
    await client.query(
      `UPDATE boqs
       SET status = 'finalised', finalised_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1`,
      [boq_id]
    );

    // CHANGED: measurement status → approved
    await updateMeasurementStatus(client, measurement_id, "approved");

    await client.query("COMMIT");

    try {
      const { createNotificationDirect } = require("./qsNotificationController");
      await createNotificationDirect({
        type:      "Quantity",
        project_name,
        milestone: milestone_name,
        title:     "Quantity Report Approved ✅",
        message:   "BOQ is now finalised!",
        status:    "approved",
      });
    } catch {}

    res.json({
      message:           "✅ QR Approved — BOQ FINALISED!",
      id:                result.rows[0].id,
      status:            "approved",
      boqId:             boq_id,
      finalised:         true,
      measurementStatus: "approved",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("qr.approve:", err.message);
    res.status(500).json({ error: "Failed to approve: " + err.message });
  } finally {
    client.release();
  }
};

/* ═══════════════════════════════════════════════════════════
   SE REJECT   PUT /api/quantity-report/reject/:id
   CHANGED: measurement status → rejected
   WHY: SE rejected the QR. Measurement is flagged for revision.
        Measurement remains editable (rejected is not locked).
   UNCHANGED: QR rejection, BOQ rejected_by_se
═══════════════════════════════════════════════════════════ */
exports.rejectReport = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const note = req.body.comment || "Please revise the quantities.";

    const result = await client.query(
      `UPDATE quantity_reports
       SET status = 'rejected', se_comment = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending_se'
       RETURNING id, status, boq_id, measurement_id, project_name, milestone_name`,
      [note, req.params.id]
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Quantity report not found or not awaiting SE approval",
      });
    }

    const { boq_id, measurement_id, project_name, milestone_name } = result.rows[0];

    await client.query(
      `UPDATE boqs SET status = 'rejected_by_se', se_note = $1, updated_at = NOW() WHERE id = $2`,
      [note, boq_id]
    );

    // CHANGED: measurement status → rejected
    await updateMeasurementStatus(client, measurement_id, "rejected");

    await client.query("COMMIT");

    try {
      const { createNotificationDirect } = require("./qsNotificationController");
      await createNotificationDirect({
        type:      "Quantity",
        project_name,
        milestone: milestone_name,
        title:     "Quantity Report Rejected ↩️",
        message:   note,
        status:    "rejected",
      });
    } catch {}

    res.json({
      message:           "Changes requested ↩️ — QS must revise and resubmit.",
      id:                result.rows[0].id,
      status:            "rejected",
      boqId:             boq_id,
      measurementStatus: "rejected",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("qr.reject:", err.message);
    res.status(500).json({ error: "Failed to reject: " + err.message });
  } finally {
    client.release();
  }
};

/* ═══════════════════════════════════════════════════════════
   DELETE   DELETE /api/quantity-report/:id
   CHANGED: measurement status → submitted on QR delete
   WHY: QR was deleted. Measurement goes back to submitted
        so QS can generate a new QR from it.
   UNCHANGED: BOQ revert logic
═══════════════════════════════════════════════════════════ */
exports.deleteReport = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await pool.query(
      "SELECT status, boq_id, measurement_id FROM quantity_reports WHERE id = $1",
      [req.params.id]
    );
    if (!check.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Quantity report not found" });
    }
    if (check.rows[0].status === "approved") {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Cannot delete an approved quantity report" });
    }

    const { boq_id, measurement_id } = check.rows[0];

    await client.query("DELETE FROM quantity_reports WHERE id = $1", [req.params.id]);

    await client.query(
      `UPDATE boqs SET status = 'measurement_received', updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('finalised')`,
      [boq_id]
    );

    // CHANGED: measurement status → submitted so QS can regenerate QR
    await updateMeasurementStatus(client, measurement_id, "submitted");

    await client.query("COMMIT");
    res.json({ message: "Quantity report deleted", id: parseInt(req.params.id) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("qr.delete:", err.message);
    res.status(500).json({ error: "Failed to delete: " + err.message });
  } finally {
    client.release();
  }
};