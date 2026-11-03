const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendMail, welcomeCredentialsEmailTemplate } = require("../utils/mailer");

// ✅ TEMPORARY PASSWORD — a unique, random, 12-character password for each new
//    login (instead of the same default for everybody). Easy-to-confuse
//    characters (0 O 1 l I) are left out so it can be typed from the email.
const generateTempPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%*";
  const all = upper + lower + digits;
  const pick = (set) => set[crypto.randomInt(set.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 12) chars.push(pick(all));

  // shuffle so the guaranteed characters are not always in the first four places
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

// ✅ Who is calling? (from the verified login token, never from the client)
const callerRole = (req) =>
  String(req.user?.role || "").toLowerCase().replace(/[\s-]+/g, "_");

// ✅ GENERATE NEXT UNIQUE EMPLOYEE CODE from a known set of used codes (in-memory, no extra DB call)
//    Pass in the Set of already-assigned codes so each call just increments a counter.
const nextCodeFromCounter = (usedCodes, counter) => {
  let num = counter;
  let code;
  do {
    code = "EMP" + String(num).padStart(4, "0");
    num++;
  } while (usedCodes.has(code));
  usedCodes.add(code);   // mark as used so the next call skips it
  return { code, nextCounter: num };
};

// ✅ API HANDLER: GET /api/employees/generate-code  (used when adding a new employee via the form)
const getNextEmployeeCode = async (req, res) => {
  try {
    // Single DB call — grab the highest existing EMP#### code
    const result = await pool.query(`
      SELECT employee_code FROM employees
      WHERE employee_code ~ '^EMP[0-9]+$'
      ORDER BY CAST(SUBSTRING(employee_code FROM 4) AS INTEGER) DESC
      LIMIT 1
    `);

    let next = "EMP1001";
    if (result.rows.length > 0) {
      const num = parseInt(result.rows[0].employee_code.replace("EMP", ""), 10);
      next = "EMP" + String(num + 1).padStart(4, "0");
    }

    res.status(200).json({ employee_code: next });
  } catch (error) {
    console.error("Generate code error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DEFAULT FILE PLACEHOLDERS
const DEFAULTS = {
  profile_photo: "default-profile.png",
  id_proof: "default-id.pdf",
  offer_letter: "default-offer.pdf",
  certificates: "default-cert.pdf",
};

// ✅ VALID GOV ID TYPES
const validTypes = ["pan", "aadhar", "passport", "driving", "voter"];

// ✅ CREATE EMPLOYEE → also creates/links a user account, and EMAILS the
//    employee their first login details (employee ID, login ID, temporary
//    password). The user and employee are saved together or not at all.
const createEmployee = async (req, res) => {
  const {
    name, email, phone, department, designation, salary,
    join_date, manager_id, status, address,
    dob, gender, marital_status, nationality,
    employee_code, employment_type, work_location,
    shift_timing, experience, previous_company,
    account_no, ifsc,
    gov_id_type, gov_id_number,
    password  // optional: HR may choose the first password; it is emailed like a generated one
  } = req.body;

  const files = req.files || {};

  const profile_photo = files.profile_photo?.[0]?.filename || DEFAULTS.profile_photo;
  const id_proof = files.id_proof?.[0]?.filename || DEFAULTS.id_proof;
  const offer_letter = files.offer_letter?.[0]?.filename || DEFAULTS.offer_letter;
  const certificates = files.certificates?.[0]?.filename || DEFAULTS.certificates;

  const client = await pool.connect();
  let began = false;

  try {
    if (!name || !email || !phone || !department || !designation || salary == null || !join_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (gov_id_type && !validTypes.includes(gov_id_type.toLowerCase())) {
      return res.status(400).json({
        message: `Invalid ID type. Must be one of: ${validTypes.join(", ")}`
      });
    }

    const existingEmployee = await client.query(
      "SELECT id FROM employees WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }

    await client.query("BEGIN");
    began = true;

    // ✅ STEP 1: Check if a user account already exists for this email
    let userId = null;
    let tempPassword = null; // only set when a NEW login is created here
    const existingUser = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingUser.rows.length > 0) {
      // User already exists — just grab their ID to link (their password is untouched)
      userId = existingUser.rows[0].id;
    } else {
      // ✅ STEP 2: No user exists — create one with a temporary password
      tempPassword = password || generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // ✅ Look up role_id from the roles table using the designation name
      // This ensures the new user gets the correct role so they land on the right dashboard
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [designation.trim()]
      );
      const roleId = roleResult.rows[0]?.id || null;

      // must_change_password = TRUE → the employee is invited to set their own
      // password the first time they sign in.
      const newUser = await client.query(
        `INSERT INTO users (name, email, password, role_id, status, must_change_password)
         VALUES ($1, $2, $3, $4, 'active', TRUE)
         RETURNING id`,
        [name.trim(), email.toLowerCase().trim(), hashedPassword, roleId]
      );
      userId = newUser.rows[0].id;
    }

    // ✅ STEP 2.5: Auto-generate employee_code if not provided
    let finalEmployeeCode = employee_code?.trim();
    if (!finalEmployeeCode) {
      const codeResult = await client.query(`
        SELECT employee_code FROM employees
        WHERE employee_code ~ '^EMP[0-9]+$'
        ORDER BY CAST(SUBSTRING(employee_code FROM 4) AS INTEGER) DESC
        LIMIT 1
      `);
      if (codeResult.rows.length === 0) {
        finalEmployeeCode = "EMP1001";
      } else {
        const num = parseInt(codeResult.rows[0].employee_code.replace("EMP", ""), 10);
        finalEmployeeCode = "EMP" + String(num + 1).padStart(4, "0");
      }
    }

    // ✅ STEP 3: Insert the employee record, linked to the user
    const result = await client.query(
      `INSERT INTO employees (
        name, email, phone, department, designation, salary,
        join_date, manager_id, status, address,
        dob, gender, marital_status, nationality,
        employee_code, employment_type, work_location,
        shift_timing, experience, previous_company,
        profile_photo, account_no, ifsc, gov_id_type, gov_id_number,
        id_proof, offer_letter, certificates, user_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29
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
        finalEmployeeCode,
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
        certificates,
        userId  // ✅ linked user_id
      ]
    );

    await client.query("COMMIT");
    began = false;

    const employee = result.rows[0];

    // ✅ STEP 4: Email the login details (only when a NEW login was created).
    //    The employee is already saved, so a mail problem never undoes it —
    //    the response tells HR whether the email went out.
    let credentialsEmail = { sent: false, skipped: true, error: null };
    if (tempPassword) {
      const template = welcomeCredentialsEmailTemplate({
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employee_code,
        tempPassword,
      });
      const mail = await sendMail({ to: employee.email, ...template });
      credentialsEmail = {
        sent: mail.success,
        skipped: false,
        error: mail.success ? null : mail.error,
      };
    }

    res.status(201).json({
      message: "Employee created successfully 🚀",
      employee,
      user_id: userId,
      credentials: tempPassword ? "new_account" : "existing_account",
      credentials_email: credentialsEmail,
      note: tempPassword
        ? credentialsEmail.sent
          ? "New login created; login details emailed to the employee"
          : "New login created, but the login email could not be sent — use Resend login email"
        : "Linked to existing user account",
    });

  } catch (error) {
    if (began) {
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    console.error("Create error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    client.release();
  }
};

// ✅ RESEND LOGIN EMAIL — issues a NEW temporary password (the old one is stored
//    hashed and cannot be read back) and emails it to the employee. HR / CEO only.
//    HR can resend only while the employee is still on a temporary password;
//    the CEO can reset anyone. Only the CEO can reset the CEO's login.
const resendCredentials = async (req, res) => {
  const { id } = req.params;

  try {
    const found = await pool.query(
      `SELECT e.name, e.email, e.employee_code, e.user_id,
              u.must_change_password, r.code AS role_code
         FROM employees e
         LEFT JOIN users u ON u.id = e.user_id
         LEFT JOIN roles r ON r.id = u.role_id
        WHERE e.id = $1`,
      [id]
    );

    if (found.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const row = found.rows[0];
    if (!row.user_id) {
      return res.status(400).json({ message: "This employee has no login account" });
    }

    const callerIsCeo = callerRole(req) === "ceo";
    const targetIsCeo = String(row.role_code || "").toLowerCase() === "ceo";

    if (targetIsCeo && !callerIsCeo) {
      return res.status(403).json({ message: "Only the CEO can reset the CEO's login" });
    }
    if (!row.must_change_password && !callerIsCeo) {
      return res.status(409).json({
        message:
          "This employee has already set their own password, so the login email cannot be resent.",
      });
    }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      `UPDATE users
          SET password = $1, must_change_password = TRUE, password_changed_at = NULL
        WHERE id = $2`,
      [hashed, row.user_id]
    );

    const template = welcomeCredentialsEmailTemplate({
      name: row.name,
      email: row.email,
      employeeCode: row.employee_code,
      tempPassword,
    });
    const mail = await sendMail({ to: row.email, ...template });

    res.status(200).json({
      sent: mail.success,
      message: mail.success
        ? `Login details emailed to ${row.email}`
        : "A new temporary password was set, but the email could not be sent. Please try again.",
      error: mail.success ? null : mail.error,
    });
  } catch (error) {
    console.error("Resend credentials error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET ALL EMPLOYEES — now includes role from users table
const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id, e.name, e.email, e.phone, e.department, 
        e.designation, e.salary, e.status, e.join_date,
        e.employee_code, e.gov_id_type, e.gov_id_number, e.user_id,
        m.name AS manager_name,
        r.name AS role,
        d.name AS user_department
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = r.department_id
      ORDER BY e.id DESC
      LIMIT 100
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all error:", error);

    // DB unreachable (DNS failure, network down, Supabase paused, etc.)
    if (
      error.code === "EAI_AGAIN" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(503).json({
        message: "Database is currently unreachable. Please try again shortly.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ GET BIRTHDAYS — lightweight, unpaginated endpoint dedicated to the
//    HR dashboard calendar. Returns every employee that has a dob, not
//    just the latest 100 like getAllEmployees. dob is cast to text so
//    Postgres hands back the literal "YYYY-MM-DD" string instead of a
//    JS Date object — node-postgres otherwise converts DATE columns
//    using the server's local timezone, which can shift the day by one.
const getBirthdays = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, department, dob::text AS dob
      FROM employees
      WHERE dob IS NOT NULL
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get birthdays error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ GET BY ID  (also says whether the employee is still on a temporary password)
const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        e.*, 
        m.name AS manager_name,
        m.designation AS manager_designation,
        r.name AS role,
        u.status AS login_status,
        u.must_change_password AS login_password_pending
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN roles r ON r.id = u.role_id
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
    gov_id_type, gov_id_number
  } = req.body;

  const files = req.files || {};

  try {
    const existing = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const old = existing.rows[0];

    if (gov_id_type && !validTypes.includes(gov_id_type.toLowerCase())) {
      return res.status(400).json({
        message: `Invalid ID type. Must be one of: ${validTypes.join(", ")}`
      });
    }

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

    // ✅ Also sync name to users table if linked
    if (name && old.user_id) {
      await pool.query(
        "UPDATE users SET name = $1 WHERE id = $2",
        [name.trim(), old.user_id]
      );
    }

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

// ✅ BACKFILL: One DB read → compute all codes in-memory → one bulk UPDATE.
//             Fixes duplicates AND fills nulls in a single pass.
const backfillEmployeeCodes = async (req, res) => {
  try {
    // Single read — get every employee's id + current code
    const { rows } = await pool.query(
      "SELECT id, employee_code FROM employees ORDER BY id ASC"
    );

    // Build a Set of all valid, non-duplicate codes already in use
    // "Valid" means matches EMP#### format
    const codeCount = {};
    for (const r of rows) {
      if (r.employee_code && /^EMP\d+$/.test(r.employee_code)) {
        codeCount[r.employee_code] = (codeCount[r.employee_code] || 0) + 1;
      }
    }

    // usedCodes = codes that are assigned exactly once (safe to keep)
    const usedCodes = new Set(
      Object.entries(codeCount)
        .filter(([, count]) => count === 1)
        .map(([code]) => code)
    );

    // Find the highest existing number so we start the counter just above it
    let maxNum = 1028; // safe floor based on your current data (EMP1028 is the highest)
    for (const code of usedCodes) {
      const n = parseInt(code.replace("EMP", ""), 10);
      if (n > maxNum) maxNum = n;
    }
    let counter = maxNum + 1;

    // Determine which employees need a new code:
    //   - employee_code is null / empty
    //   - employee_code is a duplicate (keep oldest id, reassign the rest)
    const seenOnce = new Set(); // tracks first occurrence of each code
    const toUpdate = [];        // { id, newCode }

    for (const r of rows) {
      const code = r.employee_code;
      const needsNew =
        !code ||                              // null / empty
        !/^EMP\d+$/.test(code) ||            // not a valid EMP#### format
        (codeCount[code] > 1 && seenOnce.has(code)); // duplicate — not the first occurrence

      if (codeCount[code] > 1 && !seenOnce.has(code) && code) {
        seenOnce.add(code); // mark first occurrence as "kept"
      }

      if (needsNew) {
        const result = nextCodeFromCounter(usedCodes, counter);
        counter = result.nextCounter;
        toUpdate.push({ id: r.id, newCode: result.code });
      }
    }

    if (toUpdate.length === 0) {
      return res.status(200).json({ message: "All employees already have unique codes.", updated: 0 });
    }

    // Bulk update — one query per employee (pg doesn't support bulk UPDATE with different values easily,
    // but this is a one-time operation so N small queries is fine)
    for (const { id, newCode } of toUpdate) {
      await pool.query(
        "UPDATE employees SET employee_code = $1 WHERE id = $2",
        [newCode, id]
      );
    }

    res.status(200).json({
      message: `✅ Done. Updated ${toUpdate.length} employee code(s).`,
      updated: toUpdate.length,
      assignments: toUpdate, // shows exactly what was assigned to whom
    });
  } catch (error) {
    console.error("Backfill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createEmployee,
  resendCredentials,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getNextEmployeeCode,
  backfillEmployeeCodes,
  getBirthdays,
};