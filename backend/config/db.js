const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

// Handle idle connection errors — prevents crash on sleep/wake
pool.on("error", (err) => {
  console.error("Unexpected error on idle DB client:", err.message);
  // Do NOT rethrow — just log it
});

pool
  .connect()
  .then((client) => {
    console.log("🟢 Supabase DB Connected");
    client.release();
  })
  .catch((err) => console.error("🔴 DB Error:", err));

module.exports = pool;
