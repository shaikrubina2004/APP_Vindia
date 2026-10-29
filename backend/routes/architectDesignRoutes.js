const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/architectDesignController");

/* =========================
   ARCHITECT DRAWINGS
========================= */

/* CREATE DRAWING */
router.post(
  "/",
  authMiddleware,
  controller.createDrawing
);

/* GET DRAWINGS */
router.get(
  "/",
  authMiddleware,
  controller.getDrawings
);

router.get(
  "/:drawingId/revisions",
  authMiddleware,
  controller.getDrawingRevisions
);

router.patch(
  "/:drawingId/revision",
  authMiddleware,
  controller.addDrawingRevision
);

router.delete(
  "/:drawingId",
  authMiddleware,
  controller.deleteDrawing
);

/* SEND DRAWING */
router.post(
  "/:drawingId/send",
  authMiddleware,
  controller.sendDrawing
);

/* REQUEST DETAILED DRAWING */
router.post(
  "/request",
  authMiddleware,
  controller.requestDrawing
);

/* GET DRAWING REQUESTS */
router.get(
  "/requests",
  authMiddleware,
  controller.getRequests
);
router.patch(
  "/requests/:id/seen",
  authMiddleware,
  controller.markRequestSeen
);

module.exports = router;