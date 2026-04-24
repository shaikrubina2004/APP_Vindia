const pool = require("../config/db");

const getSENotifications = async (req, res) => {
  try {
    // Role guard — double security
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Return static notifications for now
    // Replace each array with real DB queries once tables are confirmed
    const notifications = [
      { id: "se1",  type: "drawing",  severity: "critical", title: "Drawing Review Pending",  description: "Eiffel Tower – Revised structural drawings awaiting your review",    created_at: new Date(), is_read: false },
      { id: "se2",  type: "incident", severity: "critical", title: "Structural Issue Alert",  description: "Beam deflection exceeded tolerance on Block B",                       created_at: new Date(), is_read: false },
      { id: "se3",  type: "rfi",      severity: "warn",     title: "RFI #14 Response Due",    description: "Slab thickness clarification – response due today EOD",               created_at: new Date(), is_read: false },
      { id: "se4",  type: "drawing",  severity: "warn",     title: "Drawing Version Updated", description: "NH-66 – Foundation drawing updated to v2.3 by site team",            created_at: new Date(), is_read: false },
      { id: "se5",  type: "work",     severity: "warn",     title: "Daily Update Due",        description: "Today's structural site update not yet submitted",                    created_at: new Date(), is_read: false },
      { id: "se6",  type: "incident", severity: "warn",     title: "Crack Observed",          description: "NH-66 – Hairline crack in retaining wall, Block D",                  created_at: new Date(), is_read: false },
      { id: "se7",  type: "approval", severity: "warn",     title: "Approval Pending",        description: "Block C structural start awaiting PM sign-off",                      created_at: new Date(), is_read: false },
      { id: "se8",  type: "drawing",  severity: "ok",       title: "Drawing Approved",        description: "Eiffel Tower – Block A structural drawings approved by PM",          created_at: new Date(), is_read: true  },
      { id: "se9",  type: "rfi",      severity: "ok",       title: "RFI Closed",              description: "RFI #12 – Steel grade clarification resolved",                       created_at: new Date(), is_read: true  },
      { id: "se10", type: "approval", severity: "info",     title: "Material Test Report",    description: "Concrete cube test report uploaded for review – Eiffel Tower",        created_at: new Date(), is_read: true  },
    ];

    return res.json({ success: true, notifications });

  } catch (err) {
    console.error("SE Notification error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const markSENotificationRead = async (req, res) => {
  try {
    if (req.user?.role !== "structural_engineer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    // Frontend manages read state locally — just acknowledge
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getSENotifications, markSENotificationRead };