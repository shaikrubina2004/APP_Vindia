const express = require("express");
const router = express.Router();
const c = require("../controllers/siteMeasurementcontroller");

router.get("/", c.getAll);

// ✅ Specific route first
router.get("/:id/items", c.getMeasurementItems);

// ✅ General route after
router.get("/:id", c.getById);

router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;