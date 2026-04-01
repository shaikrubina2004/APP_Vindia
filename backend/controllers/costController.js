const pool = require("../config/db"); // your postgres connection

// 🔥 COST SUMMARY (ONLY PARENT TASKS)
exports.getCostSummary = async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        w.id AS wbs_id,
        w.name,
        w.budget,

        -- 👷 LABOUR
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_labour
          WHERE task_id IN (
            SELECT id FROM wbs WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS labour_cost,

        -- 🧱 MATERIAL
        COALESCE((
          SELECT SUM(total)
          FROM wbs_material
          WHERE task_id IN (
            SELECT id FROM wbs WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS material_cost,

        -- 🏗️ EQUIPMENT
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_equipment
          WHERE task_id IN (
            SELECT id FROM wbs WHERE parent_id = w.id OR id = w.id
          )
        ), 0) AS equipment_cost,

        -- 📦 MISC
        COALESCE((
          SELECT SUM(cost)
          FROM wbs_miscellaneous
          WHERE task_id IN (
            SELECT id FROM wbs WHERE parent_id = w.id OR id = w.id
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


// 🔥 COST DETAILS (AGGREGATED)
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    // 👷 LABOUR
    const labour = await pool.query(`
      SELECT 
        COUNT(*) AS total_workers,
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_labour
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    // 🧱 MATERIAL
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

    // 🏗️ EQUIPMENT
    const equipment = await pool.query(`
      SELECT 
        COALESCE(SUM(cost), 0) AS total_cost
      FROM wbs_equipment
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    // 📦 MISC
    const misc = await pool.query(`
      SELECT name, cost
      FROM wbs_miscellaneous
      WHERE task_id IN (
        SELECT id FROM wbs WHERE parent_id = $1 OR id = $1
      )
    `, [wbsId]);

    res.json({
      labour: labour.rows[0],
      material: material.rows,
      equipment: equipment.rows[0],
      miscellaneous: misc.rows
    });

  } catch (err) {
    console.error("Cost Details Error:", err);
    res.status(500).json({ error: "Error fetching details" });
  }
};