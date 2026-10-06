const express = require("express");
const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;
const {
  applyLeave,
  getMyLeaves,
  getLeavesByEmployee,
  getAllLeaves,
  getTeamLeaves,
  updateLeaveStatus,
  getLeaveSummary,
} = require("../controllers/leaveController");

const router = express.Router();
router.use(auth);

const HR_ROLES = requireRole("hr_manager", "ceo");
const LEAVE_APPROVER_ROLES = requireRole(
  "project_manager",
  "operations_manager",
  "finance_manager",
  "hr_manager",
  "ceo"
);

// Current user's leave data. Static routes must be before /:id-style routes.
router.get("/me", getMyLeaves);
router.get("/me/summary", async (req, res, next) => {
  try {
    req.params.id = "me";
    return getLeaveSummary(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// Employees can submit their own leave. employee_id in the body is ignored;
// the authenticated user's employees.user_id is the source of truth.
router.post("/", applyLeave);

// HR/CEO can review the administrative leave queue.
router.get("/", HR_ROLES, getAllLeaves);

// Direct managers see only leave requests submitted by their direct reports.
// CEO can see the full team queue for escalation/oversight.
router.get("/team", LEAVE_APPROVER_ROLES, getTeamLeaves);
router.put("/:id/status", LEAVE_APPROVER_ROLES, updateLeaveStatus);

// Employee self-view, plus HR/CEO for administration.
router.get("/employee/:id", getLeavesByEmployee);
router.get("/summary/:id", getLeaveSummary);

module.exports = router;
