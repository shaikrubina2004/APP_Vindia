const pool = require("../config/db"); // your postgres connection

exports.getCostSummary = async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
  w.id AS wbs_id,
  w.name,
  w.budget,

  COALESCE(SUM(l.cost), 0) AS labour_cost,
  COALESCE(SUM(m.total), 0) AS material_cost,
  COALESCE(SUM(e.cost), 0) AS equipment_cost,
  COALESCE(SUM(ms.cost), 0) AS misc_cost

FROM wbs w

-- 🔥 JOIN CHILD TASKS FOR CALCULATION
LEFT JOIN wbs child ON child.parent_id = w.id

LEFT JOIN wbs_labour l ON l.task_id = child.id
LEFT JOIN wbs_material m ON m.task_id = child.id
LEFT JOIN wbs_equipment e ON e.task_id = child.id
LEFT JOIN wbs_miscellaneous ms ON ms.task_id = child.id

-- 🔥 ONLY PARENT TASKS SHOWN
WHERE w.project_id = $1
AND w.parent_id IS NULL   -- ✅ THIS LINE IS THE FIX

GROUP BY w.id, w.name, w.budget;
    `, [projectId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Cost Summary Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    const labour = await pool.query(
      `SELECT name, SUM(hours) as workers, SUM(cost) as amount
       FROM wbs_labour
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const material = await pool.query(
      `SELECT name, SUM(quantity) as qty, SUM(total) as amount
       FROM wbs_material
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const equipment = await pool.query(
      `SELECT name, SUM(cost) as amount
       FROM wbs_equipment
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const misc = await pool.query(
      `SELECT name, SUM(cost) as amount
       FROM wbs_miscellaneous
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    res.json({
      labour: labour.rows,
      material: material.rows,
      equipment: equipment.rows,
      miscellaneous: misc.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching details" });
  }
};
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    const labour = await pool.query(
      `SELECT name, SUM(hours) as workers, SUM(cost) as amount
       FROM wbs_labour
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const material = await pool.query(
      `SELECT name, SUM(quantity) as qty, SUM(total) as amount
       FROM wbs_material
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const equipment = await pool.query(
      `SELECT name, SUM(cost) as amount
       FROM wbs_equipment
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    const misc = await pool.query(
      `SELECT name, SUM(cost) as amount
       FROM wbs_miscellaneous
       WHERE task_id IN (SELECT id FROM wbs WHERE parent_id = $1)
       GROUP BY name`,
      [wbsId]
    );

    res.json({
      labour: labour.rows,
      material: material.rows,
      equipment: equipment.rows,
      miscellaneous: misc.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching details" });
  }
};