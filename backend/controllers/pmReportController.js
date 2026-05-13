const pool = require("../config/db");
const XLSX = require("xlsx");

exports.getProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const wbsRows = await pool.query(
      `SELECT id, name, COALESCE(progress, 0) AS progress, status
       FROM wbs WHERE project_id = $1 AND parent_id IS NULL ORDER BY created_at ASC`,
      [projectId]
    );
    const weeklyTasks = await pool.query(
      `SELECT COUNT(*) AS count FROM daily_reports
       WHERE project_name IN (SELECT name FROM projects WHERE id = $1)
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [projectId]
    );
    const delayed = await pool.query(
      `SELECT COUNT(*) AS count FROM wbs
       WHERE project_id = $1 AND parent_id IS NULL AND LOWER(status) LIKE '%delay%'`,
      [projectId]
    );
    const phases = wbsRows.rows.map((w) => ({
      name: w.name,
      progress: parseInt(w.progress) || 0,
      status: w.status || "Pending",
    }));
    const overallProgress = phases.length > 0
      ? Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length) : 0;
    const milestones = wbsRows.rows.map((w) => ({
      name: w.name,
      status: parseInt(w.progress) === 100 ? "done"
        : w.status?.toLowerCase().includes("delay") ? "delayed" : "pending",
    }));
    res.json({ overall: overallProgress, weeklyTasks: parseInt(weeklyTasks.rows[0]?.count) || 0,
      delayedMilestones: parseInt(delayed.rows[0]?.count) || 0, phases, milestones });
  } catch (err) {
    console.error("PM project report error:", err.message);
    res.status(500).json({ error: "Failed to load project report", detail: err.message });
  }
};

exports.getCostReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const budget = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) AS total FROM boqs WHERE project_id = $1 AND status != 'rejected'`,
      [projectId]
    );
    const spent = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total FROM cost_reports WHERE project_id = $1`,
      [projectId]
    );
    const categories = await pool.query(
      `SELECT w.name AS category,
         COALESCE(SUM(b.grand_total), 0) AS budget,
         COALESCE((SELECT SUM(cr.total_cost) FROM cost_reports cr
           WHERE cr.project_id = $1 AND cr.milestone_id = w.id), 0) AS spent
       FROM wbs w
       LEFT JOIN boqs b ON b.milestone_id = w.id AND b.project_id = $1 AND b.status != 'rejected'
       WHERE w.project_id = $1 AND w.parent_id IS NULL
       GROUP BY w.id, w.name ORDER BY budget DESC`,
      [projectId]
    );
    const trend = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week,
         COALESCE(SUM(total_cost), 0) AS spent
       FROM cost_reports WHERE project_id = $1
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY DATE_TRUNC('week', created_at) ASC LIMIT 6`,
      [projectId]
    );
    res.json({
      budget: parseFloat(budget.rows[0]?.total) || 0,
      spent: parseFloat(spent.rows[0]?.total) || 0,
      categories: categories.rows.map((c) => ({ name: c.category, budget: parseFloat(c.budget) || 0, spent: parseFloat(c.spent) || 0 })),
      trend: trend.rows,
    });
  } catch (err) {
    console.error("PM cost report error:", err.message);
    res.status(500).json({ error: "Failed to load cost report", detail: err.message });
  }
};

