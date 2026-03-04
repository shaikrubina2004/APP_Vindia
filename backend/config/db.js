const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "vindia_erp",
  password: "postgres123",
  port: 5432,
});

module.exports = pool;