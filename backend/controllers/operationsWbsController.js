const pool = require("../config/db");

/* Read-only operational WBS view.
   It intentionally does not create/edit/delete WBS rows. */
exports.listProjects = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name
      FROM projects p
      WHERE EXISTS (SELECT 1 FROM wbs w WHERE w.project_id = p.id)
      ORDER BY p.name
    `);
    res.json(rows);
  } catch (err) {
    console.error("OPERATIONS WBS PROJECTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to load WBS projects" });
  }
};

exports.getProjectWbs = async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "Invalid project id" });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        w.id,
        w.project_id,
        w.code,
        w.name,
        w.parent_id,
        w.status,
        COALESCE(w.progress, 0) AS progress,
        COALESCE(w.budget, 0) AS budget,
        COALESCE(w.spent, 0) AS spent,
        COALESCE(mr.request_count, 0) AS material_request_count,
        COALESCE(po.po_count, 0) AS po_count,
        COALESCE(po.po_value, 0) AS po_value,
        COALESCE(po.pending_approval_count, 0) AS pending_po_count,
        COALESCE(del.delivery_count, 0) AS delivery_count,
        COALESCE(del.delayed_count, 0) AS delayed_delivery_count
      FROM wbs w
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS request_count
        FROM material_requests r
        WHERE r.wbs_id = w.id
      ) mr ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS po_count,
          COALESCE(SUM(po2.total_amount),0) AS po_value,
          COUNT(*) FILTER (WHERE po2.status = 'pending_approval')::int AS pending_approval_count
        FROM purchase_orders po2
        WHERE po2.wbs_id = w.id
          AND po2.status <> 'cancelled'
      ) po ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS delivery_count,
          COUNT(*) FILTER (WHERE d.status = 'delayed')::int AS delayed_count
        FROM deliveries d
        JOIN purchase_orders po3 ON po3.id = d.purchase_order_id
        WHERE po3.wbs_id = w.id
      ) del ON TRUE
      WHERE w.project_id = $1
      ORDER BY w.code NULLS LAST, w.created_at ASC
    `, [projectId]);

    res.json(rows);
  } catch (err) {
    console.error("OPERATIONS WBS ERROR:", err.message);
    res.status(500).json({ error: "Failed to load operational WBS" });
  }
};
