// controllers/labourReportController.js

const pool = require("../config/db");

/* =========================================================
   HELPERS
========================================================= */

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const getReportWithTrades = async (id) => {
  const result = await pool.query(
    `
      SELECT
        lr.*,
        u.name AS submitted_by_name,
        p.name AS project_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id',         lrt.id,
              'trade',      lrt.trade,
              'count',      lrt.count,
              'contractor', lrt.contractor,
              'zone',       lrt.zone,
              'activity',   lrt.activity
            )
            ORDER BY lrt.id
          ) FILTER (WHERE lrt.id IS NOT NULL),
          '[]'
        ) AS trades
      FROM labour_report lr
      LEFT JOIN labour_report_trades lrt
        ON lrt.report_id = lr.id
      LEFT JOIN users u
        ON u.id = lr.submitted_by
      LEFT JOIN projects p
        ON p.id = lr.project_id
      WHERE lr.id = $1
      GROUP BY lr.id, u.name, p.name
    `,
    [id]
  );

  return result.rows[0] || null;
};

/* =========================================================
   CREATE LABOUR REPORT
   POST /api/labour-report
========================================================= */

exports.create = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const submittedBy = req.user?.id;

    if (!submittedBy) {
      await client.query("ROLLBACK");

      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    const {
      daily_diary_id,
      date,
      shift,
      weather,
      notes,
      project_id,
      milestone_id,
      trades,
      total_headcount,
    } = req.body;

    /* ---------- VALIDATION ---------- */

    if (!date) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "date is required",
      });
    }

    /* ---------- PARSE TRADES ---------- */

    let parsedTrades = trades;

    if (typeof trades === "string") {
      try {
        parsedTrades = JSON.parse(trades);
      } catch {
        parsedTrades = [];
      }
    }

    if (!Array.isArray(parsedTrades)) {
      parsedTrades = [];
    }

    /* ---------- VALID TRADE ROWS ---------- */

    const validTrades = parsedTrades.filter(
      (t) =>
        t &&
        typeof t.trade === "string" &&
        t.trade.trim() &&
        Number(t.count) > 0
    );

    if (!validTrades.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "At least one trade with headcount is required",
      });
    }

    /* ---------- COMPUTE TOTAL ON SERVER ---------- */

    const computedTotal = validTrades.reduce(
      (sum, t) => sum + (Number(t.count) || 0),
      0
    );

    /* ---------- INSERT REPORT HEADER ---------- */

    const result = await client.query(
      `
        INSERT INTO labour_report
        (
          daily_diary_id,
          date,
          shift,
          weather,
          notes,
          project_id,
          milestone_id,
          submitted_by,
          status,
          total_headcount,
          submitted_at,
          created_at,
          updated_at
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        daily_diary_id || null,
        date,
        shift || "day",
        weather || "clear",
        notes || "",
        toInt(project_id),
        toInt(milestone_id),
        submittedBy,
        "submitted",
        computedTotal,
      ]
    );

    const report = result.rows[0];

    /* ---------- INSERT TRADE ROWS ---------- */

    for (const t of validTrades) {
      await client.query(
        `
          INSERT INTO labour_report_trades
          (
            report_id,
            trade,
            count,
            contractor,
            zone,
            activity
          )
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          report.id,
          t.trade.trim(),
          Number(t.count) || 0,
          t.contractor || "",
          t.zone || "",
          t.activity || "",
        ]
      );
    }

    await client.query("COMMIT");

    const full = await getReportWithTrades(report.id);

    return res.status(201).json(full);
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("labourReport.create error:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  } finally {
    client.release();
  }
};

/* =========================================================
   GET ALL LABOUR REPORTS
   GET /api/labour-report

   Supported query filters:
   date=YYYY-MM-DD
   project_id=N

   The backend decides user-specific filtering from req.user.
========================================================= */

