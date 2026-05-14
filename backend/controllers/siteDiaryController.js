// server/controllers/siteDiaryController.js
// FIXED:
//   - Dynamic column detection (no crash if subtask_id, delay_type etc. missing)
//   - getDiary: safe SELECT without assuming optional columns exist
//   - createDiary: builds INSERT dynamically based on actual DB schema
//   - PM notification: best-effort, silent fail if table missing
//   - /api/projects 500: NOT in this file — see note at bottom

const pool = require("../config/db");

/* ── Check if a column exists in a table ───────────────── */
async function columnExists(table, column) {
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return r.rows.length > 0;
  } catch { return false; }
}

/* ── Safe JSON stringify ────────────────────────────────── */
const toJson = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { JSON.parse(v); return v; } catch { return "[]"; }
  }
  return JSON.stringify(v);
};

/* ═══════════════════════════════════════════════════════════
   CREATE DIARY
═══════════════════════════════════════════════════════════ */
exports.createDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id;
    if (!engineer_id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      project_id, date, shift, site, zone,
      weather_am, weather_pm, temp_c,
      work_done, plant,
      labour_carpenters, labour_steel, labour_masons,
      labour_mep, labour_general, labour_supervisors,
      subtask_id, milestone_id,
      delay_type, delay_description,
      linked_rfi, linked_incident,
      materials, issues, instructions, next_day, notes,
    } = req.body;

    if (!project_id || !date || !work_done) {
      return res.status(400).json({ error: "project_id, date, work_done are required" });
    }

    const labour_total =
      (Number(labour_carpenters)  || 0) +
      (Number(labour_steel)       || 0) +
      (Number(labour_masons)      || 0) +
      (Number(labour_mep)         || 0) +
      (Number(labour_general)     || 0) +
      (Number(labour_supervisors) || 0);

    const labour_skilled =
      (Number(labour_carpenters) || 0) +
      (Number(labour_steel)      || 0) +
      (Number(labour_masons)     || 0) +
      (Number(labour_mep)        || 0);

    const labour_unskilled =
      (Number(labour_general)     || 0) +
      (Number(labour_supervisors) || 0);

    let parsedMaterials = [];
    if (typeof materials === "string") {
      try { parsedMaterials = JSON.parse(materials); } catch {}
    } else if (Array.isArray(materials)) {
      parsedMaterials = materials;
    }

    const parsedIssues = typeof issues === "string"
      ? issues
      : (Array.isArray(issues) ? issues.join("\n") : "");

    const attachmentPaths = (req.files || []).map(f => f.path);

    // ── Detect which optional columns exist ───────────────
    const [
      hasSubtaskId, hasMilestoneId, hasDelayType, hasDelayDesc,
      hasLinkedRfi, hasLinkedInc, hasAttachments, hasSuggestedStatus,
    ] = await Promise.all([
      columnExists("site_engineer_daily_updates", "subtask_id"),
      columnExists("site_engineer_daily_updates", "milestone_id"),
      columnExists("site_engineer_daily_updates", "delay_type"),
      columnExists("site_engineer_daily_updates", "delay_description"),
      columnExists("site_engineer_daily_updates", "linked_rfi"),
      columnExists("site_engineer_daily_updates", "linked_incident"),
      columnExists("site_engineer_daily_updates", "attachments"),
      columnExists("site_engineer_daily_updates", "suggested_status"),
    ]);

    // ── Build dynamic INSERT ──────────────────────────────
    const cols = [
      "project_id", "submitted_by", "report_date",
      "shift", "site", "zone",
      "weather_am", "weather_pm", "temp_c",
      "work_done", "plant",
      "labour_carpenters", "labour_steel", "labour_masons", "labour_mep",
      "labour_general", "labour_supervisors",
      "labour_skilled", "labour_unskilled", "labour_total",
      "materials", "issues", "instructions", "next_day", "notes",
    ];
    const vals = [
      project_id, engineer_id, date,
      shift || "morning", site || "", zone || "",
      weather_am || "Partly Cloudy", weather_pm || "Partly Cloudy", temp_c || null,
      work_done, plant || "",
      Number(labour_carpenters)  || 0,
      Number(labour_steel)       || 0,
      Number(labour_masons)      || 0,
      Number(labour_mep)         || 0,
      Number(labour_general)     || 0,
      Number(labour_supervisors) || 0,
      labour_skilled, labour_unskilled, labour_total,
      toJson(parsedMaterials), parsedIssues,
      instructions || "", next_day || "", notes || "",
    ];

    if (hasSubtaskId)       { cols.push("subtask_id");        vals.push(subtask_id        || null); }
    if (hasMilestoneId)     { cols.push("milestone_id");      vals.push(milestone_id      || null); }
    if (hasDelayType)       { cols.push("delay_type");        vals.push(delay_type        || "");   }
    if (hasDelayDesc)       { cols.push("delay_description"); vals.push(delay_description || "");   }
    if (hasLinkedRfi)       { cols.push("linked_rfi");        vals.push(linked_rfi        || "");   }
    if (hasLinkedInc)       { cols.push("linked_incident");   vals.push(linked_incident   || "");   }
    if (hasAttachments)     { cols.push("attachments");       vals.push(attachmentPaths);           }
    if (hasSuggestedStatus) { cols.push("suggested_status");  vals.push(delay_type ? "delayed" : "normal"); }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO site_engineer_daily_updates (${cols.join(", ")})
       VALUES (${placeholders})
       RETURNING *`,
      vals
    );

    const diary = result.rows[0];

    // ── Notify PMs — best effort ──────────────────────────
    try {
      const pmResult = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE LOWER(r.name) LIKE '%project%manager%'
           AND (
             u.id IN (SELECT pm_id FROM projects WHERE id = $1 AND pm_id IS NOT NULL)
             OR u.id IN (SELECT user_id FROM project_team    WHERE project_id = $1)
             OR u.id IN (SELECT user_id FROM project_members WHERE project_id = $1)
           )`,
        [project_id]
      ).catch(() => ({ rows: [] }));

      for (const pm of pmResult.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, linked_ref, read, created_at)
           VALUES ($1, 'diary', $2, $3, $4, false, NOW())
           ON CONFLICT DO NOTHING`,
          [
            pm.id,
            "Daily Diary Submitted",
            `SE submitted diary for ${date}. Zone: ${zone || "N/A"}. Labour: ${labour_total}.${delay_type ? " Delay: " + delay_type : ""}`,
            String(diary.id),
          ]
        ).catch(() => {});
      }
    } catch { /* silent */ }

    res.status(201).json(diary);

  } catch (err) {
    console.error("Create Diary Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET ALL — for current SE
   FIXED: builds SELECT based on actual columns that exist
═══════════════════════════════════════════════════════════ */
exports.getDiary = async (req, res) => {
  try {
    const engineer_id = req.user?.id;
    if (!engineer_id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [
      hasSubtaskId, hasMilestoneId, hasDelayType,
      hasLinkedRfi, hasLinkedInc,
    ] = await Promise.all([
      columnExists("site_engineer_daily_updates", "subtask_id"),
      columnExists("site_engineer_daily_updates", "milestone_id"),
      columnExists("site_engineer_daily_updates", "delay_type"),
      columnExists("site_engineer_daily_updates", "linked_rfi"),
      columnExists("site_engineer_daily_updates", "linked_incident"),
    ]);

    const optionalCols = [
      hasSubtaskId   ? "d.subtask_id"        : "NULL::int  AS subtask_id",
      hasMilestoneId ? "d.milestone_id"      : "NULL::int  AS milestone_id",
      hasDelayType   ? "d.delay_type"        : "NULL::text AS delay_type",
      hasDelayType   ? "d.delay_description" : "NULL::text AS delay_description",
      hasLinkedRfi   ? "d.linked_rfi"        : "NULL::text AS linked_rfi",
      hasLinkedInc   ? "d.linked_incident"   : "NULL::text AS linked_incident",
    ].join(",\n         ");

    const joinClause = hasSubtaskId
      ? "LEFT JOIN wbs w ON w.id = d.subtask_id"
      : "";

    const wbsCol = hasSubtaskId
      ? "w.name AS wbs_name,"
      : "NULL::text AS wbs_name,";

    const result = await pool.query(
      `SELECT
         d.id, d.project_id, d.submitted_by, d.report_date,
         d.shift, d.site, d.zone,
         d.weather_am, d.weather_pm, d.temp_c,
         d.work_done, d.plant,
         d.labour_carpenters, d.labour_steel, d.labour_masons, d.labour_mep,
         d.labour_general, d.labour_supervisors,
         d.labour_skilled, d.labour_unskilled, d.labour_total,
         d.materials, d.issues, d.instructions, d.next_day, d.notes,
         ${wbsCol}
         ${optionalCols}
       FROM site_engineer_daily_updates d
       ${joinClause}
       WHERE d.submitted_by = $1
       ORDER BY d.report_date DESC`,
      [engineer_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Get Diary Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET BY ID
═══════════════════════════════════════════════════════════ */
exports.getDiaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const hasSubtaskId = await columnExists("site_engineer_daily_updates", "subtask_id");
    const joinClause   = hasSubtaskId ? "LEFT JOIN wbs w ON w.id = d.subtask_id" : "";
    const wbsCol       = hasSubtaskId ? "w.name AS wbs_name," : "NULL::text AS wbs_name,";

    const result = await pool.query(
      `SELECT d.*, ${wbsCol} NULL AS _pad
       FROM site_engineer_daily_updates d
       ${joinClause}
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diary not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Get By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET MILESTONES
═══════════════════════════════════════════════════════════ */
exports.getMilestones = async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }

    const result = await pool.query(
      `SELECT id, name, code
       FROM wbs
       WHERE project_id = $1
         AND code NOT LIKE '%.%'
       ORDER BY code`,
      [project_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Milestones Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET WBS SUBTASKS
═══════════════════════════════════════════════════════════ */
exports.getWbs = async (req, res) => {
  try {
    const { milestone_id, project_id } = req.query;
    if (!milestone_id || !project_id) {
      return res.status(400).json({ error: "milestone_id and project_id are required" });
    }

    const milestone = await pool.query(
      "SELECT code FROM wbs WHERE id = $1",
      [milestone_id]
    );

    if (milestone.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    const code = milestone.rows[0].code;

    const result = await pool.query(
      `SELECT id, name, code
       FROM wbs
       WHERE project_id = $1
         AND code LIKE $2
       ORDER BY code`,
      [project_id, `${code}.%`]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("WBS Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   PM REPORTS — read by PM dashboard
   Route: GET /api/diary/pm-reports
═══════════════════════════════════════════════════════════ */
exports.getPMReports = async (req, res) => {
  try {
    const pm_id = req.user?.id;
    const { project_id } = req.query;

    const params = [pm_id];
    let q = `
      SELECT
        d.*,
        u.name  AS engineer_name,
        p.name  AS project_name
      FROM site_engineer_daily_updates d
      JOIN projects p ON p.id = d.project_id
      JOIN users    u ON u.id = d.submitted_by
      WHERE (
        p.pm_id = $1
        OR d.project_id IN (
          SELECT project_id FROM project_team    WHERE user_id = $1
          UNION
          SELECT project_id FROM project_members WHERE user_id = $1
        )
      )
    `;

    if (project_id) {
      params.push(project_id);
      q += ` AND d.project_id = $${params.length}`;
    }

    q += ` ORDER BY d.report_date DESC`;

    const result = await pool.query(q, params).catch(() => ({ rows: [] }));
    res.json(result.rows);

  } catch (err) {
    console.error("PM Reports Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};