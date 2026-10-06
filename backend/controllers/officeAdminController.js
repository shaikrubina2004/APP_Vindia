const OfficeAdmin = require("../models/officeAdminModel");

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
const fail = (res, err, fallback) => {
  console.error(fallback, err.message);
  return res
    .status(err.statusCode || 500)
    .json({ error: err.statusCode ? err.message : fallback });
};

const managerOrAdmin = (req, res, next) => next();

exports.dashboard = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.dashboard());
  } catch (e) {
    return fail(res, e, "Failed to load office administration dashboard");
  }
};

exports.listRequests = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.listRequests(req.query));
  } catch (e) {
    return fail(res, e, "Failed to load office requests");
  }
};
exports.createRequest = async (req, res) => {
  try {
    if (!req.body.request_type || !req.body.title)
      return res
        .status(400)
        .json({ error: "Request type and title are required" });
    return ok(res, await OfficeAdmin.createRequest(req.user.id, req.body), 201);
  } catch (e) {
    return fail(res, e, "Failed to create office request");
  }
};
exports.updateRequestStatus = async (req, res) => {
  try {
    const allowed = [
      "approved",
      "rejected",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!allowed.includes(req.body.status))
      return res.status(400).json({ error: "Invalid office request status" });
    const row = await OfficeAdmin.updateRequestStatus(
      req.params.id,
      req.user.id,
      req.body.status,
      req.body.note,
      req.body.assigned_to,
    );
    if (!row)
      return res.status(404).json({ error: "Office request not found" });
    return ok(res, row);
  } catch (e) {
    return fail(res, e, "Failed to update office request");
  }
};

exports.listFacilities = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.listFacilities());
  } catch (e) {
    return fail(res, e, "Failed to load facility requests");
  }
};
exports.createFacility = async (req, res) => {
  try {
    if (!req.body.location || !req.body.issue_type || !req.body.description)
      return res
        .status(400)
        .json({ error: "Location, issue type and description are required" });
    return ok(
      res,
      await OfficeAdmin.createFacility(req.user.id, req.body),
      201,
    );
  } catch (e) {
    return fail(res, e, "Failed to create facility request");
  }
};
exports.updateFacilityStatus = async (req, res) => {
  try {
    if (
      !["open", "assigned", "in_progress", "resolved", "cancelled"].includes(
        req.body.status,
      )
    )
      return res.status(400).json({ error: "Invalid facility status" });
    const row = await OfficeAdmin.updateFacilityStatus(req.params.id, req.body);
    if (!row)
      return res.status(404).json({ error: "Facility request not found" });
    return ok(res, row);
  } catch (e) {
    return fail(res, e, "Failed to update facility request");
  }
};

exports.listSupplies = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.listSupplies());
  } catch (e) {
    return fail(res, e, "Failed to load office supplies");
  }
};
exports.createSupply = async (req, res) => {
  try {
    if (!req.body.item_name)
      return res.status(400).json({ error: "Item name is required" });
    return ok(res, await OfficeAdmin.createSupply(req.body), 201);
  } catch (e) {
    return fail(res, e, "Failed to create office supply");
  }
};
exports.transactSupply = async (req, res) => {
  try {
    if (!["restock", "issue", "adjustment"].includes(req.body.transaction_type))
      return res.status(400).json({ error: "Invalid supply transaction type" });
    return ok(
      res,
      await OfficeAdmin.transactSupply(req.params.id, req.user.id, req.body),
    );
  } catch (e) {
    return fail(res, e, e.message || "Failed to update office supply");
  }
};

exports.listVisitors = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.listVisitors());
  } catch (e) {
    return fail(res, e, "Failed to load visitors");
  }
};
exports.createVisitor = async (req, res) => {
  try {
    if (!req.body.visitor_name)
      return res.status(400).json({ error: "Visitor name is required" });
    return ok(res, await OfficeAdmin.createVisitor(req.user.id, req.body), 201);
  } catch (e) {
    return fail(res, e, "Failed to create visitor");
  }
};
exports.updateVisitorStatus = async (req, res) => {
  try {
    if (
      !["expected", "checked_in", "checked_out", "cancelled"].includes(
        req.body.status,
      )
    )
      return res.status(400).json({ error: "Invalid visitor status" });
    const row = await OfficeAdmin.updateVisitorStatus(
      req.params.id,
      req.body.status,
    );
    if (!row) return res.status(404).json({ error: "Visitor not found" });
    return ok(res, row);
  } catch (e) {
    return fail(res, e, "Failed to update visitor");
  }
};

