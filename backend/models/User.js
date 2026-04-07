const pool = require("../config/db");

/* CREATE USER */
const createUser = async ({
  name,
  email,
  password,
  role_id,
  status = "active",
}) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role_id, status`,
    [name, email.toLowerCase(), password, role_id, status],
  );

  return result.rows[0];
};

/* GET USER BY EMAIL (JOIN ROLES) */
const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT 
        u.id,
        u.name,
        u.email,
        u.password,
        u.status,
        u.role_id,
        r.code AS role_code,
        r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1
     LIMIT 1`,
    [email.toLowerCase()],
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  getUserByEmail,
};
