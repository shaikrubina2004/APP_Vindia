const pool = require("../config/db");

const code = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

const OfficeAdmin = {
  dashboard: async () => {
    const [requests, facilities, supplies, visitors, assets] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='pending')::int AS pending,
                         COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
                         COUNT(*) FILTER (WHERE status='completed')::int AS completed
                  FROM office_requests`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('open','assigned','in_progress'))::int AS open,
                         COUNT(*) FILTER (WHERE status='resolved')::int AS resolved
                  FROM office_facility_requests`),
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE current_qty <= minimum_qty)::int AS low_stock
                  FROM office_supplies WHERE status='active'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='expected' AND expected_at::date=CURRENT_DATE)::int AS expected_today,
                         COUNT(*) FILTER (WHERE status='checked_in')::int AS checked_in
                  FROM office_visitors`),
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE status='assigned')::int AS assigned,
                         COUNT(*) FILTER (WHERE status='maintenance')::int AS maintenance
                  FROM administrative_assets`),
    ]);

    return {
      requests: requests.rows[0],
      facilities: facilities.rows[0],
      supplies: supplies.rows[0],
      visitors: visitors.rows[0],
      assets: assets.rows[0],
    };
  },

  listRequests: async ({ status } = {}) => {
    const params = [];
    const where = [];
    if (status && status !== "all") { params.push(status); where.push(`r.status=$${params.length}`); }
    const result = await pool.query(
      `SELECT r.*, u.name AS requester_name
       FROM office_requests r LEFT JOIN users u ON u.id=r.requested_by
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY r.created_at DESC LIMIT 200`, params);
    return result.rows;
  },

  createRequest: async (userId, data) => {
    const result = await pool.query(
      `INSERT INTO office_requests
       (request_code,requested_by,request_type,title,description,priority,due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code("OR"), userId, data.request_type, data.title, data.description || null,
       data.priority || "normal", data.due_date || null]);
    return result.rows[0];
  },

  updateRequestStatus: async (id, userId, status, note, assignedTo) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM office_requests WHERE id=$1 FOR UPDATE", [id]);
      if (!current.rows[0]) return null;
      const row = current.rows[0];
      const result = await client.query(
        `UPDATE office_requests SET status=$2, assigned_to=COALESCE($3,assigned_to),
         completed_at=CASE WHEN $2='completed' THEN NOW() ELSE completed_at END,
         updated_at=NOW() WHERE id=$1 RETURNING *`,
        [id, status, assignedTo || null]);
      await client.query(
        `INSERT INTO office_request_history(request_id,old_status,new_status,changed_by,note)
         VALUES($1,$2,$3,$4,$5)`, [id, row.status, status, userId, note || null]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
  },

  listFacilities: async () => (await pool.query(`SELECT * FROM office_facility_requests ORDER BY created_at DESC LIMIT 200`)).rows,
  createFacility: async (userId, data) => (await pool.query(
    `INSERT INTO office_facility_requests(request_code,reported_by,location,issue_type,description,priority,due_date)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [code("FAC"), userId, data.location, data.issue_type, data.description, data.priority || "normal", data.due_date || null])).rows[0],
  updateFacilityStatus: async (id, data) => (await pool.query(
    `UPDATE office_facility_requests SET status=$2, assigned_vendor=COALESCE($3,assigned_vendor),
     resolved_at=CASE WHEN $2='resolved' THEN NOW() ELSE resolved_at END, updated_at=NOW()
     WHERE id=$1 RETURNING *`, [id, data.status, data.assigned_vendor || null])).rows[0],

  listSupplies: async () => (await pool.query(`SELECT * FROM office_supplies ORDER BY item_name`)).rows,
  createSupply: async (data) => (await pool.query(
    `INSERT INTO office_supplies(item_code,item_name,category,unit,current_qty,minimum_qty,location)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.item_code || code("SUP"), data.item_name, data.category || null, data.unit || "pcs",
     Number(data.current_qty || 0), Number(data.minimum_qty || 0), data.location || null])).rows[0],
  transactSupply: async (id, userId, data) => {
    const qty = Number(data.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantity must be greater than zero");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM office_supplies WHERE id=$1 FOR UPDATE", [id]);
      if (!current.rows[0]) throw new Error("Supply not found");
      const row = current.rows[0];
      const next = data.transaction_type === "issue" ? Number(row.current_qty) - qty : Number(row.current_qty) + qty;
      if (next < 0) throw new Error("Insufficient office supply stock");
      await client.query(`UPDATE office_supplies SET current_qty=$2,updated_at=NOW() WHERE id=$1`, [id, next]);
      await client.query(`INSERT INTO office_supply_transactions(supply_id,transaction_type,quantity,employee_id,reason,created_by)
                          VALUES($1,$2,$3,$4,$5,$6)`, [id, data.transaction_type, qty, data.employee_id || null, data.reason || null, userId]);
      await client.query("COMMIT");
      return { ...row, current_qty: next };
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
  },

  listVisitors: async () => (await pool.query(`SELECT v.*, u.name AS host_name FROM office_visitors v LEFT JOIN users u ON u.id=v.host_user_id ORDER BY COALESCE(v.expected_at,v.created_at) DESC LIMIT 200`)).rows,
  createVisitor: async (userId, data) => (await pool.query(
    `INSERT INTO office_visitors(visitor_name,company,contact,purpose,host_user_id,expected_at,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.visitor_name, data.company || null, data.contact || null, data.purpose || null,
     data.host_user_id || null, data.expected_at || null, data.notes || null, userId])).rows[0],
  updateVisitorStatus: async (id, status) => {
    const fields = status === "checked_in" ? ", checked_in_at=NOW()" : status === "checked_out" ? ", checked_out_at=NOW()" : "";
    return (await pool.query(`UPDATE office_visitors SET status=$2${fields} WHERE id=$1 RETURNING *`, [id, status])).rows[0];
  },

  listAssets: async () => (await pool.query(`SELECT a.*, u.name AS assigned_name FROM administrative_assets a LEFT JOIN users u ON u.id=a.assigned_to ORDER BY a.asset_name`)).rows,
  createAsset: async (data) => (await pool.query(
    `INSERT INTO administrative_assets(asset_code,asset_name,category,serial_number,location,assigned_to,purchase_date,condition,status,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [data.asset_code || code("AST"), data.asset_name, data.category || null, data.serial_number || null,
     data.location || null, data.assigned_to || null, data.purchase_date || null, data.condition || "good",
     data.status || "available", data.notes || null])).rows[0],
  updateAsset: async (id, data) => (await pool.query(
    `UPDATE administrative_assets SET location=COALESCE($2,location), assigned_to=$3,
     condition=COALESCE($4,condition), status=COALESCE($5,status), notes=COALESCE($6,notes), updated_at=NOW()
     WHERE id=$1 RETURNING *`, [id, data.location || null, data.assigned_to || null, data.condition || null, data.status || null, data.notes || null])).rows[0],
};

module.exports = OfficeAdmin;
