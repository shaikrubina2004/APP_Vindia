const pool = require("../config/db");
const ops = require("../config/operations");
const { notifyRole } = require("./operationsNotificationsController");
const {
  insertNotification: notifySiteEngineer,
} = require("./siteEngineerNotificationsController");

const isPrivileged = (role) => ["operations_manager", "ceo"].includes(role);

/* ─────────────────────────────
   HELPER: Calculate total qty
───────────────────────────── */
const calcTotal = (items) => {
  return items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
};

/* Validate that the selected WBS belongs to the selected project.
   BUG FIXED: the arguments were passed as [projectId, wbsId] while the SQL reads
   "w.id = $1 AND w.project_id = $2", i.e. swapped — it looked for "WBS #<project>
   inside project #<wbs>", so every valid request was rejected with "WBS does not
   belong to the project" and no Site Engineer could create a material request. */
const validateWbsReference = async (projectId, wbsId) => {
  const result = await pool.query(
    `SELECT w.id, w.code, w.name, w.project_id, p.name AS project_name
     FROM wbs w
     JOIN projects p ON p.id = w.project_id
     WHERE w.id = $1 AND w.project_id = $2`,
    [wbsId, projectId]
  );
  return result.rows[0] || null;
};

/* ─────────────────────────────
   GET ALL REQUESTS
───────────────────────────── */
exports.getRequests = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    // Approvers / Operations staff see every request (optionally ?status=);
    // everybody else — e.g. a Site Engineer — sees only their own.
    // Previously EVERYONE got only their own rows, so approvers saw nothing.
    const seeAll = ops.MATERIAL_REQUEST_VIEW_ALL_ROLES.includes(req.user.role);
    const values = [];
    let where = "WHERE 1=1";

    if (!seeAll) {
      values.push(userId);
      where += ` AND mr.created_by = $${values.length}`;
    }
    if (req.query.status && req.query.status !== "all") {
      values.push(req.query.status);
      where += ` AND mr.status = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
         mr.*,
         u.name AS requested_by_name,
         w.code AS wbs_code,
         w.name AS wbs_name,
         p.name AS project_name
       FROM material_requests mr
       LEFT JOIN users u ON u.id = mr.created_by
       LEFT JOIN wbs w ON w.id = mr.wbs_id
       LEFT JOIN projects p ON p.id = mr.project_id
       ${where}
       ORDER BY mr.created_at DESC`,
      values
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET ERROR:", err.message);
    res.status(500).json({
      error: "Failed to fetch requests",
    });
  }
};

/* ─────────────────────────────
   CREATE REQUEST
───────────────────────────── */
exports.createRequest = async (req, res) => {
  try {
    const {
      project,
      project_id,
      wbs_id,
      zone,
      purpose,
      items,
      required_by,
      linked_activity,
      notes,
    } = req.body;

    if (!purpose || !items) {
      return res.status(400).json({
        error: "Purpose and items are required",
      });
    }

    const projectId = Number(project_id);
    const wbsId = Number(wbs_id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "A valid project_id is required" });
    }

    if (!Number.isInteger(wbsId) || wbsId <= 0) {
      return res.status(400).json({ error: "A valid wbs_id is required" });
    }

    const wbs = await validateWbsReference(projectId, wbsId);
    if (!wbs) {
      return res.status(400).json({
        error: "Selected WBS activity does not belong to the selected project",
      });
    }
    const userId = req.user?.id;

if (!userId) {
  return res.status(401).json({
    error: "User not authenticated",
  });
}

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    const total_qty = calcTotal(parsedItems);

    const result = await pool.query(
      `INSERT INTO material_requests
      (
        project,
        project_id,
        wbs_id,
        zone,
        purpose,
        items,
        status,
        required_by,
        linked_activity,
        notes,
        total_qty,
        delivered_qty,
        received_qty,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,'requested',$7,$8,$9,$10,0,0,$11)
      RETURNING *`,
      [
        wbs.project_name,
        projectId,
        wbsId,
        zone,
        purpose,
        JSON.stringify(parsedItems),
        required_by || null,
        linked_activity || null,
        notes || null,
        total_qty,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("POST ERROR:", err.message);
    res.status(500).json({ error: "Failed to create request" });
  }
};