exports.listAssets = async (req, res) => {
  try {
    return ok(res, await OfficeAdmin.listAssets());
  } catch (e) {
    return fail(res, e, "Failed to load administrative assets");
  }
};
exports.createAsset = async (req, res) => {
  try {
    if (!req.body.asset_name)
      return res.status(400).json({ error: "Asset name is required" });
    return ok(res, await OfficeAdmin.createAsset(req.body), 201);
  } catch (e) {
    return fail(res, e, "Failed to create administrative asset");
  }
};
exports.updateAsset = async (req, res) => {
  try {
    const row = await OfficeAdmin.updateAsset(req.params.id, req.body);
    if (!row)
      return res.status(404).json({ error: "Administrative asset not found" });
    return ok(res, row);
  } catch (e) {
    return fail(res, e, "Failed to update administrative asset");
  }
};

// Kept as an explicit hook so future office-admin workflow extensions can add
// manager-level authorization without changing every route.
exports.managerOrAdmin = managerOrAdmin;

/* ========================================================================
   Operations control-tower compatibility API.
   These methods intentionally use the existing Office Administration tables
   (office_requests, office_visitors, administrative_assets). They do NOT
   introduce a second office_assets storage table.
   ======================================================================== */
const opsPool = require("../config/db");
const opsRules = require("../config/operations");
const {
  notifyRole: officeNotifyRole,
} = require("./operationsNotificationsController");

const cleanOps = (v) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : s;
};
const moneyOps = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const requestStatusOut = (s) =>
  ({
    pending: "awaiting_approval",
    approved: "open",
    completed: "resolved",
    cancelled: "closed",
  })[s] || s;

exports.getDashboard = async (req, res) => {
  try {
    const stats = (
      await opsPool.query(`
      SELECT
        (SELECT COUNT(*) FROM office_requests WHERE status IN ('pending','approved','in_progress','awaiting_approval','open'))::int AS open_requests,
        (SELECT COUNT(*) FROM office_requests WHERE status IN ('pending','awaiting_approval'))::int AS awaiting_approval,
        (SELECT COUNT(*) FROM office_requests WHERE priority='urgent' AND status IN ('pending','approved','in_progress','awaiting_approval','open'))::int AS urgent,
        (SELECT COUNT(*) FROM office_requests WHERE COALESCE(needed_by,due_date) < CURRENT_DATE AND status IN ('pending','approved','in_progress','awaiting_approval','open'))::int AS overdue,
        (SELECT COUNT(*) FROM office_requests WHERE status IN ('completed','resolved','closed') AND COALESCE(resolved_at,completed_at) >= date_trunc('month',CURRENT_DATE))::int AS resolved_this_month,
        (SELECT COUNT(*) FROM office_visitors WHERE status='checked_in')::int AS visitors_in,
        (SELECT COUNT(*) FROM office_visitors WHERE COALESCE(check_in,checked_in_at)::date=CURRENT_DATE)::int AS visitors_today,
        (SELECT COUNT(*) FROM administrative_assets WHERE status <> 'retired')::int AS assets_total,
        (SELECT COUNT(*) FROM administrative_assets WHERE status='assigned')::int AS assets_assigned,
        (SELECT COUNT(*) FROM administrative_assets WHERE status='maintenance')::int AS assets_maintenance
    `)
    ).rows[0];
    const byCategory = (
      await opsPool.query(
        `SELECT COALESCE(category,request_type,'other') AS category, COUNT(*)::int AS count FROM office_requests WHERE status IN ('pending','approved','in_progress','awaiting_approval','open') GROUP BY 1 ORDER BY count DESC`,
      )
    ).rows;
    const recent = (
      await opsPool.query(
        `SELECT r.id,r.request_code,COALESCE(r.category,r.request_type,'other') AS category,r.title,r.priority,COALESCE(r.status,'open') AS raw_status,COALESCE(r.needed_by,r.due_date) AS needed_by,r.created_at FROM office_requests r ORDER BY r.created_at DESC LIMIT 6`,
      )
    ).rows.map((r) => ({ ...r, status: requestStatusOut(r.raw_status) }));
    const visitorsNow = (
      await opsPool.query(
        `SELECT v.id,v.visitor_name,v.company,v.host_name,COALESCE(v.check_in,v.checked_in_at) AS check_in FROM office_visitors v WHERE v.status='checked_in' ORDER BY COALESCE(v.check_in,v.checked_in_at) DESC LIMIT 6`,
      )
    ).rows;
    res.json({
      stats,
      by_category: byCategory,
      recent_requests: recent,
      visitors_now: visitorsNow,
    });
  } catch (e) {
    console.error("OFFICE OPS DASHBOARD ERROR:", e.message);
    res.status(500).json({ error: "Failed to load office dashboard" });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { category, status, priority, search } = req.query;
    const vals = [];
    const where = ["1=1"];
    if (category && category !== "all") {
      vals.push(category);
      where.push(`COALESCE(r.category,r.request_type)=$${vals.length}`);
    }
    if (status && status !== "all") {
      if (status === "active")
        where.push(
          "r.status IN ('pending','approved','in_progress','awaiting_approval','open')",
        );
      else if (status === "awaiting_approval")
        where.push("r.status IN ('pending','awaiting_approval')");
      else {
        vals.push(status);
        where.push(`r.status=$${vals.length}`);
      }
    }
    if (priority && priority !== "all") {
      vals.push(priority);
      where.push(`r.priority=$${vals.length}`);
    }
    if (search) {
      vals.push(`%${search}%`);
      where.push(
        `(r.title ILIKE $${vals.length} OR r.request_code ILIKE $${vals.length})`,
      );
    }
    const rows = (
      await opsPool.query(
        `SELECT r.*, COALESCE(r.requested_by_name,u.name) AS requested_by_name, COALESCE(r.category,r.request_type,'other') AS category, COALESCE(r.needed_by,r.due_date) AS needed_by FROM office_requests r LEFT JOIN users u ON u.id=r.requested_by WHERE ${where.join(" AND ")} ORDER BY r.created_at DESC LIMIT 300`,
        vals,
      )
    ).rows;
    res.json(rows.map((r) => ({ ...r, status: requestStatusOut(r.status) })));
  } catch (e) {
    console.error("GET OFFICE OPS REQUESTS ERROR:", e.message);
    res.status(500).json({ error: "Failed to fetch office requests" });
  }
};

