const express = require("express");
const router  = express.Router();
const googleAds = require("../controllers/googleAdsController");

router.get("/webhook",            googleAds.health);
router.post("/webhook",           googleAds.receiveLead);            // → "Google Ads"
router.post("/webhook/:channel",  googleAds.receiveLead);            // → /webhook/youtube = "YouTube Ads"

module.exports = router;