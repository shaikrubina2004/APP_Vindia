const express = require("express");
const router = express.Router();

const { getQSDashboard } = require("../controllers/quantitySurveyorController");

router.get("/dashboard", getQSDashboard);

module.exports = router;