const pool = require("../config/db");

// ✅ DEFAULT FILE PLACEHOLDERS
const DEFAULTS = {
  profile_photo: "default-profile.png",
  id_proof: "default-id.pdf",
  offer_letter: "default-offer.pdf",
  certificates: "default-cert.pdf",
};

// ✅ CREATE EMPLOYEE
const createEmployee = async (req, res) => {
  const {
    name, email, phone, department, designation, salary,
    join_date, manager_id, status, address,
    dob, gender, marital_status, nationality,
    employee_code, employment_type, work_location,
    shift_timing, experience, previous_company,
    account_no, ifsc, pan, aadhar
  } = req.body;

  const files = req.files || {}; // ✅ FIX

  const profile_photo =
    files.profile_photo?.[0]?.filename || DEFAULTS.profile_photo;

  const id_proof =
    files.id_proof?.[0]?.filename || DEFAULTS.id_proof;

  const offer_letter =
    files.offer_letter?.[0]?.filename || DEFAULTS.offer_letter;

  const certificates =
    files.certificates?.[0]?.filename || DEFAULTS.certificates;

  try {
    if (!name || !email || !phone || !department || !designation || salary == null || !join_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existingEmployee = await pool.query(
      "SELECT id FROM employees WHERE email = $1",
      [email ? email.toLowerCase() : null] // ✅ FIX
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const result = await pool.query(
      `INSERT INTO employees (
        name, email, phone, department, designation, salary,
        join_date, manager_id, status, address,
        dob, gender, marital_status, nationality,
        employee_code, employment_type, work_location,
        shift_timing, experience, previous_company,
        profile_photo, account_no, ifsc, pan, aadhar,
        id_proof, offer_letter, certificates
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,
        $18,$19,$20,
        $21,$22,$23,$24,$25,
        $26,$27,$28
      )
      RETURNING *`,
      [
        name,
        email ? email.toLowerCase() : null, // ✅ FIX
        phone,
        department,
        designation,
        salary,
        join_date,
        manager_id ? Number(manager_id) : null,
        status ? status.toLowerCase() : "active",
        address || null,

        dob || null,
        gender || null,
        marital_status || null,
        nationality || null,

        employee_code || null,
        employment_type || null,
        work_location || null,
        shift_timing || null,
        experience || null,
        previous_company || null,

        profile_photo,
        account_no || null,
        ifsc || null,
        pan || null,
        aadhar || null,

        id_proof,
        offer_letter,
        certificates
      ]
    );

    return res.status(201).json({
      message: "Employee created successfully",
      employee: result.rows[0],
    });

  } catch (error) {
    console.error("Create error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET ALL
const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, m.name AS manager_name
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      ORDER BY e.id ASC
    `);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET BY ID
const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT e.*, m.name AS manager_name
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE EMPLOYEE
const updateEmployee = async (req, res) => {
  const { id } = req.params;

  const {
    name, email, phone, department, designation, salary,
    join_date, manager_id, status, address,
    dob, gender, marital_status, nationality,
    employee_code, employment_type, work_location,
    shift_timing, experience, previous_company,
    account_no, ifsc, pan, aadhar
  } = req.body;

  const files = req.files || {}; // ✅ FIX

  try {
    const existing = await pool.query(
      "SELECT * FROM employees WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const old = existing.rows[0];

    const profile_photo =
      files.profile_photo?.[0]?.filename ||
      old.profile_photo ||
      DEFAULTS.profile_photo;

    const id_proof =
      files.id_proof?.[0]?.filename ||
      old.id_proof ||
      DEFAULTS.id_proof;

    const offer_letter =
      files.offer_letter?.[0]?.filename ||
      old.offer_letter ||
      DEFAULTS.offer_letter;

    const certificates =
      files.certificates?.[0]?.filename ||
      old.certificates ||
      DEFAULTS.certificates;

    const result = await pool.query(
      `UPDATE employees SET
        name=$1, email=$2, phone=$3, department=$4, designation=$5,
        salary=$6, join_date=$7, manager_id=$8, status=$9, address=$10,
        dob=$11, gender=$12, marital_status=$13, nationality=$14,
        employee_code=$15, employment_type=$16, work_location=$17,
        shift_timing=$18, experience=$19, previous_company=$20,
        profile_photo=$21, account_no=$22, ifsc=$23, pan=$24, aadhar=$25,
        id_proof=$26, offer_letter=$27, certificates=$28
      WHERE id=$29
      RETURNING *`,
      [
        name || old.name,
        email ? email.toLowerCase() : old.email,
        phone || old.phone,
        department || old.department,
        designation || old.designation,
        salary ?? old.salary,
        join_date || old.join_date,
        manager_id ? Number(manager_id) : old.manager_id,
        status ? status.toLowerCase() : old.status,
        address || old.address,

        dob || old.dob,
        gender || old.gender,
        marital_status || old.marital_status,
        nationality || old.nationality,

        employee_code || old.employee_code,
        employment_type || old.employment_type,
        work_location || old.work_location,
        shift_timing || old.shift_timing,
        experience ?? old.experience,
        previous_company || old.previous_company,

        profile_photo,
        account_no || old.account_no,
        ifsc || old.ifsc,
        pan || old.pan,
        aadhar || old.aadhar,

        id_proof,
        offer_letter,
        certificates,

        id
      ]
    );

    res.status(200).json({
      message: "Employee updated successfully",
      employee: result.rows[0],
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE
const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM employees WHERE id = $1", [id]);
    res.status(200).json({ message: "Deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};