/* ─────────────────────────────
   UPDATE STATUS
───────────────────────────── */
/* ─────────────────────────────
   UPDATE STATUS
───────────────────────────── */
exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const reason = String(req.body.reason || "").trim() || null;
    const { id } = req.params;

    // Only Procurement / PM workflow statuses belong here.
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Use approved or rejected.",
      });
    }

    const check = await pool.query(
      `SELECT id, status, created_by, project, purpose
       FROM material_requests
       WHERE id = $1`,
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Request not found",
      });
    }

    const currentStatus = check.rows[0].status;

    // Approval/rejection is allowed only while request is pending.
    if (currentStatus !== "requested") {
      return res.status(400).json({
        error: `Cannot change status from "${currentStatus}" to "${status}"`,
      });
    }

    // Audit trail: who decided, when, and (for a rejection) why.
    // If the audit columns have not been migrated yet (Postgres 42703 =
    // undefined_column) fall back to a plain status update so approvals are
    // never blocked by a pending migration (run `npm run migrate:ops-compat`).
    let result;
    try {
      result = await pool.query(
        `UPDATE material_requests
         SET status = $1,
             approved_by = $2,
             approved_at = NOW(),
             rejection_reason = $3
         WHERE id = $4 AND status = 'requested'
         RETURNING *`,
        [status, req.user.id, status === "rejected" ? reason : null, id]
      );
    } catch (auditErr) {
      if (auditErr.code !== "42703") throw auditErr;
      console.warn("material_requests audit columns missing — run `npm run migrate:ops-compat`. Using status-only update.");
      result = await pool.query(
        `UPDATE material_requests SET status = $1
         WHERE id = $2 AND status = 'requested'
         RETURNING *`,
        [status, id]
      );
    }

    if (!result.rows.length) {
      return res.status(409).json({
        error: "This request was already decided by someone else",
      });
    }

    const mr = check.rows[0];
    const label = `${mr.project || "Project"} — ${mr.purpose || "material request"}`;

    // Approved -> Procurement has a new job. Notification failures never
    // fail the approval itself.
    try {
      if (status === "approved") {
        await notifyRole(
          "procurement_officer",
          "request",
          "Approved request awaiting a PO",
          label,
          "/operations/procurement/purchase-requests",
          "info",
          null,
          Number(id)
        );
        // Operations takes over: Inventory checks whether stock already covers it.
        await notifyRole(
          "inventory_controller",
          "request",
          "Approved request — check stock first",
          label,
          "/operations/inventory/stock-out",
          "info",
          null,
          Number(id)
        );
      }
      if (mr.created_by) {
        await notifySiteEngineer(
          mr.created_by,
          "material",
          status === "approved" ? "Material request approved" : "Material request rejected",
          status === "approved" ? label : `${label}${reason ? ` — ${reason}` : ""}`,
          "/site-engineer/materials",
          status === "approved" ? "ok" : "warn",
          null
        );
      }
    } catch (notifyErr) {
      console.error("Material request notification failed:", notifyErr.message);
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update status",
    });
  }
};

