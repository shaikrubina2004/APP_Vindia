// ===== FILE: APP_Vindia/backend/controllers/operationsController.js =====
// Operations Manager control tower: department-wide KPIs, the approvals
// queue and reports. READ-mostly — the Operations Manager monitors the
// other four roles rather than re-entering their transactions.
const pool = require("../config/db");
const ops = require("../config/operations");

/* Run one dashboard section; if it fails (e.g. a table not migrated yet)
   the rest of the dashboard still loads and the failure is reported in
   `warnings` instead of silently hiding. */
const section = async (name, warnings, fn, fallback) => {
  try {
    const value = await fn();
    return value === undefined ? fallback : value;
  } catch (err) {
    console.error(`OPERATIONS DASHBOARD [${name}]:`, err.message);
    warnings.push({ section: name, message: err.message });
    return fallback;
  }
};

const one = async (sql, values = []) => (await pool.query(sql, values)).rows[0];
const many = async (sql, values = []) => (await pool.query(sql, values)).rows;

/* GET /api/operations/dashboard */
/* Express 4 does not catch errors thrown inside async handlers (the request
   would hang), so every handler is wrapped: any unexpected error -> 500. */
const safeHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("OPERATIONS CONTROLLER ERROR:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Failed to load operations data" });
  }
};

