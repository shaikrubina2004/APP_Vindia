const pool = require("../config/db");
const { insertNotification } = require("./pcNotificationsController");

/* ─────────────────────────────────────────────
   GET /api/wbs/:projectId  — nested tree
──────────────────────────────────────────────*/
exports.getWBSByProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM wbs WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId]
    );
    const top  = rows.filter((r) => !r.parent_id);
    const kids = rows.filter((r) => r.parent_id);
    const ids  = kids.map((k) => k.id);

    let labourMap = {}, materialMap = {}, equipMap = {}, miscMap = {};
    if (ids.length) {
      const [lR, mR, eR, xR] = await Promise.all([
        pool.query(`SELECT * FROM wbs_labour        WHERE task_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM wbs_material      WHERE task_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM wbs_equipment     WHERE task_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM wbs_miscellaneous WHERE task_id = ANY($1)`, [ids]),
      ]);
      const bucket = (map, row) => { map[row.task_id] = [...(map[row.task_id] || []), row]; };
      lR.rows.forEach((r) => bucket(labourMap,   r));
      mR.rows.forEach((r) => bucket(materialMap, r));
      eR.rows.forEach((r) => bucket(equipMap,    r));
      xR.rows.forEach((r) => bucket(miscMap,     r));
    }

    const tree = top.map((parent) => ({
      ...parent,
      tasks: kids
        .filter((k) => k.parent_id === parent.id)
        .map((task) => ({
          ...task,
          details: {
            labour:        labourMap[task.id]  || [],
            material:      materialMap[task.id] || [],
            equipment:     equipMap[task.id]    || [],
            miscellaneous: miscMap[task.id]     || [],
          },
        })),
    }));

    return res.json(tree);
  } catch (err) {
    console.error("GET WBS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch WBS" });
  }
};

