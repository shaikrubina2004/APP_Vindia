// ===== FILE: APP_Vindia/backend/controllers/procurementController.js =====
const Procurement = require("../models/procurementModel");
const ops = require("../config/operations");
const { notifyRole, insertNotification } = require("./operationsNotificationsController");

// Notifications must never fail the business action they describe.
const safeNotify = async (fn) => {
  try {
    await fn();
  } catch (err) {
    console.error("Procurement notification failed:", err.message);
  }
};

/* ─────────────────────────────
   GET APPROVED, UNLINKED MATERIAL REQUESTS
   GET /api/procurement/material-requests/approved
───────────────────────────── */
exports.getApprovedRequests = async (req, res) => {
  try {
    const requests = await Procurement.getApprovedUnlinkedRequests();
    res.status(200).json(requests);
  } catch (err) {
    console.error("GET APPROVED REQUESTS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to fetch approved material requests",
    });
  }
};

/* ─────────────────────────────
   CREATE PURCHASE ORDER
   POST /api/procurement/purchase-orders
   Body: { material_request_id, vendor_id, project_id, items: [{item_name, unit, ordered_qty}] }
───────────────────────────── */
exports.createPurchaseOrder = async (req, res) => {
  try {
    const {
      material_request_id,
      vendor_id,
      project_id,
      items,
      expected_delivery_date,
      payment_terms,
      remarks,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({ error: "vendor_id is required" });
    }

    if (!project_id) {
      // material_requests.project is a free-text field, not a projects.id FK,
      // so it can't be resolved automatically — the Procurement Officer must
      // confirm the numeric project on the Create PO screen.
      return res.status(400).json({ error: "project_id is required" });
    }

    const parsedItems =
      typeof items === "string" ? JSON.parse(items) : items;

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({
        error: "At least one line item is required",
      });
    }

    for (const it of parsedItems) {
      if (!it.item_name || !Number.isFinite(Number(it.ordered_qty)) || Number(it.ordered_qty) <= 0) {
        return res.status(400).json({
          error: "Each item needs an item_name and a positive ordered_qty",
        });
      }
      const hasPrice =
        it.unit_price !== undefined && it.unit_price !== null && it.unit_price !== "";
      if (hasPrice && (!Number.isFinite(Number(it.unit_price)) || Number(it.unit_price) < 0)) {
        return res.status(400).json({
          error: `Unit price for "${it.item_name}" must be a number ≥ 0`,
        });
      }
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const purchaseOrder = await Procurement.createPO({
      material_request_id: material_request_id || null,
      vendor_id,
      project_id,
      items: parsedItems,
      created_by: userId,
      expected_delivery_date,
      payment_terms,
      remarks,
      approvalThreshold: ops.PO_APPROVAL_THRESHOLD,
    });

    await safeNotify(async () => {
      if (purchaseOrder.status === ops.PO_STATUS.PENDING_APPROVAL) {
        await notifyRole(
          "operations_manager",
          "approval",
          `${purchaseOrder.po_code} needs approval`,
          `Total ₹${Number(purchaseOrder.total_amount).toLocaleString("en-IN")} is above the ₹${ops.PO_APPROVAL_THRESHOLD.toLocaleString("en-IN")} limit.`,
          "/operations/manager/approvals",
          "warn",
          project_id,
          purchaseOrder.id
        );
      } else {
        await notifyRole(
          "logistics_coordinator",
          "delivery",
          `${purchaseOrder.po_code} issued`,
          "New purchase order — schedule the delivery.",
          "/operations/logistics/deliveries",
          "info",
          project_id,
          purchaseOrder.id
        );
      }
    });

    res.status(201).json(purchaseOrder);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("CREATE PO ERROR:", err.message);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
};

/* ─────────────────────────────
   LIST PURCHASE ORDERS
   GET /api/procurement/purchase-orders?status=issued
───────────────────────────── */
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const purchaseOrders = await Procurement.getAllPOs({ status });
    res.status(200).json(purchaseOrders);
  } catch (err) {
    console.error("GET PURCHASE ORDERS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
};

/* ─────────────────────────────
   GET SINGLE PURCHASE ORDER
   GET /api/procurement/purchase-orders/:id
───────────────────────────── */
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await Procurement.getPOById(id);

    if (!purchaseOrder) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    res.status(200).json(purchaseOrder);
  } catch (err) {
    console.error("GET PURCHASE ORDER BY ID ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
};

/* ─────────────────────────────
   APPROVE / REJECT A PO  (Operations Manager)
   PUT /api/procurement/purchase-orders/:id/approve
   PUT /api/procurement/purchase-orders/:id/reject   Body: { reason }
───────────────────────────── */
const decide = (approve) => async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (!approve && !reason) {
      return res.status(400).json({ error: "A reason is required to reject a purchase order" });
    }

    const po = await Procurement.decidePO({
      id: req.params.id,
      approve,
      userId: req.user.id,
      reason,
    });

    if (!po) {
      return res.status(409).json({
        error: "This purchase order is not waiting for approval (already decided or not found)",
      });
    }

    await safeNotify(async () => {
      if (po.created_by) {
        await insertNotification(
          po.created_by,
          "approval",
          approve ? `${po.po_code} approved` : `${po.po_code} rejected`,
          approve ? "Issued — Logistics can now schedule delivery." : reason,
          "/operations/procurement/purchase-orders",
          approve ? "ok" : "warn",
          po.project_id,
          "procurement_officer",
          po.id
        );
      }
      if (approve) {
        await notifyRole(
          "logistics_coordinator",
          "delivery",
          `${po.po_code} issued`,
          "Approved purchase order — schedule the delivery.",
          "/operations/logistics/deliveries",
          "info",
          po.project_id,
          po.id
        );
      }
    });

    res.status(200).json(po);
  } catch (err) {
    console.error("DECIDE PO ERROR:", err.message);
    res.status(500).json({ error: "Failed to update purchase order" });
  }
};

