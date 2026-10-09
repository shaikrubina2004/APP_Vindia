const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const upload = require("../middleware/upload");

const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getNextEmployeeCode,
  backfillEmployeeCodes,
  getBirthdays,
} = require("../controllers/employeeController");

// Only HR Manager and CEO may create, edit or delete employees.
const HR_ONLY = requireRole("hr_manager", "ceo");

// ✅ GENERATE NEXT EMPLOYEE CODE (must be before /:id routes)
router.get("/generate-code", authMiddleware, HR_ONLY, getNextEmployeeCode);

// ✅ BIRTHDAYS (must be before /:id routes, otherwise Express treats
//    "birthdays" as an :id param on the route below)
router.get("/birthdays", authMiddleware, getBirthdays);

// ✅ BACKFILL MISSING EMPLOYEE CODES
router.post("/backfill-codes", authMiddleware, HR_ONLY, backfillEmployeeCodes);

// ✅ CREATE EMPLOYEE (WITH FILE UPLOAD)
router.post(
  "/",
  authMiddleware,
  HR_ONLY,
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "certificates", maxCount: 1 },
  ]),
  createEmployee
);

// GET CURRENT EMPLOYEE PROFILE
// Resolves the logged-in account to the employee record that owns
// the department/role assignment. This is the source of truth for
// dashboard greetings, profile identity and employee-scoped UI.
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await require("../config/db").query(`
      SELECT
        e.id AS employee_id,
        e.name AS employee_name,
        e.email AS employee_email,
        e.department AS employee_department,
        e.designation,
        e.profile_photo,
        e.status AS employee_status,
        u.id AS user_id,
        u.name AS account_name,
        u.email AS account_email,
        r.code AS role_code,
        r.name AS role_name,
        d.id AS department_id,
        d.name AS department_name
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = r.department_id
      WHERE e.user_id = $1
      LIMIT 1
    `, [req.user.id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /employees/me error:", error);
    return res.status(500).json({ message: "Could not load employee profile" });
  }
});

// ✅ GET (reads stay login-only for now; to be tightened after usage check)
router.get("/", authMiddleware, getAllEmployees);
router.get("/:id", authMiddleware, getEmployeeById);

// ✅ UPDATE (WITH FILE UPLOAD)
router.put(
  "/:id",
  authMiddleware,
  HR_ONLY,
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "certificates", maxCount: 1 },
  ]),
  updateEmployee
);

// ✅ DELETE
router.delete("/:id", authMiddleware, HR_ONLY, deleteEmployee);

module.exports = router;