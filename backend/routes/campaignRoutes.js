// backend/routes/campaignRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/campaignController");

const CAN_MANAGE = ["digital_marketing", "ceo"];

router.use(protect);
router.use(requireRole(...CAN_MANAGE));

router.get("/", controller.getCampaigns);
router.get("/:id", controller.getCampaignById);
router.post("/", controller.createCampaign);
router.patch("/:id", controller.updateCampaign);
router.delete("/:id", controller.deleteCampaign);

module.exports = router;