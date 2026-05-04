const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const lead    = require("../controllers/leadController");

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
router.get("/dashboard-summary", lead.getDashboardSummary);

/* ── IMPORT ── */
router.post("/import-excel",    upload.single("file"), lead.importLeadsFromExcel);
router.post("/import-justdial", upload.single("file"), lead.importJustDialPDF);

/* ── EXPORT ── */
router.get("/export", lead.exportLeadsToExcel);

/* ── FOLLOW UPS (reports) ── */
router.get("/follow-ups/today",   lead.getTodaysFollowUps);
router.get("/follow-ups/pending", lead.getPendingFollowUps);

/* ── LEADS CRUD ── */
router.get("/",    lead.getAllLeads);
router.post("/",   lead.createLead);
router.get("/:id", lead.getLeadById);
router.put("/:id", lead.updateLead);

/* ── FOLLOW UPS per lead ── */
router.post("/:leadId/followups", lead.addFollowUp);
router.get("/:leadId/followups",  lead.getFollowUps);

/* ── JUNK / ADMIN ── */
router.put("/:id/request-junk",     lead.requestJunk);
router.put("/:id/reassign",         lead.reassignLead);
router.put("/:id/permanent-delete", lead.permanentDeleteLead);

module.exports = router;