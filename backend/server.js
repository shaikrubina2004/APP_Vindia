const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const path = require("path");
const fs   = require("fs");

/* ── Upload directory ────────────────────────────────────── */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ═══════════════════════════════════════════════════════════
   ROUTE IMPORTS
═══════════════════════════════════════════════════════════ */

/* ── Auth + Users ─────────────────────────────────────────── */
const authRoutes       = require("./routes/authRoutes");
const userRoutes       = require("./routes/userRoutes");
const employeeRoutes   = require("./routes/employeeRoutes");

/* ── HR ───────────────────────────────────────────────────── */
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes      = require("./routes/leaveRoutes");
const rolesRoutes = require("./routes/rolesRoutes");
/* ── Project Module ───────────────────────────────────────── */
const projectRoutes    = require("./routes/projectRoutes");
const wbsRoutes        = require("./routes/wbsRoutes");
const costRoutes       = require("./routes/costRoutes");
const dashboardRoutes  = require("./routes/dashboardRoutes");
const teamRoutes = require("./routes/teamRoutes");
/* ── Other Core Modules ───────────────────────────────────── */
const timesheetRoutes  = require("./routes/timesheetRoutes");
const dailyRoutes      = require("./routes/dailyUpdatesRoutes");
const analysisRoutes   = require("./routes/analysis");

/* ── Incident ─────────────────────────────────────────────── */
const incidentRoutes   = require("./routes/IncidentRoutes");

/* ── Project Coordinator ──────────────────────────────────── */
const pcDailyUpdateRoutes   = require("./routes/pcDailyUpdateRoutes");
const templateRoutes         = require("./routes/templateRoutes");
const pcNotificationsRouter  = require("./routes/pcNotifications");

/* ── Site Engineer ────────────────────────────────────────── */
const siteEngineerRfiRoutes       = require("./routes/siteEngineerRfiRoutes");
const ncrRoutes                    = require("./routes/ncrRoutes");
const siteDiaryRoutes              = require("./routes/siteDiaryRoutes");
const activityLogRoutes            = require("./routes/activityLogRoutes");
const progressRoutes               = require("./routes/progressRoutes");
const siteEngineerDashboardRoutes  = require("./routes/siteEngineerDashboardRoutes");
const materialRequestRoutes        = require("./routes/materialRequestRoutes");
const snagRoutes                   = require("./routes/snagRoutes");

/* ── Architect ────────────────────────────────────────────── */
const architectProjectsRoutes       = require("./routes/architectProjects");
const architectDailyLogRoutes       = require("./routes/architectDailyLogRoutes");
const architectDesignRoutes         = require("./routes/architectDesignRoutes");
const architectDrawingUploadRoutes  = require("./routes/architectDrawingUploadRoutes");
const architectAssignRoutes         = require("./routes/architectAssignRoutes");
const architectNotifRoutes          = require("./routes/architectNotificationsRoutes");

/* ── File Uploads / Drawings (shared) ─────────────────────── */
const drawingUploadRoutes  = require("./routes/drawingUploadRoutes");

/* ── Structural Engineer ──────────────────────────────────── */
const structuralRoutes      = require("./routes/structuralRoutes");
const seDailyRoutes         = require("./routes/seDailyupdatesRoutes");
const rfiRoutes             = require("./routes/rfiRoutes");
const seNotificationRoutes  = require("./routes/seNotificationRoutes");

/* ── QS ───────────────────────────────────────────────────── */
const qsRoutes             = require("./routes/qsRoutes");
const boqRoutes            = require("./routes/boqRoutes");
const costReportRoutes     = require("./routes/costReportRoutes");
const quantityReportRoutes = require("./routes/Quantityreportroutes.js");
const qsNotifRoutes        = require("./routes/qsNotificationRoutes");
const measurementRoutes = require("./routes/measurementRoutes");

/* ── MEP ──────────────────────────────────────────────────── */
const mepNotifRoutes = require("./routes/mepNotificationsRoutes");

/* ── BDA / Leads ──────────────────────────────────────────── */
const leadRoutes     = require("./routes/leadRoutes");
const reportRoutes   = require("./routes/reportRoutes");
const pmReportRoutes = require("./routes/pmReportRoutes");
const metaRoutes     = require("./routes/metaRoutes");
const bdaNotifRoutes = require("./routes/bdaNotificationRoutes");