const getDashboard = async (req, res) => {
  const warnings = [];

  const [requests, purchaseOrders, deliveries, inventory, office, dailyUpdates] =
    await Promise.all([
      section("requests", warnings, () =>
        one(`SELECT
               COUNT(*) FILTER (WHERE status = 'requested')::int AS requested,
               COUNT(*) FILTER (WHERE status = 'approved')::int  AS approved,
               COUNT(*) FILTER (WHERE status = 'approved' AND NOT EXISTS (
                     SELECT 1 FROM purchase_orders po
                     WHERE po.material_request_id = material_requests.id
                       AND po.status NOT IN ('cancelled','rejected')))::int AS awaiting_po,
               COUNT(*) FILTER (WHERE status = 'delivered')::int AS completed,
               COUNT(*) FILTER (WHERE status = 'rejected')::int  AS rejected,
               COUNT(*) FILTER (WHERE status IN ('requested','approved')
                     AND required_by IS NOT NULL
                     AND required_by::date < CURRENT_DATE)::int  AS overdue
             FROM material_requests`),
        { requested: 0, approved: 0, awaiting_po: 0, completed: 0, rejected: 0, overdue: 0 }),

      section("purchase_orders", warnings, () =>
        one(`SELECT
               COUNT(*) FILTER (WHERE status = 'pending_approval')::int    AS pending_approval,
               COUNT(*) FILTER (WHERE status = 'issued')::int              AS issued,
               COUNT(*) FILTER (WHERE status = 'partially_fulfilled')::int AS partially_fulfilled,
               COUNT(*) FILTER (WHERE status = 'fulfilled')::int           AS fulfilled,
               COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending_approval'), 0)::float AS pending_value,
               COALESCE(SUM(total_amount) FILTER (WHERE status IN ('issued','partially_fulfilled','fulfilled')
                     AND created_at >= date_trunc('month', CURRENT_DATE)), 0)::float AS month_value
             FROM purchase_orders`),
        { pending_approval: 0, issued: 0, partially_fulfilled: 0, fulfilled: 0, pending_value: 0, month_value: 0 }),

      section("deliveries", warnings, () =>
        one(`SELECT
               COUNT(*) FILTER (WHERE status = 'scheduled')::int  AS scheduled,
               COUNT(*) FILTER (WHERE status IN ('dispatched','in_transit'))::int AS on_the_way,
               COUNT(*) FILTER (WHERE status = 'delayed')::int    AS delayed,
               COUNT(*) FILTER (WHERE status = 'delivered' AND receipt_status = 'pending_receipt')::int AS pending_receipt,
               COUNT(*) FILTER (WHERE expected_date = CURRENT_DATE
                     AND status NOT IN ('delivered','cancelled'))::int AS due_today
             FROM deliveries`),
        { scheduled: 0, on_the_way: 0, delayed: 0, pending_receipt: 0, due_today: 0 }),

      section("inventory", warnings, () =>
        one(`SELECT
               COUNT(*) FILTER (WHERE status = 'active')::int AS active_items,
               COUNT(*) FILTER (WHERE status = 'active' AND total_available_qty <= minimum_stock
                     AND total_available_qty > 0)::int AS low_stock,
               COUNT(*) FILTER (WHERE status = 'active' AND total_available_qty <= 0)::int AS out_of_stock
             FROM stock_overview`),
        { active_items: 0, low_stock: 0, out_of_stock: 0 }),

      section("office", warnings, () =>
        one(`SELECT
               (SELECT COUNT(*) FROM office_requests
                 WHERE status IN ('open','in_progress','awaiting_approval'))::int AS open_requests,
               (SELECT COUNT(*) FROM office_requests
                 WHERE status = 'awaiting_approval')::int AS awaiting_approval,
               (SELECT COUNT(*) FROM office_visitors WHERE status = 'checked_in')::int AS visitors_in,
               (SELECT COUNT(*) FROM administrative_assets WHERE status = 'maintenance')::int AS assets_in_maintenance`),
        { open_requests: 0, awaiting_approval: 0, visitors_in: 0, assets_in_maintenance: 0 }),

      section("daily_updates", warnings, () =>
        one(`SELECT
               (SELECT COUNT(*) FROM operations_daily_updates WHERE status = 'pending')::int AS pending_review,
               (SELECT COUNT(*) FROM operations_daily_updates
                 WHERE date = CURRENT_DATE AND overall_status IN ('at-risk','delayed'))::int AS at_risk_today`),
        { pending_review: 0, at_risk_today: 0 }),
    ]);

  const [delayedList, lowStockList, recent] = await Promise.all([
    section("delayed_list", warnings, () =>
      many(`SELECT d.id, d.delivery_code, d.expected_date, d.delay_reason,
                   p.name AS project_name, v.name AS vendor_name
            FROM deliveries d
            LEFT JOIN projects p ON p.id = d.project_id
            LEFT JOIN vendors v ON v.id = d.vendor_id
            WHERE d.status = 'delayed'
            ORDER BY d.expected_date ASC NULLS LAST LIMIT 5`), []),

    section("low_stock_list", warnings, () =>
      many(`SELECT item_id, item_code, item_name, unit, minimum_stock, total_available_qty
            FROM stock_overview
            WHERE status = 'active' AND total_available_qty <= minimum_stock
            ORDER BY (total_available_qty - minimum_stock) ASC LIMIT 5`), []),

    section("recent_activity", warnings, () =>
      many(`SELECT * FROM (
              (SELECT 'purchase_order' AS kind, po_code AS ref,
                      'Purchase order ' || status AS text, created_at AS at
               FROM purchase_orders ORDER BY created_at DESC LIMIT 6)
              UNION ALL
              (SELECT 'delivery', delivery_code, 'Delivery ' || status, COALESCE(updated_at, created_at)
               FROM deliveries ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 6)
              UNION ALL
              (SELECT 'goods_receipt', grn_code, 'Goods received into stock', created_at
               FROM goods_receipts ORDER BY created_at DESC LIMIT 6)
              UNION ALL
              (SELECT 'material_request', '#' || id, 'Material request ' || status, created_at
               FROM material_requests ORDER BY created_at DESC LIMIT 6)
            ) feed
            ORDER BY at DESC LIMIT 10`), []),
  ]);

  /* "Needs your attention" — the few things a manager should act on first. */
  const attention = [];
  const push = (severity, title, detail, link) => attention.push({ severity, title, detail, link });

  if (purchaseOrders.pending_approval > 0)
    push("warn", `${purchaseOrders.pending_approval} purchase order(s) awaiting your approval`,
      `₹${Math.round(purchaseOrders.pending_value).toLocaleString("en-IN")} on hold`, "/operations/manager/approvals");
  if (office.awaiting_approval > 0)
    push("warn", `${office.awaiting_approval} office request(s) awaiting approval`,
      "Above the office spend limit", "/operations/manager/administration");
  if (deliveries.delayed > 0)
    push("critical", `${deliveries.delayed} delayed deliver${deliveries.delayed === 1 ? "y" : "ies"}`,
      "Sites may be short of material", "/operations/manager/logistics");
  if (requests.overdue > 0)
    push("critical", `${requests.overdue} material request(s) past their required-by date`,
      "Not yet delivered", "/operations/manager/material-requests");
  if (inventory.out_of_stock > 0)
    push("critical", `${inventory.out_of_stock} item(s) out of stock`, "Raise a request or PO", "/operations/manager/inventory");
  if (deliveries.pending_receipt > 0)
    push("info", `${deliveries.pending_receipt} delivery(ies) waiting to be received into stock`,
      "Inventory Controller action", "/operations/manager/inventory");
  if (requests.awaiting_po > 0)
    push("info", `${requests.awaiting_po} approved request(s) waiting for a purchase order`,
      "Procurement action", "/operations/manager/procurement");
  if (dailyUpdates.pending_review > 0)
    push("info", `${dailyUpdates.pending_review} daily update(s) to review`,
      "Team reports", "/operations/manager/daily-updates");

  res.json({
    requests, purchase_orders: purchaseOrders, deliveries, inventory, office,
    daily_updates: dailyUpdates,
    delayed_deliveries: delayedList,
    low_stock_items: lowStockList,
    recent_activity: recent,
    attention,
    thresholds: { po_approval: ops.PO_APPROVAL_THRESHOLD, office_request_approval: ops.OFFICE_REQUEST_APPROVAL_THRESHOLD },
    warnings,
  });
};

