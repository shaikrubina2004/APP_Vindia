const express = require("express");
const router = express.Router();

const {
  createActivityLog,
  getAllActivityLogs,
  getActivityLogsByProject,
  getActivityLogsByUser,
  deleteActivityLog,
} = require("../controllers/activityLogController");

/* ===== CREATE ===== */
router.post("/", createActivityLog);

/* ===== GET ===== */
router.get("/", getAllActivityLogs);
router.get("/project/:projectId", getActivityLogsByProject);
router.get("/user/:userId", getActivityLogsByUser);

/* ===== DELETE ===== */
router.delete("/:id", deleteActivityLog);

module.exports = router;
