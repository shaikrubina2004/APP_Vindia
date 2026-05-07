
const express = require("express");
const router = express.Router();

const pool = require("../config/db");

const {
  getUsersByRole,
} = require("../controllers/userController");
/* GET USERS BY ROLE */
router.get("/by-role/:role", async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        r.name AS role,
        r.code AS role_code
      FROM users u
      JOIN roles r
        ON r.id = u.role_id
      WHERE LOWER(r.code) = LOWER($1)
      ORDER BY u.name ASC
      `,
      [role]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(
      "GET USERS BY ROLE ERROR:",
      err.message
    );

    res.status(500).json({
      error: "Failed to fetch users",
    });
  }
});

/* GET ROLES */
router.get("/roles/:deptId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM roles WHERE department_id = $1",
      [req.params.deptId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* UPDATE USER */
router.put("/:id", async (req, res) => {
  const { role_id, status } = req.body;

  try {
    if (!role_id) {
      return res.status(400).json({ message: "role_id required" });
    }

    await pool.query(
      `UPDATE users 
       SET role_id = $1, status = $2 
       WHERE id = $3`,
      [role_id, status || "Active", req.params.id]
    );

    res.json({ message: "User updated" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE USER */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;