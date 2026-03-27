const pool = require("../config/db");

/* CREATE USER */
const createUser = async ({
  name,
  email,
  password,
  role = "HR",
  status = "active",
}) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, status`,
    [name, email.toLowerCase(), password, role, status]
  );

  return result.rows[0];
};

/* GET USER BY EMAIL */
const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
};

/* UPDATE ROLE + STATUS */
const updateUser = async (id, role, status) => {
  const result = await pool.query(
    `UPDATE users
     SET role = $1, status = $2
     WHERE id = $3
     RETURNING id, name, email, role, status`,
    [role, status, id]
  );

  return result.rows[0];
};

/* GET ALL USERS */
const getAllUsers = async () => {
  const result = await pool.query(
    `SELECT id, name, email, role, status FROM users ORDER BY id ASC`
  );

  return result.rows;
};

/* DELETE USER */
const deleteUser = async (id) => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};

module.exports = {
  createUser,
  getUserByEmail,
  updateUser,
  getAllUsers,
  deleteUser,
};