/* ═══════════════════════════════════════════════════════════
   APP + MIDDLEWARE
═══════════════════════════════════════════════════════════ */
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Static uploads ───────────────────────────────────────── */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ═══════════════════════════════════════════════════════════
   DB HEALTH CHECK
═══════════════════════════════════════════════════════════ */
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* ═══════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════ */

/* ── Auth + Users ─────────────────────────────────────────── */
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/employees", employeeRoutes);

/* ── HR ───────────────────────────────────────────────────── */
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves",     leaveRoutes);
app.use("/api/roles", rolesRoutes);

/* ── Project ──────────────────────────────────────────────── */
app.use("/api/projects",     projectRoutes);
app.use("/api/wbs",          wbsRoutes);
app.use("/api/cost-summary", costRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/team", teamRoutes);
/* ── Structural Engineer ──────────────────────────────────── */
app.use("/api/structural",       structuralRoutes);
app.use("/api/se-daily-reports", seDailyRoutes);
app.use("/api/rfis",             rfiRoutes);
app.use("/api/se-notifications", seNotificationRoutes);

/* ── QS ───────────────────────────────────────────────────── */
app.use("/api/qs/notifications", qsNotifRoutes);
app.use("/api/qs",               qsRoutes);
app.use("/api/boq",              boqRoutes);
app.use("/api/cost-report",      costReportRoutes);
app.use("/api/quantity-report",  quantityReportRoutes);
app.use("/api/measurement", measurementRoutes);
/* ── Other Core ───────────────────────────────────────────── */
app.use("/api/timesheets",       timesheetRoutes);
app.use("/api/daily-reports",    dailyRoutes);
app.use("/api/analysis",         analysisRoutes);
app.use("/api/mep-notifications",mepNotifRoutes);

/* ── Incidents ────────────────────────────────────────────── */
app.use("/api/incidents", incidentRoutes);

/* ── Project Coordinator ──────────────────────────────────── */
app.use("/api/pc-daily-updates", pcDailyUpdateRoutes);
app.use("/api/templates",        templateRoutes);
app.use("/api/pc-notifications", pcNotificationsRouter);

/* ── Architect ────────────────────────────────────────────── */
app.use("/api/architect",               architectProjectsRoutes);
app.use("/api/architect-daily-log",     architectDailyLogRoutes);
app.use("/api/architect-designs",       architectDesignRoutes);
app.use("/api/architect-drawings",      architectDrawingUploadRoutes);
app.use("/api/architect-assign",        architectAssignRoutes);
app.use("/api/architect-notifications", architectNotifRoutes);

/* ── Site Engineer ────────────────────────────────────────── */
app.use("/api/site-engineer/rfi",     siteEngineerRfiRoutes);
app.use("/api/ncr",                   ncrRoutes);
app.use("/api/diary",                 siteDiaryRoutes);
app.use("/api/activity-log",          activityLogRoutes);
app.use("/api/progress",              progressRoutes);
app.use("/api/site-engineer-dashboard", siteEngineerDashboardRoutes);
app.use("/api/material-request",      materialRequestRoutes);
app.use("/api/snags",                 snagRoutes);

/* ── Drawings (shared — architect issues, SE reads) ───────── */
app.use("/api/drawings", drawingUploadRoutes);

/* ── BDA / Leads ──────────────────────────────────────────── */
app.use("/api/leads",            leadRoutes);
app.use("/api/reports",          reportRoutes);
app.use("/api/pm-reports",       pmReportRoutes);
app.use("/api/meta",             metaRoutes);
app.use("/api/bda-notifications",bdaNotifRoutes);

/* ═══════════════════════════════════════════════════════════
   BDA FOLLOW-UP CRON — daily at 08:00
═══════════════════════════════════════════════════════════ */
const cron = require("node-cron");
const { generateFollowUpNotifications } = require("./controllers/bdaNotificationsController");

cron.schedule("0 8 * * *", () => {
  generateFollowUpNotifications();
});

/* ═══════════════════════════════════════════════════════════
   404 + GLOBAL ERROR HANDLER
═══════════════════════════════════════════════════════════ */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

/* ═══════════════════════════════════════════════════════════
   START
═══════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});