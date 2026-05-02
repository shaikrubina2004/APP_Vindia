const express = require("express");
const router  = express.Router();
const lead    = require("../controllers/leadController");

/* ── DASHBOARD SUMMARY ── */
router.get("/dashboard-summary", lead.getDashboardSummary);

/* ── LEADS CRUD ── */
router.post("/",    lead.createLead);
router.get("/",     lead.getAllLeads);
router.get("/:id",  lead.getLeadById);
router.put("/:id",  lead.updateLead);

/* ── FOLLOW UPS ── */
router.post("/:leadId/followups", lead.addFollowUp);
router.get("/:leadId/followups",  lead.getFollowUps);

/* ── JUNK / ADMIN ── */
router.put("/:id/request-junk",     lead.requestJunk);
router.put("/:id/permanent-delete", lead.permanentDeleteLead);

module.exports = router;