exports.createRequestV2 = async (req, res) => {
  const client = await opsPool.connect();
  try {
    const b = req.body || {};
    const title = cleanOps(b.title);
    if (!title) return res.status(400).json({ error: "A title is required" });
    const category = b.category || b.request_type || "other";
    const priority = b.priority || "normal";
    const cost = moneyOps(b.cost_estimate);
    if (!["low", "normal", "high", "urgent"].includes(priority))
      return res.status(400).json({ error: "Invalid priority" });
    if (Number.isNaN(cost))
      return res
        .status(400)
        .json({ error: "cost_estimate must be a number >= 0" });
    const needs =
      cost !== null && cost > opsRules.OFFICE_REQUEST_APPROVAL_THRESHOLD;
    await client.query("BEGIN");
    const code = `OR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const r = await client.query(
      `INSERT INTO office_requests (request_code,requested_by,request_type,title,description,priority,status,assigned_to,due_date,category,requested_by_name,department,location,needed_by,cost_estimate,approval_required,resolution_note,resolved_at,approved_by,approved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,$10,$11,$12,$13,$14,$15,NULL,NULL,NULL,NULL) RETURNING *`,
      [
        code,
        req.user.id,
        category,
        title,
        cleanOps(b.description),
        priority,
        needs ? "awaiting_approval" : "pending",
        cleanOps(b.needed_by || b.due_date),
        category,
        cleanOps(b.requested_by_name),
        cleanOps(b.department),
        cleanOps(b.location),
        cleanOps(b.needed_by || b.due_date),
        cost,
        needs,
      ],
    );
    await client.query("COMMIT");
    if (needs) {
      try {
        await officeNotifyRole(
          "operations_manager",
          "approval",
          `${code} needs approval`,
          `${title} — ₹${cost.toLocaleString("en-IN")} exceeds the office limit.`,
          `/operations/manager/approvals`,
          "warn",
          null,
          r.rows[0].id,
        );
      } catch (_) {}
    }
    res
      .status(201)
      .json({ ...r.rows[0], status: requestStatusOut(r.rows[0].status) });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("CREATE OFFICE OPS REQUEST ERROR:", e.message);
    res.status(500).json({ error: "Failed to create office request" });
  } finally {
    client.release();
  }
};

exports.updateRequestStatusV2 = async (req, res) => {
  try {
    const { status } = req.body || {};
    const note = cleanOps(req.body?.note);
    const id = req.params.id;
    const map = {
      open: "approved",
      awaiting_approval: "pending",
      in_progress: "in_progress",
      resolved: "completed",
      closed: "completed",
      rejected: "rejected",
      approved: "approved",
      completed: "completed",
      cancelled: "cancelled",
      pending: "pending",
    };
    if (!map[status])
      return res.status(400).json({ error: "Invalid office request status" });
    const cur = (
      await opsPool.query("SELECT * FROM office_requests WHERE id=$1", [id])
    ).rows[0];
    if (!cur) return res.status(404).json({ error: "Request not found" });
    const manager = ["operations_manager", "ceo"].includes(req.user.role);
    if (
      (cur.status === "pending" || cur.status === "awaiting_approval") &&
      [
        "open",
        "approved",
        "in_progress",
        "resolved",
        "closed",
        "rejected",
      ].includes(status) &&
      !manager
    )
      return res
        .status(403)
        .json({ error: "This request needs Operations Manager approval" });
    if (status === "rejected" && !note)
      return res
        .status(400)
        .json({ error: "A note is required to reject a request" });
    const decided =
      (cur.status === "pending" || cur.status === "awaiting_approval") &&
      ["open", "approved", "rejected"].includes(status);
    const r = await opsPool.query(
      `UPDATE office_requests SET status=$1, completed_at=CASE WHEN $1 IN ('completed','cancelled') THEN NOW() ELSE completed_at END, resolution_note=COALESCE($2,resolution_note), approved_by=CASE WHEN $4 THEN $3 ELSE approved_by END, approved_at=CASE WHEN $4 THEN NOW() ELSE approved_at END, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [map[status], note, req.user.id, decided, id],
    );
    if (decided) {
      try {
        await officeNotifyRole(
          "office_administrator",
          "request",
          `${cur.request_code} ${status}`,
          note || cur.title,
          "/operations/administrator/requests",
          status === "rejected" ? "warn" : "ok",
          null,
          cur.id,
        );
      } catch (_) {}
    }
    res.json({ ...r.rows[0], status: requestStatusOut(r.rows[0].status) });
  } catch (e) {
    console.error("UPDATE OFFICE OPS REQUEST ERROR:", e.message);
    res.status(500).json({ error: "Failed to update office request" });
  }
};

