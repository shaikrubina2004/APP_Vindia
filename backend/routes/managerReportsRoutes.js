const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;
const c = require("../controllers/managerReportsController");

const SUBMITTERS = requireRole(...c.SUBMITTER_ROLES);
const CEO_ONLY   = requireRole("ceo");

router.post("/",          authMiddleware, SUBMITTERS, c.submitReport);
router.get("/mine",       authMiddleware, SUBMITTERS, c.getMyReports);

router.get("/summary",    authMiddleware, CEO_ONLY, c.getSummary);
router.get("/",           authMiddleware, CEO_ONLY, c.getAllReports);
router.put("/:id/review", authMiddleware, CEO_ONLY, c.reviewReport);

module.exports = router;