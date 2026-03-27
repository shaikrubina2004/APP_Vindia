const pool = require("../config/db");

// ✅ CREATE EMPLOYEE
const createEmployee = async (req, res) => {
  const {
    name,
    email,
    phone,
    department,
    designation,
    salary,
    join_date,
    manager_id,
    status,
    address
  } = req.body;

  try {
    if (!name || !email || !phone || !department || !designation || salary == null || !join_date) {
      return res.status(400).json({ message: "All employee fields are required" });
    }

    const existingEmployee = await pool.query(
      "SELECT id FROM employees WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }

    const result = await pool.query(
      `INSERT INTO employees 
      (name, email, phone, department, designation, salary, join_date, manager_id, status, address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        name,
        email.toLowerCase(),
        phone,
        department,
        designation,
        salary,
        join_date,
        manager_id || null,
        status || "active",
        address || null
      ]
    );

    return res.status(201).json({
      message: "Employee created successfully",
      employee: result.rows[0],
    });

  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ GET ALL EMPLOYEES (🔥 IMPORTANT FIX)
const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        m.name AS manager_name
      FROM employees e
      LEFT JOIN employees m 
      ON e.manager_id = m.id
      ORDER BY e.id ASC
    `);

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("Get all employees error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ GET BY ID
const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        m.name AS manager_name
      FROM employees e
      LEFT JOIN employees m 
      ON e.manager_id = m.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ UPDATE EMPLOYEE
const updateEmployee = async (req, res) => {
  const { id } = req.params;

  const {
    name,
    email,
    phone,
    department,
    designation,
    salary,
    join_date,
    manager_id,
    status,
    address
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE employees
       SET name=$1, email=$2, phone=$3, department=$4, designation=$5,
           salary=$6, join_date=$7, manager_id=$8, status=$9, address=$10
       WHERE id=$11 RETURNING *`,
      [
        name,
        email.toLowerCase(),
        phone,
        department,
        designation,
        salary,
        join_date,
        manager_id || null,
        status || "active",
        address || null,
        id
      ]
    );

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ DELETE
const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM employees WHERE id = $1", [id]);
    return res.status(200).json({ message: "Employee deleted" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};