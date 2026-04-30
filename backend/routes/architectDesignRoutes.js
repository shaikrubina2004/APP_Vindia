// routes/architectDesignRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/architectDesignController");

// Stats (must be before /:drawingId to avoid conflict)
router.get("/stats",                      ctrl.getStats);

// Drawings
router.post("/",                          ctrl.createDrawing);
router.get("/project/:projectId",         ctrl.getDrawingsByProject);
router.get("/:drawingId",                 ctrl.getDrawingById);
router.delete("/:drawingId",              ctrl.deleteDrawing);

// Revisions
router.post("/:drawingId/revision",       ctrl.addRevision);
router.get("/:drawingId/revisions",       ctrl.getRevisions);

// Workflow
router.post("/:drawingId/workflow",       ctrl.updateWorkflow);

module.exports = router;