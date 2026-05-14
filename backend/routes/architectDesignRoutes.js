const express = require("express");
const router = express.Router();

const controller = require("../controllers/architectDesignController");

/* ══════════════════════════════════════════════════════════════
   STATIC ROUTES FIRST — must come before any /:param routes.
   Express matches top-to-bottom; if /:drawingId appears first,
   "request", "requests", "my-3d-submissions" etc. are all
   swallowed by it as param values.
══════════════════════════════════════════════════════════════ */

/* ── Core drawing CRUD ─────────────────────────────────────── */
router.post("/",    controller.createDrawing);
router.get("/",     controller.getDrawings);

/* ── Drawing requests (SE / Client → Architect) ────────────── */
router.post("/request",  controller.requestDrawing);
router.get("/requests",  controller.getRequests);

/* ── 3D: 3D Visualizer's own submission history ────────────── */
router.get("/my-3d-submissions", controller.getMy3DSubmissions);

/* ── 3D: Architect gets all 3D submissions for their drawings ── */
router.get("/my-3d-reviews", controller.getMy3DReviews);

/* ── 3D: Architect approves / rejects a submission ─────────── */
router.patch("/3d-submissions/:submissionId", controller.review3DSubmission);

/* ══════════════════════════════════════════════════════════════
   PARAMETERISED ROUTES LAST — :drawingId wildcard comes here
══════════════════════════════════════════════════════════════ */

/* ── Send a drawing to a recipient ─────────────────────────── */
router.post("/:drawingId/send",          controller.sendDrawing);

/* ── 3D Visualizer submits a render for a drawing ──────────── */
router.post("/:drawingId/submit-3d",     controller.submit3DRender);

/* ── Architect fetches all 3D renders for a drawing ────────── */
router.get("/:drawingId/3d-submissions", controller.get3DSubmissions);

/* ── Architect increments Planning drawing revision ─────────── */
router.patch("/:drawingId/revision", controller.incrementRevision);

module.exports = router;