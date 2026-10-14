const pool = require("../config/db");
const { notifyRole } = require("./operationsNotificationsController");
const { recomputePOStatus } = require("../models/procurementModel");

// Inside the receipt transaction; advisory lock prevents duplicate GRN numbers.
const generateGrnCode = async (client) => {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('grn_code'))");
  const result = await client.query(`SELECT grn_code FROM goods_receipts ORDER BY id DESC LIMIT 1`);
  let next = 1;
  if (result.rows.length) {
    const last = result.rows[0].grn_code.split("-").pop();
    const n = parseInt(last, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `GRN-${String(next).padStart(4, "0")}`;
};

/* GET /api/goods-receipts */
exports.getGoodsReceipts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gr.*, d.delivery_code, p.name AS project_name
       FROM goods_receipts gr
       LEFT JOIN deliveries d ON d.id = gr.delivery_id
       LEFT JOIN projects p ON p.id = gr.project_id
       ORDER BY gr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET GOODS RECEIPTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch goods receipts" });
  }
};

/* GET /api/goods-receipts/:id */
exports.getGoodsReceiptById = async (req, res) => {
  try {
    const gr = await pool.query(
      `SELECT gr.*, d.delivery_code, p.name AS project_name
       FROM goods_receipts gr
       LEFT JOIN deliveries d ON d.id = gr.delivery_id
       LEFT JOIN projects p ON p.id = gr.project_id
       WHERE gr.id = $1`,
      [req.params.id]
    );
    if (!gr.rows.length) return res.status(404).json({ error: "Goods receipt not found" });

    const items = await pool.query(
      `SELECT gri.*, it.item_name, it.item_code
       FROM goods_receipt_items gri
       LEFT JOIN inventory_items it ON it.id = gri.item_id
       WHERE gri.goods_receipt_id = $1`,
      [req.params.id]
    );

    res.json({ ...gr.rows[0], items: items.rows });
  } catch (err) {
    console.error("GET GOODS RECEIPT ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch goods receipt" });
  }
};

/* POST /api/goods-receipts
   body: {
     delivery_id, remarks,
     items: [{ delivery_item_id, item_id, ordered_qty, delivered_qty, accepted_qty, damaged_qty }]
   }
   This is PHASE 6/7 of the roadmap — the critical Logistics → Inventory handoff.
   Delivered != automatically in stock. Inventory verifies quantity here, THEN stock updates. */
