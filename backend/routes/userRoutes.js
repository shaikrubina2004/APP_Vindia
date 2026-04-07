const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* GET ALL USERS — joins role + department */
router.get("/", async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.status, u.role_id,
        r.name  AS role,
        d.id    AS department_id,
        d.name  AS department
      FROM users u
      LEFT JOIN roles       r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = r.department_id
      ORDER BY u.id
    `);
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* GET ALL DEPARTMENTS — no is_active filter (works even if column missing) */
router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM departments ORDER BY name",
    );
    console.log("Departments fetched:", result.rows); // debug log
    res.json(result.rows);
  } catch (err) {
    console.error("Departments error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* GET ROLES BY DEPARTMENT — no is_active filter */
router.get("/roles/:deptId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM roles WHERE department_id = $1 ORDER BY name",
      [req.params.deptId],
    );
    console.log(`Roles for dept ${req.params.deptId}:`, result.rows); // debug log
    res.json(result.rows);
  } catch (err) {
    console.error("Roles error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* UPDATE USER — saves role_id + status */
router.put("/:id", async (req, res) => {
  const { role_id, status } = req.body;
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE users SET role_id = $1, status = $2 WHERE id = $3",
      [role_id, status, id],
    );
    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* DELETE USER */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
