// ══════════════════════════════════════════════════════════════════════════════
//  boqRoutes.js
//  Register in server.js:
//    const boqRoutes = require("./routes/boqRoutes");
//    app.use("/api/boq", boqRoutes);
// ══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();

const {
  getProjects,
  getMilestones,
  getAllBoqs,
  getBoqById,
  createBoq,
  updateBoq,
  pmApprove,
  pmReject,
  seApprove,
  seReject,
  deleteBoq,
} = require("../controllers/boqController");

// Optional auth middleware — uncomment if you have one:
// const { protect } = require("../middleware/authMiddleware");
// router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️  ORDER MATTERS:
//  Named routes (approve/pm, reject/pm etc.) MUST come BEFORE /:id
//  Otherwise Express matches "approve" as the :id parameter
// ─────────────────────────────────────────────────────────────────────────────

// ── Dropdown data ──
router.get("/projects",              getProjects);       // GET  all projects
router.get("/milestones/:projectId", getMilestones);     // GET  WBS top-level items for a project

// ── Approval / rejection routes (BEFORE /:id) ──
router.put("/approve/pm/:id",        pmApprove);         // PUT  PM approves  → pending_se
router.put("/reject/pm/:id",         pmReject);          // PUT  PM rejects   → rejected
router.put("/approve/se/:id",        seApprove);         // PUT  SE approves  → finalised + sent_to_se
router.put("/reject/se/:id",         seReject);          // PUT  SE rejects   → rejected

// ── BOQ CRUD ──
router.get   ("/",    getAllBoqs);                        // GET  all BOQs  (?projectId=&status=)
router.post  ("/",    createBoq);                        // POST create BOQ
router.get   ("/:id", getBoqById);                       // GET  single BOQ
router.put   ("/:id", updateBoq);                        // PUT  edit & resubmit BOQ
router.delete("/:id", deleteBoq);                        // DELETE BOQ

module.exports = router;