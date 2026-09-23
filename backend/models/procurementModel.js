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

<<<<<<< Updated upstream
  /* ─────────────────────────────
=======

    /* ─────────────────────────────
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      `SELECT id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date, po_followups, vendor_calls, pending_approvals, notes, created_at
       FROM procurement_daily_reports
=======
      `SELECT * FROM procurement_daily_reports
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
       RETURNING id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date,
                 po_followups, vendor_calls, pending_approvals, notes, created_at`,
=======
       RETURNING *`,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      `SELECT id, officer_id, TO_CHAR(report_date, 'YYYY-MM-DD') AS report_date, po_followups, vendor_calls, pending_approvals, notes, created_at
       FROM procurement_daily_reports
=======
      `SELECT * FROM procurement_daily_reports
>>>>>>> Stashed changes
       ${where}
       ORDER BY report_date DESC
       LIMIT 30`,
      values
    );
    return result.rows;
  },
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
};

module.exports = Procurement;