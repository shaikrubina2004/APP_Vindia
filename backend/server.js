const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const path = require("path");

/* ── EXISTING ROUTES ─────────────────────────────────────── */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

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

/* ── 🔥 NEW: PC DAILY UPDATE ROUTE ───────────────────────── */
const pcDailyUpdateRoutes = require("./routes/pcDailyUpdateRoutes");

/* ── SITE ENGINEER MODULES ───────────────────────────────── */
const siteEngineerRfiRoutes = require("./routes/siteEngineerRfiRoutes");
const ncrRoutes = require("./routes/ncrRoutes");
const siteDiaryRoutes = require("./routes/siteDiaryRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const progressRoutes = require("./routes/progressRoutes");
const siteEngineerDashboardRoutes = require("./routes/siteEngineerDashboardRoutes");


/* ── STRUCTURAL ENGINEER MODULES ───────────────────────────────── */
const structuralRoutes = require("./routes/structuralRoutes");
const seDailyRoutes = require("./routes/seDailyupdatesRoutes");
const rfiRoutes = require("./routes/rfiRoutes");

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
app.use("/api/se-daily-reports", seDailyRoutes);   // ✅ SE route
app.use("/api/rfi", rfiRoutes);

/* ── Other Modules ───────────────── */
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/daily-reports", dailyRoutes);        // ✅ normal route
app.use("/api/analysis", analysisRoutes);

  /* ── Incident Module ───────────────────────────────────── */
  app.use("/api/incidents", incidentRoutes);

  /* ── 🔥 NEW: PC DAILY UPDATE ROUTE ─────────────────────── */
  app.use("/api/pc-daily-updates", pcDailyUpdateRoutes);

  /* ── Site Engineer Modules ─────────────────────────────── */
  app.use("/api/site-engineer/rfi", siteEngineerRfiRoutes); // Site Engineer RFI
  app.use("/api/ncr", ncrRoutes);
  app.use("/api/diary", siteDiaryRoutes);
  app.use("/api/activity-log", activityLogRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/site-engineer-dashboard", siteEngineerDashboardRoutes);

} catch (err) {
  console.error("❌ Route loading error:", err.message);
}

/* ═══════════════════════════════════════════════════════════
   404 + GLOBAL ERROR HANDLER
═══════════════════════════════════════════════════════════ */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

// eslint-disable-next-line no-unused-vars
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