exports.getVisitorsV2 = async (req, res) => {
  try {
    const { status } = req.query;
    const vals = [];
    let w = "1=1";
    if (status && status !== "all") {
      vals.push(status);
      w += ` AND v.status=$${vals.length}`;
    }
    const rows = (
      await opsPool.query(
        `SELECT v.*, v.contact AS phone, COALESCE(v.host_name,u.name) AS host_name, v.checked_in_at AS check_in, v.checked_out_at AS check_out FROM office_visitors v LEFT JOIN users u ON u.id=v.host_user_id WHERE ${w} ORDER BY COALESCE(v.checked_in_at,v.expected_at,v.created_at) DESC LIMIT 200`,
        vals,
      )
    ).rows;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
};
exports.createVisitorV2 = async (req, res) => {
  try {
    const b = req.body || {};
    if (!cleanOps(b.visitor_name))
      return res.status(400).json({ error: "visitor_name is required" });
    const expected = !!cleanOps(b.expected_at);
    const r = await opsPool.query(
      `INSERT INTO office_visitors(visitor_name,company,contact,purpose,host_user_id,expected_at,checked_in_at,checked_out_at,status,notes,created_by,phone,host_name,badge_no,check_in,check_out) VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,$10,$3,$11,$12,$7,NULL) RETURNING *`,
      [
        b.visitor_name,
        cleanOps(b.company),
        cleanOps(b.phone || b.contact),
        cleanOps(b.purpose),
        b.host_user_id || null,
        b.expected_at || null,
        expected ? null : new Date(),
        expected ? "expected" : "checked_in",
        cleanOps(b.notes),
        req.user.id,
        cleanOps(b.host_name),
        cleanOps(b.badge_no),
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("CREATE OFFICE VISITOR ERROR:", e.message);
    res.status(500).json({ error: "Failed to register visitor" });
  }
};
exports.checkInVisitor = async (req, res) => {
  try {
    const r = await opsPool.query(
      `UPDATE office_visitors SET status='checked_in',checked_in_at=NOW(),check_in=NOW() WHERE id=$1 AND status='expected' RETURNING *`,
      [req.params.id],
    );
    if (!r.rows.length)
      return res.status(409).json({ error: "Visitor is not expected" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to check in visitor" });
  }
};
exports.checkOutVisitor = async (req, res) => {
  try {
    const r = await opsPool.query(
      `UPDATE office_visitors SET status='checked_out',checked_out_at=NOW(),check_out=NOW() WHERE id=$1 AND status='checked_in' RETURNING *`,
      [req.params.id],
    );
    if (!r.rows.length)
      return res.status(409).json({ error: "Visitor is not checked in" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to check out visitor" });
  }
};

exports.getAssetsV2 = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const vals = [];
    const w = ["1=1"];
    if (category && category !== "all") {
      vals.push(category);
      w.push(`a.category=$${vals.length}`);
    }
    if (status && status !== "all") {
      vals.push(status);
      w.push(`a.status=$${vals.length}`);
    }
    if (search) {
      vals.push(`%${search}%`);
      w.push(
        `(a.asset_name ILIKE $${vals.length} OR a.asset_code ILIKE $${vals.length} OR a.serial_number ILIKE $${vals.length} OR COALESCE(a.assigned_to_name,u.name) ILIKE $${vals.length})`,
      );
    }
    const rows = (
      await opsPool.query(
        `SELECT a.*,a.asset_name AS name,a.serial_number AS serial_no,COALESCE(a.assigned_to_name,u.name) AS assigned_to_name,a.purchase_cost,a.assigned_at FROM administrative_assets a LEFT JOIN users u ON u.id=a.assigned_to WHERE ${w.join(" AND ")} ORDER BY a.created_at DESC LIMIT 500`,
        vals,
      )
    ).rows;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
};
exports.createAssetV2 = async (req, res) => {
  try {
    const b = req.body || {};
    if (!cleanOps(b.name || b.asset_name))
      return res.status(400).json({ error: "name is required" });
    const code = `AST-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const who = cleanOps(b.assigned_to_name);
    const r = await opsPool.query(
      `INSERT INTO administrative_assets(asset_code,asset_name,category,serial_number,location,assigned_to,purchase_date,condition,status,notes,name,serial_no,purchase_cost,assigned_to_name,assigned_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$2,$4,$11,$12,$13) RETURNING *`,
      [
        b.asset_code || code,
        b.name || b.asset_name,
        b.category || "equipment",
        cleanOps(b.serial_no || b.serial_number),
        cleanOps(b.location),
        null,
        cleanOps(b.purchase_date),
        "good",
        who ? "assigned" : "available",
        cleanOps(b.notes),
        moneyOps(b.purchase_cost),
        who,
        who ? new Date() : null,
      ],
    );
    res
      .status(201)
      .json({
        ...r.rows[0],
        name: r.rows[0].asset_name,
        serial_no: r.rows[0].serial_number,
        assigned_to_name: r.rows[0].assigned_to_name,
      });
  } catch (e) {
    console.error("CREATE OFFICE ASSET ERROR:", e.message);
    res.status(500).json({ error: "Failed to create asset" });
  }
};
exports.assignAssetV2 = async (req, res) => {
  try {
    const who = cleanOps(req.body?.assigned_to_name);
    const r = await opsPool.query(
      `UPDATE administrative_assets SET assigned_to_name=$1,assigned_to_name=$1,assigned_at=CASE WHEN $1 IS NULL THEN NULL ELSE NOW() END,assigned_to=CASE WHEN $1 IS NULL THEN NULL ELSE assigned_to END,status=CASE WHEN $1 IS NULL THEN 'available' ELSE 'assigned' END,updated_at=NOW() WHERE id=$2 AND status IN ('available','assigned') RETURNING *`,
      [who, req.params.id],
    );
    if (!r.rows.length)
      return res
        .status(409)
        .json({ error: "Only available or assigned assets can be reassigned" });
    res.json({
      ...r.rows[0],
      name: r.rows[0].asset_name,
      serial_no: r.rows[0].serial_number,
      assigned_to_name: r.rows[0].assigned_to_name,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to assign asset" });
  }
};
exports.updateAssetStatusV2 = async (req, res) => {
  try {
    const { status } = req.body;
    if (
      !["available", "assigned", "maintenance", "retired", "lost"].includes(
        status,
      )
    )
      return res.status(400).json({ error: "Invalid asset status" });
    const r = await opsPool.query(
      `UPDATE administrative_assets SET status=$1,notes=COALESCE($2,notes),assigned_to_name=CASE WHEN $1 IN ('available','retired','lost','maintenance') THEN NULL ELSE assigned_name END,assigned_to_name=CASE WHEN $1 IN ('available','retired','lost','maintenance') THEN NULL ELSE assigned_to_name END,assigned_at=CASE WHEN $1 IN ('available','retired','lost','maintenance') THEN NULL ELSE assigned_at END,updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, cleanOps(req.body.notes), req.params.id],
    );
    if (!r.rows.length)
      return res.status(404).json({ error: "Asset not found" });
    res.json({
      ...r.rows[0],
      name: r.rows[0].asset_name,
      serial_no: r.rows[0].serial_number,
      assigned_to_name: r.rows[0].assigned_to_name,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to update asset status" });
  }
};
