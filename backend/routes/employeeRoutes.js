const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee } = require("../controllers/employeeController");

router.post("/", authMiddleware, createEmployee);
router.get("/", authMiddleware, getAllEmployees);
router.get("/:id", authMiddleware, getEmployeeById);
router.put("/:id", authMiddleware, updateEmployee);
router.delete("/:id", authMiddleware, deleteEmployee);

module.exports = router;