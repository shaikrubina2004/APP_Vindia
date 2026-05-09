const pool = require("../config/db");

// Safe JSON parse
function safeJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch (_) { return []; } }
  if (typeof val === "object") return val;
  return [];
}

// ==========================================
// COST SUMMARY — feeds Cost Tracking tab
// budget  = SUM of approved BOQ grand_totals per phase
// spent   = SUM of cost_report totals per phase (recalc from items if columns are 0)
// ==========================================
exports.getCostSummary = async (req, res) => {
  const { projectId } = req.params;

  try {
    const wbsResult = await pool.query(
      `SELECT id, name FROM wbs WHERE project_id = $1 AND parent_id IS NULL ORDER BY code ASC`,
      [projectId]
    );

    if (!wbsResult.rows.length) return res.json([]);

    const rows = await Promise.all(
      wbsResult.rows.map(async (wbs) => {

        // BUDGET = sum of all BOQ grand_totals for this milestone (any status except rejected)
        const boqBudget = await pool.query(
          `SELECT COALESCE(SUM(grand_total), 0) AS budget,
                  COALESCE(SUM(material_total), 0) AS mat_total,
                  COALESCE(SUM(labour_total), 0) AS lab_total,
                  json_agg(rows) AS all_rows,
                  json_agg(labour_rows) AS all_labour_rows
           FROM boqs
           WHERE project_id = $1 AND milestone_id = $2
             AND status != 'rejected'`,
          [projectId, wbs.id]
        );

        let budget = parseFloat(boqBudget.rows[0]?.budget) || 0;

        // If material_total/labour_total columns are 0, recalc from JSONB rows
        if (budget > 0) {
          const allBoqRows = (boqBudget.rows[0]?.all_rows || [])
            .filter(Boolean)
            .flatMap(r => safeJson(r));
          const allLabourRows = (boqBudget.rows[0]?.all_labour_rows || [])
            .filter(Boolean)
            .flatMap(r => safeJson(r));

          const calcMat = allBoqRows.reduce((s, i) => s + parseFloat(i?.total || 0), 0);
          const calcLab = allLabourRows.reduce((s, i) => s + parseFloat(i?.total || 0), 0);

          // Use stored totals if they exist, else recalc
          const boqMatTotal = parseFloat(boqBudget.rows[0]?.mat_total) || calcMat;
          const boqLabTotal = parseFloat(boqBudget.rows[0]?.lab_total) || calcLab;

          // If stored grand_total disagrees with recalc, trust grand_total
          // (grand_total is always set correctly)
        }

        // SPENT = sum of cost_report totals (recalc from items if columns are 0)
        const crResult = await pool.query(
          `SELECT material_total, labour_total, total_cost, items, labour_items
           FROM cost_reports
           WHERE project_id = $1 AND milestone_id = $2
             AND status != 'rejected'
           ORDER BY created_at DESC`,
          [projectId, wbs.id]
        );

        let matSpent = 0, labSpent = 0;

        for (const cr of crResult.rows) {
          const items       = safeJson(cr.items);
          const labourItems = safeJson(cr.labour_items);

          // Recalc from JSONB arrays (handles old rows where columns were 0)
          const calcMat = items.reduce((s, i) => s + parseFloat(i?.total || 0), 0);
          const calcLab = labourItems.reduce((s, i) => s + parseFloat(i?.total || 0), 0);

          matSpent += parseFloat(cr.material_total) || calcMat;
          labSpent += parseFloat(cr.labour_total)   || calcLab;
        }

        // If no cost_reports, fall back to BOQ data as spent too
        if (crResult.rows.length === 0 && budget > 0) {
          const allBoqRows = (boqBudget.rows[0]?.all_rows || [])
            .filter(Boolean).flatMap(r => safeJson(r));
          const allLabourRows = (boqBudget.rows[0]?.all_labour_rows || [])
            .filter(Boolean).flatMap(r => safeJson(r));

          matSpent = parseFloat(boqBudget.rows[0]?.mat_total) ||
            allBoqRows.reduce((s, i) => s + parseFloat(i?.total || 0), 0);
          labSpent = parseFloat(boqBudget.rows[0]?.lab_total) ||
            allLabourRows.reduce((s, i) => s + parseFloat(i?.total || 0), 0);
        }

        return {
          wbs_id:        wbs.id,
          name:          wbs.name,
          budget:        budget,
          labour_cost:   labSpent,
          material_cost: matSpent,
          equipment_cost: 0,
          misc_cost:      0,
        };
      })
    );

    res.json(rows);
  } catch (err) {
    console.error("Cost Summary Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// COST DETAILS — expanded row on click
// ==========================================
exports.getCostDetails = async (req, res) => {
  const { wbsId } = req.params;

  try {
    const wbsMeta = await pool.query(
      `SELECT id, name, project_id FROM wbs WHERE id = $1`, [wbsId]
    );
    if (!wbsMeta.rows.length) return res.status(404).json({ error: "WBS not found" });
    const { project_id } = wbsMeta.rows[0];

    // Try cost_reports first
    const crResult = await pool.query(
      `SELECT items, labour_items, material_total, labour_total
       FROM cost_reports
       WHERE project_id = $1 AND milestone_id = $2 AND status != 'rejected'
       ORDER BY created_at DESC LIMIT 1`,
      [project_id, wbsId]
    );

    let items = [], labourItems = [];

    if (crResult.rows.length) {
      items       = safeJson(crResult.rows[0].items);
      labourItems = safeJson(crResult.rows[0].labour_items);
    } else {
      const boqResult = await pool.query(
        `SELECT rows, labour_rows FROM boqs
         WHERE project_id = $1 AND milestone_id = $2 AND status != 'rejected'
         ORDER BY created_at DESC LIMIT 1`,
        [project_id, wbsId]
      );
      if (boqResult.rows.length) {
        items       = safeJson(boqResult.rows[0].rows);
        labourItems = safeJson(boqResult.rows[0].labour_rows);
      }
    }

    const materialList = items
      .filter(i => i && i.material)
      .map(i => ({
        name:       i.material,
        unit:       i.unit       || "",
        total_qty:  parseFloat(i.quantity  || 0),
        unit_price: parseFloat(i.unitPrice || 0),
        total_cost: parseFloat(i.total     || 0),
      }));

    const labourRows = labourItems
      .filter(i => i && i.labourType)
      .map(i => ({
        labour_type:  i.labourType,
        workers:      parseInt(i.workers     || 0),
        working_days: parseInt(i.workingDays || 0),
        daily_wage:   parseFloat(i.dailyWage || 0),
        total_cost:   parseFloat(i.total     || 0),
      }));

    const labourTotal   = labourItems.reduce((s, i) => s + parseFloat(i?.total || 0), 0);
    const labourWorkers = labourItems.reduce((s, i) => s + parseInt(i?.workers || 0), 0);

    res.json({
      labour:   { total_workers: labourWorkers, total_cost: labourTotal, rows: labourRows },
      material: materialList,
    });
  } catch (err) {
    console.error("Cost Details Error:", err);
    res.status(500).json({ error: "Error fetching details" });
  }
};