exports.createGoodsReceipt = async (req, res) => {
  const client = await pool.connect();
  try {
    const { delivery_id, remarks, items } = req.body;
    const userId = req.user?.id;

    if (!delivery_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "delivery_id and at least one item are required" });
    }

    for (const it of items) {
      if (!it.item_id) {
        return res.status(400).json({ error: "Every line must be mapped to an inventory item_id (Item Master)" });
      }
      const accepted = Number(it.accepted_qty || 0);
      const damaged = Number(it.damaged_qty || 0);
      const delivered = Number(it.delivered_qty || 0);
      if (accepted < 0 || damaged < 0 || !Number.isFinite(accepted) || !Number.isFinite(damaged)) {
        return res.status(400).json({ error: "Accepted and damaged quantities cannot be negative" });
      }
      if (delivered > 0 && accepted + damaged > delivered) {
        return res.status(400).json({
          error: "Accepted + damaged cannot exceed the delivered quantity on a line",
        });
      }
    }

    await client.query("BEGIN");

    // Lock the delivery row so two people cannot receive the same delivery
    // twice at the same moment (double stock-in).
    const delivery = await client.query("SELECT * FROM deliveries WHERE id=$1 FOR UPDATE", [delivery_id]);
    if (!delivery.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Delivery not found" });
    }
    if (delivery.rows[0].status !== "delivered") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Only deliveries marked 'delivered' can be received into stock" });
    }
    if (delivery.rows[0].receipt_status === "received") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This delivery has already been received into stock" });
    }

    const grn_code = await generateGrnCode(client);
    const projectId = delivery.rows[0].project_id;

    const gr = await client.query(
      `INSERT INTO goods_receipts (grn_code, delivery_id, project_id, received_by, remarks)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [grn_code, delivery_id, projectId, userId, remarks || null]
    );
    const grId = gr.rows[0].id;

    for (const it of items) {
      const accepted = Number(it.accepted_qty || 0);
      const damaged = Number(it.damaged_qty || 0);

      await client.query(
        `INSERT INTO goods_receipt_items
           (goods_receipt_id, delivery_item_id, item_id, ordered_qty, delivered_qty, accepted_qty, damaged_qty)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [grId, it.delivery_item_id || null, it.item_id, Number(it.ordered_qty || 0), Number(it.delivered_qty || 0), accepted, damaged]
      );

      if (accepted > 0) {
        await client.query(
          `INSERT INTO inventory_transactions
             (item_id, project_id, transaction_type, quantity, reference_type, reference_id, remarks, created_by)
           VALUES ($1,$2,'RECEIPT',$3,'GOODS_RECEIPT',$4,$5,$6)`,
          [it.item_id, projectId, accepted, grId, `GRN ${grn_code}`, userId]
        );
      }
    }

    await client.query(
      "UPDATE deliveries SET receipt_status='received', updated_at=NOW() WHERE id=$1",
      [delivery_id]
    );

    // Close the loop with Procurement: PO becomes partially_fulfilled /
    // fulfilled from what was actually accepted into stock.
    const poStatus = await recomputePOStatus(client, delivery.rows[0].purchase_order_id);

    // Push the accepted quantity back to the Site Engineer's material request, so
    // the "Receive" button on site has a delivered quantity to confirm
    // (ported from the team's version). Capped at what was requested.
    let mrId = delivery.rows[0].material_request_id;
    if (!mrId && delivery.rows[0].purchase_order_id) {
      const poRow = await client.query(
        "SELECT material_request_id FROM purchase_orders WHERE id = $1",
        [delivery.rows[0].purchase_order_id]
      );
      mrId = poRow.rows[0]?.material_request_id || null;
    }
    if (mrId) {
      const totalAccepted = items.reduce((sum, it) => sum + Number(it.accepted_qty || 0), 0);
      if (totalAccepted > 0) {
        await client.query(
          `UPDATE material_requests
              SET delivered_qty = LEAST(COALESCE(delivered_qty, 0) + $1, COALESCE(total_qty, 0))
            WHERE id = $2 AND status = 'approved'`,
          [totalAccepted, mrId]
        );
      }
    }

    await client.query("COMMIT");

    const itemsResult = await pool.query(
      `SELECT gri.*, it.item_name FROM goods_receipt_items gri
       LEFT JOIN inventory_items it ON it.id = gri.item_id
       WHERE goods_receipt_id=$1`,
      [grId]
    );

    // Let Logistics know their delivery was confirmed and stocked.
    await notifyRole(
      "logistics_coordinator",
      "receipt",
      `${delivery.rows[0].delivery_code} received into stock`,
      `Goods receipt ${grn_code} confirmed.`,
      "/operations/logistics/deliveries",
      "ok",
      projectId,
      delivery_id
    );

    // Procurement hears about the receipt; the Operations Manager only when
    // something is short or damaged (avoids notification noise).
    const damagedTotal = items.reduce((s, it) => s + Number(it.damaged_qty || 0), 0);
    const shortTotal = items.reduce(
      (s, it) => s + Math.max(0, Number(it.ordered_qty || 0) - Number(it.accepted_qty || 0) - Number(it.damaged_qty || 0)),
      0
    );
    await notifyRole(
      "procurement_officer",
      "receipt",
      `${delivery.rows[0].delivery_code} received into stock`,
      poStatus ? `Purchase order is now ${poStatus.replace("_", " ")}.` : `Goods receipt ${grn_code} confirmed.`,
      "/operations/procurement/purchase-orders",
      "ok",
      projectId,
      delivery_id
    );
    if (damagedTotal > 0 || shortTotal > 0) {
      await notifyRole(
        "operations_manager",
        "receipt",
        `${grn_code}: discrepancy on ${delivery.rows[0].delivery_code}`,
        `${damagedTotal} damaged, ${shortTotal} short versus the order.`,
        "/operations/manager/inventory",
        "warn",
        projectId,
        delivery_id
      );
    }

    res.status(201).json({ ...gr.rows[0], items: itemsResult.rows });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE GOODS RECEIPT ERROR:", err.message);
    res.status(500).json({ error: "Failed to create goods receipt" });
  } finally {
    client.release();
  }
};