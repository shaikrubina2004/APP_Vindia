const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle DB client:", err.message);
});

(async () => {
  try {
    const client = await pool.connect();
    console.log("🟢 Supabase DB Connected");
    client.release();
  } catch (err) {
    console.error("🔴 DB Error:", err.message);
  }
})();

module.exports = pool;