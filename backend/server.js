require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

<<<<<<< Updated upstream
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
const structuralRoutes = require("./routes/structuralRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const dailyRoutes = require("./routes/dailyUpdatesRoutes");
const analysisRoutes = require("./routes/analysis");

/* ── INCIDENT MODULE ─────────────────────────────────────── */
const incidentRoutes = require("./routes/IncidentRoutes");

const app = express();

/* ═══════════════════════════════════════════════════════════
   MIDDLEWARE
═══════════════════════════════════════════════════════════ */
=======
const app = express();

/* ── DB ───────────────── */
const pool = require("./config/db");

/* ── ROUTES ───────────── */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const rfiRoutes = require("./routes/rfiRoutes");
const structuralRoutes = require("./routes/structuralRoutes"); // ✅ ADD THIS
// OPTIONAL (only if exists)
let incidentRoutes;
try {
  incidentRoutes = require("./routes/incidentRoutes");
} catch (err) {
  console.log("⚠️ Incident routes not found, skipping...");
}

/* ── MIDDLEWARE ───────── */
>>>>>>> Stashed changes
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

<<<<<<< Updated upstream
/* ═══════════════════════════════════════════════════════════
   DEBUG
═══════════════════════════════════════════════════════════ */
console.log("authRoutes:", typeof authRoutes);
console.log("userRoutes:", typeof userRoutes);
console.log("employeeRoutes:", typeof employeeRoutes);
console.log("attendanceRoutes:", typeof attendanceRoutes);
console.log("leaveRoutes:", typeof leaveRoutes);

/* ═══════════════════════════════════════════════════════════
   TEST DB
═══════════════════════════════════════════════════════════ */
=======
/* ── STATIC ───────────── */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ── TEST DB ──────────── */
>>>>>>> Stashed changes
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "API Running ✅", time: result.rows[0] });
  } catch (err) {
    res.status(500).send("Database error");
  }
});

<<<<<<< Updated upstream
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

  /* ── Other Modules ─────────────────────────────────────── */
  app.use("/api/structural", structuralRoutes);
  app.use("/api/timesheets", timesheetRoutes);
  app.use("/api/daily-reports", dailyRoutes);
  app.use("/api/analysis", analysisRoutes);

  /* ── Incident Module ───────────────────────────────────── */
  app.use("/api/incidents", incidentRoutes);
} catch (err) {
  console.error("❌ Route loading error:", err.message);
}

/* ═══════════════════════════════════════════════════════════
   404 + GLOBAL ERROR HANDLER
═══════════════════════════════════════════════════════════ */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);
=======
/* ── ROUTES ───────────── */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/rfis", rfiRoutes);
app.use("/api/structural", structuralRoutes); // ✅ ADD THIS
// optional
if (incidentRoutes) {
  app.use("/api/incidents", incidentRoutes);
}

/* ── 404 ─────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* ── ERROR ───────────── */
app.use((err, _req, res, _next) => {
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

/* ── START ───────────── */
const PORT = process.env.PORT || 5000;
>>>>>>> Stashed changes

// eslint-disable-next-line no-unused-vars
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
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
