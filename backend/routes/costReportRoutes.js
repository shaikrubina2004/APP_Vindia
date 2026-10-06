const express = require("express");
const router  = express.Router();

const auth = require("../middleware/authMiddleware");
const { requireRole } = auth;

router.use(auth);
router.use(requireRole("quantity_surveyor", "project_manager", "ceo"));
const WRITE_ROLES = requireRole("quantity_surveyor", "project_manager", "ceo");

const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  approveReport,
  rejectReport,
  deleteReport,
} = require("../controllers/costReportcontroller");

router.put("/approve/:id", WRITE_ROLES, approveReport);
router.put("/reject/:id",  WRITE_ROLES, rejectReport);
router.get   ("/",    getAllReports);
router.post  ("/",    WRITE_ROLES, createReport);
router.get   ("/:id", getReportById);
router.put   ("/:id", WRITE_ROLES, updateReport);
router.delete("/:id", WRITE_ROLES, deleteReport);

module.exports = router;