const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes"); // import routes

const app = express();

app.use(cors());
app.use(express.json());

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

/* AUTH ROUTES */
app.use("/api/auth", authRoutes);

/* START SERVER */
app.listen(process.env.PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${process.env.PORT}`);
});