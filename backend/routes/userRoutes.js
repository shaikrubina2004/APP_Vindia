
const express = require("express");
const router = express.Router();

const pool = require("../config/db");

const {
  getUsersByRole,
} = require("../controllers/userController");
/* GET USERS BY ROLE */
router.get("/by-role/:role", getUsersByRole);
/* GET USERS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.status, u.role_id,
        r.name AS role,
        d.id AS department_id,
        d.name AS department
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = r.department_id
      ORDER BY u.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET DEPARTMENTS */
router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM departments ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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