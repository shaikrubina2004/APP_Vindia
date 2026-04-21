const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("🟢 Supabase DB Connected"))
  .catch(err => console.error("🔴 DB Error:", err));

module.exports = pool;