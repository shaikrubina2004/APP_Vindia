const pool = require("../config/db");
const { isAssignedProject } = require("../utils/siteEngineerAccess");

async function canAccessDashboardProject(req, projectId) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "ceo") return true;
  if (role === "site_engineer") {
    return isAssignedProject(req.user.id, projectId);
  }
  if (role === "project_manager") {
    const result = await pool.query(
      `SELECT 1
         FROM projects p
         JOIN employees e ON e.id = p.manager_id
        WHERE p.id = $1
          AND e.user_id = $2
        LIMIT 1`,
      [Number(projectId), req.user.id]
    );
    return result.rows.length > 0;
  }
  return false;
}

async function getProjectName(projectId) {
  const result = await pool.query(
    "SELECT name FROM projects WHERE id = $1",
    [projectId]
  );
  return result.rows[0]?.name || null;
}

const getSiteEngineerDashboard = async (req, res) => {
  try {
    const projectId = Number(req.query.project_id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: "A valid project_id is required" });
    }
    if (!(await canAccessDashboardProject(req, projectId))) {
      return res.status(403).json({ success: false, message: "You cannot access this project" });
    }

    const projectName = await getProjectName(projectId);
    if (!projectName) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const [labour, zones, activity] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(morning_skilled, 0)
                          + COALESCE(morning_unskilled, 0)
                          + COALESCE(morning_supervisors, 0)), 0) AS total_labour
           FROM site_progress
          WHERE project_id = $1
            AND date = CURRENT_DATE`,
        [projectId]
      ),
      pool.query(
        `SELECT zone, ROUND(AVG(percent_complete), 2) AS progress
           FROM site_progress
          WHERE project_id = $1
          GROUP BY zone
          ORDER BY zone`,
        [projectId]
      ),
      pool.query(
        `SELECT type, id, label, priority, status, created_at
           FROM (
             SELECT 'RFI' AS type, id, subject AS label, priority, status, created_at
               FROM rfis
              WHERE project_name = $1
             UNION ALL
             SELECT 'Progress' AS type, id, activity AS label, NULL AS priority,
                    'recorded' AS status, created_at
               FROM site_progress
              WHERE project_id = $2
           ) recent
          ORDER BY created_at DESC
          LIMIT 10`,
        [projectName, projectId]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        project_id: projectId,
        kpi: { labourToday: Number(labour.rows[0]?.total_labour || 0) },
        zones: zones.rows,
        activity: activity.rows,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load project dashboard" });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const { project_id: requestedProjectId } = req.query;
    const role = String(req.user?.role || "").toLowerCase();

    if (role === "ceo" && !requestedProjectId) {
      const result = await pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'open') AS open_count,
           COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count
         FROM rfis`
      );
      const ncr = await pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'open') AS open_count,
           COUNT(*) FILTER (WHERE "holdPlaced" = true) AS hold_count
         FROM ncr`
      );
      return res.json({
        success: true,
        data: {
          rfi: {
            open: Number(result.rows[0]?.open_count || 0),
            total: Number(result.rows[0]?.total || 0),
            critical: Number(result.rows[0]?.critical_count || 0),
          },
          ncr: {
            open: Number(ncr.rows[0]?.open_count || 0),
            total: Number(ncr.rows[0]?.total || 0),
            holds: Number(ncr.rows[0]?.hold_count || 0),
          },
        },
      });
    }

    const projectId = Number(requestedProjectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: "A valid project_id is required" });
    }
    if (!(await canAccessDashboardProject(req, projectId))) {
      return res.status(403).json({ success: false, message: "You cannot access this project" });
    }

    const projectName = await getProjectName(projectId);
    if (!projectName) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    const rfi = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'open') AS open_count,
         COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count
       FROM rfis
       WHERE project_name = $1`,
      [projectName]
    );

    return res.json({
      success: true,
      data: {
        rfi: {
          open: Number(rfi.rows[0]?.open_count || 0),
          total: Number(rfi.rows[0]?.total || 0),
          critical: Number(rfi.rows[0]?.critical_count || 0),
        },
        ncr: null,
      },
    });
  } catch (error) {
    console.error("Metrics Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch metrics" });
  }
};

const getZoneProgress = async (req, res) => {
  try {
    const requestedProjectId = req.query.project_id;
    let where = "";
    const values = [];

    if (requestedProjectId) {
      const projectId = Number(requestedProjectId);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid project_id" });
      }
      if (!(await canAccessDashboardProject(req, projectId))) {
        return res.status(403).json({ success: false, message: "You cannot access this project" });
      }
      values.push(projectId);
      where = "WHERE project_id = $1";
    } else if (req.user?.role !== "ceo") {
      return res.status(400).json({ success: false, message: "A valid project_id is required" });
    }

    const result = await pool.query(
      `SELECT zone, ROUND(AVG(percent_complete), 2) AS progress
         FROM site_progress
         ${where}
        GROUP BY zone
        ORDER BY zone`,
      values
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Zone Progress Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch zone progress" });
  }
};

const getLabourToday = async (req, res) => {
  try {
    const projectId = Number(req.query.project_id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: "A valid project_id is required" });
    }
    if (!(await canAccessDashboardProject(req, projectId))) {
      return res.status(403).json({ success: false, message: "You cannot access this project" });
    }
    const result = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(morning_skilled, 0)
                        + COALESCE(morning_unskilled, 0)
                        + COALESCE(morning_supervisors, 0)), 0) AS total_labour
         FROM site_progress
        WHERE date = CURRENT_DATE
          AND project_id = $1`,
      [projectId]
    );
    return res.json({ success: true, data: Number(result.rows[0]?.total_labour || 0) });
  } catch (error) {
    console.error("Labour Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch labour count" });
  }
};

module.exports = {
  getSiteEngineerDashboard,
  getDashboardMetrics,
  getZoneProgress,
  getLabourToday,
};