/* ─────────────────────────────
   UPDATE FULL REQUEST (EDIT)
───────────────────────────── */
exports.updateFullRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      project,
      project_id,
      wbs_id,
      zone,
      purpose,
      items,
      required_by,
      linked_activity,
      notes,
    } = req.body;

    // Guard: this is the full-edit route. A body without purpose/items (e.g. a
    // { status } payload sent by mistake) must never blank out the request.
    if (!purpose || !items) {
      return res.status(400).json({
        error:
          "Purpose and items are required. To approve or reject use PUT /material-request/status/:id",
      });
    }

    const projectId = Number(project_id);
    const wbsId = Number(wbs_id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "A valid project_id is required" });
    }

    if (!Number.isInteger(wbsId) || wbsId <= 0) {
      return res.status(400).json({ error: "A valid wbs_id is required" });
    }

    const wbs = await validateWbsReference(projectId, wbsId);
    if (!wbs) {
      return res.status(400).json({
        error: "Selected WBS activity does not belong to the selected project",
      });
    }

    const check = await pool.query(
      "SELECT status, created_by FROM material_requests WHERE id=$1",
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (
      Number(check.rows[0].created_by) !== Number(req.user.id) &&
      !isPrivileged(req.user.role)
    ) {
      return res.status(403).json({ error: "You can only edit your own requests" });
    }

    if (check.rows[0].status !== "requested") {
  return res.status(400).json({
    error: "Only requested material requests can be edited",
  });
}

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    const total_qty = calcTotal(parsedItems);

    const result = await pool.query(
      `UPDATE material_requests
       SET project=$1,
           project_id=$2,
           wbs_id=$3,
           zone=$4,
           purpose=$5,
           items=$6,
           total_qty=$7,
           required_by=$8,
           linked_activity=$9,
           notes=$10
       WHERE id=$11
       RETURNING *`,
      [
        wbs.project_name,
        projectId,
        wbsId,
        zone,
        purpose,
        JSON.stringify(parsedItems),
        total_qty,
        required_by,
        linked_activity,
        notes,
        id,
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};

/* ─────────────────────────────
   DELETE REQUEST
───────────────────────────── */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT status, created_by FROM material_requests WHERE id=$1",
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }

    if (
      Number(check.rows[0].created_by) !== Number(req.user.id) &&
      !isPrivileged(req.user.role)
    ) {
      return res.status(403).json({ error: "You can only delete your own requests" });
    }

    if (check.rows[0].status !== "requested") {
  return res.status(400).json({
    error: "Only requested material requests can be deleted",
  });
}

    await pool.query("DELETE FROM material_requests WHERE id=$1", [id]);

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
};

/* ─────────────────────────────
   ADD DELIVERY
───────────────────────────── */
exports.addDelivery = async (req, res) => {
  try {
    const { request_id, qty } = req.body;

    const deliveryQty = Number(qty);

    if (
      !request_id ||
      !Number.isFinite(deliveryQty) ||
      deliveryQty <= 0
    ) {
      return res.status(400).json({
        error: "Valid request_id and delivery quantity are required",
      });
    }

    const check = await pool.query(
      `SELECT
         id,
         status,
         total_qty,
         delivered_qty,
         received_qty
       FROM material_requests
       WHERE id = $1`,
      [request_id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Material request not found",
      });
    }

    const request = check.rows[0];

    // Delivery can happen only after approval.
    if (request.status !== "approved") {
      return res.status(400).json({
        error: "Material can be delivered only after the request is approved",
      });
    }

    const totalQty = Number(request.total_qty || 0);
    const deliveredQty = Number(request.delivered_qty || 0);

    const remainingToDeliver = Math.max(
      0,
      totalQty - deliveredQty
    );

    if (remainingToDeliver <= 0) {
      return res.status(400).json({
        error: "The full requested quantity has already been delivered",
      });
    }

    if (deliveryQty > remainingToDeliver) {
      return res.status(400).json({
        error: `Only ${remainingToDeliver} quantity remains to be delivered`,
      });
    }

    const newDeliveredQty = deliveredQty + deliveryQty;

    const result = await pool.query(
      `UPDATE material_requests
       SET delivered_qty = $1
       WHERE id = $2
       RETURNING *`,
      [newDeliveredQty, request_id]
    );

    return res.json({
      message: "Delivery updated",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("ADD DELIVERY ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update delivery",
    });
  }
};

