const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const path = require("path");

/* ROUTES */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

/* PROJECT MODULE */
const projectRoutes = require("./routes/projectRoutes");
const wbsRoutes = require("./routes/wbsRoutes");
const costRoutes = require("./routes/costRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

/* NEW MODULES */
const structuralRoutes = require("./routes/structuralRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= DEBUG ================= */
console.log("authRoutes:", typeof authRoutes);
console.log("userRoutes:", typeof userRoutes);
console.log("employeeRoutes:", typeof employeeRoutes);
console.log("attendanceRoutes:", typeof attendanceRoutes);
console.log("leaveRoutes:", typeof leaveRoutes);

/* ================= TEST DB ================= */
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* ================= ROUTES ================= */
try {
  // AUTH + USERS
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/employees", employeeRoutes);

  // HR MODULE
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leaves", leaveRoutes);

  // FILE UPLOADS
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // PROJECT MODULE
  app.use("/api/projects", projectRoutes);
  app.use("/api/wbs", wbsRoutes);
  app.use("/api/cost-summary", costRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // NEW MODULES
  app.use("/api/structural", structuralRoutes);
  app.use("/api/timesheets", timesheetRoutes);

} catch (err) {
  console.error("❌ Route loading error:", err.message);
}

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});