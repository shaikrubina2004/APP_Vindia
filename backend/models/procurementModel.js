// ===== FILE: APP_Vindia/backend/models/procurementModel.js =====
const pool = require("../config/db");

/* ─────────────────────────────
   HELPER: Generate next PO code
   Format: PO-<YEAR>-<0001 style sequence, per year>
───────────────────────────── */
const generatePoCode = async (client) => {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

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

const Procurement = {
  /* ─────────────────────────────
     Approved material requests that
     don't have a PO linked yet
  ───────────────────────────── */
  getApprovedUnlinkedRequests: async () => {
    const result = await pool.query(
      `SELECT mr.*
       FROM material_requests mr
       WHERE mr.status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM purchase_orders po
           WHERE po.material_request_id = mr.id
         )
       ORDER BY mr.created_at DESC`
    );
    return result.rows;
  },

  /* ─────────────────────────────
     Create a Purchase Order + its line items
     in a single transaction.
     items: [{ item_name, unit, ordered_qty }, ...]
  ───────────────────────────── */
  createPO: async ({
    material_request_id,
    vendor_id,
    project_id,
    items,
    created_by,
  }) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const po_code = await generatePoCode(client);

      const poResult = await client.query(
        `INSERT INTO purchase_orders
           (po_code, material_request_id, vendor_id, project_id, status, created_by)
         VALUES ($1, $2, $3, $4, 'issued', $5)
         RETURNING *`,
        [po_code, material_request_id, vendor_id, project_id, created_by]
      );

      const purchaseOrder = poResult.rows[0];

      const insertedItems = [];
      for (const it of items) {
        const itemResult = await client.query(
          `INSERT INTO purchase_order_items
             (purchase_order_id, item_name, unit, ordered_qty)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [purchaseOrder.id, it.item_name, it.unit || null, it.ordered_qty]
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
     List POs, optionally filtered by status.
     Matches the shape Logistics will need later:
     po_code, vendor_id, project_id, status, items[]
  ───────────────────────────── */
  getAllPOs: async ({ status } = {}) => {
    const values = [];
    let where = "WHERE 1=1";

    if (status) {
      values.push(status);
      where += ` AND po.status = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
         po.*,
         v.name AS vendor_name,
         p.name AS project_name,
         COALESCE(
           (SELECT json_agg(
              json_build_object(
                'item_name', poi.item_name,
                'unit', poi.unit,
                'ordered_qty', poi.ordered_qty
              )
            )
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = po.id
           ), '[]'
         ) AS items
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       ${where}
       ORDER BY po.created_at DESC`,
      values
    );
    return result.rows;
  },

  /* ─────────────────────────────
     Single PO with its items
  ───────────────────────────── */
  getPOById: async (id) => {
    const result = await pool.query(
      `SELECT
         po.*,
         v.name AS vendor_name,
         p.name AS project_name,
         COALESCE(
           (SELECT json_agg(
              json_build_object(
                'id', poi.id,
                'item_name', poi.item_name,
                'unit', poi.unit,
                'ordered_qty', poi.ordered_qty
              )
            )
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = po.id
           ), '[]'
         ) AS items
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       WHERE po.id = $1`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = Procurement;