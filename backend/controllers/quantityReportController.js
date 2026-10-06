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
const { updateMeasurementStatus } = require("./siteMeasurementcontroller");

const toInt = v => { const n = parseInt(v); return isNaN(n) ? null : n; };

async function userCanAccessProject(req, projectId) {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "ceo" || role === "quantity_surveyor") return true;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return false;
  if (role === "site_engineer") {
    const r = await pool.query(`SELECT 1 FROM projects WHERE id = $1 AND site_engineer_id = $2 LIMIT 1`, [id, req.user.id]);
    return r.rows.length > 0;
  }
  if (role === "project_manager") {
    const e = await pool.query(`SELECT id FROM employees WHERE user_id = $1 LIMIT 1`, [req.user.id]);
    if (!e.rows.length) return false;
    const r = await pool.query(`SELECT 1 FROM projects WHERE id = $1 AND manager_id = $2 LIMIT 1`, [id, e.rows[0].id]);
    return r.rows.length > 0;
  }
  return false;
}

async function getAccessibleProjectIds(req) {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "ceo" || role === "quantity_surveyor") return null;
  if (role === "site_engineer") {
    const r = await pool.query(`SELECT id FROM projects WHERE site_engineer_id = $1`, [req.user.id]);
    return r.rows.map(x => Number(x.id));
  }
  if (role === "project_manager") {
    const e = await pool.query(`SELECT id FROM employees WHERE user_id = $1 LIMIT 1`, [req.user.id]);
    if (!e.rows.length) return [];
    const r = await pool.query(`SELECT id FROM projects WHERE manager_id = $1`, [e.rows[0].id]);
    return r.rows.map(x => Number(x.id));
  }
  return [];
}

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
    // New workflow stores the source in site_measurement_id.
    // Keep the legacy field as a read-only fallback for historical records.
    measurementId:   r.site_measurement_id || r.measurement_id || null,
    siteMeasurementId: r.site_measurement_id || null,
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
    const allowedIds = await getAccessibleProjectIds(req);
    if (allowedIds !== null) {
      if (!allowedIds.length) return res.json([]);
      params.push(allowedIds);
      conds.push(`project_id = ANY($${params.length}::int[])`);
    }
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
    if (!(await userCanAccessProject(req, result.rows[0].project_id))) {
      return res.status(403).json({ error: "You are not authorized to access this project's quantity report." });
    }
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

    let { projectId, milestoneId, boqId, measurementId } = req.body || {};

    // The QS Pending Measurements screen sends only measurementId.
    // Resolve the BOQ/project/milestone from that authoritative SE record.
    if (measurementId && (!projectId || !milestoneId || !boqId)) {
      const measurementLookup = await client.query(
        `SELECT id, boq_id, project_id, milestone_id
           FROM site_measurements
          WHERE id = $1`,
        [toInt(measurementId)]
      );
      if (!measurementLookup.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Site measurement not found" });
      }
      const m = measurementLookup.rows[0];
      measurementId = m.id;
      projectId = projectId || m.project_id;
      milestoneId = milestoneId || m.milestone_id;
      boqId = boqId || m.boq_id;
    }

    if (!projectId || !milestoneId || !boqId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "measurementId or projectId, milestoneId and boqId are required" });
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
      measurementId
        ? `SELECT * FROM site_measurements WHERE id = $1 AND boq_id = $2 LIMIT 1`
        : `SELECT * FROM site_measurements WHERE boq_id = $1 ORDER BY created_at DESC LIMIT 1`,
      measurementId ? [toInt(measurementId), toInt(boqId)] : [toInt(boqId)]
    );
    if (!measurementRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(422).json({
        error: "Site Engineer measurements must be submitted before creating a Quantity Report.",
      });
    }
    const measurement = measurementRes.rows[0];
    if (!(await userCanAccessProject(req, measurement.project_id))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not authorized to create a quantity report for this project." });
    }
    if (toInt(projectId) !== Number(measurement.project_id) || toInt(milestoneId) !== Number(measurement.milestone_id)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Measurement project or milestone does not match the requested quantity report." });
    }
    if (!["submitted", "rejected"].includes(measurement.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: `Measurement is not available for a new Quantity Report (status: ${measurement.status}).` });
    }

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
          boq_id, site_measurement_id, items, labour_items,
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
      "SELECT status, boq_id, project_id, site_measurement_id, measurement_id FROM quantity_reports WHERE id = $1", [id]
    );
    if (!check.rows.length) return res.status(404).json({ error: "Quantity report not found" });
    if (!(await userCanAccessProject(req, check.rows[0].project_id))) {
      return res.status(403).json({ error: "You are not authorized to update this project's quantity report." });
    }

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
       RETURNING id, status, boq_id, site_measurement_id, measurement_id, project_id, project_name, milestone_name`,
      [req.params.id]
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Quantity report not found or not awaiting SE approval",
      });
    }

    const { boq_id, site_measurement_id, measurement_id, project_id, project_name, milestone_name } = result.rows[0];
    if (!(await userCanAccessProject(req, project_id))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not authorized to approve this project's quantity report." });
    }
    const sourceMeasurementId = site_measurement_id || measurement_id;

    // Finalise BOQ (unchanged)
    await client.query(
      `UPDATE boqs
       SET status = 'finalised', finalised_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1`,
      [boq_id]
    );

    // CHANGED: measurement status → approved
    await updateMeasurementStatus(client, sourceMeasurementId, "approved");

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
       RETURNING id, status, boq_id, site_measurement_id, measurement_id, project_id, project_name, milestone_name`,
      [note, req.params.id]
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Quantity report not found or not awaiting SE approval",
      });
    }

    const { boq_id, site_measurement_id, measurement_id, project_id, project_name, milestone_name } = result.rows[0];
    if (!(await userCanAccessProject(req, project_id))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not authorized to reject this project's quantity report." });
    }
    const sourceMeasurementId = site_measurement_id || measurement_id;

    await client.query(
      `UPDATE boqs SET status = 'rejected_by_se', se_note = $1, updated_at = NOW() WHERE id = $2`,
      [note, boq_id]
    );

    // CHANGED: measurement status → rejected
    await updateMeasurementStatus(client, sourceMeasurementId, "rejected");

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
      "SELECT status, boq_id, project_id, site_measurement_id, measurement_id FROM quantity_reports WHERE id = $1",
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

    if (!(await userCanAccessProject(req, check.rows[0].project_id))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You are not authorized to delete this project's quantity report." });
    }

    const { boq_id, site_measurement_id, measurement_id } = check.rows[0];
    const sourceMeasurementId = site_measurement_id || measurement_id;

    await client.query("DELETE FROM quantity_reports WHERE id = $1", [req.params.id]);

    await client.query(
      `UPDATE boqs SET status = 'measurement_received', updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('finalised')`,
      [boq_id]
    );

    // CHANGED: measurement status → submitted so QS can regenerate QR
    await updateMeasurementStatus(client, sourceMeasurementId, "submitted");

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