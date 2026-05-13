const pool = require("../config/db");
const XLSX = require("xlsx");

// ══════════════════════════════════════════
//  PROJECT REPORT — progress phases from WBS
// ══════════════════════════════════════════
exports.getProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    // WBS phases (top-level = milestones)
    const wbsRows = await pool.query(
      `SELECT id, name, code,
              COALESCE(progress, 0) AS progress,
              status
       FROM wbs
       WHERE project_id = $1 AND parent_id IS NULL
       ORDER BY created_at ASC`,
      [projectId]
    );

    // Sub-tasks for milestones (children)
    const subTasks = await pool.query(
      `SELECT parent_id, status
       FROM wbs
       WHERE project_id = $1 AND parent_id IS NOT NULL`,
      [projectId]
    );

    // Count daily reports this week
    const weeklyTasks = await pool.query(
      `SELECT COUNT(*) AS count
       FROM daily_reports
       WHERE project_name IN (SELECT name FROM projects WHERE id = $1)
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [projectId]
    );

    // Delayed milestones
    const delayed = await pool.query(
      `SELECT COUNT(*) AS count FROM wbs
       WHERE project_id = $1 AND parent_id IS NULL
         AND LOWER(status) LIKE '%delay%'`,
      [projectId]
    );

    const phases = wbsRows.rows.map((w) => ({
      name: w.name,
      progress: parseInt(w.progress) || 0,
      status: w.status || "Pending",
    }));

    const overallProgress =
      phases.length > 0
        ? Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length)
        : 0;

    // Build milestones list from WBS top-level rows
    const milestones = wbsRows.rows.map((w) => ({
      name: w.name,
      target_date: null, // WBS doesn't store dates
      status:
        parseInt(w.progress) === 100
          ? "done"
          : w.status?.toLowerCase().includes("delay")
          ? "delayed"
          : "pending",
    }));

    res.json({
      overall: overallProgress,
      weeklyTasks: parseInt(weeklyTasks.rows[0]?.count) || 0,
      delayedMilestones: parseInt(delayed.rows[0]?.count) || 0,
      phases,
      milestones,
      latestReport: null,
    });
  } catch (err) {
    console.error("PM project report error:", err);
    res.status(500).json({ error: "Failed to load project report" });
  }
};

// ══════════════════════════════════════════
//  COST REPORT — from BOQ + cost_reports
// ══════════════════════════════════════════
exports.getCostReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Total budget from approved BOQs
    const budget = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) AS total
       FROM boqs WHERE project_id = $1 AND status != 'rejected'`,
      [projectId]
    );

    // Total spent from cost_reports
    const spent = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total
       FROM cost_reports WHERE project_id = $1`,
      [projectId]
    );

    // Per-category breakdown (from BOQ rows vs cost_report rows)
    const categories = await pool.query(
      `SELECT
         w.name AS category,
         COALESCE(SUM(b.grand_total), 0) AS budget,
         COALESCE(
           (SELECT SUM(cr.total_cost) FROM cost_reports cr
            WHERE cr.project_id = $1 AND cr.milestone_id = w.id), 0
         ) AS spent
       FROM wbs w
       LEFT JOIN boqs b ON b.milestone_id = w.id AND b.project_id = $1 AND b.status != 'rejected'
       WHERE w.project_id = $1 AND w.parent_id IS NULL
       GROUP BY w.id, w.name
       ORDER BY budget DESC`,
      [projectId]
    );

    // Weekly trend — last 5 weeks of cost_reports
    const trend = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week,
         COALESCE(SUM(total_cost), 0) AS spent
       FROM cost_reports
       WHERE project_id = $1
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY DATE_TRUNC('week', created_at) DESC
       LIMIT 5`,
      [projectId]
    );

    res.json({
      budget: parseFloat(budget.rows[0]?.total) || 0,
      spent: parseFloat(spent.rows[0]?.total) || 0,
      categories: categories.rows.map((c) => ({
        name: c.category,
        budget: parseFloat(c.budget) || 0,
        spent: parseFloat(c.spent) || 0,
      })),
      trend: trend.rows.reverse(),
    });
  } catch (err) {
    console.error("PM cost report error:", err);
    res.status(500).json({ error: "Failed to load cost report" });
  }
};