/* GET /api/operations/approvals — everything waiting on the manager */
const getApprovals = async (req, res) => {
  const warnings = [];

  const [materialRequests, purchaseOrders, officeRequests] = await Promise.all([
    section("material_requests", warnings, () =>
      many(`SELECT mr.id, mr.project, mr.zone, mr.purpose, mr.items, mr.required_by,
                   mr.total_qty, mr.notes, mr.created_at, u.name AS requested_by_name
            FROM material_requests mr
            LEFT JOIN users u ON u.id = mr.created_by
            WHERE mr.status = 'requested'
            ORDER BY mr.required_by ASC NULLS LAST, mr.created_at ASC`), []),

    section("purchase_orders", warnings, () =>
      many(`SELECT po.id, po.po_code, po.total_amount, po.expected_delivery_date, po.remarks,
                   po.created_at, v.name AS vendor_name, p.name AS project_name,
                   u.name AS created_by_name,
                   COALESCE((SELECT json_agg(json_build_object(
                       'item_name', poi.item_name, 'unit', poi.unit,
                       'ordered_qty', poi.ordered_qty, 'unit_price', poi.unit_price)
                       ORDER BY poi.id)
                     FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id), '[]') AS items
            FROM purchase_orders po
            LEFT JOIN vendors v ON v.id = po.vendor_id
            LEFT JOIN projects p ON p.id = po.project_id
            LEFT JOIN users u ON u.id = po.created_by
            WHERE po.status = 'pending_approval'
            ORDER BY po.created_at ASC`), []),

    section("office_requests", warnings, () =>
      many(`SELECT id, request_code, category, title, description, priority, cost_estimate,
                   requested_by_name, needed_by, created_at
            FROM office_requests
            WHERE status = 'awaiting_approval'
            ORDER BY created_at ASC`), []),
  ]);

  res.json({
    material_requests: materialRequests,
    purchase_orders: purchaseOrders,
    office_requests: officeRequests,
    counts: {
      material_requests: materialRequests.length,
      purchase_orders: purchaseOrders.length,
      office_requests: officeRequests.length,
      total: materialRequests.length + purchaseOrders.length + officeRequests.length,
    },
    warnings,
  });
};