exports.approvePurchaseOrder = decide(true);
exports.rejectPurchaseOrder = decide(false);

/* ─────────────────────────────
   CANCEL A PO
   PUT /api/procurement/purchase-orders/:id/cancel   Body: { reason }
───────────────────────────── */
exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const result = await Procurement.cancelPO({
      id: req.params.id,
      reason: String(req.body?.reason || "").trim() || null,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(200).json(result.po);
  } catch (err) {
    console.error("CANCEL PO ERROR:", err.message);
    res.status(500).json({ error: "Failed to cancel purchase order" });
  }
};

/* ─────────────────────────────
   GET ONE DAY'S REPORT (+ the real POs issued that day)
   GET /api/procurement/daily-reports/:date   (date = YYYY-MM-DD)
───────────────────────────── */
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const [report, posIssued] = await Promise.all([
      Procurement.getDailyReport(userId, date),
      Procurement.getPOsIssuedOnDate(userId, date),
    ]);

    res.status(200).json({
      report: report || null,
      posIssued,
    });
  } catch (err) {
    console.error("GET DAILY REPORT ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch daily report" });
  }
};

/* ─────────────────────────────
   CREATE OR UPDATE TODAY'S (OR A PAST) REPORT
   POST /api/procurement/daily-reports
   Body: { report_date, po_followups, vendor_calls, pending_approvals, notes }
───────────────────────────── */
exports.upsertDailyReport = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const { report_date, po_followups, vendor_calls, pending_approvals, notes } = req.body;

    if (!report_date) {
      return res.status(400).json({ error: "report_date is required" });
    }

    const report = await Procurement.upsertDailyReport({
      officerId: userId,
      report_date,
      po_followups,
      vendor_calls,
      pending_approvals,
      notes,
    });

    res.status(200).json(report);
  } catch (err) {
    console.error("UPSERT DAILY REPORT ERROR:", err.message);
    res.status(500).json({ error: "Failed to save daily report" });
  }
};

/* ─────────────────────────────
   REPORT HISTORY
   GET /api/procurement/daily-reports?from=&to=
───────────────────────────── */
exports.getDailyReportsHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const { from, to } = req.query;
    const history = await Procurement.getDailyReportsHistory(userId, { from, to });
    res.status(200).json(history);
  } catch (err) {
    console.error("GET DAILY REPORTS HISTORY ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch daily report history" });
  }
};

/* ─────────────────────────────
   MANAGER ROLLUP — every officer's daily reports
   GET /api/procurement/daily-reports/all?from=&to=&officerId=
   Restricted to operations_manager / ceo (see procurementRoutes.js) —
   ready for whenever the Operations Manager role goes live.
───────────────────────────── */
exports.getAllDailyReportsForManager = async (req, res) => {
  try {
    const { from, to, officerId } = req.query;
    const reports = await Procurement.getAllOfficersReports({ from, to, officerId });
    res.status(200).json(reports);
  } catch (err) {
    console.error("GET ALL DAILY REPORTS (MANAGER) ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch daily reports" });
  }
};