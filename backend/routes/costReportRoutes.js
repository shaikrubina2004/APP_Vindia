const express = require("express");
const router  = express.Router();

const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  approveReport,
  rejectReport,
  deleteReport,
} = require("../controllers/costReportcontroller");

router.put("/approve/:id", approveReport);
router.put("/reject/:id",  rejectReport);
router.get   ("/",    getAllReports);
router.post  ("/",    createReport);
router.get   ("/:id", getReportById);
router.put   ("/:id", updateReport);
router.delete("/:id", deleteReport);

module.exports = router;