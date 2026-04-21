// backend/controllers/dashboardController.js
const Dashboard = require("../models/Dashboard");

// Get Site Engineer Dashboard summary
const getSiteEngineerDashboard = async (req, res) => {
  try {
    const [rfiSummary, ncrSummary, activity, labourCount, zoneProgress, weekProgress] = await Promise.all([
      Dashboard.getRFISummary(),
      Dashboard.getNCRSummary(),
      Dashboard.getRecentActivity(10),
      Dashboard.getLabourToday(),
      Dashboard.getZoneProgress(),
      Dashboard.getWeekProgress(),
    ]);

    res.json({
      success: true,
      data: {
        kpi: {
          weekProgress,
          openRFIs: rfiSummary.open_count,
          totalRFIs: rfiSummary.total,
          openNCRs: ncrSummary.open_count,
          totalNCRs: ncrSummary.total,
          criticalHolds: ncrSummary.hold_count,
          labourToday: labourCount,
        },
        zones: zoneProgress,
        activity: activity.map(a => ({
          type: a.type.toLowerCase(),
          id: a.id,
          label: a.label,
          priority: a.priority,
          status: a.status,
          timestamp: a.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

// Get RFI and NCR counts
const getDashboardMetrics = async (req, res) => {
  try {
    const rfiSummary = await Dashboard.getRFISummary();
    const ncrSummary = await Dashboard.getNCRSummary();

    res.json({
      success: true,
      data: {
        rfi: {
          open: rfiSummary.open_count,
          total: rfiSummary.total,
          critical: rfiSummary.critical_count,
        },
        ncr: {
          open: ncrSummary.open_count,
          total: ncrSummary.total,
          holds: ncrSummary.hold_count,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ success: false, message: "Failed to fetch metrics" });
  }
};

module.exports = {
  getSiteEngineerDashboard,
  getDashboardMetrics,
};