exports.getAll = async (req, res) => {
  try {
    const { date, project_id } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    const conditions = [];
    const params = [];

    /* ---------- DATE FILTER ---------- */

    if (date) {
      params.push(date);
      conditions.push(`lr.date = $${params.length}`);
    }

    /* ---------- PROJECT FILTER ---------- */

    if (project_id) {
      params.push(toInt(project_id));
      conditions.push(`lr.project_id = $${params.length}`);
    }

    /*
      Site Engineer:
      return only reports submitted by the logged-in SE.

      Other roles:
      can access reports allowed by their broader workflow.
    */
    if (userRole === "site_engineer") {
      params.push(userId);
      conditions.push(`lr.submitted_by = $${params.length}`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
        SELECT
          lr.*,
          u.name AS submitted_by_name,
          p.name AS project_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id',         lrt.id,
                'trade',      lrt.trade,
                'count',      lrt.count,
                'contractor', lrt.contractor,
                'zone',       lrt.zone,
                'activity',   lrt.activity
              )
              ORDER BY lrt.id
            ) FILTER (WHERE lrt.id IS NOT NULL),
            '[]'
          ) AS trades
        FROM labour_report lr
        LEFT JOIN labour_report_trades lrt
          ON lrt.report_id = lr.id
        LEFT JOIN users u
          ON u.id = lr.submitted_by
        LEFT JOIN projects p
          ON p.id = lr.project_id
        ${where}
        GROUP BY lr.id, u.name, p.name
        ORDER BY lr.date DESC, lr.created_at DESC
      `,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("labourReport.getAll error:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   GET ONE
   GET /api/labour-report/:id
========================================================= */

exports.getOne = async (req, res) => {
  try {
    const report = await getReportWithTrades(
      toInt(req.params.id)
    );

    if (!report) {
      return res.status(404).json({
        error: "Not found",
      });
    }

    return res.json(report);
  } catch (err) {
    console.error("labourReport.getOne error:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   UPDATE STATUS
   PATCH /api/labour-report/:id

   Only Project Manager may:
   - acknowledge
   - flag
   - add PM comment
========================================================= */

exports.updateStatus = async (req, res) => {
  try {
    const role = req.user?.role;

    if (role !== "project_manager") {
      return res.status(403).json({
        error: "Only Project Managers can update Labour Report status",
      });
    }

    const { status, pm_comment } = req.body;

    const VALID = [
      "submitted",
      "acknowledged",
      "flagged",
    ];

    if (status && !VALID.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}`,
      });
    }

    const sets = ["updated_at = NOW()"];
    const vals = [];

    if (status) {
      vals.push(status);
      sets.push(`status = $${vals.length}`);
    }

    if (pm_comment != null) {
      vals.push(pm_comment);
      sets.push(`pm_comment = $${vals.length}`);
    }

    vals.push(toInt(req.params.id));

    const result = await pool.query(
      `
        UPDATE labour_report
        SET ${sets.join(", ")}
        WHERE id = $${vals.length}
        RETURNING *
      `,
      vals
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Not found",
      });
    }

    const full = await getReportWithTrades(
      req.params.id
    );

    return res.json(full);
  } catch (err) {
    console.error(
      "labourReport.updateStatus:",
      err.message
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   DELETE
   DELETE /api/labour-report/:id

   Only the original submitter can delete.
========================================================= */

exports.remove = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    const reportId = toInt(req.params.id);

    const check = await pool.query(
      `
        SELECT *
        FROM labour_report
        WHERE id = $1
      `,
      [reportId]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        error: "Not found",
      });
    }

    if (
      String(check.rows[0].submitted_by) !==
      String(userId)
    ) {
      return res.status(403).json({
        error: "Not authorised",
      });
    }

    await pool.query(
      `
        DELETE FROM labour_report
        WHERE id = $1
      `,
      [reportId]
    );

    return res.json({
      message: "Deleted",
    });
  } catch (err) {
    console.error("labourReport.remove:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   GET LABOUR REPORT FOR MEASUREMENT
   GET /api/labour-report/measurement/:id

   Used by QS Measurement workflow.
========================================================= */

exports.getMeasurementSource = async (req, res) => {
  try {
    const id = toInt(req.params.id);

    const result = await pool.query(
      `
        SELECT
          lr.id,
          lr.daily_diary_id,
          lr.project_id,
          lr.milestone_id,
          lr.date,
          lr.shift,
          lr.weather,
          lr.notes,

          d.zone,
          d.work_done,

          p.name AS project_name

        FROM labour_report lr

        LEFT JOIN site_engineer_daily_updates d
          ON d.id = lr.daily_diary_id

        LEFT JOIN projects p
          ON p.id = lr.project_id

        WHERE lr.id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Labour Report not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(
      "labourReport.getMeasurementSource:",
      err.message
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};