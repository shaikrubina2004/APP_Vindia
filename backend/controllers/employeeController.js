const pool = require("../config/db");

// ✅ DEFAULT FILE PLACEHOLDERS
const DEFAULTS = {
  profile_photo: "default-profile.png",
  id_proof: "default-id.pdf",
  offer_letter: "default-offer.pdf",
  certificates: "default-cert.pdf",
};

// ✅ VALID GOV ID TYPES
const validTypes = ["pan", "aadhar", "passport", "driving", "voter"];

// ✅ CREATE EMPLOYEE
const createEmployee = async (req, res) => {
  const {
    name, email, phone, department, designation, salary,
    join_date, manager_id, status, address,
    dob, gender, marital_status, nationality,
    employee_code, employment_type, work_location,
    shift_timing, experience, previous_company,
    account_no, ifsc,
    gov_id_type, gov_id_number  // ✅ NEW: Replaced pan/aadhar
  } = req.body;

  const files = req.files || {};

  const profile_photo = files.profile_photo?.[0]?.filename || DEFAULTS.profile_photo;
  const id_proof = files.id_proof?.[0]?.filename || DEFAULTS.id_proof;
  const offer_letter = files.offer_letter?.[0]?.filename || DEFAULTS.offer_letter;
  const certificates = files.certificates?.[0]?.filename || DEFAULTS.certificates;

  try {
    // ✅ REQUIRED VALIDATION
    if (!name || !email || !phone || !department || !designation || salary == null || !join_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // ✅ GOV ID TYPE VALIDATION
    if (gov_id_type && !validTypes.includes(gov_id_type.toLowerCase())) {
      return res.status(400).json({ 
        message: `Invalid ID type. Must be one of: ${validTypes.join(", ")}` 
      });
    }

    // ✅ EMAIL UNIQUENESS CHECK (case insensitive)
    const existingEmployee = await pool.query(
      "SELECT id FROM employees WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }

    const result = await pool.query(
      `INSERT INTO employees (
        name, email, phone, department, designation, salary,
        join_date, manager_id, status, address,
        dob, gender, marital_status, nationality,
        employee_code, employment_type, work_location,
        shift_timing, experience, previous_company,
        profile_photo, account_no, ifsc, gov_id_type, gov_id_number,
        id_proof, offer_letter, certificates
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING *`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        phone.trim(),
        department.trim(),
        designation.trim(),
        Number(salary),
        join_date,
        manager_id ? Number(manager_id) : null,
        status ? status.toLowerCase().trim() : "active",
        address?.trim() || null,

        dob || null,
        gender?.trim() || null,
        marital_status?.trim() || null,
        nationality?.trim() || null,

        employee_code?.trim() || null,
        employment_type?.trim() || null,
        work_location?.trim() || null,
        shift_timing?.trim() || null,
        Number(experience) || null,
        previous_company?.trim() || null,

        profile_photo,
        account_no?.trim() || null,
        ifsc?.trim().toUpperCase() || null,
        gov_id_type ? gov_id_type.toLowerCase().trim() : null,
        gov_id_number?.trim() || null,

        id_proof,
        offer_letter,
        certificates
      ]
    );

    res.status(201).json({
      message: "Employee created successfully 🚀",
      employee: result.rows[0]
    });

  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ GET ALL EMPLOYEES
const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id, e.name, e.email, e.phone, e.department, 
        e.designation, e.salary, e.status, e.join_date,
        e.gov_id_type, e.gov_id_number,
        m.name AS manager_name
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      ORDER BY e.id DESC
      LIMIT 50
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET BY ID
const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        e.*, 
        m.name AS manager_name,
        m.designation AS manager_designation
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get by ID error:", error);
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
    account_no, ifsc,
    gov_id_type, gov_id_number  // ✅ NEW: Replaced pan/aadhar
  } = req.body;

  const files = req.files || {};

  try {
    const existing = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const old = existing.rows[0];

    // ✅ GOV ID TYPE VALIDATION
    if (gov_id_type && !validTypes.includes(gov_id_type.toLowerCase())) {
      return res.status(400).json({ 
        message: `Invalid ID type. Must be one of: ${validTypes.join(", ")}` 
      });
    }

    // ✅ File handling with fallback
    const profile_photo = files.profile_photo?.[0]?.filename || old.profile_photo || DEFAULTS.profile_photo;
    const id_proof = files.id_proof?.[0]?.filename || old.id_proof || DEFAULTS.id_proof;
    const offer_letter = files.offer_letter?.[0]?.filename || old.offer_letter || DEFAULTS.offer_letter;
    const certificates = files.certificates?.[0]?.filename || old.certificates || DEFAULTS.certificates;

    const result = await pool.query(
      `UPDATE employees SET
        name=$1, email=$2, phone=$3, department=$4, designation=$5,
        salary=$6, join_date=$7, manager_id=$8, status=$9, address=$10,
        dob=$11, gender=$12, marital_status=$13, nationality=$14,
        employee_code=$15, employment_type=$16, work_location=$17,
        shift_timing=$18, experience=$19, previous_company=$20,
        profile_photo=$21, account_no=$22, ifsc=$23, gov_id_type=$24, gov_id_number=$25,
        id_proof=$26, offer_letter=$27, certificates=$28
      WHERE id=$29
      RETURNING *`,
      [
        name?.trim() || old.name,
        email ? email.toLowerCase().trim() : old.email,
        phone?.trim() || old.phone,
        department?.trim() || old.department,
        designation?.trim() || old.designation,
        salary !== undefined ? Number(salary) : old.salary,
        join_date || old.join_date,
        manager_id !== undefined ? (manager_id ? Number(manager_id) : null) : old.manager_id,
        status ? status.toLowerCase().trim() : old.status,
        address?.trim() || old.address,

        dob || old.dob,
        gender?.trim() || old.gender,
        marital_status?.trim() || old.marital_status,
        nationality?.trim() || old.nationality,

        employee_code?.trim() || old.employee_code,
        employment_type?.trim() || old.employment_type,
        work_location?.trim() || old.work_location,
        shift_timing?.trim() || old.shift_timing,
        experience !== undefined ? Number(experience) || null : old.experience,
        previous_company?.trim() || old.previous_company,

        profile_photo,
        account_no?.trim() || old.account_no,
        ifsc?.trim().toUpperCase() || old.ifsc,
        gov_id_type ? gov_id_type.toLowerCase().trim() : old.gov_id_type,
        gov_id_number?.trim() || old.gov_id_number,

        id_proof,
        offer_letter,
        certificates,
        id
      ]
    );

    res.status(200).json({
      message: "Employee updated successfully ✏️",
      employee: result.rows[0]
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE EMPLOYEE
const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM employees WHERE id = $1 RETURNING id", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully 🗑️" });
  } catch (error) {
    console.error("Delete error:", error);
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