const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ── EXISTING ROUTES ─────────────────────────────────────── */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const drawingUploadRoutes = require("./routes/drawingUploadRoutes");

/* ── PROJECT MODULE ──────────────────────────────────────── */
const projectRoutes = require("./routes/projectRoutes");
const wbsRoutes = require("./routes/wbsRoutes");
const costRoutes = require("./routes/costRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

/* ── OTHER MODULES ───────────────────────────────────────── */
const timesheetRoutes = require("./routes/timesheetRoutes");
const dailyRoutes = require("./routes/dailyUpdatesRoutes");
const analysisRoutes = require("./routes/analysis");

/* ── INCIDENT MODULE ─────────────────────────────────────── */
const incidentRoutes = require("./routes/IncidentRoutes");

/* ── PROJECT COORDINATOR ───────────────────────── */
const pcDailyUpdateRoutes = require("./routes/pcDailyUpdateRoutes");
const templateRoutes = require("./routes/templateRoutes");
const pcNotificationsRouter = require("./routes/pcNotifications");

/* ── SITE ENGINEER MODULES ───────────────────────────────── */
const siteEngineerRfiRoutes = require("./routes/siteEngineerRfiRoutes");
const ncrRoutes = require("./routes/ncrRoutes");
const siteDiaryRoutes = require("./routes/siteDiaryRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const progressRoutes = require("./routes/progressRoutes");
const siteEngineerDashboardRoutes = require("./routes/siteEngineerDashboardRoutes");

/* ── ARCHITECT ───────────────────────────────── */
const architectProjectsRoutes = require("./routes/architectProjects");
const architectDailyLogRoutes = require("./routes/architectDailyLogRoutes");
const architectDesignRoutes = require("./routes/architectDesignRoutes");
const architectDrawingUploadRoutes = require("./routes/architectDrawingUploadRoutes");

/* ── STRUCTURAL ENGINEER MODULES ───────────────────────────────── */
const structuralRoutes = require("./routes/structuralRoutes");
const seDailyRoutes = require("./routes/seDailyupdatesRoutes");
const rfiRoutes = require("./routes/rfiRoutes");
const seNotificationRoutes = require("./routes/seNotificationRoutes");

/* ── QS MODULES ───────────────────────────────── */
const qsRoutes = require("./routes/qsRoutes");
const boqRoutes = require("./routes/boqRoutes");
const costReportRoutes = require("./routes/costReportRoutes");
const quantityReportRoutes = require("./routes/Quantityreportroutes.js");
const qsNotifRoutes = require("./routes/qsNotificationRoutes"); // ← NEW

/* ── BDA / Leads ───────────────────────────────────────── */
const leadRoutes = require("./routes/leadRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

/* ═══════════════════════════════════════════════════════════
   MIDDLEWARE
═══════════════════════════════════════════════════════════ */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ═══════════════════════════════════════════════════════════
   DEBUG
═══════════════════════════════════════════════════════════ */
console.log("authRoutes:", typeof authRoutes);
console.log("userRoutes:", typeof userRoutes);
console.log("employeeRoutes:", typeof employeeRoutes);
console.log("attendanceRoutes:", typeof attendanceRoutes);
console.log("leaveRoutes:", typeof leaveRoutes);
console.log("pcDailyUpdateRoutes:", typeof pcDailyUpdateRoutes);

/* ═══════════════════════════════════════════════════════════
   TEST DB
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
try {
  /* ── Auth + Users ──────────────────────────────────────── */
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/employees", employeeRoutes);

  /* ── HR Module ─────────────────────────────────────────── */
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leaves", leaveRoutes);

  /* ── File Uploads ──────────────────────────────────────── */
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  /* ── Project Module ────────────────────────────────────── */
  app.use("/api/projects", projectRoutes);
  app.use("/api/wbs", wbsRoutes);
  app.use("/api/cost-summary", costRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  /* ── Structural Engineer Modules ───────────────── */
  app.use("/api/structural", structuralRoutes);
  app.use("/api/se-daily-reports", seDailyRoutes);
  app.use("/api/rfis", rfiRoutes);
  app.use("/api/se-notifications", seNotificationRoutes);

  /* ── QS Modules ───────────────── */
  app.use("/api/qs/notifications", qsNotifRoutes);
  app.use("/api/qs", qsRoutes);            
  app.use("/api/boq", boqRoutes);
  app.use("/api/cost-report", costReportRoutes);
  app.use("/api/quantity-report", quantityReportRoutes);
   // ← NEW

  /* ── Other Modules ───────────────── */
  app.use("/api/timesheets", timesheetRoutes);
  app.use("/api/daily-reports", dailyRoutes);
  app.use("/api/analysis", analysisRoutes);

  /* ── Incident Module ───────────────────────────────────── */
  app.use("/api/incidents", incidentRoutes);

  /* ── PROJECT COORDINATOR ─────────────────────── */
  app.use("/api/pc-daily-updates", pcDailyUpdateRoutes);
  app.use("/api/templates", templateRoutes);
  app.use("/api/pc-notifications", pcNotificationsRouter);

  /* ── Architect ─────────────────────── */
  app.use("/api/architect", architectProjectsRoutes);
  app.use("/api/architect-daily-log", architectDailyLogRoutes);
  app.use("/api/architect-designs", architectDesignRoutes);
  app.use("/api/architect-drawings", architectDrawingUploadRoutes);

  /* ── Site Engineer Modules ─────────────────────────────── */
  app.use("/api/site-engineer/rfi", siteEngineerRfiRoutes);
  app.use("/api/ncr", ncrRoutes);
  app.use("/api/diary", siteDiaryRoutes);
  app.use("/api/activity-log", activityLogRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/site-engineer-dashboard", siteEngineerDashboardRoutes);
  app.use("/api/drawings", drawingUploadRoutes);

  /* ── BDA / Leads ───────────────────────────────────────── */
  app.use("/api/leads", leadRoutes);
  app.use("/api/reports", reportRoutes);

} catch (err) {
  console.error("❌ Route loading error:", err.message);
}

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
   START SERVER
═══════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});