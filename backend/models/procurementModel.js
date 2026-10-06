// ===== FILE: APP_Vindia/backend/models/procurementModel.js =====
const pool = require("../config/db");
const { PO_STATUS } = require("../config/operations");

/* ─────────────────────────────
   HELPER: Generate next PO code
   Format: PO-<YEAR>-<0001 style sequence, per year>
   Must be called INSIDE a transaction: it takes a transaction-level advisory
   lock so two officers creating a PO at the same instant cannot get the same
   number (previously a duplicate-key 500).
───────────────────────────── */
const generatePoCode = async (client) => {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  await client.query("SELECT pg_advisory_xact_lock(hashtext('po_code'))");

  const codeResult = await client.query(
    `SELECT po_code FROM purchase_orders
     WHERE po_code ~ $1
     ORDER BY CAST(SUBSTRING(po_code FROM $2) AS INTEGER) DESC
     LIMIT 1`,
    [`^PO-${year}-[0-9]+$`, prefix.length + 1]
  );

  if (codeResult.rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastSeq = parseInt(
    codeResult.rows[0].po_code.replace(prefix, ""),
    10
  );

  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
};

/* Received quantity per PO line = accepted qty on goods receipts of the
   deliveries linked to that PO, matched by item name (case-insensitive). */
const RECEIVED_FOR_LINE_SQL = `
  COALESCE((
    SELECT SUM(gri.accepted_qty)
    FROM goods_receipt_items gri
    JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
    JOIN deliveries d ON d.id = gr.delivery_id
    LEFT JOIN delivery_items di ON di.id = gri.delivery_item_id
    LEFT JOIN inventory_items ii ON ii.id = gri.item_id
    WHERE d.purchase_order_id = po.id
      AND LOWER(TRIM(COALESCE(di.item_name, ii.item_name))) = LOWER(TRIM(poi.item_name))
  ), 0)`;

const Procurement = {
  /* ─────────────────────────────
     Approved material requests that
     don't have a live PO yet. A cancelled / rejected PO frees the request
     again (before, one cancelled PO locked it forever).
  ───────────────────────────── */
  getApprovedUnlinkedRequests: async () => {
    const result = await pool.query(
      `SELECT mr.*, u.name AS requested_by_name
       FROM material_requests mr
       LEFT JOIN users u ON u.id = mr.created_by
       WHERE mr.status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM purchase_orders po
           WHERE po.material_request_id = mr.id
             AND po.status NOT IN ('cancelled', 'rejected')
         )
       ORDER BY mr.created_at DESC`
    );
    return result.rows;
  },

  /* ─────────────────────────────
     Create a Purchase Order + its line items in a single transaction.
     items: [{ item_name, unit, ordered_qty, unit_price? }, ...]
     Total > threshold  ->  status 'pending_approval' (Operations Manager)
     otherwise          ->  status 'issued'
  ───────────────────────────── */
  createPO: async ({
    material_request_id,
    vendor_id,
    project_id,
    items,
    created_by,
    expected_delivery_date,
    payment_terms,
    remarks,
    approvalThreshold,
  }) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Serialise on the material request so two officers cannot both raise
      // a PO for the same request.
      if (material_request_id) {
        const mr = await client.query(
          "SELECT id, status FROM material_requests WHERE id = $1 FOR UPDATE",
          [material_request_id]
        );
        if (!mr.rows.length) {
          const e = new Error("Material request not found");
          e.status = 404;
          throw e;
        }
        if (mr.rows[0].status !== "approved") {
          const e = new Error("Only approved material requests can be ordered");
          e.status = 400;
          throw e;
        }
        const dup = await client.query(
          `SELECT po_code FROM purchase_orders
           WHERE material_request_id = $1 AND status NOT IN ('cancelled','rejected')
           LIMIT 1`,
          [material_request_id]
        );
        if (dup.rows.length) {
          const e = new Error(`This request already has purchase order ${dup.rows[0].po_code}`);
          e.status = 409;
          throw e;
        }
      }

      const total = items.reduce(
        (sum, it) => sum + Number(it.ordered_qty) * Number(it.unit_price || 0),
        0
      );
      const needsApproval = total > approvalThreshold;
      const status = needsApproval ? PO_STATUS.PENDING_APPROVAL : PO_STATUS.ISSUED;

      const po_code = await generatePoCode(client);

      const poResult = await client.query(
        `INSERT INTO purchase_orders
           (po_code, material_request_id, vendor_id, project_id, status, created_by,
            total_amount, expected_delivery_date, payment_terms, remarks, approval_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          po_code,
          material_request_id,
          vendor_id,
          project_id,
          status,
          created_by,
          total,
          expected_delivery_date || null,
          payment_terms || null,
          remarks || null,
          needsApproval,
        ]
      );

      const purchaseOrder = poResult.rows[0];

      const insertedItems = [];
      for (const it of items) {
        const itemResult = await client.query(
          `INSERT INTO purchase_order_items
             (purchase_order_id, item_name, unit, ordered_qty, unit_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            purchaseOrder.id,
            it.item_name,
            it.unit || null,
            it.ordered_qty,
            it.unit_price === undefined || it.unit_price === "" || it.unit_price === null
              ? null
              : it.unit_price,
          ]
        );
        insertedItems.push(itemResult.rows[0]);
      }

      await client.query("COMMIT");

      return { ...purchaseOrder, items: insertedItems };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* ─────────────────────────────
     List POs, optionally filtered by status (comma-separated allowed:
     ?status=issued,partially_fulfilled). Each row carries a fulfilment
     summary so lists can draw a progress bar.
  ───────────────────────────── */
  getAllPOs: async ({ status } = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (status) {
      values.push(String(status).split(",").map((s) => s.trim()).filter(Boolean));
      where += ` AND po.status = ANY($${values.length})`;
    }

    const result = await pool.query(
      `SELECT
         po.*,
         v.name AS vendor_name,
         p.name AS project_name,
         u.name AS created_by_name,
         (SELECT COALESCE(SUM(poi.ordered_qty), 0) FROM purchase_order_items poi
           WHERE poi.purchase_order_id = po.id) AS ordered_total,
         COALESCE(
           (SELECT json_agg(
              json_build_object(
                'item_name', poi.item_name,
                'unit', poi.unit,
                'ordered_qty', poi.ordered_qty,
                'unit_price', poi.unit_price
              )
            )
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = po.id
           ), '[]'
         ) AS items
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       LEFT JOIN users u ON u.id = po.created_by
       ${where}
       ORDER BY po.created_at DESC`,
      values
    );
    return result.rows;
  },

  /* ─────────────────────────────
     Single PO with items (+ received qty per line), linked deliveries
     and approval info.
  ───────────────────────────── */
  getPOById: async (id) => {
    const result = await pool.query(
      `SELECT
         po.*,
         v.name AS vendor_name,
         p.name AS project_name,
         u.name AS created_by_name,
         ua.name AS approved_by_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       LEFT JOIN users u ON u.id = po.created_by
       LEFT JOIN users ua ON ua.id = po.approved_by
       WHERE po.id = $1`,
      [id]
    );
    const po = result.rows[0];
    if (!po) return po;

    const items = await pool.query(
      `SELECT poi.id, poi.item_name, poi.unit, poi.ordered_qty, poi.unit_price,
              ${RECEIVED_FOR_LINE_SQL} AS received_qty
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE poi.purchase_order_id = $1
       ORDER BY poi.id`,
      [id]
    );

    const deliveries = await pool.query(
      `SELECT id, delivery_code, status, receipt_status, expected_date, delivery_date
       FROM deliveries WHERE purchase_order_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    return { ...po, items: items.rows, deliveries: deliveries.rows };
  },

  /* ─────────────────────────────
     Operations Manager decision on a PO waiting for approval.
     Returns null if the PO is not in pending_approval any more.
  ───────────────────────────── */
  decidePO: async ({ id, approve, userId, reason }) => {
    const result = await pool.query(
      `UPDATE purchase_orders
       SET status = $1,
           approved_by = $2,
           approved_at = NOW(),
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $4 AND status = 'pending_approval'
       RETURNING *`,
      [
        approve ? PO_STATUS.ISSUED : PO_STATUS.REJECTED,
        userId,
        approve ? null : reason || null,
        id,
      ]
    );
    return result.rows[0] || null;
  },

  /* ─────────────────────────────
     Cancel a PO that has not been fulfilled and has no live delivery.
  ───────────────────────────── */
  cancelPO: async ({ id, reason }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const po = await client.query(
        "SELECT id, status, po_code FROM purchase_orders WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (!po.rows.length) {
        await client.query("ROLLBACK");
        return { error: "Purchase order not found", status: 404 };
      }
      if (![PO_STATUS.PENDING_APPROVAL, PO_STATUS.ISSUED].includes(po.rows[0].status)) {
        await client.query("ROLLBACK");
        return {
          error: `A purchase order in status "${po.rows[0].status}" cannot be cancelled`,
          status: 400,
        };
      }
      const live = await client.query(
        `SELECT delivery_code FROM deliveries
         WHERE purchase_order_id = $1 AND status <> 'cancelled' LIMIT 1`,
        [id]
      );
      if (live.rows.length) {
        await client.query("ROLLBACK");
        return {
          error: `Delivery ${live.rows[0].delivery_code} is still active — cancel it first`,
          status: 409,
        };
      }
      const updated = await client.query(
        `UPDATE purchase_orders
         SET status = 'cancelled', cancelled_reason = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, reason || null]
      );
      await client.query("COMMIT");
      return { po: updated.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* ─────────────────────────────
     Re-derive issued / partially_fulfilled / fulfilled from what Inventory
     has actually accepted. Call inside the goods-receipt transaction
     (pass its client).
  ───────────────────────────── */
  recomputePOStatus: async (client, poId) => {
    if (!poId) return null;
    const summary = await client.query(
      `SELECT po.status,
              COUNT(*)::int AS lines,
              COUNT(*) FILTER (WHERE r.received >= poi.ordered_qty)::int AS full_lines,
              COUNT(*) FILTER (WHERE r.received > 0)::int AS started_lines
       FROM purchase_orders po
       JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
       CROSS JOIN LATERAL (SELECT ${RECEIVED_FOR_LINE_SQL} AS received) r
       WHERE po.id = $1
       GROUP BY po.status`,
      [poId]
    );
    const row = summary.rows[0];
    if (!row) return null;
    if (![PO_STATUS.ISSUED, PO_STATUS.PARTIALLY_FULFILLED, PO_STATUS.FULFILLED].includes(row.status)) {
      return row.status;
    }
    let next = row.status;
    if (row.lines > 0 && row.full_lines === row.lines) next = PO_STATUS.FULFILLED;
    else if (row.started_lines > 0) next = PO_STATUS.PARTIALLY_FULFILLED;
    if (next !== row.status) {
      await client.query(
        "UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [next, poId]
      );
    }
    return next;
  },

  /* ─────────────────────────────
     DAILY REPORTS
     One report per officer per day (upserted). po_followups,
     vendor_calls, pending_approvals are officer-entered JSON arrays;
     "POs issued" is NOT stored here — it's pulled live from
     purchase_orders so it can never go stale vs. the real PO data.
  ───────────────────────────── */

  // Real POs this officer issued on a given date — auto-populated,
  // never manually entered.
  getPOsIssuedOnDate: async (officerId, date) => {
    const result = await pool.query(
      `SELECT po.id, po.po_code, po.status, v.name AS vendor_name, p.name AS project_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       WHERE po.created_by = $1
         AND po.created_at::date = $2::date
       ORDER BY po.created_at DESC`,
      [officerId, date]
    );
    return result.rows;
  },

  getDailyReport: async (officerId, date) => {
    const result = await pool.query(
      `SELECT id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date, po_followups, vendor_calls, pending_approvals, notes, created_at
       FROM procurement_daily_reports
       WHERE officer_id = $1 AND report_date = $2::date`,
      [officerId, date]
    );
    return result.rows[0] || null;
  },

  upsertDailyReport: async ({
    officerId,
    report_date,
    po_followups,
    vendor_calls,
    pending_approvals,
    notes,
  }) => {
    const result = await pool.query(
      `INSERT INTO procurement_daily_reports
         (officer_id, report_date, po_followups, vendor_calls, pending_approvals, notes)
       VALUES ($1, $2::date, $3::jsonb, $4::jsonb, $5::jsonb, $6)
       ON CONFLICT (officer_id, report_date)
       DO UPDATE SET
         po_followups = EXCLUDED.po_followups,
         vendor_calls = EXCLUDED.vendor_calls,
         pending_approvals = EXCLUDED.pending_approvals,
         notes = EXCLUDED.notes
       RETURNING id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date,
                 po_followups, vendor_calls, pending_approvals, notes, created_at`,
      [
        officerId,
        report_date,
        JSON.stringify(po_followups || []),
        JSON.stringify(vendor_calls || []),
        JSON.stringify(pending_approvals || []),
        notes || null,
      ]
    );
    return result.rows[0];
  },

  getDailyReportsHistory: async (officerId, { from, to } = {}) => {
    const values = [officerId];
    let where = "WHERE officer_id = $1";

    if (from) {
      values.push(from);
      where += ` AND report_date >= $${values.length}::date`;
    }
    if (to) {
      values.push(to);
      where += ` AND report_date <= $${values.length}::date`;
    }

    const result = await pool.query(
      `SELECT id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date, po_followups, vendor_calls, pending_approvals, notes, created_at
       FROM procurement_daily_reports
       ${where}
       ORDER BY report_date DESC
       LIMIT 30`,
      values
    );
    return result.rows;
  },

  // Rollup across every Procurement Officer — for Operations Manager / CEO,
  // once that role exists. Not scoped to a single officer_id.
  getAllOfficersReports: async ({ from, to, officerId } = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (officerId) {
      values.push(officerId);
      where += ` AND pdr.officer_id = $${values.length}`;
    }
    if (from) {
      values.push(from);
      where += ` AND pdr.report_date >= $${values.length}::date`;
    }
    if (to) {
      values.push(to);
      where += ` AND pdr.report_date <= $${values.length}::date`;
    }

    const result = await pool.query(
      `SELECT pdr.id, pdr.officer_id, TO_CHAR(pdr.report_date, 'YYYY-MM-DD') AS report_date,
              pdr.po_followups, pdr.vendor_calls, pdr.pending_approvals, pdr.notes, pdr.created_at,
              u.name AS officer_name
       FROM procurement_daily_reports pdr
       LEFT JOIN users u ON u.id = pdr.officer_id
       ${where}
       ORDER BY pdr.report_date DESC, u.name ASC
       LIMIT 100`,
      values
    );
    return result.rows;
  },
};

module.exports = Procurement;