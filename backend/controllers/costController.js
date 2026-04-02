const pool = require("../config/db");

// ==========================================
// 🔥 COST SUMMARY (ALL LEVELS - FINAL)
// ==========================================
exports.getCostSummary = async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        w.id AS wbs_id,
        w.name,
        COALESCE(w.budget, 0) AS budget,

        -- 👷 LABOUR
        COALESCE((
          SELECT SUM(l.cost)
          FROM wbs_labour l
          WHERE l.task_id IN (
            WITH RECURSIVE tree AS (
              SELECT id FROM wbs WHERE id = w.id
              UNION ALL
              SELECT w2.id
              FROM wbs w2
              INNER JOIN tree t ON w2.parent_id = t.id
            )
            SELECT id FROM tree
          )
        ), 0) AS labour_cost,

        -- 🧱 MATERIAL
        COALESCE((
          SELECT SUM(m.total)
          FROM wbs_material m
          WHERE m.task_id IN (
            WITH RECURSIVE tree AS (
              SELECT id FROM wbs WHERE id = w.id
              UNION ALL
              SELECT w2.id
              FROM wbs w2
              INNER JOIN tree t ON w2.parent_id = t.id
            )
            SELECT id FROM tree
          )
        ), 0) AS material_cost,

        -- 🏗️ EQUIPMENT
        COALESCE((
          SELECT SUM(e.cost)
          FROM wbs_equipment e
          WHERE e.task_id IN (
            WITH RECURSIVE tree AS (
              SELECT id FROM wbs WHERE id = w.id
              UNION ALL
              SELECT w2.id
              FROM wbs w2
              INNER JOIN tree t ON w2.parent_id = t.id
            )
            SELECT id FROM tree
          )
        ), 0) AS equipment_cost,

        -- 📦 MISC
        COALESCE((
          SELECT SUM(ms.cost)
          FROM wbs_miscellaneous ms
          WHERE ms.task_id IN (
            WITH RECURSIVE tree AS (
              SELECT id FROM wbs WHERE id = w.id
              UNION ALL
              SELECT w2.id
              FROM wbs w2
              INNER JOIN tree t ON w2.parent_id = t.id
            )
            SELECT id FROM tree
          )
        ), 0) AS misc_cost

      FROM wbs w
      WHERE w.project_id = $1
      AND w.parent_id IS NULL;
      `,
      [projectId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Cost Summary Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// 🔥 COST DETAILS (EXPAND ROW - FINAL)
// ==========================================
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    // 👷 LABOUR
    const labour = await pool.query(
      `
      WITH RECURSIVE tree AS (
        SELECT id FROM wbs WHERE id = $1
        UNION ALL
        SELECT w.id
        FROM wbs w
        INNER JOIN tree t ON w.parent_id = t.id
      )
      SELECT 
        COUNT(*) AS total_workers,
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_labour
      WHERE task_id IN (SELECT id FROM tree);
      `,
      [wbsId]
    );

    // 🧱 MATERIAL
    const material = await pool.query(
      `
      WITH RECURSIVE tree AS (
        SELECT id FROM wbs WHERE id = $1
        UNION ALL
        SELECT w.id
        FROM wbs w
        INNER JOIN tree t ON w.parent_id = t.id
      )
      SELECT 
        LOWER(name) AS name,
        SUM(quantity) AS total_qty,
        SUM(total) AS total_cost
      FROM wbs_material
      WHERE task_id IN (SELECT id FROM tree)
      GROUP BY LOWER(name);
      `,
      [wbsId]
    );

    // 🏗️ EQUIPMENT
    const equipment = await pool.query(
      `
      WITH RECURSIVE tree AS (
        SELECT id FROM wbs WHERE id = $1
        UNION ALL
        SELECT w.id
        FROM wbs w
        INNER JOIN tree t ON w.parent_id = t.id
      )
      SELECT 
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_equipment
      WHERE task_id IN (SELECT id FROM tree);
      `,
      [wbsId]
    );

    // 📦 MISC
    const misc = await pool.query(
      `
      WITH RECURSIVE tree AS (
        SELECT id FROM wbs WHERE id = $1
        UNION ALL
        SELECT w.id
        FROM wbs w
        INNER JOIN tree t ON w.parent_id = t.id
      )
      SELECT name, cost
      FROM wbs_miscellaneous
      WHERE task_id IN (SELECT id FROM tree);
      `,
      [wbsId]
    );

    res.json({
      labour: labour.rows[0] || { total_workers: 0, total_cost: 0 },
      material: material.rows || [],
      equipment: equipment.rows[0] || { total_cost: 0 },
      miscellaneous: misc.rows || [],
    });
  } catch (err) {
    console.error("Cost Details Error:", err);
    res.status(500).json({ error: "Error fetching details" });
  }
};