/* GET /api/operations/reports?from=YYYY-MM-DD&to=YYYY-MM-DD  (default: last 30 days) */
const getReports = async (req, res) => {
  const warnings = [];
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const to = iso.test(req.query.to || "") ? req.query.to : new Date().toISOString().slice(0, 10);
  const from = iso.test(req.query.from || "")
    ? req.query.from
    : new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const range = [from, to];

  const [byVendor, funnel, delivery, movements, cycle] = await Promise.all([
    section("procurement_by_vendor", warnings, () =>
      many(`SELECT COALESCE(v.name, 'Unassigned') AS vendor, COUNT(*)::int AS po_count,
                   COALESCE(SUM(po.total_amount), 0)::float AS total_value
            FROM purchase_orders po
            LEFT JOIN vendors v ON v.id = po.vendor_id
            WHERE po.created_at::date BETWEEN $1::date AND $2::date
              AND po.status NOT IN ('cancelled','rejected')
            GROUP BY v.name ORDER BY total_value DESC, po_count DESC LIMIT 10`, range), []),

    section("request_funnel", warnings, () =>
      many(`SELECT status, COUNT(*)::int AS count FROM material_requests
            WHERE created_at::date BETWEEN $1::date AND $2::date
            GROUP BY status ORDER BY count DESC`, range), []),

    section("delivery_performance", warnings, () =>
      one(`SELECT
             COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
             COUNT(*) FILTER (WHERE status = 'delivered' AND expected_date IS NOT NULL
                   AND delivery_date <= expected_date)::int AS on_time,
             COUNT(*) FILTER (WHERE status = 'delivered' AND expected_date IS NOT NULL
                   AND delivery_date > expected_date)::int AS late,
             COALESCE(ROUND(AVG(delivery_date - expected_date) FILTER (
                   WHERE status = 'delivered' AND expected_date IS NOT NULL
                     AND delivery_date > expected_date), 1), 0)::float AS avg_days_late,
             COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
           FROM deliveries
           WHERE created_at::date BETWEEN $1::date AND $2::date`, range),
      { delivered: 0, on_time: 0, late: 0, avg_days_late: 0, cancelled: 0 }),

    section("stock_movements", warnings, () =>
      many(`SELECT transaction_type, COUNT(*)::int AS transactions,
                   COALESCE(SUM(ABS(quantity)), 0)::float AS quantity
            FROM inventory_transactions
            WHERE created_at::date BETWEEN $1::date AND $2::date
            GROUP BY transaction_type ORDER BY transactions DESC`, range), []),

    section("request_cycle_time", warnings, () =>
      one(`SELECT COUNT(*)::int AS samples,
                  COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (po.created_at - mr.created_at)) / 86400)::numeric, 1), 0)::float
                    AS avg_days_request_to_po
           FROM purchase_orders po
           JOIN material_requests mr ON mr.id = po.material_request_id
           WHERE po.created_at::date BETWEEN $1::date AND $2::date`, range),
      { samples: 0, avg_days_request_to_po: 0 }),
  ]);

  const onTimeRate =
    delivery.on_time + delivery.late > 0
      ? Math.round((delivery.on_time / (delivery.on_time + delivery.late)) * 100)
      : null;

  res.json({
    range: { from, to },
    procurement_by_vendor: byVendor,
    request_funnel: funnel,
    delivery_performance: { ...delivery, on_time_rate: onTimeRate },
    stock_movements: movements,
    request_cycle_time: cycle,
    warnings,
  });
};


exports.getDashboard = safeHandler(getDashboard);
exports.getApprovals = safeHandler(getApprovals);
exports.getReports = safeHandler(getReports);
