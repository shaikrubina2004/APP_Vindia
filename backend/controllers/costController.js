const pool = require("../config/db");


// 🔥 COST SUMMARY (ALL LEVELS - FIXED)
exports.getCostSummary = async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(`
      -- 🔥 RECURSIVE TREE (ALL LEVELS)
      WITH RECURSIVE wbs_tree AS (
        SELECT id, parent_id
        FROM wbs
        WHERE project_id = $1

        UNION ALL

        SELECT w.id, w.parent_id
        FROM wbs w
        INNER JOIN wbs_tree wt ON w.parent_id = wt.id
      )

      SELECT 
        w.id AS wbs_id,
        w.name,
        COALESCE(w.budget, 0) AS budget,

        -- 👷 LABOUR
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_labour
          WHERE task_id IN (
            SELECT id FROM wbs_tree WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS labour_cost,

        -- 🧱 MATERIAL
        COALESCE((
          SELECT SUM(total)
          FROM wbs_material
          WHERE task_id IN (
            SELECT id FROM wbs_tree WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS material_cost,

        -- 🏗️ EQUIPMENT
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_equipment
          WHERE task_id IN (
            SELECT id FROM wbs_tree WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS equipment_cost,

        -- 📦 MISC (🔥 FIXED — NOW INCLUDES ALL LEVELS)
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_miscellaneous
          WHERE task_id IN (
            SELECT id FROM wbs_tree WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS misc_cost

      FROM wbs w
      WHERE w.project_id = $1
      AND w.parent_id IS NULL;
    `, [projectId]);

    res.json(result.rows);

  } catch (err) {
    console.error("Cost Summary Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};



// 🔥 COST DETAILS (ALSO FIXED FOR ALL LEVELS)
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    const labour = await pool.query(`
      SELECT 
        COUNT(*) AS total_workers,
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_labour
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    const material = await pool.query(`
      SELECT 
        LOWER(name) AS name,
        SUM(quantity) AS total_qty,
        SUM(total) AS total_cost
      FROM wbs_material
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
      GROUP BY LOWER(name)
    `, [wbsId]);

    const equipment = await pool.query(`
      SELECT 
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_equipment
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    const misc = await pool.query(`
      SELECT name, cost
      FROM wbs_miscellaneous
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    res.json({
      labour: labour.rows[0] || { total_workers: 0, total_cost: 0 },
      material: material.rows || [],
      equipment: equipment.rows[0] || { total_cost: 0 },
      miscellaneous: misc.rows || []
    });

  } catch (err) {
    console.error("Cost Details Error:", err);
    res.status(500).json({ error: "Error fetching details" });
  }
};