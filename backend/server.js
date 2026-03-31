const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
//const payrollRoutes = require("./routes/payrollRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

/* ✅ ADDED PROJECT ROUTES */
const projectRoutes = require("./routes/projectRoutes");


const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* DEBUG: Check route types */
console.log("authRoutes:", typeof authRoutes);
console.log("userRoutes:", typeof userRoutes);
console.log("employeeRoutes:", typeof employeeRoutes);
console.log("attendanceRoutes:", typeof attendanceRoutes);
console.log("leaveRoutes:", typeof leaveRoutes);
//console.log("payrollRoutes:", typeof payrollRoutes);

/* TEST DATABASE CONNECTION */
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* ROUTES */
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/employees", employeeRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leaves", leaveRoutes);
  
  //app.use("/api/payroll", payrollRoutes);

  /* ✅ ADDED PROJECT ROUTE */
  app.use("/api/projects", projectRoutes);
} catch (err) {
  console.error("❌ Route loading error:", err.message);
}

/* START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
