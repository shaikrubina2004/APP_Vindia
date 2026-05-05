const express = require("express");
const router = express.Router();

const controller = require("../controllers/architectDesignController");

router.post("/", controller.createDrawing);
router.get("/", controller.getDrawings);
router.post("/:drawingId/send", controller.sendDrawing);

router.post("/request", controller.requestDrawing);
router.get("/requests", controller.getRequests);

module.exports = router;