const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const lead    = require("../controllers/leadController");
const { logTimeSpent } = require("../controllers/timeTrackingController");

/* ── AUTH ──
   Every /api/leads route now requires a valid JWT (protect).
   requireRole() further restricts admin-level actions to
   CEO / BD Manager so a BDA account can't reassign, permanently
   delete, or export other BDAs' leads.
   Adjust the role lists below if your org uses different role
   codes for "manager of BDAs" (see app_vindia/src/roles.js). */
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = authMiddleware;

const CAN_MANAGE = requireRole("ceo", "bd_manager");

/* ── File upload setup ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    require("fs").mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .xlsx, .xls and .pdf files allowed"));
  },
});

/* ── DASHBOARD SUMMARY ── */
router.get("/dashboard-summary", authMiddleware, lead.getDashboardSummary);

/* ── IMPORT (bulk-loading leads — restrict to managers) ── */
router.post("/import-excel",    authMiddleware, CAN_MANAGE, upload.single("file"), lead.importLeadsFromExcel);
router.post("/import-justdial", authMiddleware, CAN_MANAGE, upload.single("file"), lead.importJustDialPDF);

/* ── EXPORT ── */
router.get("/export", authMiddleware, CAN_MANAGE, lead.exportLeadsToExcel);

/* ── FOLLOW UPS (reports) ── */
router.get("/follow-ups/today",   authMiddleware, lead.getTodaysFollowUps);
router.get("/follow-ups/pending", authMiddleware, lead.getPendingFollowUps);

/* ── FOLLOW UPS (aggregate list) ──────────────────────────
   IMPORTANT: this MUST be registered before GET "/:id",
   otherwise "followups" is parsed as the :id parameter and
   this request 404s / hits the wrong handler. */
router.get("/followups", authMiddleware, lead.getAllFollowUps);

/* ── LEADS CRUD ── */
router.get("/",    authMiddleware, lead.getAllLeads);
router.post("/",   authMiddleware, lead.createLead);
router.get("/:id", authMiddleware, lead.getLeadById);
router.put("/:id", authMiddleware, lead.updateLead);

/* ── FOLLOW UPS per lead ── */
router.post("/:leadId/followups", authMiddleware, lead.addFollowUp);
router.get("/:leadId/followups",  authMiddleware, lead.getFollowUps);

/* ── TIME TRACKING ── */
router.post("/:leadId/track-time", authMiddleware, logTimeSpent);

/* ── JUNK / ADMIN (manager-only) ── */
router.put("/:id/request-junk",     authMiddleware, lead.requestJunk);
router.put("/:id/reassign",         authMiddleware, CAN_MANAGE, lead.reassignLead);
router.put("/:id/permanent-delete", authMiddleware, CAN_MANAGE, lead.permanentDeleteLead);

module.exports = router;