exports.getTimesheetReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const members = await pool.query(
      `SELECT name, role, type, COALESCE(hours, 0) AS hours,
         COALESCE(tasks_count, 0) AS tasks, COALESCE(days_worked, 0) AS days_worked
       FROM team_members WHERE project_id = $1 AND status = 'Active' ORDER BY name ASC`,
      [projectId]
    );
    const trend = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week, COUNT(*) AS submissions
       FROM daily_reports WHERE project_name IN (SELECT name FROM projects WHERE id = $1)
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY DATE_TRUNC('week', created_at) ASC LIMIT 6`,
      [projectId]
    );
    const totalHours = members.rows.reduce((s, m) => s + parseInt(m.hours || 0), 0);
    const totalTasks = members.rows.reduce((s, m) => s + parseInt(m.tasks || 0), 0);
    res.json({
      totalHours, totalTasks, activeWorkers: members.rows.length,
      employees: members.rows.map((m) => ({ name: m.name, role: m.role, type: m.type,
        hours: parseInt(m.hours || 0), tasks: parseInt(m.tasks || 0), days_worked: parseInt(m.days_worked || 0) })),
      trend: trend.rows,
    });
  } catch (err) {
    console.error("PM timesheet report error:", err.message);
    res.status(500).json({ error: "Failed to load timesheet report", detail: err.message });
  }
};

exports.getIncidentReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const isNull = !projectId || projectId === "null";
    const { rows } = await pool.query(
      isNull
        ? `SELECT id, title, priority, status, created_at,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
           FROM incidents WHERE is_deleted = FALSE ORDER BY created_at DESC LIMIT 50`
        : `SELECT id, title, priority, status, created_at,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
           FROM incidents WHERE project_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 50`,
      isNull ? [] : [projectId]
    );
    const total = rows.length;
    const open   = rows.filter((r) => !["Closed","Resolved"].includes(r.status)).length;
    const closed = rows.filter((r) => ["Closed","Resolved"].includes(r.status)).length;
    const byPriority = [
      { label: "P1 Urgent", key: "P1", color: "#ef4444" },
      { label: "P2 Medium", key: "P2", color: "#f59e0b" },
      { label: "P3 Low",    key: "P3", color: "#22c55e" },
    ].map((p) => ({ ...p, count: rows.filter((r) => r.priority === p.key).length }));
    const byStatus = ["Created","Assigned","In Progress","Resolved","Closed"].map((s) => ({
      label: s, count: rows.filter((r) => r.status === s).length,
    }));
    const recent = rows.slice(0, 10).map((r) => ({
      id: `INC-${String(r.id).padStart(3,"0")}`, title: r.title,
      priority: r.priority || "P3", status: r.status || "Created",
      age: r.age_hours < 24 ? `${Math.round(r.age_hours)}h` : `${Math.round(r.age_hours/24)}d`,
    }));
    res.json({ total, open, closed, byPriority, byStatus, recent });
  } catch (err) {
    console.error("PM incident report error:", err.message);
    res.status(500).json({ error: "Failed to load incident report", detail: err.message });
  }
};

exports.exportProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type } = req.query;
    let rows = [], sheetName = "Report", filename = "report";
    if (type === "project") {
      const { rows: r } = await pool.query(
        `SELECT name, COALESCE(progress,0) AS progress, status FROM wbs WHERE project_id=$1 AND parent_id IS NULL ORDER BY created_at`, [projectId]
      );
      rows = r.map((x) => ({ Phase: x.name, "Progress (%)": x.progress, Status: x.status }));
      sheetName = "Project Progress"; filename = "project-report";
    } else if (type === "cost") {
      const { rows: r } = await pool.query(
        `SELECT milestone_name, total_cost, material_total, labour_total, status, created_at FROM cost_reports WHERE project_id=$1 ORDER BY created_at DESC`, [projectId]
      );
      rows = r.map((x) => ({ Phase: x.milestone_name, "Total (₹)": parseFloat(x.total_cost||0),
        "Material (₹)": parseFloat(x.material_total||0), "Labour (₹)": parseFloat(x.labour_total||0),
        Status: x.status, Date: new Date(x.created_at).toLocaleDateString("en-IN") }));
      sheetName = "Cost Report"; filename = "cost-report";
    } else if (type === "timesheet") {
      const { rows: r } = await pool.query(
        `SELECT name, role, type, hours, tasks_count, days_worked FROM team_members WHERE project_id=$1 AND status='Active' ORDER BY name`, [projectId]
      );
      rows = r.map((x) => ({ Employee: x.name, Role: x.role, Type: x.type, Hours: x.hours||0, Tasks: x.tasks_count||0, "Days Worked": x.days_worked||0 }));
      sheetName = "Timesheet"; filename = "timesheet-report";
    } else if (type === "incident") {
      const { rows: r } = await pool.query(
        `SELECT title, priority, status, created_at FROM incidents WHERE project_id=$1 AND is_deleted=FALSE ORDER BY created_at DESC`, [projectId]
      );
      rows = r.map((x) => ({ Title: x.title, Priority: x.priority, Status: x.status, Date: new Date(x.created_at).toLocaleDateString("en-IN") }));
      sheetName = "Incidents"; filename = "incident-report";
    }
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data found" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename=${filename}-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("PM export error:", err.message);
    res.status(500).json({ error: "Export failed", detail: err.message });
  }
};