const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

// ✅ CREATE EMPLOYEE (WITH FILE UPLOAD)
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "certificates", maxCount: 1 },
  ]),
  createEmployee
);

// ✅ GET
router.get("/", getAllEmployees);
router.get("/", authMiddleware, getAllEmployees);
router.get("/:id", authMiddleware, getEmployeeById);

// ✅ UPDATE (WITH FILE UPLOAD)
router.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "certificates", maxCount: 1 },
  ]),
  updateEmployee
);

// ✅ DELETE
router.delete("/:id", authMiddleware, deleteEmployee);

module.exports = router;