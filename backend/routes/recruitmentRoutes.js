// ===== FILE: APP_Vindia/backend/routes/recruitmentRoutes.js =====
const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const recruitmentController = require("../controllers/recruitmentController");

router.use(protect, requireRole("hr_manager", "ceo"));

/* Job Openings */
router.post("/job-openings", recruitmentController.createJobOpening);
router.get("/job-openings", recruitmentController.getAllJobOpenings);
router.get("/job-openings/:id", recruitmentController.getJobOpeningById);
router.patch("/job-openings/:id/status", recruitmentController.updateJobOpeningStatus);
router.get("/job-openings/:id/candidates", recruitmentController.getCandidatesByJobOpening);

/* Candidates */
router.post("/candidates", recruitmentController.createCandidate);
router.get("/candidates", recruitmentController.getAllCandidates);
router.get("/candidates/:id", recruitmentController.getCandidateById);
router.patch("/candidates/:id/stage", recruitmentController.updateCandidateStage);
router.patch("/candidates/:id/offer", recruitmentController.updateOfferDetails);
router.post("/candidates/:id/hire", recruitmentController.markHired);

/* Interview Rounds */
router.post("/candidates/:id/interviews", recruitmentController.addInterviewRound);

module.exports = router;