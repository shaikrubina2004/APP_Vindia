const pool = require("../config/db");

/* CREATE USER */
const createUser = async ({ name, email, password, role_id, status }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role_id, status`,
    [name, email, password, role_id, status]
  );

  return result.rows[0];
};

/* GET USER BY EMAIL */
const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT u.*, r.code AS role
    FROM users u LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.email = $1`,
    [email]
  );

  return result.rows[0];
};

module.exports = {
  createUser,
  getUserByEmail,
};