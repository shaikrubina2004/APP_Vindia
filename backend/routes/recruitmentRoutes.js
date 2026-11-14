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
router.post("/candidates/:id/interviews", recruitmentController.addInterviewRound); // legacy: log a finished round
router.post("/candidates/:id/interviews/schedule", recruitmentController.scheduleInterview); // schedule + email
router.patch("/candidates/:id/interviews/:roundId/feedback", recruitmentController.submitInterviewFeedback);

/* Screening */
router.post("/candidates/:id/screening", recruitmentController.submitScreening);

/* Aptitude Test (taken on the separate aptitude portal — the ERP records score + decision) */
router.post("/candidates/:id/aptitude-test/send", recruitmentController.sendAptitudeTestLink); // legacy, unused by the page
router.patch("/candidates/:id/aptitude-test/complete", recruitmentController.completeAptitudeTest);
router.post("/candidates/:id/aptitude-test/decision", recruitmentController.decideAptitude);

/* Internal Approval */
router.post("/candidates/:id/approval/start", recruitmentController.moveToApproval);
router.patch("/candidates/:id/approval", recruitmentController.recordApproval);

/* BGV: email the drive link, then HR reviews (approve / flag) */
router.get("/bgv-config", recruitmentController.getBgvConfig);
router.post("/candidates/:id/bgv/send", recruitmentController.sendBgvRequest);
router.patch("/candidates/:id/bgv", recruitmentController.updateBGV);

/* Offer: release the email, then record the candidate's reply */
router.post("/candidates/:id/offer/release", recruitmentController.releaseOffer);
router.patch("/candidates/:id/offer/response", recruitmentController.recordOfferResponse);

module.exports = router;