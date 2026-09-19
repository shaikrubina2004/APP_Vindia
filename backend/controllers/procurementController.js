// ===== FILE: APP_Vindia/backend/controllers/procurementController.js =====
const Procurement = require("../models/procurementModel");

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
    const { material_request_id, vendor_id, project_id, items } = req.body;

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
    });

    res.status(201).json(purchaseOrder);
  } catch (err) {
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