/* ─────────────────────────────
   RECEIVE MATERIAL
───────────────────────────── */
exports.receiveMaterial = async (req, res) => {
  try {
    const { request_id, qty } = req.body;

    const receiveQty = Number(qty);

    if (!request_id || !Number.isFinite(receiveQty) || receiveQty <= 0) {
      return res.status(400).json({
        error: "Valid request_id and quantity are required",
      });
    }

    const check = await pool.query(
      `SELECT
         id,
         status,
         total_qty,
         delivered_qty,
         received_qty
       FROM material_requests
       WHERE id = $1`,
      [request_id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Material request not found",
      });
    }

    const request = check.rows[0];

    // Site Engineer can receive only after approval.
    if (request.status !== "approved") {
      return res.status(400).json({
        error: "Material can be received only after the request is approved",
      });
    }

    const totalQty = Number(request.total_qty || 0);
    const deliveredQty = Number(request.delivered_qty || 0);
    const receivedQty = Number(request.received_qty || 0);

    const remainingToReceive = Math.max(
      0,
      deliveredQty - receivedQty
    );

    if (remainingToReceive <= 0) {
      return res.status(400).json({
        error: "No delivered quantity is available to receive",
      });
    }

    if (receiveQty > remainingToReceive) {
      return res.status(400).json({
        error: `Only ${remainingToReceive} quantity is available to receive`,
      });
    }

    const newReceivedQty = receivedQty + receiveQty;

    const newStatus =
      newReceivedQty >= totalQty
        ? "delivered"
        : "approved";

    const result = await pool.query(
      `UPDATE material_requests
       SET received_qty = $1,
           status = $2
       WHERE id = $3
       RETURNING *`,
      [
        newReceivedQty,
        newStatus,
        request_id,
      ]
    );

    res.json({
      message: "Material received updated",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("RECEIVE MATERIAL ERROR:", err.message);

    res.status(500).json({
      error: "Failed to receive material",
    });
  }
};
/* ─────────────────────────────
   ASSIGN PROJECT / WBS TO A LEGACY REQUEST
   PUT /api/material-request/:id/wbs   Body: { project_id, wbs_id }
   The WBS migration intentionally does not backfill requests created before it,
   and a PO can only be raised from a request that carries project + WBS — so
   every older approved request was stuck. This lets the people who hold the
   project context (PC / Procurement / Ops Manager / CEO) assign it once.
   Only requests that are not yet delivered/rejected and have no live PO.
───────────────────────────── */
exports.assignWbs = async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = Number(req.body.project_id);
    const wbsId = Number(req.body.wbs_id);
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(wbsId) || wbsId <= 0) {
      return res.status(400).json({ error: "project_id and wbs_id are required" });
    }
    const wbs = await validateWbsReference(projectId, wbsId);
    if (!wbs) {
      return res.status(400).json({ error: "Selected WBS does not belong to the selected project" });
    }
    const cur = await pool.query("SELECT id, status FROM material_requests WHERE id = $1", [id]);
    if (!cur.rows.length) return res.status(404).json({ error: "Request not found" });
    if (["delivered", "rejected"].includes(cur.rows[0].status)) {
      return res.status(400).json({ error: `A ${cur.rows[0].status} request cannot be re-coded` });
    }
    const live = await pool.query(
      "SELECT po_code FROM purchase_orders WHERE material_request_id = $1 AND status NOT IN ('cancelled','rejected') LIMIT 1",
      [id]
    );
    if (live.rows.length) {
      return res.status(409).json({ error: `Purchase order ${live.rows[0].po_code} already exists \u2014 cancel it before changing the WBS` });
    }
    const result = await pool.query(
      "UPDATE material_requests SET project_id = $1, wbs_id = $2, project = COALESCE($3, project) WHERE id = $4 RETURNING *",
      [projectId, wbsId, wbs.project_name, id]
    );
    return res.json({ ...result.rows[0], wbs_code: wbs.code, wbs_name: wbs.name, project_name: wbs.project_name });
  } catch (err) {
    console.error("ASSIGN WBS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to assign WBS" });
  }
};
