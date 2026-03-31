const pool = require("../config/db");

// ─────────────────────────────────────────────
// GET /api/wbs/:projectId
// Returns full WBS tree for a project
// Structure: [ { ...wbs_row, tasks: [ {..., details: {labour,material,equipment,miscellaneous} } ] } ]
// ─────────────────────────────────────────────
exports.getWBSByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    // 1. Fetch all wbs rows for this project
    const wbsResult = await pool.query(
      `SELECT * FROM wbs WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId],
    );

    const allRows = wbsResult.rows; // flat list

    // 2. Separate top-level (parent_id IS NULL) from children
    const topLevel = allRows.filter((r) => r.parent_id === null);
    const children = allRows.filter((r) => r.parent_id !== null);

    // 3. For each child task, fetch its cost details
    const taskIds = children.map((c) => c.id);

    let labourMap = {};
    let materialMap = {};
    let equipmentMap = {};
    let miscMap = {};

    if (taskIds.length > 0) {
      const [labourRes, materialRes, equipRes, miscRes] = await Promise.all([
        pool.query(`SELECT * FROM wbs_labour WHERE task_id = ANY($1)`, [
          taskIds,
        ]),
        pool.query(`SELECT * FROM wbs_material WHERE task_id = ANY($1)`, [
          taskIds,
        ]),
        pool.query(`SELECT * FROM wbs_equipment WHERE task_id = ANY($1)`, [
          taskIds,
        ]),
        pool.query(`SELECT * FROM wbs_miscellaneous WHERE task_id = ANY($1)`, [
          taskIds,
        ]),
      ]);

      labourRes.rows.forEach((r) => {
        labourMap[r.task_id] = [...(labourMap[r.task_id] || []), r];
      });
      materialRes.rows.forEach((r) => {
        materialMap[r.task_id] = [...(materialMap[r.task_id] || []), r];
      });
      equipRes.rows.forEach((r) => {
        equipmentMap[r.task_id] = [...(equipmentMap[r.task_id] || []), r];
      });
      miscRes.rows.forEach((r) => {
        miscMap[r.task_id] = [...(miscMap[r.task_id] || []), r];
      });
    }

    // 4. Build nested structure expected by frontend
    const wbsTree = topLevel.map((parent) => ({
      ...parent,
      tasks: children
        .filter((c) => c.parent_id === parent.id)
        .map((task) => ({
          ...task,
          details: {
            labour: labourMap[task.id] || [],
            material: materialMap[task.id] || [],
            equipment: equipmentMap[task.id] || [],
            miscellaneous: miscMap[task.id] || [],
          },
        })),
    }));

    return res.status(200).json(wbsTree);
  } catch (err) {
    console.error("GET WBS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch WBS" });
  }
};

// ─────────────────────────────────────────────
// POST /api/wbs
// Create a top-level WBS item (Task)
// Body: { project_id, code, name }
// ─────────────────────────────────────────────
exports.createWBSItem = async (req, res) => {
  const { project_id, code, name } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ error: "project_id and name are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO wbs (project_id, code, name, parent_id, status, progress)
       VALUES ($1, $2, $3, NULL, 'Pending', 0)
       RETURNING *`,
      [project_id, code, name],
    );

    // Return with empty tasks array so frontend can use directly
    return res.status(201).json({ ...result.rows[0], tasks: [] });
  } catch (err) {
    console.error("CREATE WBS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to create WBS item" });
  }
};

// ─────────────────────────────────────────────
// POST /api/wbs/task
// Create a child task (subtask) under a WBS item
// Body: { project_id, parent_id, code, name }
// ─────────────────────────────────────────────
exports.createWBSTask = async (req, res) => {
  const { project_id, parent_id, code, name } = req.body;

  if (!project_id || !parent_id || !name) {
    return res
      .status(400)
      .json({ error: "project_id, parent_id and name are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO wbs (project_id, code, name, parent_id, status, progress)
       VALUES ($1, $2, $3, $4, 'Pending', 0)
       RETURNING *`,
      [project_id, code, name, parent_id],
    );

    // Return with empty details so frontend can use directly
    return res.status(201).json({
      ...result.rows[0],
      details: { labour: [], material: [], equipment: [], miscellaneous: [] },
    });
  } catch (err) {
    console.error("CREATE TASK ERROR:", err.message);
    return res.status(500).json({ error: "Failed to create task" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/wbs/:id
// Delete a WBS item or task (cascades to detail tables via FK)
// ─────────────────────────────────────────────
exports.deleteWBSItem = async (req, res) => {
  const { id } = req.params;

  try {
    // If top-level, also delete all children first
    await pool.query(`DELETE FROM wbs WHERE parent_id = $1`, [id]);
    const result = await pool.query(
      `DELETE FROM wbs WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "WBS item not found" });
    }

    return res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE WBS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to delete WBS item" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COST DETAIL ROUTES  (labour / material / equipment / miscellaneous)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/wbs/labour
exports.addLabour = async (req, res) => {
  const { task_id, name, role, hours, rate } = req.body;
  try {
    const cost = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
    const result = await pool.query(
      `INSERT INTO wbs_labour (task_id, name, role, hours, rate, cost)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [task_id, name, role, hours, rate, cost],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/wbs/labour/:id
exports.deleteLabour = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM wbs_labour WHERE id = $1`, [id]);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/wbs/material
exports.addMaterial = async (req, res) => {
  const { task_id, name, quantity, unit, price, vendor } = req.body;
  try {
    const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
    const result = await pool.query(
      `INSERT INTO wbs_material (task_id, name, quantity, unit, price, total, vendor)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [task_id, name, quantity, unit, price, total, vendor],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/wbs/material/:id
exports.deleteMaterial = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM wbs_material WHERE id = $1`, [id]);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/wbs/equipment
exports.addEquipment = async (req, res) => {
  const { task_id, name, duration, unit, cost } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO wbs_equipment (task_id, name, duration, unit, cost)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [task_id, name, duration, unit, cost],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/wbs/equipment/:id
exports.deleteEquipment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM wbs_equipment WHERE id = $1`, [id]);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/wbs/miscellaneous
exports.addMiscellaneous = async (req, res) => {
  const { task_id, name, cost, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO wbs_miscellaneous (task_id, name, cost, note)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [task_id, name, cost, note],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/wbs/miscellaneous/:id
exports.deleteMiscellaneous = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM wbs_miscellaneous WHERE id = $1`, [id]);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