// ══════════════════════════════════════════
//  TIMESHEET REPORT — from team_members
// ══════════════════════════════════════════
exports.getTimesheetReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    const members = await pool.query(
      `SELECT tm.name, tm.role, tm.type,
              COALESCE(tm.hours, 0) AS hours,
              COALESCE(tm.tasks_count, 0) AS tasks,
              COALESCE(tm.days_worked, 0) AS days_worked,
              p.name AS project_name
       FROM team_members tm
       LEFT JOIN projects p ON p.id = tm.project_id
       WHERE tm.project_id = $1 AND tm.status = 'Active'
       ORDER BY tm.name ASC`,
      [projectId]
    );

    const totalHours = members.rows.reduce((s, m) => s + parseInt(m.hours || 0), 0);
    const totalTasks = members.rows.reduce((s, m) => s + parseInt(m.tasks || 0), 0);

    // Weekly hours trend (from daily_reports submissions this project)
    const trend = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week,
         COUNT(*) AS submissions
       FROM daily_reports
       WHERE project_name IN (SELECT name FROM projects WHERE id = $1)
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY DATE_TRUNC('week', created_at) DESC
       LIMIT 6`,
      [projectId]
    );

    res.json({
      totalHours,
      totalTasks,
      activeWorkers: members.rows.length,
      employees: members.rows.map((m) => ({
        name: m.name,
        role: m.role,
        type: m.type,
        hours: parseInt(m.hours || 0),
        tasks: parseInt(m.tasks || 0),
        days_worked: parseInt(m.days_worked || 0),
      })),
      trend: trend.rows.reverse(),
    });
  } catch (err) {
    console.error("PM timesheet report error:", err);
    res.status(500).json({ error: "Failed to load timesheet report" });
  }
};

// ══════════════════════════════════════════
//  INCIDENT REPORT — from incidents table
// ══════════════════════════════════════════
exports.getIncidentReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    const incidents = await pool.query(
      `SELECT id, title, priority, status, severity,
              created_at, updated_at,
              EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
       FROM incidents
       WHERE project_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC
       LIMIT 50`,
      [projectId]
    );

    const rows = incidents.rows;

    const total = rows.length;
    const open = rows.filter((r) => !["Closed", "Resolved"].includes(r.status)).length;
    const closed = rows.filter((r) => ["Closed", "Resolved"].includes(r.status)).length;

    const byPriority = ["P1", "P2", "P3"].map((p) => ({
      label: p === "P1" ? "P1 Urgent" : p === "P2" ? "P2 Medium" : "P3 Low",
      count: rows.filter((r) => r.priority === p).length,
      color: p === "P1" ? "#ef4444" : p === "P2" ? "#f59e0b" : "#22c55e",
    }));

    const statusOrder = ["Created", "Assigned", "In Progress", "Resolved", "Closed"];
    const byStatus = statusOrder.map((s) => ({
      label: s,
      count: rows.filter((r) => r.status === s).length,
    }));

    const recent = rows.slice(0, 10).map((r) => ({
      id: `INC-${String(r.id).padStart(3, "0")}`,
      title: r.title,
      priority: r.priority || "P3",
      status: r.status || "Created",
      age:
        r.age_hours < 24
          ? `${Math.round(r.age_hours)}h`
          : `${Math.round(r.age_hours / 24)}d`,
    }));

    res.json({ total, open, closed, byPriority, byStatus, recent });
  } catch (err) {
    console.error("PM incident report error:", err);
    res.status(500).json({ error: "Failed to load incident report" });
  }
};

// ══════════════════════════════════════════
//  EXPORT PROJECT REPORT TO EXCEL
// ══════════════════════════════════════════
exports.exportProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type } = req.query; // project | cost | timesheet | incident

    let rows = [];
    let sheetName = "Report";
    let filename = "report";

    if (type === "project") {
      const wbs = await pool.query(
        `SELECT name, COALESCE(progress,0) AS progress, status
         FROM wbs WHERE project_id = $1 AND parent_id IS NULL ORDER BY created_at`,
        [projectId]
      );
      rows = wbs.rows.map((r) => ({
        Phase: r.name,
        "Progress (%)": r.progress,
        Status: r.status,
      }));
      sheetName = "Project Progress";
      filename = "project-report";
    } else if (type === "cost") {
      const cr = await pool.query(
        `SELECT cr.phase, cr.total_cost, cr.created_at
         FROM cost_reports cr WHERE cr.project_id = $1 ORDER BY cr.created_at DESC`,
        [projectId]
      );
      rows = cr.rows.map((r) => ({
        Phase: r.phase,
        "Total Cost (₹)": parseFloat(r.total_cost),
        Date: new Date(r.created_at).toLocaleDateString("en-IN"),
      }));
      sheetName = "Cost Report";
      filename = "cost-report";
    } else if (type === "timesheet") {
      const tm = await pool.query(
        `SELECT name, role, hours, tasks_count, days_worked
         FROM team_members WHERE project_id = $1 AND status = 'Active'`,
        [projectId]
      );
      rows = tm.rows.map((r) => ({
        Employee: r.name,
        Role: r.role,
        Hours: r.hours || 0,
        Tasks: r.tasks_count || 0,
        "Days Worked": r.days_worked || 0,
      }));
      sheetName = "Timesheet";
      filename = "timesheet-report";
    } else if (type === "incident") {
      const inc = await pool.query(
        `SELECT title, priority, status, severity, created_at
         FROM incidents WHERE project_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC`,
        [projectId]
      );
      rows = inc.rows.map((r) => ({
        Title: r.title,
        Priority: r.priority,
        Status: r.status,
        Severity: r.severity,
        Date: new Date(r.created_at).toLocaleDateString("en-IN"),
      }));
      sheetName = "Incidents";
      filename = "incident-report";
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${filename}-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("PM export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
};