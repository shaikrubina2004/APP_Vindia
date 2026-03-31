const express = require("express");
const {
  applyLeave,
  getLeavesByEmployee,
  getAllLeaves,
  updateLeaveStatus,
  getLeaveSummary   // ✅ ADD THIS
} = require("../controllers/leaveController");

const router = express.Router();

/* Employee routes */
router.post("/", applyLeave);
router.get("/summary/:id", getLeaveSummary);
router.get("/employee/:id", getLeavesByEmployee);


/* HR routes */
router.get("/", getAllLeaves);
router.put("/:id/status", updateLeaveStatus);

module.exports = router;