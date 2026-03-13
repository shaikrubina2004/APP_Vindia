const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

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

/* ROUTES */

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/* START SERVER */

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});