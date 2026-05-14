const pool = require("../config/db");
const Dashboard = require("../models/Dashboard");

// ✅ MAIN DASHBOARD (ONLY ONE VERSION)
const getSiteEngineerDashboard = async (req, res) => {
  try {
    const projectId = req.query.project_id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "project_id required"
      });
    }

    const [
      rfiSummary,
      ncrSummary,
      activity,
      labourCount,
      zoneProgress,
      weekProgress
    ] = await Promise.all([
      Dashboard.getRFISummary(projectId),
      Dashboard.getNCRSummary(projectId),
      Dashboard.getRecentActivity(10, projectId),
      Dashboard.getLabourToday(projectId),
      Dashboard.getZoneProgress(projectId),
      Dashboard.getWeekProgress(projectId),
    ]);

    res.json({
      success: true,
      data: {
        kpi: {
          labourToday: labourCount || 0,
        },
        zones: zoneProgress || [],
        activity
      }
    });

  } catch (error) {
    console.error("Dashboard Error 👉", error);
    res.status(500).json({ success: false });
  }
};

// ✅ METRICS
const getDashboardMetrics = async (req, res) => {
  try {
    const rfiSummary = await Dashboard.getRFISummary();
    const ncrSummary = await Dashboard.getNCRSummary();

    res.json({
      success: true,
      data: {
        rfi: {
          open: rfiSummary?.open_count || 0,
          total: rfiSummary?.total || 0,
          critical: rfiSummary?.critical_count || 0,
        },
        ncr: {
          open: ncrSummary?.open_count || 0,
          total: ncrSummary?.total || 0,
          holds: ncrSummary?.hold_count || 0,
        },
      },
    });

  } catch (error) {
    console.error("Metrics Error 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch metrics",
    });
  }
};

// ✅ ZONE PROGRESS
const getZoneProgress = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        zone,
        ROUND(AVG(percent_complete), 2) as progress
      FROM site_progress
      GROUP BY zone
      ORDER BY zone
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Zone Progress Error 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch zone progress"
    });
  }
};

// ✅ LABOUR
const getLabourToday = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(morning_skilled),0) +
        COALESCE(SUM(morning_unskilled),0) +
        COALESCE(SUM(morning_supervisors),0) AS total_labour
      FROM site_progress
      WHERE date = CURRENT_DATE
    `);

    res.json({
      success: true,
      data: result.rows[0].total_labour || 0
    });

  } catch (error) {
    console.error("Labour Error 👉", error);
    res.status(500).json({
      success: false
    });
  }
};

module.exports = {
  getSiteEngineerDashboard,
  getDashboardMetrics,
  getZoneProgress,
  getLabourToday,
};