/* ─────────────────────────────────────────────
   GET /api/wbs  — flat list of all rows
──────────────────────────────────────────────*/
exports.getAllWBS = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM wbs ORDER BY project_id, created_at ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs  — create top-level item
──────────────────────────────────────────────*/
exports.createWBSItem = async (req, res) => {
  const { project_id, code, name } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ error: "project_id and name required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO wbs (
        project_id, code, name, parent_id,
        status, progress, budget, spent, visible_to_client
      )
      VALUES ($1,$2,$3,NULL,'Not Started',0,0,0,false)
      RETURNING *`,
      [project_id, code || "", name]
    );

    const newMilestone = rows[0];

    const proj = await pool.query(
      `SELECT coordinator_id FROM projects WHERE id = $1`,
      [project_id]
    );
    const coordinatorId = proj.rows[0]?.coordinator_id;

    if (coordinatorId) {
      await insertNotification(
        coordinatorId,
        "milestone",
        "New Milestone Created",
        `${name} milestone added`,
        "/project-coordinator/milestone",
        "info",
        project_id
      );
    }

    return res.status(201).json({ ...newMilestone, tasks: [] });
  } catch (err) {
    console.error("CREATE WBS ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs/task  — create child
──────────────────────────────────────────────*/
exports.createWBSTask = async (req, res) => {
  const { project_id, parent_id, code, name } = req.body;
  if (!project_id || !parent_id || !name)
    return res.status(400).json({ error: "project_id, parent_id and name required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO wbs (project_id, code, name, parent_id, status, progress)
       VALUES ($1,$2,$3,$4,'Not Started',0) RETURNING *`,
      [project_id, code, name, parent_id]
    );
    return res.status(201).json({ ...rows[0], details: { labour:[], material:[], equipment:[], miscellaneous:[] } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   PATCH /api/wbs/:id
──────────────────────────────────────────────*/
exports.updateWBSItem = async (req, res) => {
  const { id } = req.params;
  const allowed = [
    "status","progress","budget","spent",
    "due_date","start_date","description",
    "assigned_to","phase","dependencies","risks",
    "visible_to_client",
  ];
  const fields  = [];
  const values  = [];
  let   n = 1;

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = $${n++}`);
      values.push(req.body[key]);
    }
  });

  if (!fields.length) return res.status(400).json({ error: "No valid fields to update" });
  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE wbs SET ${fields.join(", ")} WHERE id = $${n} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "WBS item not found" });

    if (req.body.status !== undefined) {
      const updated = rows[0];
      if (updated.parent_id) {
        await syncParentStatus(updated.parent_id);
      }
    }

    // ── Notification: top-level milestone manually set to Delayed ──
    // FIX: was using undefined `ms` variable — now correctly uses rows[0] + a fresh query
    if (
      req.body.status &&
      req.body.status.toLowerCase() === "delayed" &&
      !rows[0].parent_id   // only top-level milestones, not subtasks
    ) {
      try {
        const projResult = await pool.query(
          `SELECT p.coordinator_id
           FROM projects p
           WHERE p.id = $1`,
          [rows[0].project_id]
        );
        const coordinatorId = projResult.rows[0]?.coordinator_id;
        if (coordinatorId) {
          await insertNotification(
            coordinatorId,
            "milestone",
            `Milestone Delayed — ${rows[0].name}`,
            "Milestone has been marked as Delayed",
            "/project-coordinator/milestone",
            "critical",
            rows[0].project_id
          );
        }
      } catch (notifErr) {
        console.error("Notification error:", notifErr.message);
      }
    }
    // ─────────────────────────────────────────────────────────────

    return res.json(rows[0]);
  } catch (err) {
    console.error("PATCH WBS ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/* helper — recalculate parent milestone status from its children */
async function syncParentStatus(parentId) {
  try {
    const { rows: children } = await pool.query(
      `SELECT status FROM wbs WHERE parent_id = $1`,
      [parentId]
    );
    if (!children.length) return;

    const statuses = children.map((c) => (c.status || "Not Started").toLowerCase());
    const all      = statuses.length;
    const done     = statuses.filter((s) => s === "completed").length;
    const active   = statuses.filter((s) => s === "in progress" || s === "in-progress").length;
    const delayed  = statuses.filter((s) => s === "delayed").length;

    let newStatus = "Not Started";
    let progress  = 0;

    if (done === all)         { newStatus = "Completed";   progress = 100; }
    else if (delayed > 0)     { newStatus = "Delayed";     progress = Math.round(done / all * 100); }
    else if (active > 0 || done > 0) { newStatus = "In Progress"; progress = Math.round(done / all * 100); }

    await pool.query(
      `UPDATE wbs SET status = $1, progress = $2 WHERE id = $3`,
      [newStatus, progress, parentId]
    );

    // ── If parent becomes Delayed via children, notify coordinator ──
    if (newStatus === "Delayed") {
      try {
        const parentResult = await pool.query(
          `SELECT w.name, p.coordinator_id, p.id AS project_id
           FROM wbs w
           JOIN projects p ON p.id = w.project_id
           WHERE w.id = $1`,
          [parentId]
        );
        const ms = parentResult.rows[0];
        if (ms?.coordinator_id) {
          await insertNotification(
            ms.coordinator_id,
            "milestone",
            `Milestone Delayed — ${ms.name}`,
            "One or more subtasks marked as Delayed",
            "/project-coordinator/milestone",
            "critical",
            ms.project_id
          );
        }
      } catch (notifErr) {
        console.error("Notification error in syncParentStatus:", notifErr.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────
  } catch (err) {
    console.error("syncParentStatus error:", err.message);
  }
}

/* ─────────────────────────────────────────────
   DELETE /api/wbs/:id
──────────────────────────────────────────────*/
exports.deleteWBSItem = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM wbs WHERE parent_id = $1`, [id]);
    const { rows } = await pool.query(`DELETE FROM wbs WHERE id = $1 RETURNING *`, [id]);
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs/auto-plan
──────────────────────────────────────────────*/
exports.autoPlanWBS = async (req, res) => {
  const { project_id, items } = req.body;
  try {
    await pool.query(`DELETE FROM wbs WHERE project_id = $1`, [project_id]);
    const map = {};
    for (const item of items) {
      const parentId = item.parent_id ? map[item.parent_id] : null;
      const { rows } = await pool.query(
        `INSERT INTO wbs (project_id,code,name,parent_id,status,progress,budget,spent,visible_to_client)
         VALUES ($1,$2,$3,$4,'Not Started',0,0,0,false) RETURNING id`,
        [project_id, item.code, item.name, parentId]
      );
      map[item.temp_id] = rows[0].id;
    }
    res.json({ message: "WBS auto-planned successfully" });
  } catch (err) {
    console.error("AUTO PLAN ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   SE ALERT SYSTEM
──────────────────────────────────────────────*/
exports.getSEAlerts = async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: "project_id required" });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM site_engineer_daily_updates
       WHERE project_id = $1
         AND applied   = false
         AND dismissed = false
       ORDER BY created_at DESC`,
      [project_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET SE ALERTS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs/se-alerts/:id/apply
──────────────────────────────────────────────*/
exports.applySEAlert = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: alertRows } = await pool.query(
      `SELECT
         sa.*,
         w.name        AS milestone_name,
         wt.name       AS subtask_name,
         p.coordinator_id,
         p.id          AS project_id
       FROM site_engineer_daily_updates sa
       JOIN wbs      w  ON w.id  = sa.milestone_id
       JOIN projects p  ON p.id  = w.project_id
       LEFT JOIN wbs wt ON wt.id = sa.subtask_id
       WHERE sa.id = $1`,
      [id]
    );
    if (!alertRows.length) return res.status(404).json({ error: "Alert not found" });
    const alert = alertRows[0];

    if (alert.subtask_id && alert.suggested_status) {
      await pool.query(
        `UPDATE wbs SET status = $1 WHERE id = $2`,
        [alert.suggested_status, alert.subtask_id]
      );
    }

    if (alert.milestone_id && alert.suggested_status) {
      if (!alert.subtask_id) {
        await pool.query(
          `UPDATE wbs SET status = $1 WHERE id = $2`,
          [alert.suggested_status, alert.milestone_id]
        );
      } else {
        await syncParentStatus(alert.milestone_id);
      }
    }

    await pool.query(
      `UPDATE site_engineer_daily_updates SET applied = true WHERE id = $1`,
      [id]
    );

    // ── Notification ────────────────────────────────────────
    if (alert.coordinator_id) {
      try {
        const severity = alert.suggested_status === "Delayed" ? "critical" : "info";
        await insertNotification(
          alert.coordinator_id,
          "milestone",
          `SE Update — ${alert.milestone_name}`,
          `${alert.subtask_name || alert.milestone_name} marked ${alert.suggested_status} by ${alert.submitted_by}`,
          "/project-coordinator/milestone",
          severity,
          alert.project_id
        );
      } catch (notifErr) {
        console.error("Notification error:", notifErr.message);
      }
    }
    // ─────────────────────────────────────────────────────────

    res.json({ message: "Alert applied successfully" });
  } catch (err) {
    console.error("APPLY SE ALERT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs/se-alerts/:id/dismiss
──────────────────────────────────────────────*/
exports.dismissSEAlert = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE site_engineer_daily_updates SET dismissed = true WHERE id = $1`,
      [id]
    );
    res.json({ message: "Alert dismissed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/wbs/sync-from-se
──────────────────────────────────────────────*/
exports.syncFromSEReport = async (req, res) => {
  const { report_id, matches } = req.body;
  if (!Array.isArray(matches) || !matches.length) {
    return res.status(400).json({ error: "No matches provided" });
  }

  try {
    const updated = [];

    for (const m of matches) {
      if (m.subtask_id) {
        const { rows } = await pool.query(
          `SELECT status FROM wbs WHERE id = $1`, [m.subtask_id]
        );
        if (rows.length && rows[0].status?.toLowerCase() !== "completed") {
          await pool.query(
            `UPDATE wbs SET status = 'In Progress' WHERE id = $1`,
            [m.subtask_id]
          );
          updated.push({ type: "subtask", id: m.subtask_id });
        }
      }

      if (m.milestone_id) {
        const { rows } = await pool.query(
          `SELECT status FROM wbs WHERE id = $1`, [m.milestone_id]
        );
        if (rows.length && rows[0].status?.toLowerCase() === "not started") {
          await pool.query(
            `UPDATE wbs SET status = 'In Progress' WHERE id = $1`,
            [m.milestone_id]
          );
          updated.push({ type: "milestone", id: m.milestone_id });
        }
        await syncParentStatus(m.milestone_id);
      }
    }

    try {
      await pool.query(
        `UPDATE se_daily_reports SET wbs_synced = true, wbs_synced_at = NOW() WHERE id = $1`,
        [report_id]
      );
    } catch (_) { /* non-fatal */ }

    res.json({ message: "Synced successfully", updated });
  } catch (err) {
    console.error("SYNC FROM SE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   COST DETAIL ROUTES
──────────────────────────────────────────────*/
exports.addLabour = async (req, res) => {
  const { task_id, name, role, hours, rate } = req.body;
  try {
    const cost = (parseFloat(hours)||0) * (parseFloat(rate)||0);
    const { rows } = await pool.query(
      `INSERT INTO wbs_labour (task_id,name,role,hours,rate,cost) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [task_id, name, role, hours, rate, cost]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};
exports.deleteLabour = async (req, res) => {
  try { await pool.query(`DELETE FROM wbs_labour WHERE id=$1`,[req.params.id]); res.json({message:"Deleted"}); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addMaterial = async (req, res) => {
  const { task_id, name, quantity, unit, price, vendor } = req.body;
  try {
    const total = (parseFloat(quantity)||0) * (parseFloat(price)||0);
    const { rows } = await pool.query(
      `INSERT INTO wbs_material (task_id,name,quantity,unit,price,total,vendor) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [task_id, name, quantity, unit, price, total, vendor]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};
exports.deleteMaterial = async (req, res) => {
  try { await pool.query(`DELETE FROM wbs_material WHERE id=$1`,[req.params.id]); res.json({message:"Deleted"}); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addEquipment = async (req, res) => {
  const { task_id, name, duration, unit, cost } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO wbs_equipment (task_id,name,duration,unit,cost) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [task_id, name, duration, unit, cost]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};
exports.deleteEquipment = async (req, res) => {
  try { await pool.query(`DELETE FROM wbs_equipment WHERE id=$1`,[req.params.id]); res.json({message:"Deleted"}); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addMiscellaneous = async (req, res) => {
  const { task_id, name, cost, note } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO wbs_miscellaneous (task_id,name,cost,note) VALUES ($1,$2,$3,$4) RETURNING *`,
      [task_id, name, cost, note]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};
exports.deleteMiscellaneous = async (req, res) => {
  try { await pool.query(`DELETE FROM wbs_miscellaneous WHERE id=$1`,[req.params.id]); res.json({message:"Deleted"}); }
  catch (err) { res.status(500).json({ error: err.message }); }
};